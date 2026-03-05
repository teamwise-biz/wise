const bcrypt = require('bcryptjs');
const axios = require('axios');

async function testNaverToken() {
    const clientId = '4aTjpvduCQkMgmJjioSzFK';
    const clientSecret = '$2a$04$UNqs4AJrZASKpHqfUFGxOe';
    const timestamp = Date.now();
    
    // Naver Docs say:
    // signature = bcrypt(clientId + "_" + timestamp, clientSecret)
    const plainText = `${clientId}_${timestamp}`;
    
    try {
        console.log('Generating signature...');
        const rawSignature = bcrypt.hashSync(plainText, clientSecret);
        const signature = Buffer.from(rawSignature).toString('base64');
        console.log('Signature:', signature);
        
        console.log('Requesting token...');
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
        
        console.log('Success!', response.data);
        
        console.log('Fetching orders...');
        const toKSTIsoString = (date) => {
            const kstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
            const iso = kstDate.toISOString(); 
            return iso.replace('Z', '+09:00');
        };

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 1); // Max 24 hours allowed by Naver API

        const kstStart = toKSTIsoString(startDate);
        const kstEnd = toKSTIsoString(endDate);
        console.log('lastChangedFrom:', kstStart);
        console.log('lastChangedTo:', kstEnd);

        const orderResponse = await axios.get('https://api.commerce.naver.com/external/v1/pay-order/seller/product-orders/last-changed-statuses', {
            headers: {
                'Authorization': `Bearer ${response.data.access_token}`
            },
            params: {
                lastChangedFrom: kstStart,
                lastChangedTo: kstEnd
            }
        });
        
        console.log('Orders:', orderResponse.data);
    } catch (err) {
        console.error('Failed:', err.response ? err.response.data : err.message);
    }
}

testNaverToken();
