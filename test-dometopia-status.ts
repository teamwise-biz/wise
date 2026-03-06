import { checkDometopiaStatus } from './src/main/scraper';

async function testScan() {
    console.log("Testing a normal product (hope it exists, e.g., 222881 or 81926)");
    const codes = ['222881', '81926', '99999999']; // last one should be out of stock
    
    for (const code of codes) {
        console.log(`\nChecking ItemCode: ${code}...`);
        try {
            const result = await checkDometopiaStatus(code);
            console.log("Result:", result);
        } catch (e) {
            console.error("Error:", e);
        }
    }
}

testScan();
