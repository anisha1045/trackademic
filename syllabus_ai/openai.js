const { OpenAI } = require('openai');


const openai = new OpenAI({
  apiKey: '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'
});

async function extractFromSyllabus(syllabusText) {
    const messages = [
      {
        role: 'system',
        content: 'You are an assistant that extracts assignment names, due dates, and estimated tasks from a syllabus.',
      },
      {
        role: 'user',
        content: `Extract a JSON list of all assignments and their due dates and break them into subtasks from the following syllabus:\n\n${syllabusText}`,
      },
    ];
  
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      temperature: 0.3,
    });
  
    const content = response.choices[0].message.content;
    console.log('GPT raw output:', content);
  
    try {
      return JSON.parse(content);
    } catch (err) {
      console.error('Failed to parse GPT response as JSON:', content);
      return null;
    }
  }
  
  module.exports = { extractFromSyllabus };