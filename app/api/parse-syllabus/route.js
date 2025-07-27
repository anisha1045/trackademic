import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY)

export async function POST(req) {
  try {
    const formData = await req.formData()
    const file = formData.get('file')
    
    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 })
    }

    const fileType = file.type
    const fileName = file.name.toLowerCase()
    let text = ''
    let useVision = false

    // Handle different file types
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      // Convert PDF to image and process with Vision API
      try {
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        
        // For simplicity, we'll use the PDF as binary data and let Gemini Vision handle it
        // This approach works for many PDFs
        const base64Data = buffer.toString('base64')
        
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
        
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

        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: base64Data,
              mimeType: 'application/pdf'
            }
          }
        ])

        const response = await result.response
        const generatedText = response.text()

        // Parse the response
        let parsedData
        try {
          const jsonMatch = generatedText.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            parsedData = JSON.parse(jsonMatch[0])
          } else {
            parsedData = JSON.parse(generatedText)
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

        return Response.json({
          success: true,
          file_name: file.name,
          file_size: file.size,
          assignments_found: parsedData.assignments.length,
          assignments: parsedData.assignments
        })

      } catch (pdfError) {
        console.error('PDF processing error:', pdfError)
        return Response.json({ 
          error: 'Failed to process PDF. Please try uploading as an image (screenshot) instead.',
          details: pdfError.message 
        }, { status: 400 })
      }
    } else if (fileType.startsWith('image/') || fileName.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/)) {
      // Handle images using Gemini Vision
      useVision = true
    } else {
      // Handle text files
      text = await file.text()
    }

    if (!useVision && (!text || text.trim().length === 0)) {
      return Response.json({ error: 'File appears to be empty or unreadable' }, { status: 400 })
    }

    // Get the appropriate model
    const model = useVision 
      ? genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
      : genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    let result
    
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

      result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: file.type
          }
        }
      ])
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

      result = await model.generateContent(prompt)
    }
    const response = await result.response
    const generatedText = response.text()

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
    return Response.json({ 
      error: 'Failed to process the file',
      details: error.message 
    }, { status: 500 })
  }
} 