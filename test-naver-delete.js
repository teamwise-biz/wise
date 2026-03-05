const axios = require('axios');

async function getSmartStoreToken(clientId, clientSecret) {
    const timestamp = Date.now();
    const password = `${clientId}_${timestamp}`;
    const bcrypt = require('bcryptjs');
    const hashedPwd = bcrypt.hashSync(password, clientSecret);
    const encodedPwd = Buffer.from(hashedPwd, 'utf-8').toString('base64');
    
    const tokenUrl = 'https://api.commerce.naver.com/external/v1/oauth2/token';
    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('timestamp', timestamp.toString());
    params.append('grant_type', 'client_credentials');
    params.append('client_secret_sign', encodedPwd);
    params.append('type', 'SELF');
    
    const response = await axios.post(tokenUrl, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data.access_token;
}

async function run() {
    try {
        const token = await getSmartStoreToken('4aTjpvduCQkMgmJjioSzFK', '$2a$04$UNqs4AJrZASKpHqfUFGxOe');
        console.log('Got token');
        const res = await axios.get(`https://api.commerce.naver.com/external/v2/products/channel-products/13197603348`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log("Success?", res.data.channelProduct.statusType);
    } catch(e) {
        if(e.response) {
            console.log("Error status:", e.response.status, e.response.data);
        } else {
            console.log(e.message);
        }
    }
}
run();
