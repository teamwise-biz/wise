const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');

async function test() {
    try {
        const res = await axios.get('https://dometopia.com/goods/catalog?code=0177', { responseType: 'arraybuffer' });
        let html = iconv.decode(res.data, 'EUC-KR');
        if (html.includes('utf-8') || html.includes('UTF-8')) {
           html = iconv.decode(res.data, 'UTF-8');
        }
        const $ = cheerio.load(html);
        
        const links = new Set();
        $('a[href*="/goods/view?no="]').each((i, el) => {
            const href = $(el).attr('href');
            if (href) {
                // Remove trailing &code=... or similar
                let cleanHref = href.split('&')[0];
                links.add(cleanHref.startsWith('http') ? cleanHref : `https://dometopia.com${cleanHref.startsWith('/') ? cleanHref : '/' + cleanHref}`);
            }
        });
        
        console.log(`Found ${links.size} unique product links.`);
        console.log(Array.from(links).slice(0, 10));

    } catch (e) {
        console.error(e.message);
    }
}
test();
