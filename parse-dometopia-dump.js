const fs = require('fs');
const cheerio = require('cheerio');

try {
    const html = fs.readFileSync('dometopia.html', 'utf-8');
    const $ = cheerio.load(html);

    console.log("=== Category / Delivery Info Dump ===");
    
    // 1. 카테고리(네비게이션) 영역 탐색
    console.log("\n[Category Path Analysis]");
    // 도매토피아는 .pl_navi 나 nav 등 여러 클래스를 쓸 수 있습니다.
    const navText = $('.pl_navi').text().trim() || $('.navi').text().trim() || $('.path').text().trim();
    console.log("Raw navi text:", navText.substring(0, 100).replace(/\s+/g, ' '));
    
    let pathNodes = [];
    $('.pl_navi li, .navi li').each((i, el) => {
        const text = $(el).text().trim();
        if(text) pathNodes.push(text);
    });
    console.log("Path Nodes from <li>:", pathNodes);

    // 구글링/소스에서 흔히 보이는 categoryCode 변수 스캔
    const catMatch = html.match(/categoryCode\s*=\s*'([^']+)'/);
    if(catMatch) console.log("Category Code from JS:", catMatch[1]);

    // 2. 배송비 테이블 영역 탐색
    console.log("\n[Delivery Fee Analysis]");
    // '배송비'라는 텍스트를 포함하는 th 나 td 찾기
    $('th, td, dt, dd, span').each((i, el) => {
        const text = $(el).text().replace(/\s+/g, ' ').trim();
        if (text.includes('배송비') && text.length < 50) {
            console.log(`[Found Element <${$(el).prop('tagName')}>] ${text}`);
            
            // th 라면 다음 td의 값이 배송비 상세일 확률이 높음
            if ($(el).prop('tagName').toLowerCase() === 'th') {
                const siblingVal = $(el).next('td').text().replace(/\s+/g, ' ').trim();
                console.log(`   -> Next Sibling <TD> value: ${siblingVal}`);
            }
        }
    });

} catch(e) {
    console.error(e);
}
