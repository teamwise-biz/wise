const axios = require('axios');
const iconv = require('iconv-lite');
const fs = require('fs');

async function dump() {
    const url = 'https://dometopia.com/goods/view?no=201300';
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    let html = iconv.decode(response.data, 'EUC-KR');
    if (html.includes('utf-8') || html.includes('UTF-8')) {
        html = iconv.decode(response.data, 'UTF-8');
    }
    fs.writeFileSync('c:/wise/dump.html', html);
    console.log('Dumped to c:/wise/dump.html');
}
dump();
