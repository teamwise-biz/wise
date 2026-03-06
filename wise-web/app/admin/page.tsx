import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Fetch user's subscription data
    const { data: subData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    // Prepare variables for display
    const hasActiveSub = subData && (subData.status === 'active' || subData.status === 'trialing' || subData.status === 'trial' || subData.plan_id?.includes('trial'));
    const planName = subData?.plan_id || '무료 대기 (Free)';
    const statusStr = subData ? subData.status : 'none';
    const statusText = statusStr.charAt(0).toUpperCase() + statusStr.slice(1);
    const statusColor = hasActiveSub ? '#10B981' : (statusStr === 'none' ? 'var(--text-muted)' : '#EF4444');
    const statusBg = hasActiveSub ? 'rgba(16, 185, 129, 0.2)' : (statusStr === 'none' ? 'rgba(255,255,255,0.1)' : 'rgba(239, 68, 68, 0.2)');

    return (
        <div className="container animate-fade-in" style={{ padding: '60px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px' }}>관리자 대시보드</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        환영합니다, <strong style={{ color: 'var(--text-primary)' }}>{user.email}</strong>님!
                    </p>
                </div>
                <form action="/auth/signout" method="post">
                    <button className="btn-secondary" style={{ padding: '10px 20px', fontSize: '0.9rem', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)' }}>
                        로그아웃
                    </button>
                </form>
            </div>

            <div style={statsGridStyles}>
                <div className="glass-panel animate-slide-up delay-100" style={statCardStyles}>
                    <div style={statLabelStyles}>내 활성 라이선스</div>
                    <div style={statValueStyles}>{hasActiveSub ? 1 : 0} <span style={{ fontSize: '1rem', fontWeight: 'normal' }}>개</span></div>
                </div>
                <div className="glass-panel animate-slide-up delay-100" style={statCardStyles}>
                    <div style={statLabelStyles}>현재 플랜</div>
                    <div style={{ ...statValueStyles, color: hasActiveSub ? 'var(--accent-secondary)' : 'var(--text-muted)', fontSize: '1.5rem' }}>
                        {planName}
                        {hasActiveSub && <span style={{ fontSize: '1rem', fontWeight: 'normal', color: 'var(--text-primary)' }}> (이용 중)</span>}
                    </div>
                </div>
            </div>

            <div className="glass-panel animate-slide-up delay-200" style={{ padding: '32px', marginBottom: '40px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '16px' }}>앱 다운로드</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                    유효한 라이선스(Pro 또는 무료 체험)를 보유한 회원만 다운로드할 수 있습니다.
                </p>
                <div style={{ display: 'flex', gap: '16px' }}>
                    {hasActiveSub ? (
                        <a href="/download" className="btn-primary" style={{ padding: '14px 24px', textDecoration: 'none', display: 'inline-block' }}>
                            💻 Windows 버전 다운로드 (v3.0.0)
                        </a>
                    ) : (
                        <a href="/pricing" className="btn-primary" style={{ padding: '14px 24px', textDecoration: 'none', display: 'inline-block', opacity: 0.8 }}>
                            🛒 라이선스 구매하기
                        </a>
                    )}
                </div>
            </div>

            <div className="glass-panel animate-slide-up delay-300" style={{ padding: '32px', overflowX: 'auto' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '24px' }}>라이선스 상태</h3>
                <table style={tableStyles}>
                    <thead>
                        <tr>
                            <th style={thStyles}>Email</th>
                            <th style={thStyles}>가입일</th>
                            <th style={thStyles}>플랜</th>
                            <th style={thStyles}>상태</th>
                            <th style={thStyles}>만료일</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style={trStyles}>
                            <td style={{ ...tdStyles, fontWeight: 500 }}>{user.email}</td>
                            <td style={{ ...tdStyles, color: 'var(--text-secondary)' }}>{new Date(user.created_at).toLocaleDateString()}</td>
                            <td style={tdStyles}>{planName}</td>
                            <td style={tdStyles}>
                                <span style={{
                                    ...statusBadgeStyles,
                                    background: statusBg,
                                    color: statusColor
                                }}>
                                    {statusText}
                                </span>
                            </td>
                            <td style={{ ...tdStyles, color: 'var(--text-secondary)' }}>
                                {subData?.current_period_end ? new Date(subData.current_period_end).toLocaleDateString() : '-'}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}

const statsGridStyles: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '24px',
    marginBottom: '40px',
};

const statCardStyles: React.CSSProperties = {
    padding: '24px',
};

const statLabelStyles: React.CSSProperties = {
    color: 'var(--text-secondary)',
    fontSize: '0.9rem',
    marginBottom: '12px',
};

const statValueStyles: React.CSSProperties = {
    fontSize: '2rem',
    fontWeight: 800,
    color: 'var(--text-primary)',
};

const tableStyles: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
};

const thStyles: React.CSSProperties = {
    padding: '16px',
    borderBottom: '1px solid var(--border-color)',
    color: 'var(--text-secondary)',
    fontWeight: 500,
    fontSize: '0.9rem',
};

const tdStyles: React.CSSProperties = {
    padding: '16px',
    borderBottom: '1px solid rgba(255,255,255,0.02)',
    fontSize: '0.95rem',
};

const trStyles: React.CSSProperties = {
    transition: 'background 0.2s',
};

const statusBadgeStyles: React.CSSProperties = {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '0.8rem',
    fontWeight: 600,
};
