import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { code } = await req.json();

    if (!code) {
      return NextResponse.json({ error: 'Authorization code is required' }, { status: 400 });
    }

    // Build redirect_uri dynamically so localhost uses local callback
    const origin = req.headers.get('origin') || new URL(req.url).origin;
    const isLocal = origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1') || origin.startsWith('http://192.168.') || origin.startsWith('http://10.');
    const redirectUri = isLocal
      ? `${origin}/auth/callback`
      : (process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI || 'https://sortie-upload.vercel.app/auth/callback');

    // Exchange authorization code for access token
    const tokenParams = {
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    };
    
    console.log('=== TOKEN EXCHANGE DEBUG ===');
    console.log('Token params:', { ...tokenParams, client_secret: '***hidden***' });
    console.log('Redirect URI:', tokenParams.redirect_uri);
    
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(tokenParams),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Token exchange error:', errorData);
      return NextResponse.json(
        { error: 'Failed to exchange authorization code for token' },
        { status: 400 }
      );
    }

    const tokenData = await tokenResponse.json();

    return NextResponse.json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
      token_type: tokenData.token_type,
    });
  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json(
      { error: 'Internal server error during authentication' },
      { status: 500 }
    );
  }
}
