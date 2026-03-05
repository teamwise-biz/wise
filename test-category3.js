const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');

async function test() {
    try {
        const res = await axios.get('https://dometopia.com', { responseType: 'arraybuffer' });
        let html = iconv.decode(res.data, 'EUC-KR');
        if (html.includes('utf-8') || html.includes('UTF-8')) {
           html = iconv.decode(res.data, 'UTF-8');
        }
        const $ = cheerio.load(html);
        
        const links = new Set();
        $('a[href*="category"]').each((i, el) => {
            const href = $(el).attr('href');
            if (href) links.add(href);
        });
        
        console.log(`Found ${links.size} unique category links.`);
        console.log(Array.from(links).slice(0, 15));
    } catch (e) {
        console.error(e.message);
    }
}
test();
