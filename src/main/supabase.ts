import { BrowserWindow, session } from 'electron';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Use exactly the same public keys from your web project
const SUPABASE_URL = 'https://sqiufpkzdosgtynbikkx.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_hTtTs0gEhVPcG2sQRfEHoQ_SAJO8Bh_';

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Checks if a user has a valid active/trial subscription.
 */
export async function checkLicense(userId: string): Promise<boolean> {
    try {
        const { data, error } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error || !data) {
            return false;
        }

        return ['active', 'trial'].includes(data.status);
    } catch (e) {
        console.error("License check failed", e);
        return false;
    }
}

/**
 * Opens a login window to your Next.js web app's login page.
 * Returns the Supabase session details if successful.
 */
export function requireLogin(parentWindow?: BrowserWindow): Promise<{ user_id: string, email: string }> {
    return new Promise((resolve, reject) => {
        const loginWin = new BrowserWindow({
            width: 800,
            height: 900,
            title: 'WISE 라이선스 로그인',
            modal: parentWindow ? true : false,
            parent: parentWindow,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true
            }
        });

        // We load the live Next.js app in development, or the production URL later.
        // The most robust way in Electron is to use the standard Supabase Auth UI
        // hosted on your website, then capture the session token from local storage or cookie.
        
        loginWin.loadURL('http://localhost:3000/login');

        // Periodically check local storage or cookies to see if user logged in
        // In Next.js with Supabase SSR, a cookie like `sb-XXX-auth-token` is set.
        let checkInterval = setInterval(async () => {
            if (loginWin.isDestroyed()) {
                clearInterval(checkInterval);
                return;
            }

            try {
                // Execute JS to grab the Supabase auth token from local storage if using client auth
                // Or check cookies
                const cookies = await session.defaultSession.cookies.get({ url: 'http://localhost:3000' });
                // Alternatively, we can just intercept the redirect to /admin!
                // Since our web app redirects to /admin upon login, detecting /admin means success.
            } catch (e) {
                // ignore
            }
        }, 1000);

        // Easier method: Intercept Navigation!
        loginWin.webContents.on('did-navigate', async (_event, url) => {
            if (url.includes('/admin')) {
                clearInterval(checkInterval);
                
                // User is authenticated. Let's pull the session cookie from the browser window.
                const cookies = await session.defaultSession.cookies.get({ url: 'http://localhost:3000' });
                
                // Due to SSR, Next.js holds the session cookies. 
                // To get the user ID, we can inject a script to ask the page, or read the token.
                // An easier trick: Just inject JS into the loaded /admin page to read the user email
                // that is rendered, or better yet, hit an API endpoint we create.
                
                try {
                    // Inject JS to grab the email from the page text for a quick mock test
                    // But for security, we need the exact Supabase JWT.
                    // Let's use `window.localStorage.getItem` if available.
                    const localStorageKeys = await loginWin.webContents.executeJavaScript(`Object.keys(window.localStorage)`);
                    const sbKey = localStorageKeys.find((k: string) => k.startsWith('sb-') && k.endsWith('-auth-token'));
                    
                    if (sbKey) {
                        const tokenStr = await loginWin.webContents.executeJavaScript(`window.localStorage.getItem('${sbKey}')`);
                        const tokenData = JSON.parse(tokenStr);
                        console.log("Found Electron local session:", tokenData.user.email);
                        
                        loginWin.close();
                        resolve({ user_id: tokenData.user.id, email: tokenData.user.email });
                    } else {
                        // If it's pure SSR and no local storage, we might need a dedicated API endpoint like /api/auth/me
                        // For now, assume SSR cookies are shared and we can just hit our DB.
                    }
                } catch(e) {
                    console.error("Failed to read user data from window", e);
                }
            }
        });

        loginWin.on('closed', () => {
            clearInterval(checkInterval);
            reject(new Error('User closed login window.'));
        });
    });
}
