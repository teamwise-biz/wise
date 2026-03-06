import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const { mallId } = await request.json();

    if (!mallId) {
      return NextResponse.json({ error: 'Missing mallId' }, { status: 400 });
    }

    const supabase = await createClient();
    
    // 1. Retrieve stored tokens from Supabase
    const { data: credentials, error: dbError } = await supabase
      .from('market_credentials')
      .select('*')
      .eq('market_type', 'cafe24')
      .eq('mall_id', mallId)
      .single();

    if (dbError || !credentials || !credentials.access_token) {
      console.error('Credentials not found in DB:', dbError);
      return NextResponse.json({ error: 'OAuth credentials not found. Please connect Cafe24 again.' }, { status: 404 });
    }

    // 2. Check if Access Token is expired or expiring soon (e.g., within 5 minutes)
    const now = new Date().toISOString();
    const expiresAt = credentials.access_expires_at;

    if (expiresAt && new Date(now).getTime() > new Date(expiresAt).getTime() - 300000) {
      // Token is expired or expiring soon, need to refresh it
      console.log(`Access token for mall ${mallId} is expired/expiring, refreshing...`);

      const clientId = process.env.CAFE24_CLIENT_ID;
      const clientSecret = process.env.CAFE24_CLIENT_SECRET;

      if (!clientId || !clientSecret || !credentials.refresh_token) {
        return NextResponse.json({ error: 'Cannot refresh token due to missing client credentials or refresh token.' }, { status: 500 });
      }

      const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      
      const refreshResponse = await fetch(`https://${mallId}.cafe24api.com/api/v2/oauth/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: credentials.refresh_token
        })
      });

      if (!refreshResponse.ok) {
        console.error('Failed to refresh token:', await refreshResponse.text());
        return NextResponse.json({ error: 'Token refresh failed' }, { status: refreshResponse.status });
      }

      const tokenData = await refreshResponse.json();
      const newAccessToken = tokenData.access_token;
      // Some APIs return a new refresh token, some don't. Keep the old one if not provided.
      const newRefreshToken = tokenData.refresh_token || credentials.refresh_token; 
      
      // Update DB with new tokens
      const { error: updateError } = await supabase
        .from('market_credentials')
        .update({
          access_token: newAccessToken,
          refresh_token: newRefreshToken,
          access_expires_at: tokenData.expires_at,
          refresh_expires_at: tokenData.refresh_token_expires_at || credentials.refresh_expires_at,
          updated_at: new Date().toISOString()
        })
        .eq('id', credentials.id);

      if (updateError) {
        console.error('Failed to update refreshed tokens in DB:', updateError);
        // We still return the token so the app can function immediately
      }

      return NextResponse.json({ success: true, access_token: newAccessToken, source: 'refreshed' });
    }

    // 3. Return the valid Access Token
    return NextResponse.json({ success: true, access_token: credentials.access_token, source: 'cache' });

  } catch (error: any) {
    console.error('Cafe24 token fetch/refresh error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
