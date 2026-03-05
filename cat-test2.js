const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');

async function test() {
    const url = 'https://dometopia.com/goods/view?no=201300';
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    let html = iconv.decode(response.data, 'EUC-KR');
    if (html.includes('utf-8') || html.includes('UTF-8')) {
        html = iconv.decode(response.data, 'UTF-8');
    }
    
    // Look for category-related variable assignments in the raw HTML
    console.log("Looking for 'cat' or 'category' in scripts...");
    const regex = /(cat|category)[a-zA-Z0-9_]*\s*=\s*['"]([^'"]+)['"]/ig;
    let match;
    while((match = regex.exec(html)) !== null) {
        console.log(`Found: ${match[0]}`);
    }

    const regex2 = /['"]category['"]?\s*:\s*['"]([^'"]+)['"]/ig;
    while((match = regex2.exec(html)) !== null) {
        console.log(`Found JSON-like category: ${match[0]}`);
    }
    
    // Also try to find any meta tags with category
    const $ = cheerio.load(html);
    $('meta').each((i, el) => {
        const name = $(el).attr('name') || $(el).attr('property');
        const content = $(el).attr('content');
        if (name && name.toLowerCase().includes('cat')) {
            console.log(`Meta ${name}: ${content}`);
        }
    });
}
test();
