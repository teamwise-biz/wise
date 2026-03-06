import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';
import './globals.css';

export const metadata: Metadata = {
  title: 'WISE - 1:N Market Sync Solution',
  description: '다중 도매처와 오픈마켓을 통합 관리하는 지능형 스크래핑 솔루션',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <html lang="ko">
      <body>
        {/* Global Navigation Bar */}
        {/* Global Navigation Bar */}
        <nav className="nav-wrapper" style={navStyles}>
          <div className="container nav-container" style={navContainerStyles}>
            <div style={logoStyles}>
              <Link href="/">
                <span className="gradient-text-accent" style={{ fontWeight: 800, fontSize: '1.5rem', letterSpacing: '-0.5px' }}>
                  WISE
                </span>
              </Link>
            </div>
            <div className="nav-menu" style={menuStyles}>
              <Link href="/" style={linkStyles}>홈</Link>
              <Link href="/pricing" style={linkStyles}>요금제</Link>
              <Link href="/admin" style={linkStyles}>대시보드</Link>
            </div>
            <div className="nav-auth" style={authStyles}>
              {user ? (
                <>
                  <Link href="/admin" className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '8px', border: 'none' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold' }}>
                      {user.email?.charAt(0).toUpperCase()}
                    </div>
                    <span>{user.email?.split('@')[0]}</span>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/login" className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.9rem', display: 'inline-block' }}>
                    로그인
                  </Link>
                  <Link href="/login" className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.9rem', display: 'inline-block' }}>
                    무료 체험
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main style={{ flex: 1, marginTop: '80px', paddingBottom: '60px' }}>
          {children}
        </main>

        {/* Footer */}
        <footer style={footerStyles}>
          <div className="container" style={footerContainerStyles}>
            <div>
              <h3 style={{ marginBottom: '16px', fontSize: '1.2rem', fontWeight: 'bold' }}>WISE</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                초보 셀러도 쉽게 시작하는<br />1:N 마켓 상품 동기화 솔루션
              </p>
            </div>
            <div>
              <h4 style={{ marginBottom: '16px', fontSize: '1rem' }}>링크</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                <li style={{ marginBottom: '8px' }}><Link href="#" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>이용약관</Link></li>
                <li style={{ marginBottom: '8px' }}><Link href="#" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>개인정보처리방침</Link></li>
                <li style={{ marginBottom: '8px' }}><Link href="/pricing" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>요금제 안내</Link></li>
              </ul>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

// Inline styles for skeleton speed (In production, move to CSS modules or globals)
const navStyles: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  height: '80px',
  background: 'rgba(10, 10, 11, 0.8)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  borderBottom: '1px solid var(--border-color)',
  zIndex: 100,
  display: 'flex',
  alignItems: 'center',
};

const navContainerStyles: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const logoStyles: React.CSSProperties = {
  flex: '1',
};

const menuStyles: React.CSSProperties = {
  display: 'flex',
  gap: '32px',
  flex: '2',
  justifyContent: 'center',
};

const authStyles: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  flex: '1',
  justifyContent: 'flex-end',
};

const linkStyles: React.CSSProperties = {
  fontWeight: 500,
  fontSize: '0.95rem',
  color: 'var(--text-secondary)',
};

const footerStyles: React.CSSProperties = {
  borderTop: '1px solid var(--border-color)',
  padding: '60px 0',
  marginTop: 'auto',
};

const footerContainerStyles: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '40px',
};
