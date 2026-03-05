const axios = require('axios');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const FormData = require('form-data');

async function testImageUpload() {
    console.log("Starting test...");
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
        console.log("Token acquired.");
    } catch(e) {
        console.log("Token error", e.message);
        return;
    }

    const imageUrl = "https://dmtusr.vipweb.kr/goods_img/1/2023/09/183521/1_7116view.jpg";
    let buffer;
    try {
        console.log("Downloading image...");
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        });
        buffer = Buffer.from(response.data, 'binary');
        console.log("Downloaded bytes:", buffer.length);
    } catch (e) {
        console.log("Download error:", e.message);
        return;
    }

    try {
        console.log("Uploading to Naver...");
        const formData = new FormData();
        formData.append('imageFiles', buffer, { filename: 'scraped_image.jpg', contentType: 'image/jpeg' });

        const uploadResponse = await axios.post('https://api.commerce.naver.com/external/v1/product-images/upload', formData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                ...formData.getHeaders()
            }
        });

        console.log("Upload Success:", uploadResponse.data);
    } catch (e) {
        console.log("Upload error:", e.message);
        if (e.response) console.log(JSON.stringify(e.response.data));
    }
}
testImageUpload();
