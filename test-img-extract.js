const fs = require('fs');
const cheerio = require('cheerio');

try {
    const html = fs.readFileSync('test2.html', 'utf8');
    const $ = cheerio.load(html);
    
    // As per user: <img src="/data/goods/goods_img/GDI/1358506/1358506.jpg" alt="상품상세">
    // Since alt="상품상세" fails on encoding, check for the specific path structure
    let detailImages = $('img[src*="/data/goods/goods_img/"]');
    console.log('Total /goods_img/ found:', detailImages.length);
    
    // Filter out common banners
    const filteredImages = [];
    detailImages.each((i, el) => {
        const src = $(el).attr('src');
        if (src && !src.includes('all_top_img')) {
             filteredImages.push(src);
        }
    });

    console.log('Filtered exact detail images:', filteredImages.length);
    filteredImages.forEach(src => console.log('  ->', src));

} catch(e) {
    console.error(e);
}
