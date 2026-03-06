import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section style={heroStyles}>
        <div className="container animate-slide-up" style={heroContainerStyles}>
          <div style={heroContentStyles}>
            <div style={badgeStyles}>
              <span className="gradient-text-accent" style={{ fontWeight: 600 }}>v3.0 릴리즈</span>
              <span style={{ color: 'var(--text-secondary)', marginLeft: '8px', fontSize: '0.9rem' }}>다중 마켓 1:N 동기화 완벽 지원</span>
            </div>
            <h1 style={heroTitleStyles}>
              도매처 상품 수백 개,<br />
              <span className="gradient-text-accent">클릭 한 번에 알아서 척척</span>
            </h1>
            <p style={heroDescStyles}>
              도매토피아, 오너클랜 등 여러 곳의 상품을 네이버/쿠팡 등 내 마켓에 동시 전송.<br />
              귀찮은 단순 노가다는 이제 WISE에게 맡기세요.
            </p>
            <div style={heroActionsStyles}>
              <Link href="/download" className="btn-primary" style={{ padding: '16px 32px', fontSize: '1.1rem' }}>
                Windows용 다운로드
              </Link>
              <Link href="/pricing" className="btn-secondary" style={{ padding: '16px 32px', fontSize: '1.1rem' }}>
                요금제 보기
              </Link>
            </div>
          </div>

          {/* Dashboard Mockup Video/Image Area */}
          <div className="glass-panel animate-slide-up delay-200" style={mockupContainerStyles}>
            <div style={mockupHeaderStyles}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#FF5F56' }}></div>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#FFBD2E' }}></div>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#27C93F' }}></div>
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', flex: 1, textAlign: 'center' }}>WISE Dashboard v3.0.0</div>
            </div>
            <div style={mockupContentStyles}>
              {/* Visual Pipeline for 1:N Sync */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', padding: '24px 32px' }}>

                {/* Step 1: Source */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.2)', color: 'var(--accent-primary)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem' }}>📦</div>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>1. 도매토피아 상품 수집</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>가전/디지털 카테고리 100건</div>
                  </div>
                  <div style={{ color: 'var(--accent-success)', fontSize: '0.9rem', fontWeight: 600 }}>완료</div>
                </div>

                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '1.2rem', margin: '-8px 0' }}>⬇</div>

                {/* Step 2: Master */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--accent-success)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem' }}>📊</div>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>2. 마스터 시트 데이터 가공</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>판매가 마진율(1.5x) 일괄 적용 및 이미지 호스팅 링크 생성</div>
                  </div>
                  <div style={{ color: 'var(--accent-success)', fontSize: '0.9rem', fontWeight: 600 }}>완료</div>
                </div>

                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '1.2rem', margin: '-8px 0' }}>⬇</div>

                {/* Step 3: Target Markets */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(59, 130, 246, 0.05)', padding: '20px', borderRadius: '12px', border: '1px dashed var(--accent-primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--accent-primary)' }}>🚀 3. 내 마켓으로 동시 배포 중 (1:N)</div>
                  </div>

                  {/* Naver */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: '#03C75A', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>N</div>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                        <span>네이버 스마트스토어</span>
                        <span style={{ color: '#03C75A', fontWeight: 600 }}>100 / 100</span>
                      </div>
                      <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: '100%', height: '100%', background: '#03C75A' }}></div>
                      </div>
                    </div>
                  </div>

                  {/* Coupang */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: '#CB1400', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>C</div>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                        <span>쿠팡 (Coupang)</span>
                        <span style={{ color: '#CB1400', fontWeight: 600 }}>65 / 100</span>
                      </div>
                      <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: '65%', height: '100%', background: '#CB1400', transition: 'width 0.5s ease' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section style={featuresStyles}>
        <div className="container animate-slide-up delay-100">
          <div style={{ textAlign: 'center', marginBottom: '80px' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '16px' }}>강력한 핵심 기능</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem' }}>판매에만 집중하세요. 나머지는 WISE가 알아서 합니다.</p>
          </div>

          <div style={featureGridStyles}>
            <div className="glass-panel animate-slide-up delay-100" style={featureCardStyles}>
              <div style={featureIconStyles}>🔄</div>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '12px', fontWeight: 600 }}>클릭 한 번으로 N개 마켓 동시 배포</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>똑같은 상품을 마켓마다 일일이 올리지 마세요. 한 번만 세팅하면 여러 곳에 똑같이 전송됩니다.</p>
            </div>

            <div className="glass-panel animate-slide-up delay-200" style={featureCardStyles}>
              <div style={featureIconStyles}>⚡</div>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '12px', fontWeight: 600 }}>귀찮은 이미지 캡쳐/업로드 제로</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>무겁고 복잡한 상세페이지 이미지? 걱정 마세요. 알아서 리사이징하고 호스팅까지 붙여줍니다.</p>
            </div>

            <div className="glass-panel animate-slide-up delay-300" style={featureCardStyles}>
              <div style={featureIconStyles}>🛡️</div>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '12px', fontWeight: 600 }}>구글 시트 기반의 투명한 관리</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>구글 아이디 하나만 있으면 끝! 내 개인 구글 시트에 마스터 데이터가 저장되어 평생 내 자산으로 남습니다.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works section */}
      <section style={howItWorksStyles}>
        <div className="container animate-slide-up delay-200">
          <div style={{ textAlign: 'center', marginBottom: '80px' }}>
            <h2 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '16px' }}>단 3단계면 끝입니다</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem' }}>직관적인 소싱-편집-배포 파이프라인</p>
          </div>

          <div style={stepGridStyles}>
            <div className="glass-panel" style={stepCardStyles}>
              <div style={stepNumberStyles}>1</div>
              <h3 style={stepTitleStyles}>상품 수집 (소싱)</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                도매처에서 원하는 상품 번호나 카테고리를 입력하면 이미지와 옵션, 상세페이지를 자동으로 긁어옵니다.
              </p>
            </div>

            <div style={stepArrowStyles}>➔</div>

            <div className="glass-panel" style={stepCardStyles}>
              <div style={stepNumberStyles}>2</div>
              <h3 style={stepTitleStyles}>마스터 시트 연동</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                수집된 상품 데이터는 내 구글 시트에 자동으로 쌓입니다. 이곳에서 상품명이나 가격을 입맛대로 수정하세요.
              </p>
            </div>

            <div style={stepArrowStyles}>➔</div>

            <div className="glass-panel" style={stepCardStyles}>
              <div style={stepNumberStyles}>3</div>
              <h3 style={stepTitleStyles}>원클릭 배포</h3>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                원하는 타겟 마켓(스마트스토어, 쿠팡 등)을 체크하고 [배포] 버튼을 누르면 모든 마켓에 동시 등록됩니다.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// Inline Styles
