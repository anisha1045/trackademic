// app/api/chat/route.js
import { NextResponse } from 'next/server'

export async function POST(request) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY
  const { tasks, schedule } = await request.json()  // read JSON body
  console.log('Received tasks:', tasks);
    console.log('Received schedule:', schedule);
  const prompt = `Schedule these tasks ${JSON.stringify(tasks)} into this schedule ${schedule}. Then, return each task by id and the time it is scheduled for, in the format: "[task_id], [time]".`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  const data = await response.json()

if (response.ok) {
    const completion = data.choices[0].message.content;
    console.log('Split task response:', completion);
  } else {
    console.error('Failed to fetch:', data)
  }
  return NextResponse.json(data)
}