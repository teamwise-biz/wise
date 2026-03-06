import { app, shell, BrowserWindow, ipcMain, session } from 'electron';
import { join } from 'path'
import icon from '../../resources/icon.png?asset'
import { authorize, logout } from './auth';
import { createSpreadsheet, writeToSheet, readFromSheet, updateSheetCell, getOrCreateMasterSheet, appendToMasterSheet } from './sheets';
import { fetchSmartStoreOrders, registerSmartStoreProduct, updateSmartStoreProduct, uploadImageToNaverFromUrl, searchSmartStoreCategories, fetchSmartstoreProductStatus, updateSmartstoreProductStatus, deleteSmartstoreProduct, updateSmartStorePrice } from './smartstore';
import { createCafe24Product, updateCafe24Product, deleteCafe24Product, Cafe24ProductPayload } from './cafe24';
import { scrapeDometopiaProduct, scrapeCategoryLinks, checkDometopiaStatus } from './scraper';
import { getCategoryRules, saveCategoryRule, deleteCategoryRule, findRuleByUrl, CategoryRule } from './db';
import { requireLogin, checkLicense } from './supabase';

// Dometopia Session Cookie Storage
let dometopiaSessionCookie: string | null = null;

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.maximize()
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  const isDev = !app.isPackaged;
  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.