const heroStyles: React.CSSProperties = {
  padding: '160px 0 80px 0',
  minHeight: '80vh',
  display: 'flex',
  alignItems: 'flex-start',
};

const heroContainerStyles: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
};

const heroContentStyles: React.CSSProperties = {
  maxWidth: '800px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
};

const badgeStyles: React.CSSProperties = {
  background: 'rgba(59, 130, 246, 0.1)',
  border: '1px solid rgba(59, 130, 246, 0.2)',
  padding: '6px 16px',
  borderRadius: '24px',
  display: 'inline-flex',
  alignItems: 'center',
  marginBottom: '24px',
};

const heroTitleStyles: React.CSSProperties = {
  fontSize: 'clamp(3rem, 5vw, 4.5rem)',
  fontWeight: 800,
  lineHeight: 1.1,
  letterSpacing: '-1.5px',
  marginBottom: '24px',
};

const heroDescStyles: React.CSSProperties = {
  fontSize: '1.25rem',
  color: 'var(--text-secondary)',
  lineHeight: 1.6,
  marginBottom: '40px',
  maxWidth: '600px',
};

const heroActionsStyles: React.CSSProperties = {
  display: 'flex',
  gap: '16px',
  justifyContent: 'center',
  flexWrap: 'wrap',
};

const mockupContainerStyles: React.CSSProperties = {
  width: '100%',
  maxWidth: '1000px',
  minHeight: '400px', // changed from fixed 500px to allow inner stacking
  marginTop: '80px',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
};

const mockupHeaderStyles: React.CSSProperties = {
  padding: '12px 16px',
  background: 'rgba(0, 0, 0, 0.4)',
  borderBottom: '1px solid var(--border-color)',
  display: 'flex',
  alignItems: 'center',
};

const mockupContentStyles: React.CSSProperties = {
  display: 'flex',
  flex: 1,
  flexWrap: 'wrap', // Added wrap for mobile
};


const featuresStyles: React.CSSProperties = {
  padding: '120px 0',
  background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.3))',
};

const featureGridStyles: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: '32px',
};

const featureCardStyles: React.CSSProperties = {
  padding: '40px 32px',
  transition: 'transform 0.3s ease',
};

const featureIconStyles: React.CSSProperties = {
  fontSize: '2.5rem',
  marginBottom: '24px',
  display: 'inline-block',
};

const howItWorksStyles: React.CSSProperties = {
  padding: '80px 0 140px 0',
  background: 'var(--bg-primary)',
};

const stepGridStyles: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '16px',
  flexWrap: 'wrap',
};

const stepCardStyles: React.CSSProperties = {
  padding: '40px 32px',
  flex: '1 1 280px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  position: 'relative',
  borderTop: '3px solid var(--accent-primary)',
};

const stepNumberStyles: React.CSSProperties = {
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
  color: 'white',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  fontSize: '1.2rem',
  fontWeight: 'bold',
  marginBottom: '20px',
};

const stepTitleStyles: React.CSSProperties = {
  fontSize: '1.3rem',
  marginBottom: '16px',
  fontWeight: 600,
  color: 'var(--text-primary)',
};

const stepArrowStyles: React.CSSProperties = {
  fontSize: '2rem',
  color: 'var(--border-color)',
  display: 'flex',
  padding: '0 10px',
  opacity: 0.5,
};
