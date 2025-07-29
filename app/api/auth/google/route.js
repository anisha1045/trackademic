import { NextResponse } from 'next/server';
import { getAuthUrl } from '../../../../lib/googleService';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ message: 'User ID missing' }, { status: 400 });
    }

    const authUrl = getAuthUrl();
    const urlWithState = `${authUrl}&state=${userId}`;

    return NextResponse.json({ 
      authUrl: urlWithState,
      message: 'Navigate to this URL to authenticate with Google Calendar'
    });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    return NextResponse.json({ 
      message: 'Error generating authentication URL',
      error: error.message 
    }, { status: 500 });
  }
}
