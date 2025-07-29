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
    const code = searchParams.get('code');
    const state = searchParams.get('state'); 
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(new URL(`/calendar?auth_error=${encodeURIComponent(error)}`, req.url));
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL('/calendar?auth_error=missing_parameters', req.url));
    }

    try {
      const { tokens } = await oauth2Client.getToken(code);
      
      setUserTokens(state, {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date
      });

      console.log(`Stored tokens for user ${state} temporarily`);

      return NextResponse.redirect(new URL('/calendar?auth_success=true&calendar_connected=true', req.url));
    } catch (error) {
      console.error('Error handling Google OAuth callback:', error);
      return NextResponse.redirect(new URL(`/calendar?auth_error=${encodeURIComponent('token_exchange_failed')}`, req.url));
    }
  } catch (error) {
    console.error('Error in Google OAuth callback:', error);
    return NextResponse.redirect(new URL('/calendar?auth_error=callback_error', req.url));
  }
}
