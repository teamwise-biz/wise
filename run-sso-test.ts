import { authorize } from './src/main/auth';
import fetch from 'node-fetch';

async function testAuth() {
  console.log('Starting standalone Google SSO test...');
  try {
    const authClient = await authorize();
    
    const accessToken = authClient.credentials.access_token;
    if (!accessToken) {
       console.error('Google 로그인에서 인증 토큰(access_token)을 받지 못했습니다.');
       process.exit(1);
    }
    
    console.log(`Access Token acquired... length: ${accessToken.length}`);

    // Verify License on Next.js Backend
    const apiUrl = 'http://localhost:3000/api/verify-license';
    console.log(`Calling Next.js at ${apiUrl} ...`);
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken })
    });

    const result = await response.json();
    
    if (!result.success) {
      console.error('API Verification Failed:', result);
      process.exit(1);
    }

    console.log('✅ SSO Success! Details:', result);
  } catch (error) {
    console.error('### FATAL CRASH ###');
    console.error(error);
  }
}

testAuth();
