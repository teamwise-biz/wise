import { registerSmartStoreProduct, uploadImageToNaverFromUrl } from './src/main/smartstore';
import * as fs from 'fs';

async function test() {
    const credsStr = fs.readFileSync('c:\\wise\\creds2.json', 'utf8');
    const creds = JSON.parse(credsStr);
    
    // Test payload mimicking Google Sheet row data passed from App.tsx
    const productData = [
        "50004393", // 0: categoryId (생활/주방)
        "자동 정보 정교화 테스트 상품 (KC,원산지,브랜드)", // 1: productName
        "<p>상세설명입니다.</p>", // 2: detail HTML
        "https://shop1.phinf.naver.net/20260226_167/1740537036735gA9sF_JPEG/GDF127102.jpg", // 3: Image URL
        "15000", // 4: Price
        "100", // 5: Stock
        "", // 6: channelProductNo
        "200245413", // 7
        "200245414", // 8
        "010-1234-5678", // 9
        "3000", // 10: base delivery
        "50000", // 11: free condition
        "Shandong Ruifan Crafts Co., Ltd", // 12: Manufacturer -> Should become "협력업체"
        "베트남", // 13: Origin -> Should become 0216000
        "폴리에스테르 100%", // 14: Material -> Used in Notice
        "TD-1234", // 15: Model Name
        "CB062R765-8001" // 16: KC Certification
    ];
    
    try {
        const imageRes = await uploadImageToNaverFromUrl(creds, "https://dometopia.com/data/goods/goods_img/GD/GDF127102/GDF127102.jpg");
        const naverImageUrl = imageRes;
        console.log("Naver Image URL:", naverImageUrl);

        productData[3] = naverImageUrl;

        console.log("Registering product with new metadata logic...");
        const result = await registerSmartStoreProduct(creds, productData);
        console.log("SUCCESS:", result);
    } catch (e: any) {
        fs.writeFileSync('error-log.txt', e.message);
        console.error("Wrote error to error-log.txt");
    }
}

test();
