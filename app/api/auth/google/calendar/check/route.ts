import { NextRequest, NextResponse } from 'next/server';
import { authClient } from '../../../../../lib/auth-client';

export async function GET(request: NextRequest) {
  try {
    const session = await authClient.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if user has Google calendar access
    // This would typically check your database for stored access tokens
    // For now, we'll return a mock response
    return NextResponse.json({ 
      hasAccess: false,
      message: 'Google Calendar access not configured yet'
    });

  } catch (error) {
    console.error('Error checking Google authorization:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
