import React, { useState } from 'react';
export type ScrapeMethod = 'product' | 'category' | 'search';

interface DataPrepStepProps {
    sheetId: string | null;
    handleCreateSheet: () => Promise<void>;
    handleOpenSheet: () => Promise<void>;
    scrapeMethod: ScrapeMethod;
    setScrapeMethod: (method: ScrapeMethod) => void;
    scrapeQuery: string;
    setScrapeQuery: (url: string) => void;
    handleScrape: () => Promise<void>;
    isScraping: boolean;
    handleCancelScrape: () => void;
}

export const DataPrepStep: React.FC<DataPrepStepProps> = ({
    sheetId,
    handleCreateSheet,
    handleOpenSheet,
    scrapeMethod,
    setScrapeMethod,
    scrapeQuery,
    setScrapeQuery,
    handleScrape,
    isScraping,
    handleCancelScrape
}) => {
    const [activeTab, setActiveTab] = useState<'manual' | 'auto'>('manual');

    // 카테고리 검색기 전용 상태
    const [catSearchKeyword, setCatSearchKeyword] = useState('');
    const [isSearchingCat, setIsSearchingCat] = useState(false);
    const [catResults, setCatResults] = useState<any[]>([]);

    const handleSearchCategory = async () => {
        if (!catSearchKeyword.trim()) return;
        setIsSearchingCat(true);
        try {
            // 하드코딩된 API 키 (개발 편의를 위해 App.tsx와 동일하게 적용)
            const clientId = '4aTjpvduCQkMgmJjioSzFK';
            const clientSecret = '$2a$04$UNqs4AJrZASKpHqfUFGxOe';
            const res = await window.electron.ipcRenderer.invoke('search-categories', clientId, clientSecret, catSearchKeyword);

            if (res.success && res.data) {
                setCatResults(res.data);
            } else {
                setCatResults([]);
                alert('검색 결과가 없습니다.');
            }
        } catch (e) {
            console.error(e);
            alert('카테고리 검색 중 오류가 발생했습니다.');
        } finally {
            setIsSearchingCat(false);
        }
    };

    const handleCopyId = (id: string) => {
        navigator.clipboard.writeText(id).then(() => {
            alert(`카테고리 ID [${id}] 가 복사되었습니다!\n구글 시트에 바로 붙여넣기(Ctrl+V) 하세요.`);
        });
    };

    const getPlaceholder = () => {
        if (scrapeMethod === 'product') return "도매토피아 상품번호 입력 (여러 개일 경우 줄바꿈으로 구분)";
        if (scrapeMethod === 'category') return "도매토피아 카테고리 코드 (예: 0177)";
        return "도매토피아 검색어 (예: 텀블러)";
    };

    return (
        <div className="animate-fade-in">
            {/* Sheet Connection Status Box */}
            <div className="glass-panel" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div className="panel-title" style={{ margin: 0 }}>📊 데이터베이스 연동</div>
                </div>

                <p style={{ color: '#cbd5e1', marginBottom: '20px', fontSize: '15px' }}>
                    상품 정보를 안전하게 보관할 구글 스프레드시트를 생성하고 연결합니다.
                </p>

                {!sheetId ? (
                    <button className="primary" onClick={handleCreateSheet}>
                        📝 상품 마스터 시트 생성
                    </button>
                ) : (
                    <div style={{
                        padding: '16px 20px',
                        backgroundColor: 'rgba(16, 185, 129, 0.08)',
                        color: '#34d399',
                        border: '1px solid rgba(16, 185, 129, 0.2)',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ fontSize: '20px' }}>✅</div>
                            <div>
                                <div style={{ fontWeight: 600, marginBottom: '4px' }}>스프레드시트가 성공적으로 연동되었습니다</div>
                                <div style={{ opacity: 0.8, fontSize: '13px', fontFamily: 'monospace' }}>ID: {sheetId}</div>
                            </div>
                        </div>
                        <button className="success" onClick={handleOpenSheet} style={{ padding: '8px 16px', fontSize: '14px' }}>
                            ✨ 브라우저에서 열기
                        </button>
                    </div>
                )}
            </div>

            {/* Content Tabs (Only active if Sheet is ready) */}
            <div style={{
                opacity: sheetId ? 1 : 0.5,
                pointerEvents: sheetId ? 'auto' : 'none',
                transition: 'opacity 0.3s ease'
            }}>
                {/* Tab Navigation */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                    <button
                        onClick={() => setActiveTab('manual')}
                        style={{
                            flex: 1,
                            padding: '16px',
                            background: activeTab === 'manual' ? 'var(--color-primary)' : 'var(--color-surface-elevated)',
                            color: activeTab === 'manual' ? '#fff' : 'var(--color-text)',
                            border: '1px solid',
                            borderColor: activeTab === 'manual' ? 'var(--color-primary)' : 'var(--color-border)',
                            borderRadius: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <span style={{ fontSize: '24px' }}>✍️</span>
                        <span>엑셀 수동 작성 (직접 입력)</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('auto')}
                        style={{
                            flex: 1,
                            padding: '16px',
                            background: activeTab === 'auto' ? 'var(--color-primary)' : 'var(--color-surface-elevated)',
                            color: activeTab === 'auto' ? '#fff' : 'var(--color-text)',
                            border: '1px solid',
                            borderColor: activeTab === 'auto' ? 'var(--color-primary)' : 'var(--color-border)',
                            borderRadius: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <span style={{ fontSize: '24px' }}>🤖</span>
                        <span>도매처 자동 수집 (대량 생성)</span>
                    </button>
                </div>

                {/* Tab Content */}
                <div className="glass-panel" style={{ minHeight: '300px' }}>
                    {activeTab === 'manual' && (
                        <div className="animate-fade-in" style={{ textAlign: 'center', padding: '40px 20px' }}>
                            <div style={{ fontSize: '48px', marginBottom: '24px' }}>📊</div>
                            <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px', color: '#f8fafc' }}>
                                직접 엑셀에 데이터를 입력하세요
                            </h3>
                            <p style={{ color: '#94a3b8', lineHeight: '1.6', maxWidth: '400px', margin: '0 auto 32px' }}>
                                상단의 <strong>[✨ 브라우저에서 열기]</strong> 버튼을 눌러 생성된 구글 시트에 접속한 뒤, 규격화된 헤더 양식에 맞추어 원하는 판매 상품의 정보를 복사/붙여넣기 하세요.<br /><br />
                                <span style={{ color: 'var(--color-primary)', fontWeight: 500 }}>입력을 완료했다면 우측 하단의 [다음 단계]를 눌러 스토어로 전송하세요.</span>
                            </p>

                            {/* 네이버 카테고리 검색기 UI */}
                            <div style={{
                                marginTop: '32px',
                                padding: '24px',
                                background: 'var(--color-surface-0)',
                                borderRadius: '16px',
                                border: '1px solid var(--color-border)',
                                textAlign: 'left'
                            }}>
                                <h4 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    🔍 네이버 스마트스토어 카테고리 검색기
                                    <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#94a3b8', background: 'var(--color-surface-elevated)', padding: '2px 8px', borderRadius: '12px' }}>수동 입력용 도우미</span>
                                </h4>

                                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                                    <input
                                        type="text"
                                        placeholder="어떤 상품을 등록하시나요? (예: 텀블러, 요가매트)"
                                        value={catSearchKeyword}
                                        onChange={(e) => setCatSearchKeyword(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearchCategory()}
                                        style={{ flex: 1, padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface-elevated)' }}
                                    />
                                    <button
                                        onClick={handleSearchCategory}
                                        disabled={isSearchingCat}
                                        style={{ padding: '12px 24px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
                                    >
                                        {isSearchingCat ? '검색 중...' : '검색'}
                                    </button>
                                </div>

                                {catResults.length > 0 && (
                                    <div style={{ maxHeight: '200px', overflowY: 'auto', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface-elevated)' }}>
                                        {catResults.map((cat, idx) => (
                                            <div
                                                key={cat.id}
                                                style={{
                                                    padding: '12px 16px',
                                                    borderBottom: idx === catResults.length - 1 ? 'none' : '1px solid var(--color-border)',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center'
                                                }}
                                            >
                                                <div style={{ fontSize: '14px', color: '#e2e8f0' }}>{cat.name}</div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <span style={{ fontSize: '13px', color: '#94a3b8', fontFamily: 'monospace' }}>ID: {cat.id}</span>
                                                    <button
                                                        onClick={() => handleCopyId(cat.id.toString())}
                                                        style={{ padding: '6px 12px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '6px', fontSize: '13px', cursor: 'pointer' }}
                                                    >
                                                        📋 복사
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'auto' && (
                        <div className="animate-fade-in">
                            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: '#f8fafc' }}>🔍 도매토피아 연동 자동화</h3>
                            <p style={{ color: '#94a3b8', marginBottom: '24px', fontSize: '14px', lineHeight: '1.6' }}>
                                도매처의 상품 데이터(상품명, 가격, 이미지, 상세설명)를 즉시 스크래핑하여 엑셀 양식에 맞춰 자동으로 채워 넣습니다.
                            </p>

                            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', padding: '16px', background: 'var(--color-surface-0)', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#f8fafc', cursor: 'pointer', fontWeight: 500 }}>
                                    <input type="radio" value="product" checked={scrapeMethod === 'product'} onChange={() => setScrapeMethod('product')} style={{ accentColor: 'var(--color-primary)', width: '18px', height: '18px' }} />
                                    🆔 상품번호 (단일)
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#f8fafc', cursor: 'pointer', fontWeight: 500 }}>
                                    <input type="radio" value="category" checked={scrapeMethod === 'category'} onChange={() => setScrapeMethod('category')} style={{ accentColor: 'var(--color-primary)', width: '18px', height: '18px' }} />
                                    📂 카테고리 (대량)
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#f8fafc', cursor: 'pointer', fontWeight: 500 }}>
                                    <input type="radio" value="search" checked={scrapeMethod === 'search'} onChange={() => setScrapeMethod('search')} style={{ accentColor: 'var(--color-primary)', width: '18px', height: '18px' }} />
                                    🔍 검색어 (대량)
                                </label>
                            </div>

                            <div className="input-group" style={{ flexWrap: 'wrap', alignItems: 'flex-start' }}>
                                {scrapeMethod === 'product' ? (
                                    <textarea
                                        value={scrapeQuery}
                                        onChange={(e) => setScrapeQuery(e.target.value)}
                                        placeholder={getPlaceholder()}
                                        style={{ flex: '1 1 300px', minWidth: '300px', minHeight: '100px', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface-elevated)', color: 'var(--color-text)', resize: 'vertical' }}
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        value={scrapeQuery}
                                        onChange={(e) => setScrapeQuery(e.target.value)}
                                        placeholder={getPlaceholder()}
                                        style={{ flex: '1 1 300px', minWidth: '300px' }}
                                    />
                                )}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {isScraping ? (
                                        <button
                                            className="primary"
                                            onClick={handleCancelScrape}
                                            style={{ flex: '0 0 auto', whiteSpace: 'nowrap', padding: '14px 24px', fontSize: '15px', background: '#ef4444', borderColor: '#ef4444' }}
                                        >
                                            ⏹ 수집 강제 중단
                                        </button>
                                    ) : (
                                        <button className="primary" onClick={handleScrape} disabled={!scrapeQuery} style={{ flex: '0 0 auto', whiteSpace: 'nowrap', padding: '14px 24px', fontSize: '15px' }}>
                                            📥 수집 진행 및 시트 기록
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
