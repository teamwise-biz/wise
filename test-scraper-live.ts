import { scrapeDometopiaProduct } from './src/main/scraper.js';

async function test() {
    try {
        const result = await scrapeDometopiaProduct('https://dometopia.com/goods/view?no=183521');
        console.log(JSON.stringify(result, null, 2));
    } catch (err) {
        console.error(err);
    }
}

test();
