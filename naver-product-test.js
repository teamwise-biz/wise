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

async function testProductRegistration() {
    const clientId = '4aTjpvduCQkMgmJjioSzFK';
    const clientSecret = '$2a$04$UNqs4AJrZASKpHqfUFGxOe';

    try {
        console.log('Authenticating...');
        const token = await getSmartStoreToken({ clientId, clientSecret });
        console.log('Got Token length', token.length);

        // Required minimal payload structure
        const productPayload = {
            "originProduct": {
                "statusType": "SALE",
                "saleType": "NEW",
                "leafCategoryId": "50004393", // Valid leaf category ID
                "name": "[테스트] 마켓 연동 솔루션 샘플 상품",
                "detailContent": "이 상품은 API를 연동하여 등록된 테스트 상품입니다. <br>구매하지 마세요.",
                "images": {
                    "representativeImage": {
                        "url": "https://shop-phinf.pstatic.net/20260226_122/1772089594291lHCCX_JPEG/14342023430493414_1072606682.jpg"
                    }
                },
                "salePrice": 10000,
                "stockQuantity": 100,
                "deliveryInfo": {
                    "deliveryType": "DELIVERY",
                    "deliveryAttributeType": "NORMAL",
                    "deliveryCompany": "CJGLS",
                    "deliveryFee": {
                        "deliveryFeeType": "FREE"
                    },
                    "claimDeliveryInfo": {
                        "returnDeliveryCompanyPriorityType": "PRIMARY",
                        "returnDeliveryFee": 3000,
                        "exchangeDeliveryFee": 6000,
                        "shippingAddressId": 200245413,
                        "returnAddressId": 200245414
                    }
                },
                "detailAttribute": {
                    "naverShoppingSearchInfo": {
                        "manufacturerName": "자체제작",
                        "brandName": "자체브랜드"
                    },
                    "afterServiceInfo": {
                        "afterServiceTelephoneNumber": "010-0000-0000",
                        "afterServiceGuideContent": "API 연동 안내"
                    },
                    "originAreaInfo": {
                        "originAreaCode": "04",
                        "importer": "수입자",
                        "manufacturer": "제조자",
                        "content": "아시아/중국"
                    },
                    "productInfoProvidedNotice": {
                        "productInfoProvidedNoticeType": "ETC",
                        "etc": {
                            "returnCostReason": "상세페이지 참조",
                            "noRefundReason": "상세페이지 참조",
                            "qualityAssuranceStandard": "상세페이지 참조",
                            "compensationProcedure": "상세페이지 참조",
                            "troubleShootingContents": "상세페이지 참조",
                            "itemName": "상세페이지 참조",
                            "modelName": "상세페이지 참조",
                            "manufacturer": "상세페이지 참조",
                            "afterServiceDirector": "010-0000-0000"
                        }
                    },
                    "sellerCodeInfo": {
                        "sellerManagementCode": "TEST-SKU-001"
                    },
                    "minorPurchasable": true // Allow minors to purchase
                }
            },
            "smartstoreChannelProduct": {
                "naverShoppingIsForcedDisplay": true,
                "channelProductDisplayStatusType": "ON",
                "naverShoppingRegistration": true
            }
        };

        console.log('Registering product...');
        const response = await axios.post('https://api.commerce.naver.com/external/v2/products', productPayload, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Success! Product registered:', response.data);

    } catch (err) {
        console.error('Failed Product Registration:');
        console.error(err.response ? JSON.stringify(err.response.data, null, 2) : err.message);
    }
}

testProductRegistration();
