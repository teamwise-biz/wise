import { NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { createClient } from '@supabase/supabase-js';

// The Desktop Application's Google OAuth Client ID
const DESKTOP_CLIENT_ID = '439781948006-uun33gogqmfnklmpkf35u1d4higre6qr.apps.googleusercontent.com';
const client = new OAuth2Client(DESKTOP_CLIENT_ID);

// We no longer need google-auth-library for ID Tokens, we use raw fetch for Access Tokens
export async function POST(request: Request) {
  try {
    const { accessToken } = await request.json();

    if (!accessToken) {
      return NextResponse.json({ success: false, error: 'Google 인증 토큰이 제공되지 않았습니다.' }, { status: 400 });
    }

    // 1. Get User Info from Google using the Access Token
    let email: string;
    try {
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!userInfoResponse.ok) {
        throw new Error(`Failed to fetch user profile. Status: ${userInfoResponse.status}`);
      }

      const userInfo = await userInfoResponse.json();
      email = userInfo.email;

      if (!email) {
        throw new Error('Email not found in Google user info');
      }
    } catch (verifyError: any) {
      console.error('Google token verification failed:', verifyError.message);
      return NextResponse.json({ success: false, error: `구글 인증 에러: ${verifyError.message}` }, { status: 401 });
    }

    // 2. Query Supabase using Service Role Key to bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase Environment Variables');
      return NextResponse.json({ success: false, error: '서버 설정 오류입니다. 관리자에게 문의하세요.' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // 2a. Find the user's profile ID by email
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (profileError || !profile) {
      console.log(`User profile not found for email: ${email}`);
      return NextResponse.json({ 
        success: false, 
        error: `[${email}] 웹사이트 가입 이력이 없습니다. 먼저 웹사이트(WISE)에 가입하고 요금제를 선택해 주세요.` 
      }, { status: 403 });
    }

    // 2b. Check the user's active subscription status
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('subscriptions')
      .select('status, plan_id')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (subError || !subscription) {
      console.error('Subscription Query Error:', subError);
      return NextResponse.json({ 
        success: false, 
        error: '라이선스 결제 내역을 찾을 수 없습니다. 웹사이트에서 구독을 완료해 주세요.' 
      }, { status: 403 });
    }

    const { status, plan_id } = subscription;
    // Allow if status is 'active', 'trial', 'trialing', or if the plan_id implies a trial
    const isValid = status === 'active' || status === 'trial' || status === 'trialing' || plan_id?.includes('trial');

    if (!isValid) {
      return NextResponse.json({ 
        success: false, 
        error: `현재 구독 상태(${status})로는 데스크톱 앱을 이용할 수 없습니다. 요금제를 갱신해 주세요.` 
      }, { status: 403 });
    }

    // 3. Return Success to Desktop
    return NextResponse.json({
      success: true,
      email: email,
      tier: plan_id,
      message: '라이선스 확인 성공',
    });

  } catch (error: any) {
    console.error('License verification API error:', error);
    return NextResponse.json({ success: false, error: '서버 내부 오류가 발생했습니다.' }, { status: 500 });
  }
}
