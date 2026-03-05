const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');

async function test() {
    try {
        const res = await axios.get('https://dometopia.com/goods/category?cate=0001', { responseType: 'arraybuffer' });
        let html = iconv.decode(res.data, 'EUC-KR');
        if (html.includes('utf-8') || html.includes('UTF-8')) {
           html = iconv.decode(res.data, 'UTF-8');
        }
        const $ = cheerio.load(html);
        
        const links = new Set();
        // Looking for standard product links
        $('a[href*="/goods/view?no="]').each((i, el) => {
            const href = $(el).attr('href');
            if (href) {
                // normalize
                const fullUrl = href.startsWith('http') ? href : `https://dometopia.com${href.startsWith('/') ? href : '/' + href}`;
                links.add(fullUrl);
            }
        });
        
        console.log(`Found ${links.size} unique product links.`);
        console.log(Array.from(links).slice(0, 5));
        
        // Check for pagination as well
        const paginationLinks = new Set();
        $('.paging a, .pagination a, .page a').each((i, el) => {
             const href = $(el).attr('href');
             if (href && href.includes('page=')) paginationLinks.add(href);
        });
        console.log(`Found pagination links:`, Array.from(paginationLinks).slice(0,3));

    } catch (e) {
        console.error(e.message);
    }
}
test();
