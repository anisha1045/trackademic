import OpenAI from 'openai'
import { gmailService } from '@/lib/gmailService'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
// Simple approach - handle PDFs by suggesting conversion to images

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

// Helper function to retry API calls with exponential backoff
async function retryWithBackoff(apiCall, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall()
    } catch (error) {
      // Check for OpenAI quota/rate limit errors (don't retry these)
      const isQuotaError = (
        error.status === 429 ||
        error.code === 'rate_limit_exceeded' ||
        error.code === 'quota_exceeded' ||
        (error.message && (
          error.message.includes('429') ||
          error.message.includes('rate_limit') ||
          error.message.includes('quota')
        ))
      )
      
      if (isQuotaError) {
        // Don't retry quota errors, throw immediately
        throw error
      }
      
      // Check for OpenAI server overload errors (retry these)
      const isOverloadError = (
        error.status === 503 ||
        error.status === 502 ||
        error.code === 'server_error' ||
        (error.message && (
          error.message.includes('503') ||
          error.message.includes('502') ||
          error.message.includes('Service Unavailable') ||
          error.message.includes('server_error')
        ))
      )
      
      if (isOverloadError && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000 // 2s, 4s, 8s
        console.log(`API overloaded, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      
      throw error
    }
  }
}

export async function POST(req) {
  try {
    const formData = await req.formData()
    const file = formData.get('file')

    // OpenAI client is already initialized above, no need for model instance
    
    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 })
    }

    // Check file size (limit to 10MB)
    const maxFileSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxFileSize) {
      return Response.json({ 
        error: 'File is too large. Please upload files smaller than 10MB.',
        file_size: file.size,
        max_size: maxFileSize
      }, { status: 400 })
    }

    const fileType = file.type
    const fileName = file.name.toLowerCase()
    let text = ''
    let useVision = false

    // Handle different file types
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      // Upload PDF to OpenAI Files API first, then reference by file ID
      try {
        // Convert File to Buffer for OpenAI upload
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        
        // Create a File-like object for OpenAI
        const fileForUpload = new File([buffer], file.name, { type: file.type })
        
        // Upload to OpenAI Files API
        console.log('Uploading PDF to OpenAI Files API...')
        const uploadedFile = await openai.files.create({
          file: fileForUpload,
          purpose: 'user_data'
        })
        
        console.log('File uploaded successfully:', uploadedFile.id)
        
        const prompt = `Analyze this PDF syllabus and extract ALL assignments, homework, projects, exams, and deadlines.

        Look for items like:
        - "Proj.1 out", "Project 1 due"
        - "Homework out", "Homework due" 
        - "Exam due", "Midterm", "Final"
        - Assignment names and dates

        Return this exact JSON format:
        {
          "assignments": [
            {
              "title": "Assignment title",
              "description": "Brief description",
              "due_date": "2025-MM-DD",
              "type": "assignment|homework|project|exam|quiz",
              "priority": "high|medium|low",
              "estimated_hours": number
            }
          ]
        }

        Rules:
        - Extract EVERY academic task you can find
        - Convert dates to YYYY-MM-DD format (assume 2025 if year not specified)
        - Projects = high priority, Exams = high priority, Homework = medium priority
        - Return ONLY valid JSON, no other text`

        const apiResult = await retryWithBackoff(() => 
          openai.responses.create({
            model: "gpt-4o",
            input: [
              {
                role: "user",
                content: [
                  {
                    type: "input_file",
                    file_id: uploadedFile.id
                  },
                  {
                    type: "input_text",
                    text: prompt
                  }
                ]
              }
            ]
          })
        )

        // Clean up - delete the uploaded file
        try {
          await openai.files.delete(uploadedFile.id)
          console.log('Temporary file cleaned up')
        } catch (cleanupError) {
          console.warn('Failed to cleanup uploaded file:', cleanupError)
        }

        // Extract the generated text from the responses API format
        let generatedText = ''
        if (apiResult.output_text) {
          generatedText = apiResult.output_text
        } else if (apiResult.output && apiResult.output[0] && apiResult.output[0].content && apiResult.output[0].content[0]) {
          generatedText = apiResult.output[0].content[0].text
        } else {
          console.error('Unexpected response format:', apiResult)
          return Response.json({ 
            error: 'Unexpected API response format',
            response_debug: apiResult 
          }, { status: 500 })
        }

        console.log('Successfully extracted PDF content')

        // Parse the response (remove markdown code blocks if present)
        let parsedData
        try {
          let cleanText = generatedText.trim()
          
          // Remove markdown code block wrapper if present
          if (cleanText.startsWith('```json')) {
            cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
          } else if (cleanText.startsWith('```')) {
            cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '')
          }
          
          // Extract JSON object
          const jsonMatch = cleanText.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            parsedData = JSON.parse(jsonMatch[0])
          } else {
            parsedData = JSON.parse(cleanText)
          }
        } catch (parseError) {
          console.error('Failed to parse AI response for PDF:', generatedText)
          return Response.json({ 
            error: 'AI could not extract assignments from this PDF. Try converting to an image or text file.',
            raw_response: generatedText 
          }, { status: 500 })
        }

        if (!parsedData.assignments || !Array.isArray(parsedData.assignments)) {
          return Response.json({ 
            error: 'No assignments found in the PDF',
            parsed_data: parsedData 
          }, { status: 400 })
        }

        console.log(`Successfully parsed PDF: found ${parsedData.assignments.length} assignments`)
        
        return Response.json({
          success: true,
          file_name: file.name,
          file_size: file.size,
          assignments_found: parsedData.assignments.length,
          assignments: parsedData.assignments
        })

      } catch (pdfError) {
        console.error('PDF processing error:', pdfError)
        
        // Check if it's an OpenAI quota/rate limit error
        if (pdfError.status === 429 || pdfError.code === 'rate_limit_exceeded' || 
            (pdfError.message && pdfError.message.includes('rate_limit'))) {
          return Response.json({ 
            error: 'OpenAI API rate limit exceeded. Please try again later.',
            details: pdfError.message 
          }, { status: 429 })
        }
        
        // Check if it's an OpenAI server error
        if (pdfError.status >= 500 || pdfError.code === 'server_error') {
          return Response.json({ 
            error: 'OpenAI API is currently experiencing issues. Please try again.',
            details: pdfError.message 
          }, { status: 503 })
        }
        
        return Response.json({ 
          error: 'Failed to process PDF. Please try uploading as an image (screenshot) instead.',
          details: pdfError.message 
        }, { status: 400 })
      }
    } else if (fileType.startsWith('image/') || fileName.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/)) {
      // Handle images using OpenAI Vision
      useVision = true
    } else {
      // Handle text files
      text = await file.text()
    }

    if (!useVision && (!text || text.trim().length === 0)) {
      return Response.json({ error: 'File appears to be empty or unreadable' }, { status: 400 })
    }

    // Use the shared model instance (already created above)

    let apiResponse
    
    if (useVision) {
      // Handle image files with vision model
      const arrayBuffer = await file.arrayBuffer()
      const base64Data = Buffer.from(arrayBuffer).toString('base64')
      
      const prompt = `Analyze this syllabus image and extract all assignments, homework, projects, exams, and deadlines. Look for due dates, assignment names, and any academic tasks.

      Provide the information in this exact JSON format:
      {
        "assignments": [
          {
            "title": "Assignment title",
            "description": "Brief description",
            "due_date": "YYYY-MM-DD",
            "type": "assignment|homework|project|exam|quiz",
            "priority": "high|medium|low",
            "estimated_hours": number
          }
        ]
      }

      Rules:
      - Extract ALL assignments, projects, homework, exams you can see
      - For dates like "Feb 12", "Mar 24", assume year 2025
      - Convert month abbreviations to full dates
      - If you see "Proj.1 out", "Homework due", "Exam due" etc., these are assignments
      - Estimate priority: projects=high, exams=high, homework=medium
      - Return only valid JSON, no other text`

      apiResponse = await retryWithBackoff(() =>
        openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${file.type};base64,${base64Data}`
                  }
                }
              ]
            }
          ],
          temperature: 0.1,
          max_tokens: 4000
        })
      )
    } else {
      // Handle text/PDF content
      const prompt = `Analyze this syllabus content and extract ALL assignments, homework, projects, exams, and deadlines.

      Looking at this schedule, I can see items like:
      - "Proj.1 out" (project release)
      - "Proj.2 out", "Proj.2 due" (project deadlines)
      - "Homework out", "Homework due" (homework assignments)
      - "Exam due" (exam deadlines)
      - "Final Proj." related items

      For each assignment/task found, provide this exact JSON format:
      {
        "assignments": [
          {
            "title": "Assignment title",
            "description": "Brief description",
            "due_date": "2025-MM-DD",
            "type": "assignment|homework|project|exam|quiz",
            "priority": "high|medium|low", 
            "estimated_hours": number
          }
        ]
      }

      Rules:
      - Extract EVERY academic task (assignments, projects, homework, exams)
      - For dates like "12-Feb", "24-Mar", convert to "2025-02-12", "2025-03-24" format
      - Items marked "out" are assignment releases (still include them)
      - Items marked "due" are deadlines
      - Projects = high priority, Exams = high priority, Homework = medium priority
      - Estimate hours: homework=2-4h, projects=10-20h, exams=3-5h study time
      - Return ONLY valid JSON, no explanation text

      Content to analyze:
      ${text}`;

      apiResponse = await retryWithBackoff(() =>
        openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "user", content: prompt }
          ],
          temperature: 0.1,
          max_tokens: 4000
        })
      )
    }
    const generatedText = apiResponse.choices[0].message.content

    // Try to parse the JSON response
    let parsedData
    try {
      // Clean the response in case there's extra text
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0])
      } else {
        parsedData = JSON.parse(generatedText)
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', generatedText)
      return Response.json({ 
        error: 'AI response was not in expected format',
        raw_response: generatedText 
      }, { status: 500 })
    }

    // Validate the structure
    if (!parsedData.assignments || !Array.isArray(parsedData.assignments)) {
      return Response.json({ 
        error: 'No assignments found in the document',
        parsed_data: parsedData 
      }, { status: 400 })
    }

    // Send Gmail notification if assignments were parsed successfully
    try {
      const cookieStore = await cookies()
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll()
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options)
              })
            },
          },
        }
      )
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (session && session.user.email) {
        const notificationResult = await gmailService.sendScheduleNotification(
          session.user.email,
          parsedData.assignments
        )
        
        if (notificationResult.success) {
          console.log('Gmail notification sent successfully for syllabus parsing:', notificationResult.messageId)
        } else {
          console.warn('Failed to send Gmail notification for syllabus parsing:', notificationResult.error)
        }
      }
    } catch (emailError) {
      console.warn('Error sending email notification for syllabus parsing (non-blocking):', emailError)
    }

    // Add metadata about the parsing
    return Response.json({
      success: true,
      file_name: file.name,
      file_size: file.size,
      assignments_found: parsedData.assignments.length,
      assignments: parsedData.assignments
    })

  } catch (error) {
    console.error('Error parsing syllabus:', error)
    
    // Check if it's an OpenAI quota/rate limit error
    if (error.status === 429 || error.code === 'rate_limit_exceeded' || 
        (error.message && error.message.includes('rate_limit'))) {
      return Response.json({ 
        error: 'OpenAI API rate limit exceeded. Please try again later.',
        details: error.message 
      }, { status: 429 })
    }
    
    // Check if it's an OpenAI server error
    if (error.status >= 500 || error.code === 'server_error') {
      return Response.json({ 
        error: 'OpenAI API is currently experiencing issues. Please try again.',
        details: error.message 
      }, { status: 503 })
    }
    
    return Response.json({ 
      error: 'Failed to process the file',
      details: error.message 
    }, { status: 500 })
  }
}