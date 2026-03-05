import React from 'react';
import { SyncStepMaster } from './SyncStepMaster';

type SyncStatus = 'pending' | 'syncing' | 'success' | 'failed';

interface MarketSyncStepProps {
    sheetData: string[][];
    syncStatuses: { [rowIdx: number]: { status: SyncStatus, message: string } };
    handleReadProducts: () => Promise<void>;
    handleSyncProducts: () => Promise<void>;
    handleFetchSmartStoreOrders: () => Promise<void>;
    marginRate: number;
    setMarginRate: React.Dispatch<React.SetStateAction<number>>;
    extraShippingCost: number;
    setExtraShippingCost: React.Dispatch<React.SetStateAction<number>>;
    masterSheetId: string;
}

export const MarketSyncStep: React.FC<MarketSyncStepProps> = ({
    sheetData,
    syncStatuses,
    handleReadProducts,
    handleSyncProducts,
    handleFetchSmartStoreOrders,
    marginRate,
    setMarginRate,
    extraShippingCost,
    setExtraShippingCost,
    masterSheetId
}) => {
    return (
        <div className="animate-fade-in">
            <div className="glass-panel" style={{ marginBottom: '32px' }}>
                <div className="panel-title">🔄 상품 연동 허브</div>
                <p style={{ color: '#cbd5e1', marginBottom: '24px', fontSize: '15px', lineHeight: '1.6' }}>
                    구글 시트에서 미리 세팅된 데이터를 읽어오고 수익률을 지정한 후, 스마트스토어에 일괄 등록합니다.
                </p>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    <button className="secondary" onClick={handleReadProducts} style={{ flexGrow: 1, padding: '14px 24px', fontSize: '15px' }}>
                        📖 1. 등록할 상품 시트에서 가져오기
                    </button>
                </div>
            </div>

            {sheetData.length > 0 && (
                <>
                    <div className="glass-panel" style={{ marginBottom: '32px' }}>
                        <div className="panel-title">💰 2. 수익률 설정 및 데이터 검토</div>
                        <p style={{ color: '#cbd5e1', marginBottom: '24px', fontSize: '14px', lineHeight: '1.6' }}>
                            수집된 원가에 마진율과 고정 부대비용을 더해 스마트스토어 최종 판매가를 결정합니다. 아래 표에서 적용된 가격을 확인할 수 있습니다.
                        </p>

                        <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', marginBottom: '24px' }}>
                            <div style={{ flex: '1 1 200px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: '#e2e8f0' }}>마진율 (%)</label>
                                <input
                                    type="number"
                                    className="input-field"
                                    value={marginRate}
                                    onChange={(e) => setMarginRate(Number(e.target.value))}
                                    style={{ width: '100%', fontSize: '16px' }}
                                    min="0"
                                />
                            </div>
                            <div style={{ flex: '1 1 200px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: '#e2e8f0' }}>추가 배송비 / 고정 마진 (₩)</label>
                                <input
                                    type="number"
                                    className="input-field"
                                    value={extraShippingCost}
                                    onChange={(e) => setExtraShippingCost(Number(e.target.value))}
                                    style={{ width: '100%', fontSize: '16px' }}
                                    min="0"
                                    step="100"
                                />
                            </div>
                        </div>

                        <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--color-border)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>순번</th>
                                        <th>상품명</th>
                                        <th>카테고리ID</th>
                                        <th>판매가 (적용 전 ➔ 후)</th>
                                        <th>상태</th>
                                        <th>응답 / 메시지</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(() => {
                                        const hasHeader = sheetData.length > 0 && (sheetData[0][0] === '카테고리ID' || sheetData[0][1] === '상품명');
                                        const startIndex = hasHeader ? 1 : 0;
                                        const dataRows = hasHeader ? sheetData.slice(1) : sheetData;

                                        return dataRows.map((row, idx) => {
                                            const rowIdx = startIndex + idx;
                                            if (row.length < 6 || !row[0]) return null;
                                            const statusInfo = syncStatuses[rowIdx] || { status: 'pending', message: '연동 대기 중' };

                                            return (
                                                <tr key={rowIdx}>
                                                    <td style={{ whiteSpace: 'nowrap' }}>{idx + 1}번째 상품</td>
                                                    <td style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                        {row[3] ? (
                                                            <img className="table-thumbnail" src={row[3]} alt="thumbnail" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                                        ) : (
                                                            <div className="table-thumbnail" style={{ borderStyle: 'dashed' }} />
                                                        )}
                                                        <div style={{ maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600, letterSpacing: '-0.02em', color: '#f8fafc' }}>
                                                            {row[1]}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span style={{ fontSize: '13px', fontFamily: 'monospace', padding: '4px 8px', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                                                            {row[0]}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span style={{ fontSize: '13px', color: '#94a3b8', textDecoration: 'line-through' }}>
                                                                {parseInt(row[4] || '0').toLocaleString()} ₩
                                                            </span>
                                                            <span style={{ color: '#64748b' }}>➔</span>
                                                            <span style={{ fontSize: '15px', fontWeight: 600, color: '#38bdf8' }}>
                                                                {(Math.floor((parseInt(row[4] || '0') * (1 + marginRate / 100) + extraShippingCost) / 10) * 10).toLocaleString()} ₩
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className={`badge ${statusInfo.status}`}>
                                                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'currentColor' }}></span>
                                                            {statusInfo.status}
                                                        </div>
                                                    </td>
                                                    <td style={{ color: statusInfo.status === 'failed' ? '#f87171' : (statusInfo.status === 'success' ? '#34d399' : '#cbd5e1') }}>
                                                        {statusInfo.message}
                                                    </td>
                                                </tr>
                                            );
                                        });
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="glass-panel" style={{ marginBottom: '32px', textAlign: 'center', padding: '32px' }}>
                        <div style={{ fontSize: '32px', marginBottom: '16px' }}>🚀</div>
                        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>3. 스마트스토어 연동 실행</h3>
                        <p style={{ color: '#cbd5e1', marginBottom: '24px', fontSize: '14px' }}>
                            위의 상품 목록과 최종 가격이 맞다면, 스마트스토어 상품등록 API를 호출하여 내 스토어에 업로드합니다.
                        </p>
                        <button className="primary" onClick={handleSyncProducts} disabled={sheetData.length === 0} style={{ padding: '16px 48px', fontSize: '16px', fontWeight: 600, opacity: sheetData.length === 0 ? 0.5 : 1, cursor: sheetData.length === 0 ? 'not-allowed' : 'pointer' }}>
                            연동(업로드) 시작하기
                        </button>
                    </div>
                </>
            )}

            <hr style={{ border: 'none', borderTop: '1px dashed rgba(255,255,255,0.1)', margin: '48px 0 32px 0' }} />

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px' }}>
                <div style={{ flex: '1 1 500px' }}>
                    <SyncStepMaster masterSheetId={masterSheetId} />
                </div>
                <div style={{ flex: '1 1 300px' }}>
                    <div className="glass-panel" style={{ height: '100%' }}>
                        <div className="panel-title">🛒 주문 관리</div>
                        <p style={{ color: '#cbd5e1', marginBottom: '24px', fontSize: '14px', lineHeight: '1.6' }}>최근 수정된 주문 내역을 실시간으로 가져옵니다.</p>
                        <button className="ghost" onClick={handleFetchSmartStoreOrders} style={{ width: '100%', padding: '14px 24px' }}>
                            📥 24h 주문 마이그레이션
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
