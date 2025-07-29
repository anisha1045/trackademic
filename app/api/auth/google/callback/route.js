import { NextResponse } from 'next/server';
import { getTokensFromCode, storeUserTokens } from '../../../../../lib/googleService';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state'); 
    const error = searchParams.get('error');

    if (error) {
      return NextResponse.redirect(new URL(`/dashboard?auth_error=${encodeURIComponent(error)}`, req.url));
    }

    if (!code || !state) {
      return NextResponse.redirect(new URL('/dashboard?auth_error=missing_parameters', req.url));
    }

    try {
      const tokens = await getTokensFromCode(code);
            await storeUserTokens(state, tokens);
      return NextResponse.redirect(new URL('/dashboard?auth_success=true&calendar_connected=true', req.url));
    } catch (error) {
      console.error('Error handling Google OAuth callback:', error);
      return NextResponse.redirect(new URL(`/dashboard?auth_error=${encodeURIComponent('token_exchange_failed')}`, req.url));
    }
  } catch (error) {
    console.error('Error in Google OAuth callback:', error);
    return NextResponse.redirect(new URL('/dashboard?auth_error=callback_error', req.url));
  }
}
