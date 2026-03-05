const axios = require('axios');
const bcrypt = require('bcryptjs');

async function testCategoryApi() {
    try {
        const clientId = '4aTjpvduCQkMgmJjioSzFK';
        const clientSecret = '$2a$04$UNqs4AJrZASKpHqfUFGxOe';
        
        const timestamp = Date.now();
        const password = clientId + '_' + timestamp;
        const hashed = bcrypt.hashSync(password, clientSecret);
        const signature = Buffer.from(hashed).toString('base64');
        
        const tokenRes = await axios.post('https://api.commerce.naver.com/external/v1/oauth2/token', {
            client_id: clientId,
            timestamp: timestamp,
            client_secret_sign: signature,
            grant_type: 'client_credentials',
            type: 'SELF'
        }, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        
        const token = tokenRes.data.access_token;
        console.log('Got token');
        
        // Try to fetch categories
        const catRes = await axios.get('https://api.commerce.naver.com/external/v1/categories', {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('Success:', catRes.data.slice(0, 5));
    } catch (e) {
        if (e.response && e.response.status === 404) {
             console.log('Endpoint not found. Trying /external/v1/product-categories or standard-categories');
        } else {
             console.log('Error:', e.response ? e.response.data : e.message);
        }
    }
}

testCategoryApi();
