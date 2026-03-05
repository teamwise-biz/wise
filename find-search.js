const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');

axios.get('https://dometopia.com', {responseType: 'arraybuffer'}).then(res => {
    const html = iconv.decode(res.data, 'EUC-KR');
    const $ = cheerio.load(html);
    $('form').each((i, el) => {
        const action = $(el).attr('action');
        if(action && action.includes('search')) {
            console.log('Found Form Action:', action);
            console.log('Inputs:', $(el).find('input').map((i, inpel) => $(inpel).attr('name')).get());
        }
    });
}).catch(console.error);
