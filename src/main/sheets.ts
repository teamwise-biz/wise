import { google } from 'googleapis';
import { authorize } from './auth';

export async function createSpreadsheet(title: string): Promise<string | null | undefined> {
    const auth = await authorize();
    const sheets = google.sheets({ version: 'v4', auth });

    const resource = {
        properties: {
            title,
        },
    };

    const response = await sheets.spreadsheets.create({
        requestBody: resource,
        fields: 'spreadsheetId',
    });

    return response.data.spreadsheetId;
}

export async function getOrCreateMasterSheet(): Promise<string> {
    const auth = await authorize();
    const drive = google.drive({ version: 'v3', auth });
    const sheets = google.sheets({ version: 'v4', auth });
    
    const masterSheetName = '[WISE] 내 상품 마스터 DB';

    try {
        // Search Drive for existing sheet
        const res = await drive.files.list({
            q: `name='${masterSheetName}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
            spaces: 'drive',
            fields: 'files(id, name)',
        });

        if (res.data.files && res.data.files.length > 0) {
            // Master Sheet already exists!
            const fileId = res.data.files[0].id!;
            console.log(`[Master DB] Found existing database: ${fileId}`);
            return fileId;
        }

        // Doesn't exist, create it anew
        console.log(`[Master DB] Not found. Creating new Master DB sheet...`);
        const createRes = await sheets.spreadsheets.create({
            requestBody: {
                properties: { title: masterSheetName }
            },
            fields: 'spreadsheetId'
        });

        const newSheetId = createRes.data.spreadsheetId!;

        // Write Header Row for the Master DB
        await sheets.spreadsheets.values.update({
            spreadsheetId: newSheetId,
            range: 'A1:E1',
            valueInputOption: 'RAW',
            requestBody: {
                values: [['도매처/공급사', '상품번호(SKU)', '스마트스토어채널번호', '업로드단가', '최초연동일시']]
            }
        });

        // 1행 틀고정 (Freeze header row)
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: newSheetId,
            requestBody: {
                requests: [{
                    updateSheetProperties: {
                        properties: {
                            gridProperties: { frozenRowCount: 1 }
                        },
                        fields: 'gridProperties.frozenRowCount'
                    }
                }]
            }
        });

        return newSheetId;

    } catch (error: any) {
        console.error('Failed to get or create Master Sheet', error);
        throw new Error(`Master DB Initialization Failed: ${error.message}`);
    }
}

export async function appendToMasterSheet(spreadsheetId: string, values: any[][]) {
    const auth = await authorize();
    const sheets = google.sheets({ version: 'v4', auth });

    await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'A:E', // Any place in these columns
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
            values
        }
    });
}

export async function writeToSheet(spreadsheetId: string, range: string, values: any[][]) {
    const auth = await authorize();
    const sheets = google.sheets({ version: 'v4', auth });

    const resource = {
        values,
    };

    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'RAW',
        requestBody: resource,
    });
}

export async function updateSheetCell(spreadsheetId: string, range: string, value: string | number) {
    const auth = await authorize();
    const sheets = google.sheets({ version: 'v4', auth });

    const resource = {
        values: [[value]],
    };

    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'RAW',
        requestBody: resource,
    });
}

export async function readFromSheet(spreadsheetId: string, range: string) {
    const auth = await authorize();
    const sheets = google.sheets({ version: 'v4', auth });

    try {
        console.log(`[readFromSheet] Requesting sheetId: ${spreadsheetId}, range: ${range}`);
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
        });

        console.log(`[readFromSheet] Response status: ${response.status}`);
        console.log(`[readFromSheet] Values length: ${response.data.values?.length}`);
        
        return response.data.values || [];
    } catch (e: any) {
        console.error(`[readFromSheet] API Error:`, e.message);
        throw e;
    }
}
