const bcrypt = require('bcryptjs');
const axios = require('axios');

async function getProducts() {
    const clientId = '4aTjpvduCQkMgmJjioSzFK';
    const clientSecret = '$2a$04$UNqs4AJrZASKpHqfUFGxOe';
    
    // 1. Get Token
    const timestamp = Date.now();
    const plainText = `${clientId}_${timestamp}`;
    const rawSignature = bcrypt.hashSync(plainText, clientSecret);
    const signature = Buffer.from(rawSignature).toString('base64');

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
        const token = tokenRes.data.access_token;
        
        // 2. Fetch Products
        const prodRes = await axios.post('https://api.commerce.naver.com/external/v2/products/search', {
            page: 1,
            size: 5
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log("Products found:", prodRes.data.originProductElements ? prodRes.data.originProductElements.length : 0);
        
        if (prodRes.data.originProductElements && prodRes.data.originProductElements.length > 0) {
            for (let prod of prodRes.data.originProductElements) {
                const claimInfo = prod.deliveryInfo && prod.deliveryInfo.claimDeliveryInfo;
                if (claimInfo) {
                    console.log("Found Shipping Address ID:", claimInfo.shippingAddressId);
                    console.log("Found Return Address ID:", claimInfo.returnAddressId);
                } else {
                    console.log("No claimDeliveryInfo in prod", prod.name);
                    console.log(JSON.stringify(prod.deliveryInfo, null, 2));
                }
            }
        } else {
            console.log("Full Response:", JSON.stringify(prodRes.data, null, 2));
        }

    } catch (e) {
        console.error("Error:", e.response ? JSON.stringify(e.response.data, null, 2) : e.message);
    }
}

getProducts();
