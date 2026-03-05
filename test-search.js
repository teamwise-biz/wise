const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');

async function searchAndScrape() {
    try {
        const keyword = encodeURIComponent('언니네 가발');
        const url = `https://dometopia.com/goods/search?keyword_log_flag=Y&search_text=${keyword}&x=0&y=0`;
        
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const html = iconv.decode(response.data, 'EUC-KR');
        const $ = cheerio.load(html);
        
        const firstLink = $('.goods-list li a').first().attr('href');
        if (!firstLink) {
            console.log('Product not found in search');
            return;
        }

        const productUrl = `https://dometopia.com${firstLink}`;
        console.log('Found product URL:', productUrl);
        
        const prodRes = await axios.get(productUrl, { responseType: 'arraybuffer' });
        const prodHtml = iconv.decode(prodRes.data, 'EUC-KR');
        const $p = cheerio.load(prodHtml);
        
        const imgs = $p('img[src*="/goods_img/"]');
        console.log(`Found ${imgs.length} /goods_img/ images`);
        imgs.each((i, el) => {
            console.log('Image:', $p(el).attr('src'));
        });

    } catch (e) {
        console.error(e);
    }
}
searchAndScrape();
