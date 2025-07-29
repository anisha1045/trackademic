import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import { getUserTokens } from '../../../lib/tokenStorage';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ message: 'User ID missing' }, { status: 400 });
    }

    const userTokens = getUserTokens(userId);
    
    if (!userTokens) {
      return NextResponse.json({ 
        message: 'Google account not authenticated. Please authenticate first.',
        needsAuth: true,
        authUrl: `/api/simple-calendar-auth?user_id=${userId}`
      }, { status: 401 });
    }

    oauth2Client.setCredentials({
      access_token: userTokens.access_token,
      refresh_token: userTokens.refresh_token
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const { data: tasks, error: taskError } = await supabase
      .from('Tasks')
      .select('*')
      .eq('user_id', userId);

    if (taskError) {
      console.error('Error fetching tasks:', taskError);
      return NextResponse.json({ message: 'Error fetching tasks' }, { status: 500 });
    }

    if (!tasks || tasks.length === 0) {
      return NextResponse.json({ 
        message: 'No tasks found to sync',
        syncedCount: 0 
      });
    }

    const syncedTasks = [];
    const errors = [];

    // Sync each task to Google Calendar
    for (const task of tasks) {
      try {
        // Create calendar event for the task
        const dueDate = new Date(task.due_date);
        const estimatedMinutes = task.estimated_time || 60;
        const startTime = new Date(dueDate.getTime() - (estimatedMinutes * 60 * 1000));

        const event = {
          summary: `📚 ${task.title}`,
          description: `Task: ${task.description || 'No description provided'}\n\nClass: ${task.class_name || 'N/A'}\nEstimated Time: ${estimatedMinutes} minutes`,
          start: {
            dateTime: startTime.toISOString(),
            timeZone: 'America/Los_Angeles'
          },
          end: {
            dateTime: dueDate.toISOString(),
            timeZone: 'America/Los_Angeles'
          },
          reminders: {
            useDefault: false,
            overrides: [
              { method: 'email', minutes: 90 },    
              { method: 'popup', minutes: 60 }      
            ]
          }
        };

        const response = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: event
        });

        syncedTasks.push({
          taskId: task.id,
          taskTitle: task.title,
          calendarEventId: response.data.id,
          eventLink: response.data.htmlLink
        });

      } catch (error) {
        console.error(`Error syncing task ${task.id}:`, error);
        errors.push({
          taskId: task.id,
          taskTitle: task.title,
          error: error.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${syncedTasks.length} tasks to Google Calendar`,
      syncedCount: syncedTasks.length,
      syncedTasks: syncedTasks,
      errors: errors,
      features: [
        'Events created with emoji prefix',
        'Email notifications set for 90 minutes before',
        'Popup notifications set for 60 minutes before',
        'Events scheduled based on due dates and estimated time'
      ],
      note: 'Tasks are synced to your Google Calendar. Check your calendar!'
    });

  } catch (error) {
    console.error('Calendar sync error:', error);
    return NextResponse.json({ 
      message: 'Error syncing tasks to calendar',
      error: error.message 
    }, { status: 500 });
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('user_id');
  
  if (!userId) {
    return NextResponse.json({ message: 'User ID required' }, { status: 400 });
  }

  const userTokens = getUserTokens(userId);
  const isAuthenticated = !!userTokens;

  return NextResponse.json({
    authenticated: isAuthenticated,
    message: isAuthenticated 
      ? 'User is authenticated. Ready to sync!' 
      : 'User needs to authenticate with Google Calendar first.',
    authUrl: isAuthenticated ? null : `/api/simple-calendar-auth?user_id=${userId}`,
    syncUrl: isAuthenticated ? `/api/simple-calendar-sync?user_id=${userId}` : null
  });
}
