import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { setUserTokens } from '../../../lib/tokenStorage';

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
      return NextResponse.json({ message: 'User ID required' }, { status: 400 });
    }

    // Generate auth URL
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: userId 
    });

    return NextResponse.json({
      success: true,
      authUrl: authUrl,
      message: 'Click the authUrl to authenticate with Google Calendar',
      instructions: [
        '1. Click the authUrl below',
        '2. Sign in with your email', 
        '3. Grant calendar permissions',
        '4. You will be redirected back to the app',
        '5. Then try the calendar sync again'
      ]
    });

  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    });
  }
}

// Handle the OAuth callback and store tokens temporarily
export async function POST(req) {
  try {
    const { code, userId } = await req.json();
    
    if (!code || !userId) {
      return NextResponse.json({ 
        success: false, 
        message: 'Missing code or userId' 
      }, { status: 400 });
    }

    const { tokens } = await oauth2Client.getToken(code);
    setUserTokens(userId, tokens);

    return NextResponse.json({
      success: true,
      message: 'Authentication successful! Tokens stored temporarily.',
      expiresInfo: 'Tokens will be valid until server restart or 1 hour.'
    });

  } catch (error) {
    console.error('Token exchange error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      message: 'Failed to exchange code for tokens'
    });
  }
}
