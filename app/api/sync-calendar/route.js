import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY 
);

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export async function POST(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ message: 'User ID missing' }, { status: 400 });
    }

    // Fetch user's Google token from your `User Info` table
    const { data: user, error: userError } = await supabase
      .from('User Info')
      .select('google_id')
      .eq('id', userId)
      .single();

    if (userError || !user.google_id) {
      return NextResponse.json({ message: 'No Google account linked' }, { status: 401 });
    }

    // TODO: Retrieve actual refresh token for the user from secure storage
    const refreshToken = 'USER_REFRESH_TOKEN_HERE';

    oauth2Client.setCredentials({ refresh_token: refreshToken });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const { data: tasks, error: taskError } = await supabase
      .from('Tasks')
      .select('*')
      .eq('user_id', userId);

    if (taskError) {
      return NextResponse.json({ message: 'Error fetching tasks' }, { status: 500 });
    }

    // Push each task to Google Calendar
    for (const task of tasks) {
      const event = {
        summary: task.title,
        description: task.description,
        start: {
          dateTime: task.due_date,
        },
        end: {
          dateTime: new Date(new Date(task.due_date).getTime() + (task.estimated_time || 60) * 60000).toISOString(),
        },
      };

      await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
      });
    }

    return NextResponse.json({ message: 'Tasks synced to Google Calendar!' });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: 'Something went wrong' }, { status: 500 });
  }
}
