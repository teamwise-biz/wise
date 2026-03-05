const { google } = require('googleapis');
const fs = require('fs');

async function testSheet() {
    try {
        const authPath = "C:/wise/credentials.json";
        const auth = new google.auth.GoogleAuth({
            keyFile: authPath,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        const sheets = google.sheets({ version: 'v4', auth });
        
        // I need the sheet ID from the wise project, but I don't know it exactly.
        // Let's just read it from the App's context or look into recent sheets.
        console.log('Use this script to verify sheet contents');
    } catch(e) {
        console.error(e);
    }
}
testSheet();
