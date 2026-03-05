import axios from 'axios';
import FormData from 'form-data';
import * as bcrypt from 'bcryptjs';

interface SmartStoreCredentials {
    clientId: string;
    clientSecret: string;
}

interface TokenResponse {
    access_token: string;
    expires_in: number;
    token_type: string;
}

let accessToken: string | null = null;
let tokenExpiresAt: number = 0;

// 카테고리 목록 메모리 캐싱용 변수
let cachedCategories: any[] | null = null;

export async function getSmartStoreToken(credentials: SmartStoreCredentials): Promise<string> {
    const now = Date.now();
    // Return cached token if valid (with 60sec buffer)
    if (accessToken && tokenExpiresAt > now + 60000) {
        return accessToken;
    }

    const { clientId, clientSecret } = credentials;
    const timestamp = Date.now();
    
    // Naver Commerce API Authentication Signature
    // bcrypt(clientId_timestamp, clientSecret)
    // Note: Naver requires a very specific bcrypt-like signature generation.
    // However, the official guide states we can use a simpler token generation:
    // Signature = Base64( HMAC_SHA256( client_id + "_" + timestamp, client_secret ) )
    // Actually, Naver Commerce API uses bcrypt for the client_secret signature, 
    // but the Node.js standard way to generate the token for Naver Commerce is:
    
    // We will use standard bcrypt for the signature as required by Naver Commerce API
    
    // we need to install bcryptjs since native bcrypt can cause electron build issues
    
    const plainText = `${clientId}_${timestamp}`;
    const rawSignature = bcrypt.hashSync(plainText, clientSecret);
    const signature = Buffer.from(rawSignature).toString('base64');

    try {
        const response = await axios.post<TokenResponse>('https://api.commerce.naver.com/external/v1/oauth2/token', null, {
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

        accessToken = response.data.access_token;
        // Expires_in is in seconds
        tokenExpiresAt = now + (response.data.expires_in * 1000);
        return accessToken;
    } catch (error: any) {
        const errorMessage = error.response?.data?.message || error.message;
        throw new Error(`Naver Commerce API Token Generation Failed: ${errorMessage}`);
    }
}

interface OrderChangeStatus {
    productOrderId: string;
    productOrderStatus: string;
    claimType: string;
    claimStatus: string;
    lastChangedDate: string;
}

export async function fetchSmartStoreOrders(credentials: SmartStoreCredentials) {
    const token = await getSmartStoreToken(credentials);
    
    const toKSTIsoString = (date: Date): string => {
        const kstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
        const iso = kstDate.toISOString(); 
        return iso.replace('Z', '+09:00');
    };

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 1); // API limit is 24 hours

    try {
        // Step 1: Changed Statuses 조회
        const response = await axios.get('https://api.commerce.naver.com/external/v1/pay-order/seller/product-orders/last-changed-statuses', {
            headers: { 'Authorization': `Bearer ${token}` },
            params: {
                lastChangedFrom: toKSTIsoString(startDate),
                lastChangedTo: toKSTIsoString(endDate),
                // lastChangedType: 'PAYED' // 옵션: 신규 결제완료 내역만 원할 경우
            }
        });

        const changes: OrderChangeStatus[] = response.data?.data?.lastChangeStatuses || [];
        
        // 결제완료(PAYED) 혹은 신규 접수건만 필터링 (필요시 제거 가능, 여기선 모두 가져오되 테스트용으로 둠)
        const relevantOrderIds = changes.map(c => c.productOrderId);

        if (relevantOrderIds.length === 0) {
            return []; // 변경된 주문이 없음
        }

        // Step 2: Product Order Query 로 상세 조회
        return await fetchSmartStoreOrderDetails(token, relevantOrderIds);

    } catch (error: any) {
         let errorMessage = error.message;
         if (error.response && error.response.data) {
             errorMessage = JSON.stringify(error.response.data);
         } else if (error.response && error.response.statusText) {
             errorMessage = `${error.response.status} - ${error.response.statusText}`;
         }
         throw new Error(`[SmartStore API 에러] 신규 주문 조회 실패: ${errorMessage}`);
    }
}

async function fetchSmartStoreOrderDetails(token: string, productOrderIds: string[]) {
    try {
        const response = await axios.post('https://api.commerce.naver.com/external/v1/pay-order/seller/product-orders/query', 
        {
            productOrderIds: productOrderIds
        },
        {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        // 응답 데이터에서 의미있는 데이터(시트에 넣을 배열 형태)를 추출
        const details = response.data?.data || [];
        const formattedOrders = details.map((d: any) => {
            const p = d.productOrder;
            const s = d.shippingAddress;
            return [
                p.paymentDate || p.orderDate,   // 주문일시
                p.productOrderId,               // 주문번호(상품주문번호)
                p.productName,                  // 상품명
                p.productOption || '단품',        // 옵션
                p.quantity?.toString() || '1',  // 수량
                s?.name || '알수없음',              // 수취인
                s?.baseAddress + ' ' + (s?.detailedAddress || ''), // 주소
                s?.tel1 || s?.tel2 || '',       // 연락처
                p.totalPaymentAmount?.toString() || '0', // 결제금액
                p.productOrderStatus            // 주문상태 (PAYED, DISPATCHED 등)
            ];
        });

        return formattedOrders;
    } catch (error: any) {
         const errorMessage = error.response?.data?.message || error.message;
         throw new Error(`SmartStore Order Details Fetch Failed: ${errorMessage}`);
    }
}

function getProductInfoProvidedNotice(_categoryId: string) {
    // 상품 카테고리에 따른 고시정보 템플릿 반환
    // PoC 단계이므로 현재는 '기타(ETC)'로 통일. 향후 categoryId에 따라 의류/가전 등으로 분기 가능
    return {
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
    };
}

export async function registerSmartStoreProduct(credentials: SmartStoreCredentials, productData: string[]) {
    // productData is an array of strings representing a single row from the Google Sheet
    // Expected format based on App.tsx template:
    // [0] 카테고리ID(A)
    // [1] 상품명(B)
    // [2] 상세설명(C)
    // [3] 대표이미지 URL(D)
    // [4] 판매가(E)
    // [5] 재고수량(F)
    // [6] 스마트스토어 상품번호(G)
    // [7] 출고지주소ID(H) - Optional
    // [8] 반품지주소ID(I) - Optional
    // [9] A/S전화번호(J) - Optional

    if (productData.length < 6) {
        throw new Error("Missing required product data columns in the row.");
    }

    const token = await getSmartStoreToken(credentials);

    const categoryId = productData[0];
    const name = productData[1];
    const detailContent = productData[2];
    const imageUrl = productData[3];
    const salePrice = parseInt(productData[4], 10);
    const stockQuantity = parseInt(productData[5], 10);
    
    // Fallback logic for optional values
    // 실제 운영 시에는 기본값을 사용자 설정이나 DB에서 가져오도록 변경 필요
    // 200245413: 상품출고지, 200245414: 반품교환지 (addressbooks-for-page API 조회 결과 적용)
    const shippingAddressId = productData[7] ? parseInt(productData[7], 10) : 200245413;
    const returnAddressId = productData[8] ? parseInt(productData[8], 10) : 200245414;
    const asPhoneNumber = productData[9] || "010-0000-0000";

    // --- New Metadata Logic ---
    const manufacturerName = productData[12] || "자체제작";
    const originName = productData[13] || "아시아/중국";
    const modelName = productData[15] || "";

    const isDomestic = originName.includes('한국') || originName.includes('국산') || originName.includes('대한민국');
    const isChina = originName.includes('중국');
    const originAreaCode = isDomestic ? "00" : (isChina ? "0204000" : "04");

    // --- Delivery Fee Logic ---
    const baseDeliveryFee = productData[10] ? parseInt(productData[10], 10) : 0;
    const freeConditionAmount = productData[11] ? parseInt(productData[11], 10) : 0;
    
    let deliveryFeeObject: any = {
        "deliveryFeeType": "FREE"
    };

    if (baseDeliveryFee > 0) {
        if (freeConditionAmount > 0) {
            deliveryFeeObject = {
                "deliveryFeeType": "CONDITIONAL_FREE",
                "baseFee": baseDeliveryFee,
                "freeConditionalAmount": freeConditionAmount,
                "deliveryFeePayType": "PREPAID"
            };
        } else {
            deliveryFeeObject = {
                "deliveryFeeType": "PAID",
                "baseFee": baseDeliveryFee,
                "deliveryFeePayType": "PREPAID"
            };
        }
    }

    const productInfoProvidedNotice = getProductInfoProvidedNotice(categoryId);
    productInfoProvidedNotice.etc.afterServiceDirector = asPhoneNumber;
    productInfoProvidedNotice.etc.manufacturer = manufacturerName;

    const productPayload = {
        "originProduct": {
            "statusType": "SALE",
            "saleType": "NEW",
            "leafCategoryId": categoryId,
            "name": name,
            "detailContent": detailContent,
            "images": {
                "representativeImage": {
                    "url": imageUrl
                }
            },
            "salePrice": salePrice,
            "stockQuantity": stockQuantity,
            "deliveryInfo": {
                "deliveryType": "DELIVERY",
                "deliveryAttributeType": "NORMAL",
                "deliveryCompany": "CJGLS",
                "deliveryFee": deliveryFeeObject,
                "claimDeliveryInfo": {
                    "returnDeliveryCompanyPriorityType": "PRIMARY",
                    "returnDeliveryFee": 3000,
                    "exchangeDeliveryFee": 6000,
                    "shippingAddressId": shippingAddressId,
                    "returnAddressId": returnAddressId
                }
            },
            "detailAttribute": {
                "naverShoppingSearchInfo": {
                    "manufacturerName": manufacturerName,
                    "brandName": manufacturerName, // Dometopia usually lacks strict brand names, so fallback to maker
                    "modelName": modelName
                },
                "afterServiceInfo": {
                    "afterServiceTelephoneNumber": asPhoneNumber,
                    "afterServiceGuideContent": "API 연동 안내"
                },
                "returnInfo": {
                    "deliveryCompany": "CJGLS",
                    "returnZipCode": "12345",
                    "returnAddress": "상세설정 참조", // 실제 주소 설정은 반품지주소ID에 종속적이라 API에서 무시되거나 자동 매핑될 수 있음
                    "returnAddressDetail": "상세설정 참조",
                    "returnCharge": 3000,
                    "exchangeCharge": 6000,
                    "returnPhoneNumber": asPhoneNumber
                },
                "originAreaInfo": {
                    "originAreaCode": originAreaCode,
                    "importer": isDomestic ? "" : manufacturerName,
                    "manufacturer": manufacturerName,
                    "content": originName
                },
                "productInfoProvidedNotice": productInfoProvidedNotice,
                "sellerCodeInfo": {
                    "sellerManagementCode": `SKU-${Date.now()}` // Dynamic pseudo-SKU for testing
                },
                "minorPurchasable": true
            }
        },
        "smartstoreChannelProduct": {
            "naverShoppingIsForcedDisplay": true,
            "channelProductDisplayStatusType": "ON",
            "naverShoppingRegistration": true
        }
    };

    try {
        const response = await axios.post('https://api.commerce.naver.com/external/v2/products', productPayload, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        // SmartStore returns smartstoreChannelProductNo upon successful registration
        return {
             channelProductNo: response.data.smartstoreChannelProductNo,
             originProductNo: response.data.originProductNo
        };
    } catch (error: any) {
         let errorMessage = error.message;
         if (error.response && error.response.data) {
             errorMessage = JSON.stringify(error.response.data);
         } else if (error.response && error.response.statusText) {
             errorMessage = `${error.response.status} - ${error.response.statusText}`;
         }
         throw new Error(`[SmartStore API 에러] 상품 등록 실패: ${errorMessage}`);
    }
}

export async function updateSmartStoreProduct(credentials: SmartStoreCredentials, channelProductNo: string, productData: string[]) {
    // 상품 수정 시에도 필수 칼럼 동일하게 사용
    if (productData.length < 6) {
        throw new Error("Missing required product data columns in the row.");
    }

    const token = await getSmartStoreToken(credentials);

    const categoryId = productData[0];
    const name = productData[1];
    const detailContent = productData[2];
    const imageUrl = productData[3];
    const salePrice = parseInt(productData[4], 10);
    const stockQuantity = parseInt(productData[5], 10);
    
    // Fallback logic for optional values
    const shippingAddressId = productData[7] ? parseInt(productData[7], 10) : 200245413;
    const returnAddressId = productData[8] ? parseInt(productData[8], 10) : 200245414;
    const asPhoneNumber = productData[9] || "010-0000-0000";

    // --- New Metadata Logic ---
    const manufacturerName = productData[12] || "자체제작";
    const originName = productData[13] || "아시아/중국";
    const modelName = productData[15] || "";

    const isDomestic = originName.includes('한국') || originName.includes('국산') || originName.includes('대한민국');
    const isChina = originName.includes('중국');
    const originAreaCode = isDomestic ? "00" : (isChina ? "0204000" : "04");

    // --- Delivery Fee Logic ---
    const baseDeliveryFee = productData[10] ? parseInt(productData[10], 10) : 0;
    const freeConditionAmount = productData[11] ? parseInt(productData[11], 10) : 0;
    
    let deliveryFeeObject: any = { "deliveryFeeType": "FREE" };
    if (baseDeliveryFee > 0) {
        if (freeConditionAmount > 0) {
            deliveryFeeObject = {
                "deliveryFeeType": "CONDITIONAL_FREE",
                "baseFee": baseDeliveryFee,
                "freeConditionalAmount": freeConditionAmount,
                "deliveryFeePayType": "PREPAID"
            };
        } else {
            deliveryFeeObject = {
                "deliveryFeeType": "PAID",
                "baseFee": baseDeliveryFee,
                "deliveryFeePayType": "PREPAID"
            };
        }
    }
    // 1. Fetch existing product to safely update without validation errors 
    // (e.g., leafCategoryId mismatches or missing originAreaInfo)
    let existingLeafCategoryId = categoryId;
    try {
        const getRes = await axios.get(`https://api.commerce.naver.com/external/v2/products/channel-products/${channelProductNo}`, {
            headers: { 'Authorization': `Bearer ${token}` },
            timeout: 10000
        });
        if (getRes.data?.originProduct?.leafCategoryId) {
            existingLeafCategoryId = getRes.data.originProduct.leafCategoryId;
        }
    } catch (e: any) {
        // 단종되거나 삭제된 상품의 경우 네이버가 403 접근 권한이 없다고 응답함
        const errorCode = e.response?.data?.code;
        const errorMessage = e.response?.data?.message;
        const isDeleted = e.response?.status === 404 || 
            (e.response?.status === 403 && errorCode === 'FORBIDDEN' && errorMessage === '접근 권한이 없습니다.');
            
        if (isDeleted) {
             throw new Error(`[Deleted Product] The product ${channelProductNo} appears to be deleted on SmartStore. Cannot update.`);
        }
        console.warn(`Failed to fetch original product info for ${channelProductNo}, proceeding with sheet data.`, e.message);
    }

    // 상품 수정용 PUT 페이로드
    
    const productInfoProvidedNotice = getProductInfoProvidedNotice(existingLeafCategoryId);
    productInfoProvidedNotice.etc.afterServiceDirector = asPhoneNumber;
    productInfoProvidedNotice.etc.manufacturer = manufacturerName;

    const productPayload = {
        "originProduct": {
            "statusType": "SALE",
            "saleType": "NEW",
            "leafCategoryId": existingLeafCategoryId,
            "name": name,
            "detailContent": detailContent,
            "images": {
                "representativeImage": { "url": imageUrl }
            },
            "salePrice": salePrice,
            "stockQuantity": stockQuantity,
            "deliveryInfo": {
                "deliveryType": "DELIVERY",
                "deliveryAttributeType": "NORMAL",
                "deliveryCompany": "CJGLS",
                "deliveryFee": deliveryFeeObject,
                "claimDeliveryInfo": {
                    "returnDeliveryCompanyPriorityType": "PRIMARY",
                    "returnDeliveryFee": 3000,
                    "exchangeDeliveryFee": 6000,
                    "shippingAddressId": shippingAddressId,
                    "returnAddressId": returnAddressId
                }
            },
            "detailAttribute": {
                "naverShoppingSearchInfo": {
                    "manufacturerName": manufacturerName,
                    "brandName": manufacturerName,
                    "modelName": modelName
                },
                "afterServiceInfo": {
                    "afterServiceTelephoneNumber": asPhoneNumber,
                    "afterServiceGuideContent": "API 연동 안내"
                },
                "returnInfo": {
                    "deliveryCompany": "CJGLS",
                    "returnZipCode": "12345",
                    "returnAddress": "상세설정 참조",
                    "returnAddressDetail": "상세설정 참조",
                    "returnCharge": 3000,
                    "exchangeCharge": 6000,
                    "returnPhoneNumber": asPhoneNumber
                },
                "originAreaInfo": {
                    "originAreaCode": originAreaCode,
                    "importer": isDomestic ? "" : manufacturerName,
                    "manufacturer": manufacturerName,
                    "content": originName
                },
                "productInfoProvidedNotice": productInfoProvidedNotice,
                "sellerCodeInfo": {
                    "sellerManagementCode": `SKU-${Date.now()}` // 옵션: 기존 SKU 유지 로직 추가 가능
                },
                "minorPurchasable": true
            }
        },
        "smartstoreChannelProduct": {
            "naverShoppingIsForcedDisplay": true,
            "channelProductDisplayStatusType": "ON",
            "naverShoppingRegistration": true
        }
    };

    try {
        const response = await axios.put(`https://api.commerce.naver.com/external/v2/products/channel-products/${channelProductNo}`, productPayload, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            timeout: 15000
        });

        // 수정 성공 시 기존 channelProductNo 반환
        return {
             channelProductNo: channelProductNo,
             originProductNo: response.data.originProductNo || "N/A"
        };
    } catch (error: any) {
         let errorMessage = error.message;
         if (error.response && error.response.data) {
             errorMessage = JSON.stringify(error.response.data);
         } else if (error.response && error.response.statusText) {
             errorMessage = `${error.response.status} - ${error.response.statusText}`;
         }
         throw new Error(`[SmartStore API 에러] 상품 수정 실패: ${errorMessage}`);
    }
}

export async function uploadImageToNaverFromUrl(credentials: SmartStoreCredentials, imageUrl: string): Promise<string> {
    const token = await getSmartStoreToken(credentials);

    try {
        // 1. Download image from Source URL
        const imageResponse = await axios.get(imageUrl, { 
            responseType: 'arraybuffer',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        const buffer = Buffer.from(imageResponse.data, 'binary');

        // 2. Upload to Naver
        const formData = new FormData();
        formData.append('imageFiles', buffer, { filename: 'scraped_image.jpg', contentType: 'image/jpeg' });

        const uploadResponse = await axios.post('https://api.commerce.naver.com/external/v1/product-images/upload', formData, {
            headers: {
                'Authorization': `Bearer ${token}`,
                ...formData.getHeaders()
            }
        });

        if (uploadResponse.data && uploadResponse.data.images && uploadResponse.data.images.length > 0) {
            return uploadResponse.data.images[0].url; // Naver CDN URL
        }
        throw new Error('Image upload failed to return a valid URL.');
    } catch (error: any) {
        let errorMessage = error?.message || String(error);
        if (error?.response?.data) {
             errorMessage = JSON.stringify(error.response.data);
        } else if (error?.response?.statusText) {
             errorMessage = `${error.response.status} - ${error.response.statusText}`;
        }
        throw new Error(`[SmartStore API 에러] 네이버 이미지 업로드 실패: ${errorMessage}`);
    }
}

/**
 * 네이버 스마트스토어 카테고리 전체 목록을 조회하고, 캐싱한 뒤 키워드로 필터링하여 상위 20개를 반환합니다.
 * @param credentials API 인증 정보
 * @param keyword 검색어 (카테고리명 또는 ID)
 */
export async function searchSmartStoreCategories(credentials: SmartStoreCredentials, keyword: string) {
    if (!cachedCategories) {
        try {
            const token = await getSmartStoreToken(credentials);
            const response = await axios.get('https://api.commerce.naver.com/external/v1/categories', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            cachedCategories = response.data || [];
        } catch (error: any) {
            throw new Error(`Failed to fetch Naver categories: ${error.message}`);
        }
    }

    if (!keyword.trim() && cachedCategories) {
        return cachedCategories.slice(0, 20); // 검색어가 없으면 무작위 상위 20개 반환
    }

    const lowerKeyword = keyword.toLowerCase();
    const filtered = (cachedCategories || []).filter(cat => 
        cat.wholeCategoryName.toLowerCase().includes(lowerKeyword) ||
        cat.id.includes(lowerKeyword)
    );

    return filtered.slice(0, 20);
}

/**
 * 네이버 스마트스토어 특정 상품의 상태(판매중, 품절 등)를 조회합니다.
 */
export async function fetchSmartstoreProductStatus(credentials: SmartStoreCredentials, channelProductNo: string): Promise<string> {
    try {
        const token = await getSmartStoreToken(credentials);
        // 채널상품번호로 원본 상품번호를 먼저 조회하거나, 바로 채널상품 조회를 할 수 있습니다.
        // 네이버 커머스 API의 채널 상품 조회 엔드포인트를 사용합니다.
        const response = await axios.get(`https://api.commerce.naver.com/external/v2/products/channel-products/${channelProductNo}`, {
            headers: { 'Authorization': `Bearer ${token}` },
            timeout: 10000
        });
        
        // 반환된 데이터 구조에서 판매 상태를 추출합니다. 보통 statusType 이나 saleType 등에 들어있습니다.
        // 네이버 공식 기준: statusType (SALE, OUTOFSTOCK 등)
        const statusType = response.data?.channelProduct?.statusType || response.data?.originProduct?.statusType || 'UNKNOWN';
        return statusType;
    } catch (error: any) {
        // 네이버 API는 삭제된 상품 조회 시 404가 아닌 403 (접근 권한이 없습니다)을 반환함
        // 일시적인 통신장애나 토큰 오류(일반 403)로 인해 전체 마스터 DB가 삭제되는 대참사를 막기 위해 정확한 에러코드와 메시지를 검증
        const errorCode = error.response?.data?.code;
        const errorMessage = error.response?.data?.message;
        const isDeleted = error.response?.status === 404 || 
            (error.response?.status === 403 && errorCode === 'FORBIDDEN' && errorMessage === '접근 권한이 없습니다.');

        if (isDeleted) {
            return 'NOT_FOUND';
        }
        
        // 그 외의 403이나 500 등은 실제 '통신 오류'이므로 에러를 발생시켜 안전하게 Sync를 스킵하게 만듦
        const errorMsg = error.response?.data?.message || error.message;
        throw new Error(`Failed to fetch product status: ${errorMsg}`);
    }
}

/**
 * 네이버 스마트스토어 특정 상품의 상태(판매중, 품절 등)를 변경합니다.
 * statusType 매개변수: SALE(판매중), OUTOFSTOCK(품절) 등
 */
export async function updateSmartstoreProductStatus(credentials: SmartStoreCredentials, channelProductNo: string, statusType: 'SALE' | 'OUTOFSTOCK'): Promise<boolean> {
    try {
        const token = await getSmartStoreToken(credentials);
        
        // 먼저 원본 상품번호(originProductNo)를 알아야 할 수 있으므로 겟팅
        const getRes = await axios.get(`https://api.commerce.naver.com/external/v2/products/channel-products/${channelProductNo}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const originProductNo = getRes.data?.channelProduct?.originProductNo;
        
        if (!originProductNo) {
             throw new Error("Cannot find originProductNo for update");
        }

        const payload = {
            statusType: statusType
        };

        await axios.put(`https://api.commerce.naver.com/external/v2/products/origin-products/${originProductNo}/status`, payload, {
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        return true;
    } catch (error: any) {
        const errorMsg = error.response?.data?.message || error.message;
        throw new Error(`Failed to update product status: ${errorMsg}`);
    }
}

/**
 * 네이버 스마트스토어 특정 상품을 삭제합니다.
 */
export async function deleteSmartstoreProduct(credentials: SmartStoreCredentials, channelProductNo: string): Promise<boolean> {
     try {
        const token = await getSmartStoreToken(credentials);
        
        const getRes = await axios.get(`https://api.commerce.naver.com/external/v2/products/channel-products/${channelProductNo}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const originProductNo = getRes.data?.channelProduct?.originProductNo;
        
        if (!originProductNo) {
             throw new Error("Cannot find originProductNo for deletion");
        }

        await axios.delete(`https://api.commerce.naver.com/external/v2/products/origin-products/${originProductNo}`, {
            headers: { 'Authorization': `Bearer ${token}` },
            timeout: 10000
        });
        
        return true;
    } catch (error: any) {
        if (error.response?.status === 404) return true; // 이미 없으면 성공처리
        const errorMsg = error.response?.data?.message || error.message;
        throw new Error(`Failed to delete product: ${errorMsg}`);
    }
}

