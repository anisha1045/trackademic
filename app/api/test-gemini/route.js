import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY)

export async function GET() {
  try {
    console.log('Testing Gemini API...')
    
    if (!process.env.GOOGLE_AI_API_KEY) {
      return Response.json({ error: 'Gemini API key not found' }, { status: 500 })
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
    
    const testPrompt = `Extract assignments from this text:
    
    Course: Computer Science
    Assignment 1: Due February 15, 2025
    Homework 2: Due March 1, 2025
    Final Project: Due April 30, 2025
    
    Return JSON format:
    {"assignments": [{"title": "Assignment 1", "due_date": "2025-02-15", "type": "assignment"}]}`

    const result = await model.generateContent(testPrompt)
    const response = await result.response
    const text = response.text()

    return Response.json({
      success: true,
      api_key_present: !!process.env.GOOGLE_AI_API_KEY,
      response_length: text.length,
      raw_response: text,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Gemini API test error:', error)
    return Response.json({ 
      error: 'Gemini API test failed',
      details: error.message,
      api_key_present: !!process.env.GOOGLE_AI_API_KEY
    }, { status: 500 })
  }
} 