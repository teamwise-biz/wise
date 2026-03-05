import React from 'react';

export type ViewType = 'SOURCING' | 'SYNC' | 'ORDERS' | 'SETTINGS';

interface SidebarProps {
    currentView: ViewType;
    setCurrentView: (view: ViewType) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView }) => {
    const menuItems: { id: ViewType; label: string; icon: string }[] = [
        { id: 'SOURCING', label: '상품 수집 (소싱)', icon: '📦' },
        { id: 'SYNC', label: '마켓 연동 (배포)', icon: '🚀' },
        { id: 'ORDERS', label: '주문 수집', icon: '📝' },
        { id: 'SETTINGS', label: '설정', icon: '⚙️' }
    ];

    return (
        <div style={{
            width: '260px',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(20px)',
            borderRight: '1px solid rgba(255, 255, 255, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            padding: '24px 16px',
            boxShadow: '4px 0 24px rgba(0,0,0,0.05)',
            zIndex: 10
        }}>
            <div style={{ marginBottom: '40px', padding: '0 8px' }}>
                <h1 style={{
                    fontSize: '24px',
                    fontWeight: '800',
                    color: '#2d3748',
                    margin: 0,
                    letterSpacing: '-0.5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <span style={{ fontSize: '28px' }}>🧭</span>
                    WISE<span style={{ color: '#4299e1' }}>.</span>
                </h1>
                <p style={{ color: '#718096', fontSize: '13px', margin: '4px 0 0 0', fontWeight: '500' }}>Multi-Market Hub</p>
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                {menuItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setCurrentView(item.id)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '14px 16px',
                            borderRadius: '12px',
                            border: 'none',
                            backgroundColor: currentView === item.id ? '#4299e1' : 'transparent',
                            color: currentView === item.id ? 'white' : '#4a5568',
                            fontWeight: currentView === item.id ? '600' : '500',
                            fontSize: '15px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            textAlign: 'left',
                            boxShadow: currentView === item.id ? '0 4px 12px rgba(66, 153, 225, 0.3)' : 'none'
                        }}
                        onMouseEnter={(e) => {
                            if (currentView !== item.id) {
                                e.currentTarget.style.backgroundColor = 'rgba(66, 153, 225, 0.1)';
                                e.currentTarget.style.color = '#2b6cb0';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (currentView !== item.id) {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = '#4a5568';
                            }
                        }}
                    >
                        <span style={{ fontSize: '18px' }}>{item.icon}</span>
                        {item.label}
                    </button>
                ))}
            </nav>

            <div style={{
                marginTop: 'auto',
                padding: '16px',
                backgroundColor: 'rgba(255, 255, 255, 0.5)',
                borderRadius: '12px',
                fontSize: '12px',
                color: '#a0aec0',
                textAlign: 'center'
            }}>
                v3.0.0 (Multi-Market Ready)
            </div>
        </div>
    );
};