app.whenReady().then(() => {
  // Set app user model id for windows
  app.setAppUserModelId('com.electron')

  // Category Rules IPC Handlers
  ipcMain.handle('get-category-rules', () => {
    return getCategoryRules();
  });
  ipcMain.handle('save-category-rule', (_: any, rule: CategoryRule) => {
    saveCategoryRule(rule);
    return { success: true };
  });
  ipcMain.handle('delete-category-rule', (_: any, dometopiaUrl: string) => {
    deleteCategoryRule(dometopiaUrl);
    return { success: true };
  });
  ipcMain.handle('find-rule-by-url', async (_: any, dometopiaUrl: string) => {
    return findRuleByUrl(dometopiaUrl);
  });
  
  // Category Scraping IPC Handler
  ipcMain.handle('scrape-category-links', async (_: any, url: string) => {
    try {
      const links = await scrapeCategoryLinks(url);
      return links;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Naver Category Search IPC Handler
  ipcMain.handle('search-categories', async (_: any, clientId: string, clientSecret: string, keyword: string) => {
    try {
      const categories = await searchSmartStoreCategories({ clientId, clientSecret }, keyword);
      return { success: true, data: categories };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  ipcMain.handle('open-external', async (_: any, url: string) => {
    try {
      await shell.openExternal(url);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('supabase-auth', async () => {
    try {
      const user = await requireLogin();
      const hasLicense = await checkLicense(user.user_id);
      
      if (!hasLicense) {
        return { success: false, error: '유효한 라이선스(Pro 또는 무료 체험)가 없습니다. 웹사이트에서 요금제를 먼저 결제해주세요.' };
      }
      return { success: true, email: user.email };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('scrape-dometopia', async (_: any, htmlContent: string) => {
    try {
      const productInfo = await scrapeDometopiaProduct(htmlContent, dometopiaSessionCookie);
      return productInfo;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('dometopia-login', async () => {
    return new Promise((resolve) => {
      const loginWin = new BrowserWindow({
        width: 600,
        height: 750,
        title: '도매토피아 로그인',
        modal: true,
        parent: BrowserWindow.getAllWindows()[0],
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });

      // Clear existing session data before logging in to ensure a fresh state
      session.defaultSession.cookies.get({ url: 'https://dometopia.com' }).then((cookies) => {
        cookies.forEach(cookie => {
          session.defaultSession.cookies.remove('https://dometopia.com', cookie.name);
        });
      });

      loginWin.loadURL('https://dometopia.com/member/login');

      // Intercept redirects or navigation to check if login is successful
      loginWin.webContents.on('did-navigate', async (_event, url) => {
        // Typically, successful login redirects to main page or a specific return URL
        if (url === 'https://dometopia.com/' || url === 'https://dometopia.com/main/index' || url.includes('main/index')) {
          const cookies = await session.defaultSession.cookies.get({ url: 'https://dometopia.com' });
          const phpSessId = cookies.find(c => c.name === 'PHPSESSID');
          
          if (phpSessId) {
            dometopiaSessionCookie = `PHPSESSID=${phpSessId.value}`;
            loginWin.close();
            resolve({ success: true, cookie: dometopiaSessionCookie });
          }
        }
      });

      loginWin.on('closed', () => {
        // If user closes window without successfully logging in
        if (!dometopiaSessionCookie) {
           resolve({ success: false, error: 'User closed the login window without logging in.' });
        }
      });
    });
  });

  ipcMain.handle('get-dometopia-session', () => {
     return { success: true, cookie: dometopiaSessionCookie };
  });

  ipcMain.handle('scrape-category', async (_: any, url: string) => {
    try {
      const result = await scrapeCategoryLinks(url, dometopiaSessionCookie);
      return result;
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('upload-naver-image', async (_: any, clientId: string, clientSecret: string, imageUrl: string) => {
    try {
      const naverUrl = await uploadImageToNaverFromUrl({ clientId, clientSecret }, imageUrl);
      return { success: true, url: naverUrl };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('fetch-smartstore', async (_: any, clientId: string, clientSecret: string) => {
    try {
      const orders = await fetchSmartStoreOrders({ clientId, clientSecret });
      return { success: true, data: orders };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('register-product', async (_: any, clientId: string, clientSecret: string, productData: string[]) => {
    try {
      const result = await registerSmartStoreProduct({ clientId, clientSecret }, productData);
      return { success: true, ...result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('update-product', async (_: any, clientId: string, clientSecret: string, channelProductNo: string, productData: string[]) => {
    try {
      const result = await updateSmartStoreProduct({ clientId, clientSecret }, channelProductNo, productData);
      return { success: true, ...result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.on('open-external-window', (_: unknown, url: string) => {
    shell.openExternal(url);
  });

  ipcMain.on('open-external-window', (_: unknown, url: string) => {
    shell.openExternal(url);
  });

  // Cafe24 Handlers
  ipcMain.handle('register-cafe24-product', async (_: unknown, credentials: any, payload: Cafe24ProductPayload) => {
    try {
      const result = await createCafe24Product(credentials.mallId, payload);
      return result;
    } catch (error: unknown) {
      const err = error as any;
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('update-cafe24-product', async (_: unknown, credentials: any, productNo: number, payload: Partial<Cafe24ProductPayload>) => {
    try {
      const result = await updateCafe24Product(credentials.mallId, productNo, payload);
      return result;
    } catch (error: unknown) {
      const err = error as any;
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('delete-cafe24-product', async (_: unknown, credentials: any, productNo: number) => {
    try {
      const result = await deleteCafe24Product(credentials.mallId, productNo);
      return result;
    } catch (error: unknown) {
      const err = error as any;
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('google-auth', async () => {
    try {
      const authClient = await authorize();
      
      const accessToken = authClient.credentials.access_token;
      if (!accessToken) {
         throw new Error('Google 서버와의 연결이 원활하지 않습니다.\n앱을 껐다가 다시 실행해 주세요.');
      }

      // 1-Click License Check against the Next.js unified endpoint
      const apiUrl = app.isPackaged ? 'https://wise-web.vercel.app/api/verify-license' : 'http://localhost:3000/api/verify-license';
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken })
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '라이선스 확인 실패');
      }

      return { success: true, email: result.email, tier: result.tier };
    } catch (error: any) {
      console.error('### GOOGLE AUTH CRASH ###', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('google-logout', async () => {
    try {
      const result = logout();
      return { success: true, loggedOut: result };
    } catch (error: any) {
      console.error('### GOOGLE LOGOUT CRASH ###', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('create-sheet', async (_: any, title: string) => {
    try {
      const spreadsheetId = await createSpreadsheet(title);
      return { success: true, spreadsheetId };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('write-sheet', async (_: any, spreadsheetId: string, range: string, values: string[][]) => {
    try {
      await writeToSheet(spreadsheetId, range, values);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('update-sheet-cell', async (_: any, spreadsheetId: string, range: string, value: string) => {
    try {
      await updateSheetCell(spreadsheetId, range, value);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('read-sheet', async (_: any, spreadsheetId: string, range: string) => {
    try {
      const values = await readFromSheet(spreadsheetId, range);
      return { success: true, data: values };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('read-master-sheet-full', async (_, spreadsheetId: string) => {
    try {
      // Read all rows A through E (도매처이름, 상품번호(SKU), 스마트스토어채널번호, 업로드단가, 최초연동일시)
      // Master DB columns: A(Vendor), B(VendorItemCode), C(SmartStoreProductNo), D(Price), E(Date)
      const data = await readFromSheet(spreadsheetId, 'A:E');
      return { success: true, data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('fetch-smartstore-product-status', async (_, { credentials, channelProductNo }: { credentials: { clientId: string, clientSecret: string }, channelProductNo: string }) => {
      try {
          const status = await fetchSmartstoreProductStatus(credentials, channelProductNo);
          return { success: true, status };
      } catch (error: any) {
          return { success: false, error: error.message };
      }
  });

  ipcMain.handle('update-smartstore-status', async (_, { credentials, channelProductNo, statusType }: { credentials: { clientId: string, clientSecret: string }, channelProductNo: string, statusType: string }) => {
      try {
          const result = await updateSmartstoreProductStatus(credentials, channelProductNo, statusType as 'SALE' | 'OUTOFSTOCK');
          return { success: true, result };
      } catch (error: any) {
          return { success: false, error: error.message };
      }
  });

  ipcMain.handle('delete-smartstore-product', async (_, { credentials, channelProductNo }: { credentials: { clientId: string, clientSecret: string }, channelProductNo: string }) => {
      try {
          const result = await deleteSmartstoreProduct(credentials, channelProductNo);
          return { success: true, result };
      } catch (error: any) {
          return { success: false, error: error.message };
      }
  });

  ipcMain.handle('update-smartstore-price', async (_, { credentials, channelProductNo, newPrice }: { credentials: { clientId: string, clientSecret: string }, channelProductNo: string, newPrice: number }) => {
      try {
          const result = await updateSmartStorePrice(credentials, channelProductNo, newPrice);
          return { success: true, result };
      } catch (error: any) {
          return { success: false, error: error.message };
      }
  });

  ipcMain.handle('check-dometopia-status', async (_, itemCode: string) => {
      try {
          const result = await checkDometopiaStatus(itemCode, dometopiaSessionCookie);
          return { success: true, ...result };
      } catch (error: any) {
          return { success: false, error: error.message };
      }
  });

  ipcMain.handle('get-or-create-master-sheet', async () => {
    try {
      const sheetId = await getOrCreateMasterSheet();
      return { success: true, sheetId };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('append-to-master-sheet', async (_: any, sheetId: string, values: any[][]) => {
    try {
      await appendToMasterSheet(sheetId, values);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
