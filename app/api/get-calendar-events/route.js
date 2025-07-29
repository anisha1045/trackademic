import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getUserTokens } from '../../../lib/tokenStorage';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ message: 'User ID missing' }, { status: 400 });
    }

    // Check if user has tokens using shared storage
    const userTokens = getUserTokens(userId);
    
    if (!userTokens) {
      return NextResponse.json({ 
        message: 'Google account not authenticated. Please authenticate first.',
        needsAuth: true,
        authUrl: `/api/simple-calendar-auth?user_id=${userId}`
      }, { status: 401 });
    }

    // Set up Google Calendar client with tokens
    oauth2Client.setCredentials({
      access_token: userTokens.access_token,
      refresh_token: userTokens.refresh_token
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Get events from now to 30 days from now
    const timeMin = new Date().toISOString();
    const timeMax = new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)).toISOString();

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin,
      timeMax: timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 50
    });

    const events = response.data.items || [];
    
    // Format events for the frontend
    const formattedEvents = events.map(event => ({
      id: event.id,
      title: event.summary || 'Untitled Event',
      description: event.description || '',
      start: event.start.dateTime || event.start.date,
      end: event.end.dateTime || event.end.date,
      location: event.location || '',
      isAllDay: !event.start.dateTime, // If no dateTime, it's an all-day event
      isGoogleEvent: true,
      color: 'bg-blue-500', // Default color for Google events
      htmlLink: event.htmlLink
    }));

    return NextResponse.json({
      success: true,
      events: formattedEvents,
      totalEvents: formattedEvents.length,
      message: `Found ${formattedEvents.length} events in your Google Calendar`
    });

  } catch (error) {
    console.error('Error fetching calendar events:', error);
    
    if (error.code === 401) {
      // Token expired or invalid - getUserTokens already handles cleanup
      return NextResponse.json({ 
        message: 'Authentication expired. Please re-authenticate.',
        needsAuth: true,
        authUrl: `/api/simple-calendar-auth?user_id=${userId}`
      }, { status: 401 });
    }
    
    return NextResponse.json({ 
      message: 'Error fetching calendar events',
      error: error.message 
    }, { status: 500 });
  }
}
