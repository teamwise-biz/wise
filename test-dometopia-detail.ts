import { scrapeDometopiaProduct } from './src/main/scraper';

async function test() {
    // A sample Dometopia product URL
    const url = 'https://dometopia.com/goods/view?no=183521'; // Valid URL
    console.log(`Scraping: ${url}`);
    
    try {
        const result = await scrapeDometopiaProduct(url);
        console.log('Result extracted options/details:');
        if (result.success && result.data) {
            console.log('- Name:', result.data.name);
            console.log('- Manufacturer:', result.data.manufacturer);
            console.log('- Origin:', result.data.origin);
            console.log('- Material:', result.data.material);
            console.log('- ModelName:', result.data.modelName);
            console.log('- Detail HTML snippet:', result.data.detailHtml ? result.data.detailHtml.substring(0, 300) + '...' : 'NONE');
        } else {
            console.log('Failed:', result);
        }
    } catch (err) {
        console.error('Error:', err);
    }
}

test();
