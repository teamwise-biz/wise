import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export default async function DownloadPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    // Check subscription status
    const { data: subData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    const hasActiveSub = subData && (subData.status === 'active' || subData.status === 'trialing' || subData.status === 'trial' || subData.plan_id?.includes('trial'));

    if (!hasActiveSub) {
        return (
            <div className="container" style={{ paddingTop: '120px', paddingBottom: '80px', textAlign: 'center' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '24px' }}>
                    라이선스가 <span style={{ color: 'var(--accent-secondary)' }}>필요합니다</span>
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem', marginBottom: '40px' }}>
                    <strong>{user.email}</strong>님, 데스크톱 앱을 다운로드하려면 활성화된 라이선스가 필요합니다.<br />
                    아래 버튼을 눌러 요금제를 확인해 주세요.
                </p>
                <a href="/pricing" className="btn-primary" style={{ padding: '16px 32px', fontSize: '1.1rem', textDecoration: 'none' }}>
                    🛒 요금제 보러가기
                </a>
            </div>
        );
    }

    return (
        <div className="container" style={{ paddingTop: '80px', paddingBottom: '80px' }}>
            <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '16px' }}>
                    WISE 솔루션 <span className="gradient-text-accent">다운로드</span>
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem' }}>
                    <strong>{user.email}</strong>님의 라이선스는 현재 <strong style={{ color: 'var(--accent-success)' }}>활성(Active)</strong> 상태입니다.<br />
                    아래 링크에서 최신 버전의 앱을 다운로드할 수 있습니다.
                </p>
            </div>

            <div style={downloadGridStyles}>
                {/* Windows Download */}
                <div className="glass-panel" style={downloadCardStyles}>
                    <div style={{ fontSize: '4rem', marginBottom: '24px' }}>🪟</div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '8px' }}>Windows 용</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
                        Windows 10, 11 (64-bit)<br />버전 3.0.0
                    </p>
                    <button className="btn-primary" style={{ width: '100%', padding: '16px', fontSize: '1.1rem' }}>
                        .exe 다운로드 (135MB)
                    </button>
                </div>

                {/* Mac Download */}
                <div className="glass-panel" style={downloadCardStyles}>
                    <div style={{ fontSize: '4rem', marginBottom: '24px' }}>🍎</div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '8px' }}>macOS 용</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
                        macOS 12.0 이상 (Apple Silicon / Intel)<br />버전 3.0.0
                    </p>
                    <button className="btn-secondary" style={{ width: '100%', padding: '16px', fontSize: '1.1rem' }}>
                        .dmg 다운로드 (152MB)
                    </button>
                </div>
            </div>

            <div className="glass-panel" style={{ marginTop: '60px', padding: '32px', maxWidth: '800px', margin: '60px auto 0' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '16px' }}>설치 안내</h3>
                <ol style={{ paddingLeft: '24px', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                    <li>다운로드한 파일을 더블 클릭하여 설치를 진행합니다.</li>
                    <li>Mac의 경우 시스템 설정에서 &apos;확인되지 않은 개발자의 앱 열기&apos;를 허용해야 할 수 있습니다.</li>
                    <li>바탕화면에 생성된 WISE 아이콘을 실행합니다.</li>
                    <li>웹사이트에서 가입하신 <strong>Google 계정</strong>으로 앱 내에서 로그인하면 즉시 사용 가능합니다.</li>
                </ol>
            </div>
        </div>
    );
}

const downloadGridStyles: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '32px',
    maxWidth: '800px',
    margin: '0 auto',
};

const downloadCardStyles: React.CSSProperties = {
    padding: '40px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
};
