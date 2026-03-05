const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');

async function testDeliveryAndCategoryScrape(url) {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        let html = iconv.decode(response.data, 'EUC-KR');
        let $ = cheerio.load(html);
        
        if (html.includes('utf-8') || html.includes('UTF-8')) {
           html = iconv.decode(response.data, 'UTF-8');
           $ = cheerio.load(html);
        }

        console.log(`\n=== Analyzing: ${url} ===`);

        // 1. 배송비 정보 추출 시도
        // 도매토피아는 보통 '배송비'라는 텍스트 근처나 특정 class/id에 배송비 정보를 노출합니다.
        let deliveryText = '';
        // 1-1. '배송비' 라벨이 있는 곳 찾기
        $('th, td, span, div').each((i, el) => {
            const text = $(el).text().trim();
            if (text.includes('배송비') && text.length < 50) { // 너무 긴 텍스트 제외
                deliveryText += text + ' | ';
                // 그 다음 요소 내용도 같이 가져와봄 (보통 th 다음에 td에 값이 있음)
                deliveryText += $(el).next().text().trim() + '\n';
            }
        });
        
        // 1-2. 배송비 관련 hidden input 찾기
        const deliveryPriceVal = $('input[name="deliveryPrice"], input[name="delivery_price"]').val();

        console.log('[Delivery Info extraction attempts]');
        console.log('Text near "배송비":', deliveryText);
        console.log('Hidden Input Value:', deliveryPriceVal);


        // 2. 뎁스 카테고리 추출 시도
        // 도매토피아는 네비게이션 경로 (예: 홈 > 패션/뷰티 > 여성의류) 형태로 뎁스를 제공합니다.
        let categoryPath = [];
        // 보통 .navi, .location, .path 등 클래스 사용
        $('.pl_navi a, .navi a, .path a, .location a').each((i, el) => {
            const cat = $(el).text().trim();
            if (cat && cat !== '홈' && cat !== 'Home') {
                categoryPath.push(cat);
            }
        });
        
        // 카테고리 자바스크립트 변수 확인
        let catCodeMatch = html.match(/categoryCode\s*=\s*['"]([^'"]+)['"]/);

        console.log('\n[Category Info extraction attempts]');
        console.log('Breadcrumbs:', categoryPath.join(' > '));
        console.log('JS Category Code:', catCodeMatch ? catCodeMatch[1] : 'Not Found');

    } catch (err) {
        console.error('Error:', err.message);
    }
}

// 기존 테스트 상품
testDeliveryAndCategoryScrape('https://dometopia.com/goods/view?no=183521'); 
