const fs = require('fs');
const cheerio = require('cheerio');

try {
    const html = fs.readFileSync('test2.html', 'utf8');
    const $ = cheerio.load(html);
    
    let targetSpec = null;
    $('div').each((i, el) => {
        const h = $(el).html() || '';
        if (h.length > 5000 && $(el).find('img').length > 2) {
            console.log('Found large div:');
            console.log('ID:', $(el).attr('id'));
            console.log('Class:', $(el).attr('class'));
            targetSpec = $(el);
        }
    });

    if (targetSpec) {
        console.log('Target found via manual search.');
        let innerHtml = targetSpec.html();
        console.log('Length:', innerHtml.length);
        console.log('Snippet:', innerHtml.substring(0, 100).replace(/\n/g, ' '));
        
        // Let's see if we can extract YouTube iframe source
        const iframes = targetSpec.find('iframe');
        console.log('Iframes found:', iframes.length);
        iframes.each((i, el) => console.log('Iframe src:', $(el).attr('src')));
    }
} catch(e) {
    console.error(e);
}
