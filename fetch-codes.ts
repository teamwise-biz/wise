import axios from 'axios';
import { getSmartStoreToken } from './src/main/smartstore';
import * as fs from 'fs';

async function fetchCodes() {
    const credsStr = fs.readFileSync('c:\\wise\\creds2.json', 'utf8');
    const creds = JSON.parse(credsStr);
    const token = await getSmartStoreToken(creds);

    try {
        const response = await axios.get('https://api.commerce.naver.com/external/v1/product-origin-areas', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        fs.writeFileSync('origin-codes.json', JSON.stringify(response.data, null, 2));
        console.log("Success! Wrote origin-codes.json");
    } catch (e: any) {
        console.error(e.response?.data || e.message);
    }
}

fetchCodes();
