const { updateSmartStoreProduct } = require('./out/main/smartstore');

async function testUpdate() {
    // These are test credentials - use actual ones if needed or they will be read from file
    const credentials = {
        clientId: '4aTjpvduCQkMgmJjioSzFK',
        clientSecret: '$2a$04$UNqs4AJrZASKpHqfUFGxOe'
    };

    const channelProductNo = '13197479037'; // From the user's screenshot
    // Mock product data matching the structure expected by updateSmartStoreProduct
    // [0: CategoryID, 1: Name, 2: Detail, 3: ImageURL, 4: Price, 5: Stock]
    const productData = [
        '50000000', // Category ID (dummy)
        '매너굿즈 코털제거기', // Name
        '<p>Test detail</p>', // Detail
        'https://dometopia.com/data/goods/1/2023/10/83437_temp_16976986687425view.jpg', // Image
        '2860', // Price
        '100' // Stock
    ];

    try {
        console.log('Sending Update Request...');
        const result = await updateSmartStoreProduct(credentials, channelProductNo, productData);
        console.log('Update Success:', result);
    } catch (error) {
        console.error('Update Failed:', error.message);
    }
}

testUpdate();
