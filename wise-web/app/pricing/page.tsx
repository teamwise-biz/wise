import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export default async function PricingPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Fetch user's subscription data if logged in
    let subData = null;

    if (user) {
        const { data } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        subData = data;
    }

    // Server Action for simulating a subscription purchase
    async function subscribe(formData: FormData) {
        'use server';
        const planId = formData.get('planId') as string;

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            redirect("/login");
        }

        // Upsert a simulated active subscription using Admin privileges to bypass RLS
        const { createClient: createSupabaseAdmin } = await import('@supabase/supabase-js');
        const supabaseAdmin = createSupabaseAdmin(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { error } = await supabaseAdmin.from('subscriptions').upsert({
            user_id: user.id,
            status: 'active',
            plan_id: planId,
            current_period_start: new Date().toISOString(),
            // Set expiration to 1 month or 1 year from now based on plan
            current_period_end: new Date(new Date().setMonth(new Date().getMonth() + (planId === 'pro_yearly' ? 12 : 1))).toISOString(),
        });

        if (error) {
            console.error("Subscription update failed:", error);
            // In a real app we'd throw or return an error state here
        }

        revalidatePath('/admin');
        redirect('/admin');
    }

    return (
        <div className="container animate-fade-in" style={{ padding: '80px 24px', textAlign: 'center' }}>
            <div style={{ marginBottom: '60px' }}>
                <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '16px' }}>
                    합리적인 <span className="gradient-text-accent">요금제</span>
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem' }}>
                    약정 없이 언제든 해지 가능합니다. 14일 무료 체험으로 먼저 경험해보세요.
                </p>
            </div>

            <div style={pricingGridStyles}>
                {/* Free Tier */}
                <div className="glass-panel animate-slide-up delay-100" style={pricingCardStyles}>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '8px' }}>🚀 Starter (Trial)</h3>
                    <div style={{ fontSize: '2.5rem', fontWeight: 800, margin: '24px 0' }}>
                        ₩0 <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>/ 14일</span>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
                        WISE의 모든 기능을 제한 없이<br />충분히 경험해보세요.
                    </p>
                    <ul style={featureListStyles}>
                        <li>✔️ 다중 마켓 1:N 동기화 (제한없음)</li>
                        <li>✔️ 무제한 상품 수집 및 등록</li>
                        <li>✔️ 이미지 릴레이 파이프라인 지원</li>
                        <li>✔️ 이메일 고객지원</li>
                    </ul>
                    {subData?.plan_id === 'trial_14days' ? (
                        <button disabled className="btn-secondary" style={{ width: '100%', padding: '16px', fontSize: '1.1rem', marginTop: 'auto', opacity: 0.5, cursor: 'not-allowed' }}>
                            이미 이용 중입니다
                        </button>
                    ) : (
                        <form action={subscribe} style={{ marginTop: 'auto' }}>
                            <input type="hidden" name="planId" value="trial_14days" />
                            <button type="submit" className="btn-secondary" style={{ width: '100%', padding: '16px', fontSize: '1.1rem' }}>
                                무료 체험 시작하기
                            </button>
                        </form>
                    )}
                </div>

                {/* Pro Tier */}
                <div className="glass-panel animate-slide-up delay-200" style={{ ...pricingCardStyles, border: '2px solid var(--accent-primary)', transform: 'scale(1.05)', backgroundColor: 'rgba(20, 20, 22, 0.9)' }}>
                    <div style={popularBadgeStyles}>가장 인기</div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '8px' }}>⭐ Pro (월간)</h3>
                    <div style={{ fontSize: '2.5rem', fontWeight: 800, margin: '24px 0' }}>
                        ₩49,000 <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>/ 월</span>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
                        본격적인 판매 자동화가 필요한<br />전문 셀러를 위한 플랜
                    </p>
                    <ul style={featureListStyles}>
                        <li>✔️ Starter의 모든 기능 포함</li>
                        <li>✔️ 무제한 상품 수집 및 등록</li>
                        <li>✔️ IP 프록시 우회 지원 (예정)</li>
                        <li>✔️ 1:1 우선 고객지원</li>
                    </ul>
                    {subData?.plan_id === 'pro_monthly' ? (
                        <button disabled className="btn-primary" style={{ width: '100%', padding: '16px', fontSize: '1.1rem', marginTop: 'auto', opacity: 0.5, cursor: 'not-allowed' }}>
                            이용 중인 플랜입니다
                        </button>
                    ) : (
                        <form action={subscribe} style={{ marginTop: 'auto' }}>
                            <input type="hidden" name="planId" value="pro_monthly" />
                            <button type="submit" className="btn-primary" style={{ width: '100%', padding: '16px', fontSize: '1.1rem' }}>
                                월간 구독 결제하기 (테스트)
                            </button>
                        </form>
                    )}
                </div>

                {/* Yearly Tier */}
                <div className="glass-panel animate-slide-up delay-300" style={pricingCardStyles}>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '8px' }}>🔥 Pro (연간)</h3>
                    <div style={{ fontSize: '2.5rem', fontWeight: 800, margin: '24px 0' }}>
                        ₩39,000 <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>/ 월</span>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>
                        1년 결제 시 20% 할인 혜택<br />(총 ₩468,000 / 년)
                    </p>
                    <ul style={featureListStyles}>
                        <li>✔️ Pro 월간의 모든 기능 포함</li>
                        <li>✔️ 2개월 분 요금 할인</li>
                        <li>✔️ 신규 플랫폼 연동 시 우선 적용</li>
                    </ul>
                    {subData?.plan_id === 'pro_yearly' ? (
                        <button disabled className="btn-secondary" style={{ width: '100%', padding: '16px', fontSize: '1.1rem', marginTop: 'auto', opacity: 0.5, cursor: 'not-allowed' }}>
                            이용 중인 플랜입니다
                        </button>
                    ) : (
                        <form action={subscribe} style={{ marginTop: 'auto' }}>
                            <input type="hidden" name="planId" value="pro_yearly" />
                            <button type="submit" className="btn-secondary" style={{ width: '100%', padding: '16px', fontSize: '1.1rem' }}>
                                연간 구독 결제하기 (테스트)
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

const pricingGridStyles: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '32px',
    maxWidth: '1100px',
    margin: '0 auto',
    alignItems: 'center',
};

const pricingCardStyles: React.CSSProperties = {
    padding: '40px',
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'center',
    position: 'relative',
    minHeight: '500px',
};

const popularBadgeStyles: React.CSSProperties = {
    position: 'absolute',
    top: '-16px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
    color: 'white',
    padding: '4px 16px',
    borderRadius: '20px',
    fontSize: '0.85rem',
    fontWeight: 'bold',
    boxShadow: '0 4px 10px rgba(59, 130, 246, 0.3)',
};

const featureListStyles: React.CSSProperties = {
    listStyle: 'none',
    padding: 0,
    margin: '0 0 40px 0',
    textAlign: 'left',
    lineHeight: 2,
};
