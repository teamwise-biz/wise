import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

async function testFetchEmail() {
  try {
    const tokenPath = path.join(process.env.APPDATA || '', 'wise', 'token.json');
    const tokenStr = fs.readFileSync(tokenPath, 'utf-8');
    const token = JSON.parse(tokenStr);
    const accessToken = token.access_token;
    
    console.log('Got Access Token:', accessToken?.substring(0, 10) + '...');

    console.log('\n--- Testing Drive API ---');
    const driveRes = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    console.log('Drive Status:', driveRes.status);
    console.log('Drive Body:', await driveRes.text());

    console.log('\n--- Testing People API ---');
    const peopleRes = await fetch('https://people.googleapis.com/v1/people/me?personFields=emailAddresses', {
        headers: { Authorization: `Bearer ${accessToken}` }
    });
    console.log('People Status:', peopleRes.status);
    console.log('People Body:', await peopleRes.text());

  } catch (error) {
    console.error('Error:', error);
  }
}
testFetchEmail();
