import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { Shield, Users, CheckCircle, Star, Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { GENERAL_TERMS_TEXT, SUBSCRIPTION_RISK_TEXT, getDeviceInfo, getIpAddress } from '@/lib/legalTexts';

export default function ReferralLanding() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [referralData, setReferralData] = useState<any>(null);
  const [advisor, setAdvisor] = useState<any>(null);
  const [group, setGroup] = useState<any>(null);
  const [subCount, setSubCount] = useState(0);
  const [pastSignals, setPastSignals] = useState<any[]>([]);
  const [isOwnLink, setIsOwnLink] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [riskAlreadyAccepted, setRiskAlreadyAccepted] = useState(false);
  const [alreadySubscribed, setAlreadySubscribed] = useState(false);

  // Signup form
  const [showSignup, setShowSignup] = useState(false);
  const [signupForm, setSignupForm] = useState({ fullName: '', email: '', password: '' });
  const [signupLoading, setSignupLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    if (code) fetchReferralData();
  }, [code, user]);

  const fetchReferralData = async () => {
    // Fetch referral link info
    const { data: ref } = await supabase
      .from('referral_links')
      .select('*')
      .eq('referral_code', code!)
      .eq('is_active', true)
      .maybeSingle();

    if (!ref) {
      setLoading(false);
      return;
    }
    setReferralData(ref);

    // Fetch advisor + group
    const [advRes, grpRes] = await Promise.all([
      supabase.from('advisors').select('id, full_name, email, phone, bio, sebi_reg_no, strategy_type, profile_photo_url, status, created_at, user_id').eq('id', ref.advisor_id).single(),
      supabase.from('groups').select('*').eq('id', ref.group_id).single(),
    ]);
    setAdvisor(advRes.data);
    setGroup(grpRes.data);

    // Sub count
    const { count } = await supabase.from('subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', ref.group_id).eq('status', 'active');
    setSubCount(count || 0);

    // Past signals (last 5 for preview)
    const { data: sigs } = await supabase.from('signals')
      .select('*')
      .eq('group_id', ref.group_id)
      .eq('post_type', 'signal')
      .lt('signal_date', new Date().toISOString().split('T')[0])
      .order('signal_date', { ascending: false })
      .limit(5);
    setPastSignals(sigs || []);

    // Check if advisor clicking own link
    if (user && advRes.data && advRes.data.user_id === user.id) {
      setIsOwnLink(true);
    }

    // Check if already subscribed
    if (user) {
      const { data: existing } = await supabase.from('subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .eq('group_id', ref.group_id)
        .eq('status', 'active')
        .maybeSingle();
      if (existing) setAlreadySubscribed(true);

      // Check if already accepted risk disclaimer
      const { data: acceptance } = await supabase
        .from('user_legal_acceptances')
        .select('id')
        .eq('user_id', user.id)
        .eq('acceptance_type', 'subscription_risk')
        .limit(1);
      if (acceptance && acceptance.length > 0) setRiskAlreadyAccepted(true);
    }

    // Store cookie (30 days)
    document.cookie = `referral_code=${code};path=/;max-age=${30 * 24 * 60 * 60}`;

    // Log visit (via edge function to get IP)
    try {
      await supabase.from('referral_visits').insert({
        referral_code: code!,
        advisor_id: ref.advisor_id,
        group_id: ref.group_id,
        visitor_ip: null,
        user_agent: navigator.userAgent,
        user_id: user?.id || null,
      });
      // Increment clicks
      await supabase.rpc('increment_referral_clicks', { _code: code! });
    } catch (e) { console.error('Visit tracking error:', e); }

    setLoading(false);
  };

  const handleSubscribe = async () => {
    if (!user) { setShowSignup(true); return; }
    if (!group) return;
    setSubscribing(true);

    try {
      // Auto-save risk acceptance if not already accepted
      if (!riskAlreadyAccepted) {
        const ip = await getIpAddress();
        await supabase.from('user_legal_acceptances').insert({
          user_id: user.id,
          full_name: profile?.full_name || '',
          email: profile?.email || user.email || '',
          acceptance_type: 'subscription_risk',
          checkbox_text: SUBSCRIPTION_RISK_TEXT,
          accepted: true,
          ip_address: ip,
          user_agent: navigator.userAgent,
          device_info: getDeviceInfo(),
          page_url: window.location.href,
        });
        setRiskAlreadyAccepted(true);
      }

      const { data: session } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/initiate-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.session?.access_token}` },
        body: JSON.stringify({ group_id: group.id, origin_url: window.location.origin, referral_code: code }),
      });
      const result = await res.json();
      if (res.ok && result.payment_url) window.location.href = result.payment_url;
      else toast.error(result.error || 'Failed to initiate payment');
    } catch { toast.error('Payment initiation failed'); }
    finally { setSubscribing(false); }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) { toast.error('Please accept the terms'); return; }
    if (signupForm.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setSignupLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: signupForm.email,
      password: signupForm.password,
      options: {
        data: { full_name: signupForm.fullName, role: 'trader' },
        emailRedirectTo: `${window.location.origin}/join/${code}`,
      },
    });

    if (error) { toast.error(error.message); setSignupLoading(false); return; }

    if (data.user) {
      // Save legal acceptance
      const ip = await getIpAddress();
      await supabase.from('user_legal_acceptances').insert({
        user_id: data.user.id,
        full_name: signupForm.fullName,
        email: signupForm.email,
        acceptance_type: 'general_terms',
        checkbox_text: GENERAL_TERMS_TEXT,
        accepted: true,
        ip_address: ip,
        user_agent: navigator.userAgent,
        device_info: getDeviceInfo(),
        page_url: window.location.href,
      });

      // Save referral signup
      if (referralData) {
        try {
          await supabase.from('referral_signups').insert({
            referral_code: code!,
            advisor_id: referralData.advisor_id,
            group_id: referralData.group_id,
            user_id: data.user.id,
          });
          await supabase.rpc('increment_referral_signups', { _code: code! });
        } catch (e) { console.error('Referral signup tracking:', e); }
      }

      setRegistered(true);
    }
    setSignupLoading(false);
  };

  if (loading) return (
    <div className="min-h-screen bg-background"><Navbar />
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    </div>
  );

  if (!referralData || !advisor || !group) return (
    <div className="min-h-screen flex flex-col bg-background"><Navbar />
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="tc-card-static p-8 text-center max-w-md">
          <h1 className="text-xl font-bold">Invalid Referral Link</h1>
          <p className="mt-2 text-muted-foreground">This referral link is expired or invalid.</p>
          <Link to="/"><Button className="mt-4">Go Home</Button></Link>
        </div>
      </div>
      <Footer />
    </div>
  );

  if (isOwnLink) return (
    <div className="min-h-screen flex flex-col bg-background"><Navbar />
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="tc-card-static p-8 text-center max-w-md border-l-4 border-l-[hsl(var(--warning))]">
          <h1 className="text-xl font-bold">This is your own referral link!</h1>
          <p className="mt-2 text-muted-foreground">Share it with others to earn reduced platform fees.</p>
          <Link to="/advisor/dashboard"><Button className="mt-4">Go to Dashboard</Button></Link>
        </div>
      </div>
      <Footer />
    </div>
  );

  if (registered) return (
    <div className="min-h-screen flex flex-col bg-background"><Navbar />
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="tc-card-static p-8 text-center max-w-md">
          <CheckCircle className="mx-auto h-16 w-16 text-primary" />
          <h2 className="mt-4 text-xl font-bold">Check Your Email</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            We've sent a verification link to <strong>{signupForm.email}</strong>.
            After verifying, come back to this link to subscribe.
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );

  // Win rate calculation
  const totalSignals = pastSignals.filter(s => s.result && s.result !== 'PENDING').length;
  const wins = pastSignals.filter(s => s.result === 'TARGET_HIT').length;
  const winRate = totalSignals > 0 ? Math.round((wins / totalSignals) * 100) : 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      {/* Green top banner */}
      <div className="bg-primary text-primary-foreground py-3 text-center text-sm font-medium">
        🎉 You've been invited by <strong>{advisor.full_name}</strong>
      </div>

      <div className="flex-1 container mx-auto px-4 py-8 max-w-2xl space-y-6">
        {/* Hero - Advisor */}
        <div className="tc-card-static p-8 text-center">
          <div className="mx-auto w-28 h-28 rounded-full overflow-hidden border-4 border-primary/20 mb-4">
            {advisor.profile_photo_url ? (
              <img src={advisor.profile_photo_url} alt={advisor.full_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-primary/10 flex items-center justify-center text-4xl font-bold text-primary">{advisor.full_name.charAt(0)}</div>
            )}
          </div>
          <h1 className="text-2xl font-extrabold">{advisor.full_name}</h1>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="tc-badge-sebi"><Shield className="h-3 w-3" /> SEBI: {advisor.sebi_reg_no}</span>
          </div>
          <div className="flex items-center justify-center gap-1 mt-2">
            {[1,2,3,4,5].map(i => <Star key={i} className={`h-4 w-4 ${i <= 4 ? 'fill-[hsl(var(--warning))] text-[hsl(var(--warning))]' : 'text-muted'}`} />)}
            <span className="text-xs text-muted-foreground ml-1">4.8</span>
          </div>
          {advisor.bio && <p className="mt-3 text-muted-foreground text-sm max-w-md mx-auto">{advisor.bio}</p>}
        </div>

        {/* Group info */}
        <div className="tc-card-static p-6">
          <div className="flex items-center gap-3 mb-4">
            {group.dp_url ? (
              <img src={group.dp_url} alt={group.name} className="h-12 w-12 rounded-full object-cover" />
            ) : (
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">{group.name.charAt(0)}</div>
            )}
            <div>
              <h2 className="font-bold text-lg">{group.name}</h2>
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> {subCount} active subscribers</p>
            </div>
          </div>
          {group.description && <p className="text-sm text-muted-foreground mb-4">{group.description}</p>}

          {/* Win rate & stats */}
          {totalSignals > 0 && (
            <div className="flex gap-3 mb-4">
              <span className="tc-badge-active">🎯 {winRate}% Win Rate</span>
              <span className="tc-badge-strategy">{pastSignals.length} recent signals</span>
            </div>
          )}

          {/* Signal preview - blurred */}
          {pastSignals.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Recent Signals Preview:</p>
              {pastSignals.slice(0, 3).map((sig, i) => (
                <div key={sig.id} className={`rounded-lg border p-3 flex items-center gap-3 ${i > 0 ? 'blur-[3px]' : ''}`}>
                  <div className={`w-1 self-stretch rounded-full ${sig.signal_type === 'BUY' ? 'bg-primary' : 'bg-destructive'}`} />
                  <div className="flex-1">
                    <span className="font-bold text-sm">{sig.instrument}</span>
                    <span className={`ml-2 text-xs font-bold ${sig.signal_type === 'BUY' ? 'text-primary' : 'text-destructive'}`}>{sig.signal_type}</span>
                    <div className="flex gap-3 text-xs mt-1 text-muted-foreground">
                      <span>Entry: ₹{Number(sig.entry_price).toLocaleString('en-IN')}</span>
                      <span>Target: ₹{Number(sig.target_price).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                  <span className={`text-xs font-medium ${sig.result === 'TARGET_HIT' ? 'text-primary' : sig.result === 'SL_HIT' ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {sig.result === 'TARGET_HIT' ? '✅ Hit' : sig.result === 'SL_HIT' ? '❌ Miss' : '⏳'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Invite banner */}
        <div className="rounded-xl border-2 border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/5 p-5 text-center">
          <p className="font-bold">🎯 Invited by {advisor.full_name}</p>
          <p className="text-sm text-muted-foreground mt-1">You're getting access to their premium signal group. Join now and start receiving real-time trading signals.</p>
        </div>

        {/* CTA */}
        {alreadySubscribed ? (
          <div className="tc-card-static p-6 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-primary mb-3" />
            <p className="font-bold">You're already subscribed!</p>
            <Link to="/dashboard"><Button className="mt-3">Go to Dashboard</Button></Link>
          </div>
        ) : user && !showSignup ? (
          <div className="space-y-4">
            <Button
              className="w-full py-6 text-lg font-bold"
              onClick={handleSubscribe}
              disabled={subscribing}
            >
              {subscribing ? 'Processing...' : `Join ${group.name} — ₹${group.monthly_price}/month →`}
            </Button>
          </div>
        ) : !user ? (
          <div className="tc-card-static p-6 space-y-4">
            <h3 className="font-bold text-center">Create Account to Subscribe</h3>
            <form onSubmit={handleSignup} className="space-y-3">
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={signupForm.fullName} onChange={e => setSignupForm({ ...signupForm, fullName: e.target.value })} required className="pl-10" placeholder="Full Name" />
              </div>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="email" value={signupForm.email} onChange={e => setSignupForm({ ...signupForm, email: e.target.value })} required className="pl-10" placeholder="Email" />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type={showPassword ? 'text' : 'password'} value={signupForm.password} onChange={e => setSignupForm({ ...signupForm, password: e.target.value })} required minLength={6} className="pl-10 pr-10" placeholder="Password (min 6)" />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex items-start gap-3 rounded-lg border p-3 bg-muted/30">
                <Checkbox id="terms-ref" checked={termsAccepted} onCheckedChange={(c) => setTermsAccepted(c === true)} className="mt-0.5" />
                <label htmlFor="terms-ref" className="text-xs leading-relaxed text-muted-foreground cursor-pointer">{GENERAL_TERMS_TEXT}</label>
              </div>
              <Button type="submit" className="w-full py-5 font-semibold" disabled={signupLoading}>
                {signupLoading ? 'Creating Account...' : 'Create Account & Subscribe'}
              </Button>
            </form>
            <p className="text-center text-xs text-muted-foreground">
              Already have an account? <Link to="/login" className="text-secondary font-medium hover:underline">Sign In</Link>
            </p>
          </div>
        ) : null}

        {/* Trust badges */}
        <div className="grid grid-cols-2 gap-3 text-center text-xs text-muted-foreground">
          {['✓ Cancel anytime', '✓ Signals on Telegram', '✓ SEBI Verified Advisor', '✓ Full signal history'].map(t => (
            <div key={t} className="rounded-lg border bg-card p-3 font-medium">{t}</div>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}
