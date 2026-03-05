const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');

async function extractFromMeta() {
    const url = 'https://dometopia.com/goods/view?no=201300';
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    let html = iconv.decode(response.data, 'EUC-KR');
    if (html.includes('utf-8') || html.includes('UTF-8')) {
        html = iconv.decode(response.data, 'UTF-8');
    }
    
    const $ = cheerio.load(html);
    const keywords = $('meta[name="keywords"]').attr('content') || '';
    console.log("Meta Keywords:", keywords.substring(0, 100)); // Print first 100 chars
    
    // Parse "주방용품 > 보관/밀폐용기 > 보온/보냉병 델데이..."
    const categoryPath = [];
    if (keywords.includes('>')) {
        // usually the first part of keywords is the path, up to the first space after a word without >
        // let's split by comma or space and find the ones with >
        const parts = keywords.split(',')[0].split('>'); // split the first comma-separated block
        parts.forEach(p => {
             // clean up
             const cl = p.trim();
             // the last one might be "보온/보냉병 델데이 데이보틀 보온병"
             // so we extract only the first word or what's before the space?
             // Actually, just taking the first word of the split if it contains a space.
             if (cl) {
                 categoryPath.push(cl.split(' ')[0]);
             }
        });
    }
    console.log("Extracted Category Path:", categoryPath);
}
extractFromMeta();
