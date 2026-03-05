import { getSmartStoreToken } from './src/main/smartstore';
import axios from 'axios';

async function testUpdateImageURL() {
    const credentials = {
        clientId: '4aTjpvduCQkMgmJjioSzFK',
        clientSecret: '$2a$04$UNqs4AJrZASKpHqfUFGxOe'
    };
    const channelProductNo = '13197479037';
    const token = await getSmartStoreToken(credentials);

    // Get the proper category first
    let leafCategoryId;
    try {
        const getRes = await axios.get(`https://api.commerce.naver.com/external/v2/products/channel-products/${channelProductNo}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        leafCategoryId = getRes.data?.originProduct?.leafCategoryId;
        console.log('Fetched Leaf Category ID:', leafCategoryId);
    } catch (e:any) {
        console.error('Failed to fetch:', e.message);
        return;
    }

    // Try to update using a Raw Dometopia Image URL
    const productPayload = {
        "originProduct": {
            "statusType": "SALE",
            "saleType": "NEW",
            "leafCategoryId": leafCategoryId,
            "name": "매너굿즈 코털제거기 (수정테스트 2)",
            "detailContent": "<p>Test</p>",
            "images": {
                // Testing an external direct URL
                "representativeImage": { "url": "http://dometopia.com/data/goods/1/2025/11/1236045620_m.jpg" }
            },
            "salePrice": 2860,
            "stockQuantity": 100,
            "deliveryInfo": {
                "deliveryType": "DELIVERY",
                "deliveryAttributeType": "NORMAL",
                "deliveryCompany": "CJGLS",
                "deliveryFee": { "deliveryFeeType": "FREE" },
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
                "returnInfo": {
                    "deliveryCompany": "CJGLS",
                    "returnZipCode": "12345",
                    "returnAddress": "상세설정 참조",
                    "returnAddressDetail": "상세설정 참조",
                    "returnCharge": 3000,
                    "exchangeCharge": 6000,
                    "returnPhoneNumber": "010-0000-0000"
                },
                "originAreaInfo": {
                    "originAreaCode": "04",
                    "importer": "테스트수입자",
                    "manufacturer": "테스트제조자",
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
                "minorPurchasable": true
            }
        },
        "smartstoreChannelProduct": {
            "channelProductDisplayStatusType": "ON",
            "naverShoppingIsForcedDisplay": true,
            "naverShoppingRegistration": true
        }
    };

    try {
        console.log('Sending Update Request with external image...');
        const response = await axios.put(`https://api.commerce.naver.com/external/v2/products/channel-products/${channelProductNo}`, productPayload, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        console.log('Update Success:', response.data);
    } catch (error: any) {
        if (error.response?.data?.invalidInputs) {
            console.error('Validation Errors:', JSON.stringify(error.response.data.invalidInputs, null, 2));
        } else {
            console.error('Update Failed:', JSON.stringify(error.response?.data) || error.message);
        }
    }
}

testUpdateImageURL();
