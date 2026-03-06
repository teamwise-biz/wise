import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI & {
      ipcRenderer: {
        invoke(channel: 'update-sheet-cell', sheetId: string, range: string, value: string | number): Promise<{ success: boolean; error?: string }>;
        invoke(channel: 'get-or-create-master-sheet'): Promise<{ success: boolean; sheetId?: string; error?: string }>;
        invoke(channel: 'append-to-master-sheet', sheetId: string, values: any[][]): Promise<{ success: boolean; error?: string }>;
        invoke(channel: 'read-master-sheet-full', sheetId: string): Promise<{ success: boolean; data?: any[][]; error?: string }>;
        invoke(channel: 'fetch-smartstore-product-status', data: { credentials: any; channelProductNo: string }): Promise<{ success: boolean; status?: string; error?: string }>;
        invoke(channel: 'update-smartstore-status', data: { credentials: any; channelProductNo: string; statusType: string }): Promise<{ success: boolean; result?: boolean; error?: string }>;
        invoke(channel: 'delete-smartstore-product', data: { credentials: any; channelProductNo: string }): Promise<{ success: boolean; result?: boolean; error?: string }>;
        invoke(channel: 'supabase-auth'): Promise<{ success: boolean; email?: string; error?: string }>;
        invoke(channel: 'scrape-category', url: string): Promise<{ success: boolean; links?: string[]; error?: string }>;
        invoke(channel: string, ...args: any[]): Promise<any>;
      }
    }
    api: unknown
  }
}
