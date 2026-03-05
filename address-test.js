const axios = require('axios');
const bcrypt = require('bcryptjs');

async function getAddressId() {
    const clientId = '4aTjpvduCQkMgmJjioSzFK';
    const clientSecret = '$2a$04$UNqs4AJrZASKpHqfUFGxOe';
    const timestamp = Date.now();
    const plainText = `${clientId}_${timestamp}`;
    const rawSignature = bcrypt.hashSync(plainText, clientSecret);
    const signature = Buffer.from(rawSignature).toString('base64');

    let token;
    try {
        const tokenRes = await axios.post('https://api.commerce.naver.com/external/v1/oauth2/token', null, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            params: {
                client_id: clientId,
                timestamp: timestamp,
                grant_type: 'client_credentials',
                client_secret_sign: signature,
                type: 'SELF'
            }
        });
        token = tokenRes.data.access_token;
    } catch(e) {
        console.log("Token error", e.message);
        return;
    }

    try {
        console.log("Fetching address books using correct endpoint...");
        const res = await axios.get('https://api.commerce.naver.com/external/v1/seller/addressbooks-for-page', {      
            headers: { 'Authorization': `Bearer ${token}` },
            params: {
                page: 1,
                size: 10
            }
        });
        
        console.log("Addresses:");
        console.log(JSON.stringify(res.data, null, 2));

    } catch (e) {
        console.log("API error:", e.response ? JSON.stringify(e.response.data) : e.message);
    }
}

getAddressId();
