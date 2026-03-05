const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');

async function extractBreadcrumb() {
    const url = 'https://dometopia.com/goods/view?no=201300';
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    let html = iconv.decode(response.data, 'UTF-8');
    
    const $ = cheerio.load(html);
    
    console.log("Looking for structural classes:");
    console.log('.location:', $('.location').length);
    console.log('#location:', $('#location').length);
    console.log('.path:', $('.path').length);
    console.log('.navi:', $('.navi').length);
    console.log('.navigation:', $('.navigation').length);

    console.log("\nLooking for elements containing '홈' and '>':");
    $('*').each((i, el) => {
        const text = $(el).text();
        if (text.includes('홈') && text.includes('>')) {
            // Check if it's a visible structural element
            const hasChildren = $(el).children().length > 0;
            if (hasChildren && text.length < 100) {
               console.log($(el).prop('tagName'), '.', $(el).attr('class'), '#', $(el).attr('id'));
               console.log($(el).text().replace(/\s+/g, ' ').trim());
            }
        }
    });

    // Let's dump the script tags to see if category info is there
    $('script').each((i, el) => {
        const scriptText = $(el).html();
        if (scriptText && (scriptText.includes('category') || scriptText.includes('cat'))) {
            const match = scriptText.match(/category.{0,20}/ig);
            if (match) console.log(match);
        }
    });
}
extractBreadcrumb();
