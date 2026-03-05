import React, { useState } from 'react';

interface SyncStepProps {
    masterSheetId: string;
}

export const SyncStepMaster: React.FC<SyncStepProps> = ({ masterSheetId }) => {
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncProgress, setSyncProgress] = useState(0);
    const [syncTotal, setSyncTotal] = useState(0);
    const [syncLogs, setSyncLogs] = useState<string[]>([]);
    const [credentials, setCredentials] = useState({
        clientId: localStorage.getItem('naverClientId') || '',
        clientSecret: localStorage.getItem('naverClientSecret') || ''
    });

    const addLog = (msg: string) => {
        setSyncLogs(prev => [...prev, msg]);
    };

    const handleCredentialsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setCredentials(prev => {
            const newCreds = { ...prev, [name]: value };
            localStorage.setItem(name === 'clientId' ? 'naverClientId' : 'naverClientSecret', value);
            return newCreds;
        });
    };

    const handleSync = async () => {
        if (!masterSheetId) {
            alert('마스터 DB 시트가 연결되지 않았습니다. 앱을 재접속(구글 인증) 해주세요.');
            return;
        }
        if (!credentials.clientId || !credentials.clientSecret) {
            alert('네이버 커머스 API 인증 정보(Client ID, Secret)를 기입해주세요.');
            return;
        }

        setIsSyncing(true);
        setSyncLogs([]);
        setSyncProgress(0);
        setSyncTotal(0);

        try {
            addLog('1. 마스터 DB 전체 상품 목록 스캔 중...');

            // IPC call with a timeout in case the main process or Google API hangs indefinitely
            const readRes = await Promise.race([
                window.electron.ipcRenderer.invoke('read-master-sheet-full', masterSheetId),
                new Promise<any>((_, reject) => setTimeout(() => reject(new Error('마스터 DB 로딩 시간 초과 (15초). 앱을 재시작해주세요.')), 15000))
            ]);

            if (!readRes || !readRes.success || !readRes.data) {
                throw new Error(readRes?.error || 'Failed to read Master DB');
            }

            // data: [ [도매처, 상품코드, 채널상품번호, 가격, 일자], ... ]
            // The first row is the header.
            const rows = readRes.data;
            if (rows.length <= 1) {
                addLog('마스터 DB에 등록된 상품이 없습니다. 수집/연동을 먼저 진행해주세요.');
                setIsSyncing(false);
                return;
            }

            // Exclude header row. Map to a structured object.
            // A=0(Vendor), B=1(ItemCode), C=2(SmartStoreProductNo), D=3(Price), E=4(Date)
            const masterProducts = rows.slice(1).map((row, index) => ({
                rowIndex: index + 2, // 1-based index + header offset
                vendor: row[0] || '',
                itemCode: row[1] || '',
                channelProductNo: row[2] || '',
                price: row[3] || '',
                date: row[4] || ''
            })).filter(p => p.channelProductNo && !p.itemCode.includes('[스토어삭제됨]') && !p.vendor.includes('[스토어삭제됨]'));

            const total = masterProducts.length;
            setSyncTotal(total);
            addLog(`총 ${total}개의 상품을 네이버 스마트스토어와 대조합니다.`);

            let successCount = 0;
            let skipCount = 0;
            let errorCount = 0;
            let deletedCount = 0;

            for (let i = 0; i < total; i++) {
                const product = masterProducts[i];
                const productDesc = `[${product.vendor}] ${product.itemCode} (채널:${product.channelProductNo})`;
                setSyncProgress(i + 1);

                // Check if user manually marked '삭제' or '단종' in MasterDB vendor code or somewhere. (Case D/Sync 1 prep)
                // If ItemCode contains '[단종]', we will delete it.
                if (product.itemCode.includes('[단종]') || product.itemCode.includes('[삭제]')) {
                    addLog(`🗑️ 단종 처리 대상 발견: ${productDesc}`);
                    try {
                        await window.electron.ipcRenderer.invoke('delete-smartstore-product', {
                            credentials,
                            channelProductNo: product.channelProductNo
                        });
                        addLog(`  ✅ 스마트스토어 판매삭제 완료`);
                        deletedCount++;
                    } catch (err: any) {
                        addLog(`  ❌ 판매삭제 실패: ${String(err)}`);
                        errorCount++;
                    }
                    continue;
                }

                // Normal Case: Fetch current status from SmartStore
                try {
                    const statusRes = await window.electron.ipcRenderer.invoke('fetch-smartstore-product-status', {
                        credentials,
                        channelProductNo: product.channelProductNo
                    });

                    if (!statusRes.success) {
                        throw new Error(statusRes.error);
                    }

                    const smartStoreStatus = statusRes.status; // 'SALE', 'OUTOFSTOCK', 'NOT_FOUND', etc.

                    // Case C: Missing from SmartStore (404 Not Found or Explicitly Deleted 403)
                    if (smartStoreStatus === 'NOT_FOUND') {
                        addLog(`⚠️ 스토어 미존재(수동삭제됨) 상품 발견: ${productDesc}`);
                        addLog(`  🧹 마스터 DB 정리 수행됨 -> [스토어삭제됨] 마킹`);
                        // Update MasterDB row Vendor code to mark it as [스토어삭제됨]
                        await window.electron.ipcRenderer.invoke('update-sheet-cell', masterSheetId, `B${product.rowIndex}`, `[스토어삭제됨] ${product.itemCode}`);
                        deletedCount++;
                        continue;
                    }

                    // For now, MasterDB doesn't natively store its own Sale Status in a dedicated column, 
                    // it only stores that the item was synced. In Phase 9, MasterDB is assumed to represent "SALE" 
                    // unless marked with [단종] (checked above) or later expanded with a Status column.
                    // If SmartStore says it's OUTOFSTOCK but it exists in MasterDB (and not marked 단종), 
                    // this means someone manually out-of-stocked it or it's a discrepancy. 
                    // For now, if we want MasterDB to be the Source of Truth of "SALE", we should enforce SALE.
                    if (smartStoreStatus === 'OUTOFSTOCK' || smartStoreStatus === 'SUSPENSION') {
                        addLog(`🔄 상태 불일치 발견 (스토어:품절/중지 -> DB기준:판매중 표출): ${productDesc}`);
                        const updateRes = await window.electron.ipcRenderer.invoke('update-smartstore-status', {
                            credentials,
                            channelProductNo: product.channelProductNo,
                            statusType: 'SALE'
                        });
                        if (updateRes.success) {
                            addLog(`  ✅ '판매중' 상태로 복원 완료`);
                            successCount++;
                        } else {
                            addLog(`  ❌ 상태 복원 실패: ${updateRes.error}`);
                            errorCount++;
                        }
                    } else if (smartStoreStatus === 'SALE') {
                        addLog(`✓ 정상 씽크 유지 중: ${productDesc}`);
                        skipCount++;
                    } else {
                        addLog(`? 알 수 없는 상태(${smartStoreStatus}): ${productDesc}`);
                        skipCount++;
                    }

                } catch (err: any) {
                    addLog(`❌ 파악 실패 ${productDesc}: ${String(err)}`);
                    errorCount++;
                }
            }

            addLog(`\n🎉 씽크 작업이 모두 완료되었습니다!`);
            addLog(`결과: 상태복원 ${successCount}건, 유지 ${skipCount}건, DB청소/스토어삭제 ${deletedCount}건, 실패 ${errorCount}건`);

        } catch (err: any) {
            addLog(`❌ 동기화 중 오류가 발생했습니다: ${String(err)}`);
        } finally {
            setIsSyncing(false);
        }
    };

    return (
        <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
            <div className="glass-panel" style={{ marginBottom: '24px' }}>
                <div className="panel-title">🔄 스마트스토어 - 마스터 DB 씽크 맞추기</div>
                <p style={{ color: '#cbd5e1', marginBottom: '24px', fontSize: '15px', lineHeight: '1.6' }}>
                    구글 드라이브에 안전하게 보관된 <b>[WISE] 내 상품 마스터 DB</b>의 기록을
                    단일 진실 공급원(Source of Truth)으로 삼아,
                    현재 네이버 스마트스토어의 상품 상태를 대조하고 일치시킵니다.
                </p>

                <div style={{ background: 'var(--color-surface-elevated)', border: '1px solid var(--color-border)', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-primary)', marginBottom: '8px' }}>데이터 무결성 보호 대상</div>
                    <ul style={{ color: 'var(--color-text-dim)', fontSize: '14px', lineHeight: '1.5', margin: 0, paddingLeft: '20px' }}>
                        <li>마스터 DB에 존재하지 않는 상품(판매자가 수동 등록한 자체 상품 등)은 스캔을 회피하여 안전하게 보호됩니다.</li>
                        <li>스토어에서 삭제된 데이터(404 Not Found) 발견 시 마스터 DB를 청소하여 쓰레기 데이터를 비웁니다.</li>
                        <li>마스터 DB에서 상품명에 [단종] 등 특수 표기가 들어간 행은 스토어에서 판매중지/삭제 처리하여 동기화합니다.</li>
                    </ul>
                </div>

                <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>네이버 커머스 API 인증 (조회/수정용)</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div className="input-group">
                            <input
                                type="text"
                                name="clientId"
                                value={credentials.clientId}
                                onChange={handleCredentialsChange}
                                placeholder="Client ID"
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div className="input-group">
                            <input
                                type="password"
                                name="clientSecret"
                                value={credentials.clientSecret}
                                onChange={handleCredentialsChange}
                                placeholder="Client Secret"
                                style={{ width: '100%' }}
                            />
                        </div>
                    </div>
                </div>

                <button
                    className="primary"
                    onClick={handleSync}
                    disabled={isSyncing}
                    style={{ width: '100%', padding: '16px', fontSize: '16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
                >
                    {isSyncing ? (
                        <>
                            <div className="spinner" style={{ width: '20px', height: '20px', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                            <span>대조 및 씽크 맞추기 진행 중... ({syncProgress}/{syncTotal})</span>
                        </>
                    ) : (
                        <>
                            <span>🚀 스마트스토어 기준 데이터 정리 시작</span>
                        </>
                    )}
                </button>
            </div>

            {/* Sync Progress & Logs */}
            {syncLogs.length > 0 && (
                <div className="glass-panel" style={{ background: '#1e293b' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)', fontWeight: 600, fontSize: '14px', color: '#94a3b8' }}>
                        상호 대조 작업 로그
                    </div>
                    <div
                        className="custom-scrollbar"
                        style={{ padding: '16px', maxHeight: '300px', overflowY: 'auto', fontSize: '13px', fontFamily: 'monospace', lineHeight: '1.6', color: '#cbd5e1' }}>
                        {syncLogs.map((log, idx) => (
                            <div key={idx} style={{
                                marginBottom: '4px',
                                color: log.includes('✅') ? '#4ade80' :
                                    log.includes('❌') ? '#ef4444' :
                                        log.includes('⚠️') ? '#facc15' :
                                            log.includes('🗑️') ? '#f87171' : 'inherit'
                            }}>
                                {log}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};
