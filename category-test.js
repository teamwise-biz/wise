const axios = require('axios');
const bcrypt = require('bcryptjs');

async function searchCategory(keyword) {
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
        // Find category ID by name
        // Unfortunately, Naver Commerce API doesn't have a direct keyword search for categories in the external API.
        // We usually have to fetch the whole tree or use standard categories.
        // Let's try standard API or check a known list.
        // Actually, Naver has `GET /external/v1/categories` to get standard categories
        
        console.log("Fetching all categories...");
        const res = await axios.get('https://api.commerce.naver.com/external/v1/categories', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        console.log("Total categories:", res.data.length);
        const matches = res.data.filter(c => c.name.includes('제거기') || c.name.includes('코털') || c.wholeCategoryName.includes('코털'));
        console.log("Found matches:");
        matches.forEach(m => {
            console.log(`ID: ${m.id} | Name: ${m.name} | Path: ${m.wholeCategoryName} | IsLeaf: ${m.last}`);
        });

    } catch (e) {
        console.log("API error:", e.response ? JSON.stringify(e.response.data) : e.message);
    }
}

searchCategory('코털제거기');
