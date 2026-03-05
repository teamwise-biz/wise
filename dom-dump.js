const fs = require('fs');
const cheerio = require('cheerio');

try {
    const html = fs.readFileSync('test2.html', 'utf8');
    const $ = cheerio.load(html);
    
    console.log('--- Page Title ---');
    console.log($('title').text().trim());

    console.log('\n--- H1/H2 (Possible Product Names) ---');
    $('h1, h2, h3').each((i, el) => {
        const t = $(el).text().trim();
        if(t && t.length < 100) console.log($(el).prop('tagName'), ':', t);
    });

    console.log('\n--- Divs with large content (Possible detailHtml) ---');
    $('div').each((i, el) => {
        const htmlLen = $(el).html() ? $(el).html().length : 0;
        const id = $(el).attr('id');
        const cls = $(el).attr('class');
        // If it has lots of images or text, it might be the detail spec
        if(htmlLen > 2000 && (id || cls)) {
            const imgCount = $(el).find('img').length;
            if (imgCount > 1) {
                console.log(`div id="${id}" class="${cls}" - length: ${htmlLen}, imgs: ${imgCount}`);
            }
        }
    });

    console.log('\n--- Tables (Possible Metadata like origin, maker) ---');
    $('table th').each((i, el) => {
       console.log('TH:', $(el).text().trim(), ' => TD:', $(el).next('td').text().trim());
    });
    
    console.log('\n--- JS Variables ---');
    const scripts = $('script').map((i, el) => $(el).html()).get().join('\n');
    const nameMatch = scripts.match(/productName\s*=\s*['"]([^'"]+)['"]/);
    const priceMatch = scripts.match(/price\s*=\s*['"]?([0-9,]+)['"]?/i);
    console.log('Found Name in JS?:', nameMatch ? nameMatch[1] : 'No');
    console.log('Found Price in JS?:', priceMatch ? priceMatch[1] : 'No');

} catch(e) {
    console.error(e);
}
