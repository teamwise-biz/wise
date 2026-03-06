import { app, BrowserWindow } from 'electron';
import { google, Auth } from 'googleapis';
import * as path from 'path';
import * as fs from 'fs';

function getTokenPath() {
    return path.join(app.getPath('userData'), 'token.json');
}

function getCredentialsPath() {
    return app.isPackaged 
        ? path.join(process.resourcesPath, 'credentials.json')
        : path.join(__dirname, '../../src/main/credentials.json');
}

export async function authorize(): Promise<Auth.OAuth2Client> {
    const credentialsPath = getCredentialsPath();
    const tokenPath = getTokenPath();

    const content = fs.readFileSync(credentialsPath, 'utf-8');
    const credentials = JSON.parse(content);
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(
        client_id,
        client_secret,
        redirect_uris[0]
    );

    try {
        const tokenStr = fs.readFileSync(tokenPath, 'utf-8');
        const token = JSON.parse(tokenStr);
        oAuth2Client.setCredentials(token);
        return oAuth2Client;
    } catch (error) {
        return await getNewToken(oAuth2Client);
    }
}

function getNewToken(oAuth2Client: Auth.OAuth2Client): Promise<Auth.OAuth2Client> {
    return new Promise((resolve, reject) => {
        const authUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: [
                'https://www.googleapis.com/auth/spreadsheets',
                'https://www.googleapis.com/auth/drive.file',
                'https://www.googleapis.com/auth/userinfo.email',
                'https://www.googleapis.com/auth/userinfo.profile'
            ],
        });

        const authWindow = new BrowserWindow({
            width: 500,
            height: 600,
            show: false,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
            }
        });

        authWindow.loadURL(authUrl);
        authWindow.show();

        authWindow.webContents.on('will-redirect', async (event: any, url: string) => {
            try {
                const parsedUrl = new URL(url);
                // We use redirect_uris[0] which is typically http://localhost
                if (parsedUrl.origin === 'http://localhost' || url.startsWith('http://localhost')) {
                    event.preventDefault();
                    const code = parsedUrl.searchParams.get('code');
                    const error = parsedUrl.searchParams.get('error');

                    if (code) {
                        const { tokens } = await oAuth2Client.getToken(code);
                        oAuth2Client.setCredentials(tokens);
                        const tokenPath = getTokenPath();
                        fs.writeFileSync(tokenPath, JSON.stringify(tokens));
                        resolve(oAuth2Client);
                        authWindow.close();
                    } else if (error) {
                        reject(new Error(error));
                        authWindow.close();
                    }
                }
            } catch (err) {
                // Ignore URL parse errors for intermediate redirects
            }
        });

        authWindow.on('closed', () => {
            reject(new Error('Auth window was closed by user'));
        });
    });
}

export function logout(): boolean {
    const tokenPath = getTokenPath();
    if (fs.existsSync(tokenPath)) {
        fs.unlinkSync(tokenPath);
        return true;
    }
    return false;
}
