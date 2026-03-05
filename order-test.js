const bcrypt = require('bcryptjs');
const axios = require('axios');

async function getSmartStoreToken(credentials) {
    const { clientId, clientSecret } = credentials;
    const timestamp = Date.now();
    const plainText = `${clientId}_${timestamp}`;
    const rawSignature = bcrypt.hashSync(plainText, clientSecret);
    const signature = Buffer.from(rawSignature).toString('base64');

    const response = await axios.post('https://api.commerce.naver.com/external/v1/oauth2/token', null, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        params: {
            client_id: clientId,
            timestamp: timestamp,
            grant_type: 'client_credentials',
            client_secret_sign: signature,
            type: 'SELF'
        }
    });

    return response.data.access_token;
}

const toKSTIsoString = (date) => {
    const kstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
    const iso = kstDate.toISOString(); 
    return iso.replace('Z', '+09:00');
};

async function testFetchOrders() {
    const clientId = '4aTjpvduCQkMgmJjioSzFK';
    const clientSecret = '$2a$04$UNqs4AJrZASKpHqfUFGxOe';

    try {
        console.log('Authenticating...');
        const token = await getSmartStoreToken({ clientId, clientSecret });
        console.log('Got Token length', token.length);

        console.log('Fetching orders from the last 1 days...');
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 1); // API limit is 24 hours

        const response = await axios.get('https://api.commerce.naver.com/external/v1/pay-order/seller/product-orders/last-changed-statuses', {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            params: {
                lastChangedFrom: toKSTIsoString(startDate),
                lastChangedTo: toKSTIsoString(endDate)
            }
        });

        console.log('Success! Orders fetched.');
        
        if (response.data && response.data.data && Array.isArray(response.data.data.lastChangeStatuses)) {
             console.log(`Found ${response.data.data.lastChangeStatuses.length} order changes.`);
             console.log(JSON.stringify(response.data.data.lastChangeStatuses.slice(0, 2), null, 2));
        } else {
             console.log('Raw Output:', JSON.stringify(response.data, null, 2));
        }

    } catch (err) {
        console.error('Failed fetching orders:');
        console.error(err.response ? JSON.stringify(err.response.data, null, 2) : err.message);
    }
}

testFetchOrders();
