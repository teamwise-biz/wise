const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');

async function test() {
    const url = 'https://dometopia.com/goods/view?no=201300';
    console.log('Fetching:', url);
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    let html = iconv.decode(response.data, 'EUC-KR');
    if (html.includes('utf-8') || html.includes('UTF-8')) {
        html = iconv.decode(response.data, 'UTF-8');
    }
    
    const $ = cheerio.load(html);
    
    console.log('--- Location elements ---');
    console.log('Text of .location:', $('.location').text().trim());
    console.log('Text of .path-wrap:', $('.path-wrap').text().trim());
    
    const categoryPath = [];
    $('.location a, .location span, .location strong, .path-wrap a').each((_i, el) => {
        const text = $(el).text().replace(/>/g, '').trim();
        if (text && text !== '홈' && text !== 'HOME') {
            categoryPath.push(text);
        }
    });
    console.log('Parsed categoryPath 1:', categoryPath);
    
    const categoryPath2 = [];
    $('select[name="category"] option:selected').each((_i, el) => {
        const text = $(el).text().trim();
        if (text && !text.includes('카테고리 선택')) {
            const parts = text.split('>');
            parts.forEach(p => categoryPath2.push(p.trim()));
        }
    });
    console.log('Parsed categoryPath 2:', categoryPath2);
    
    // Look for other breadcrumb patterns
    console.log('Other potential locations:');
    $('*').each((i, el) => {
        const text = $(el).text();
        if (text.includes('홈 >') || text.includes('HOME >') || text.includes('홈>')) {
             if ($(el).children().length > 0 && $(el).text().length < 100) {
                 console.log($(el).prop('tagName'), $(el).attr('class'), $(el).text().replace(/\s+/g,' ').trim());
             }
        }
    });

}
test();
