const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const bcrypt = require('bcryptjs');

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

async function testImageUpload() {
    const clientId = '4aTjpvduCQkMgmJjioSzFK';
    const clientSecret = '$2a$04$UNqs4AJrZASKpHqfUFGxOe';

    try {
        console.log('Authenticating...');
        const token = await getSmartStoreToken({ clientId, clientSecret });
        console.log('Got Token length', token.length);

        // Create a dummy image file for testing
        const imagePath = path.join(__dirname, 'test-image.jpg');
        // A minimal 1x1 jpeg hex string
        const jpegBuffer = Buffer.from('ffd8ffe000104a46494600010101004800480000ffdb004300080606070605080707070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c231c1c2837292c30313434341f27393d38323c2e333432ffdb0043010909090c0b0c180d0d1832211c213232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232ffc00011080001000103012200021101031101ffc4001f0000010501010101010100000000000000000102030405060708090a0bffc400b5100002010303020403050504040000017d01020300041105122131410613516107227114328191a1082342b1c11552d1f02433627282090a161718191a25262728292a3435363738393a434445464748494a535455565758595a636465666768696a737475767778797a838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae1e2e3e4e5e6e7e8e9eaf1f2f3f4f5f6f7f8f9faffc4001f0100030101010101010101010000000000000102030405060708090a0bffc400b51100020102040403040705040400010277000102031104052131061241510761711322328108144291a1b1c109233352f0156272d10a162434e125f11718191a262728292a35363738393a434445464748494a535455565758595a636465666768696a737475767778797a82838485868788898a92939495969798999aa2a3a4a5a6a7a8a9aab2b3b4b5b6b7b8b9bac2c3c4c5c6c7c8c9cad2d3d4d5d6d7d8d9dae2e3e4e5e6e7e8e9eaf2f3f4f5f6f7f8f9faffda000c03010002110311003f00f928a28afcffd9', 'hex');
        fs.writeFileSync(imagePath, jpegBuffer);

        const formData = new FormData();
        formData.append('imageFiles', fs.createReadStream(imagePath));

        console.log('Uploading image to Naver Commerce API...');
        const response = await axios.post('https://api.commerce.naver.com/external/v1/product-images/upload', formData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                ...formData.getHeaders()
            }
        });

        console.log('Success! Image uploaded:');
        console.log(JSON.stringify(response.data, null, 2));

    } catch (err) {
        console.error('Failed Image Upload:');
        console.error(err.response ? JSON.stringify(err.response.data, null, 2) : err.message);
    }
}

testImageUpload();
