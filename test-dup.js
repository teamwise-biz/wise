const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');

async function checkDuplicates() {
    const ids = ['210940', '210941', '210936', '210937', '210938'];
    
    for (const id of ids) {
        try {
            const res = await axios.get('https://dometopia.com/goods/view?no=' + id, { responseType: 'arraybuffer' });
            let html = iconv.decode(res.data, 'EUC-KR');
            if (html.includes('utf-8') || html.includes('UTF-8')) {
                html = iconv.decode(res.data, 'UTF-8');
            }
            const $ = cheerio.load(html);
            const name = $('.pl_name h2').first().text().trim();
            console.log(`[${id}] ${name}`);
        } catch (e) {
            console.log(`Error on ${id}: ${e.message}`);
        }
    }
}
checkDuplicates();
