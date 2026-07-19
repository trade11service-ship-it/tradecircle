import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';


import { GroupFeed } from '@/components/GroupFeed';
import { ReferralLinkCard } from '@/components/ReferralLinkCard';
import { ReferralStatsTab } from '@/components/ReferralStatsTab';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { BarChart3, Radio, Users, UserCircle, IndianRupee, TrendingUp, Clock, CheckCircle2, XCircle, AlertTriangle, MessageSquare, ImageIcon, X, Globe, Lock, Gift, Plus, Shield, Download, FileSpreadsheet } from 'lucide-react';
import { sanitizeText, sanitizeTextarea, sanitizeNumeric, sanitizeAlphanumeric } from '@/lib/sanitize';
import type { Tables } from '@/integrations/supabase/types';
import { useLocation, useNavigate } from 'react-router-dom';
import { DashboardHero } from '@/components/DashboardHero';

type Advisor = Tables<'advisors'>;
type Group = Tables<'groups'>;
type Signal = Tables<'signals'>;
type DailyEarning = { earning_date: string; gross_revenue: number; gst_amount: number; platform_fee: number; net_earning: number; subscription_count: number };

export default function AdvisorDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [advisor, setAdvisor] = useState<Advisor | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [dailyEarnings, setDailyEarnings] = useState<DailyEarning[]>([]);
  const [earningsSummary, setEarningsSummary] = useState<any>(null);
  const [tab, setTab] = useState<'groups' | 'post' | 'signals_history' | 'subscribers' | 'revenue' | 'referrals' | 'profile'>('groups');
  const [loading, setLoading] = useState(true);
  const [groupForm, setGroupForm] = useState({ name: '', description: '', monthlyPrice: '', strategyCategory: 'All' });
  const [groupDp, setGroupDp] = useState<File | null>(null);
  const [showGroupForm, setShowGroupForm] = useState(false);

  // Post forms
  const [postMode, setPostMode] = useState<'choose' | 'message' | 'signal'>('choose');
  const [messageForm, setMessageForm] = useState({ groupId: '', text: '', isPublic: false });
  const [messageImage, setMessageImage] = useState<File | null>(null);
  const [messageImagePreview, setMessageImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [posting, setPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [signalForm, setSignalForm] = useState({ groupId: '', instrument: '', signalType: 'BUY', entryPrice: '', targetPrice: '', stopLoss: '', timeframe: 'Intraday', notes: '', isPublic: false });

  // Feed view
  const [feedGroupId, setFeedGroupId] = useState<string | null>(null);

  // SEBI audit CSV
  const [exportingCsv, setExportingCsv] = useState(false);

  const csvCell = (v: any): string => {
    if (v === null || v === undefined) return '';
    const s = String(v).replace(/"/g, '""');
    return /[",\n\r]/.test(s) ? `"${s}"` : s;
  };

  const planLabelFromDates = (start?: string | null, end?: string | null): string => {
    if (!start || !end) return 'Custom';
    const days = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000);
    if (days <= 35) return 'Monthly';
    if (days <= 100) return 'Quarterly';
    if (days <= 200) return 'Half-Yearly';
    return 'Yearly';
  };

  const downloadSebiAuditCsv = async (advisorId: string, advisorName: string | null | undefined) => {
    try {
      setExportingCsv(true);

      // Pull subscriptions joined with profiles (name + email only — phone excluded by design)
      const { data: subs, error: subsErr } = await supabase
        .from('subscriptions')
        .select('id, user_id, plan:platform_fee_percent, amount_paid, start_date, end_date, razorpay_payment_id, created_at, pan_number, consent_timestamp, profiles!inner(full_name, email)' as any)
        .eq('advisor_id', advisorId)
        .order('created_at', { ascending: false });

      if (subsErr) throw subsErr;
      const rows = (subs as any[]) || [];

      // Pull risk-disclosure consents for these users in one shot
      const userIds = Array.from(new Set(rows.map(r => r.user_id)));
      let consentMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: consents } = await supabase
          .from('user_legal_acceptances')
          .select('user_id, acceptance_type, accepted_at')
          .in('user_id', userIds);
        for (const c of (consents as any[]) || []) {
          // Prefer subscription_pan consent; fall back to most recent of any type
          const existing = consentMap.get(c.user_id);
          if (!existing || c.acceptance_type === 'subscription_pan') {
            consentMap.set(c.user_id, c.accepted_at);
          }
        }
      }

      const headers = [
        'Subscriber Name',
        'Email ID',
        'PAN Number',
        'Plan Type',
        'Amount Paid',
        'Purchase Date',
        'Subscription End Date',
        'SEBI Risk Disclosure Consent Timestamp',
        'Razorpay Payment ID',
      ];

      const lines = [headers.join(',')];
      for (const r of rows) {
        const consentTs = r.consent_timestamp || consentMap.get(r.user_id) || '';
        lines.push([
          csvCell(r.profiles?.full_name || ''),
          csvCell(r.profiles?.email || ''),
          csvCell(r.pan_number || ''),
          csvCell(planLabelFromDates(r.start_date, r.end_date)),
          csvCell(r.amount_paid ?? ''),
          csvCell(r.start_date ? new Date(r.start_date).toISOString() : ''),
          csvCell(r.end_date ? new Date(r.end_date).toISOString() : ''),
          csvCell(consentTs ? new Date(consentTs).toISOString() : ''),
          csvCell(r.razorpay_payment_id || ''),
        ].join(','));
      }

      const csv = '\uFEFF' + lines.join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 10);
      const safeName = (advisorName || 'advisor').replace(/[^A-Za-z0-9_-]/g, '_');
      a.href = url;
      a.download = `SEBI_Audit_Log_${safeName}_${stamp}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Audit log exported — ${rows.length} subscriber record(s)`);
    } catch (e: any) {
      console.error('SEBI audit export failed:', e);
      toast.error(e?.message || 'Failed to generate audit log');
    } finally {
      setExportingCsv(false);
    }
  };

  useEffect(() => { if (user) fetchData(); }, [user]);

  // Auto-select the first/primary group in composer forms when groups load
  useEffect(() => {
    if (groups.length === 0) return;
    const defaultId = groups[0].id;
    setMessageForm(prev => prev.groupId ? prev : { ...prev, groupId: defaultId });
    setSignalForm(prev => prev.groupId ? prev : { ...prev, groupId: defaultId });
  }, [groups]);

  useEffect(() => {
    const path = location.pathname;
    if (path.endsWith('/groups')) setTab('groups');
    else if (path.endsWith('/post')) setTab('post');
    else if (path.endsWith('/signals')) setTab('signals_history');
    else if (path.endsWith('/subscribers')) setTab('subscribers');
    else if (path.endsWith('/earnings')) setTab('revenue');
    else if (path === '/advisor/dashboard') setTab('groups');
  }, [location.pathname]);

  useEffect(() => {
    if (!advisor) return;
    const channel = supabase.channel('advisor-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'subscriptions', filter: `advisor_id=eq.${advisor.id}` }, () => { toast.info('New subscriber joined!'); fetchData(); })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'signals', filter: `advisor_id=eq.${advisor.id}` }, () => { fetchData(); })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'signals', filter: `advisor_id=eq.${advisor.id}` }, () => { fetchData(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [advisor]);

  const fetchData = async () => {
    const { data: advList, error: advError } = await (supabase as any).rpc('get_advisor_full_by_user', { _user_id: user!.id });
    if (advError) console.error('Advisor fetch error:', advError);
    const list: any[] = Array.isArray(advList) ? advList : [];
    const adv = list.find((a: any) => a.status === 'approved') || list[0] || null;
    setAdvisor(adv);
    if (adv) {
      const [grpsRes, subsRes, sigsRes, earningsRes] = await Promise.all([
        supabase.from('groups').select('*').eq('advisor_id', adv.id),
        supabase.from('subscriptions').select('*, profiles(full_name, email), groups!inner(name)').eq('advisor_id', adv.id).order('created_at', { ascending: false }),
        supabase.from('signals').select('*').eq('advisor_id', adv.id).order('created_at', { ascending: false }),
        supabase.from('advisor_daily_earnings').select('*').eq('advisor_id', adv.id).order('earning_date', { ascending: false }),
      ]);
      setGroups(grpsRes.data || []);
      setSubscribers(subsRes.data || []);
      setSignals(sigsRes.data || []);
      setDailyEarnings((earningsRes.data as any[]) || []);

      // Also fetch summary via RPC
      const { data: summary } = await supabase.rpc('get_advisor_earnings', { _advisor_id: adv.id });
      setEarningsSummary(summary);

      // Backfill: ensure every group has a permanent referral link (one-shot)
      const grps = grpsRes.data || [];
      if (grps.length > 0) {
        const { data: existingLinks } = await supabase.from('referral_links').select('group_id').eq('advisor_id', adv.id);
        const linked = new Set((existingLinks || []).map((l: any) => l.group_id));
        const missing = grps.filter((g: any) => !linked.has(g.id));
        if (missing.length > 0) {
          const namePrefix = (adv.full_name || 'ADV').replace(/[^A-Za-z]/g, '').substring(0, 3).toUpperCase() || 'ADV';
          const rows = missing.map((g: any) => ({
            advisor_id: adv.id,
            group_id: g.id,
            referral_code: `TC-${namePrefix}-${g.id.substring(0, 4).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          }));
          await supabase.from('referral_links').insert(rows as any);
        }
      }
    }
    setLoading(false);
  };

  const createGroup = async () => {
    if (!advisor) return;
    let dpUrl = '';
    if (groupDp) {
      const ext = groupDp.name.split('.').pop();
      const path = `${advisor.id}/${Date.now()}.${ext}`;
      const { data, error: uploadErr } = await supabase.storage.from('group-media').upload(path, groupDp, { upsert: true });
      if (uploadErr) { toast.error('Group photo upload failed: ' + uploadErr.message); return; }
      if (data) dpUrl = supabase.storage.from('group-media').getPublicUrl(data.path).data.publicUrl;
    }
    const cleanPrice = Math.max(0, Math.floor(Number(String(groupForm.monthlyPrice).replace(/\D/g, '')) || 0));
    if (cleanPrice <= 0) { toast.error('Please enter a valid monthly price in whole rupees'); return; }
    const { data: newGroup, error } = await (supabase.from('groups') as any).insert({ advisor_id: advisor.id, name: sanitizeText(groupForm.name), description: sanitizeTextarea(groupForm.description), monthly_price: cleanPrice, dp_url: dpUrl, strategy_category: groupForm.strategyCategory || 'All' }).select().single();
    if (error) { toast.error(error.message); return; }

    // Generate ONE permanent referral link for this group (only admin can change later)
    const namePrefix = (advisor.full_name || 'ADV').replace(/[^A-Za-z]/g, '').substring(0, 3).toUpperCase() || 'ADV';
    const refCode = `TC-${namePrefix}-${newGroup.id.substring(0, 4).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    await supabase.from('referral_links').insert({ advisor_id: advisor.id, group_id: newGroup.id, referral_code: refCode } as any);

    toast.info('Creating payment link...');
    const { data: session } = await supabase.auth.getSession();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment-link`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.session?.access_token}` }, body: JSON.stringify({ group_id: newGroup.id, group_name: groupForm.name, amount: parseInt(groupForm.monthlyPrice) }) });
    const result = await res.json();
    if (res.ok) toast.success('Group created with payment link!');
    else toast.warning('Group created but payment link generation failed: ' + (result.error || 'Unknown error'));
    setShowGroupForm(false);
    setGroupForm({ name: '', description: '', monthlyPrice: '', strategyCategory: 'All' });
    fetchData();
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Max file size is 5MB'); return; }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { toast.error('Only JPG, PNG, WEBP allowed'); return; }
    setMessageImage(file);
    setMessageImagePreview(URL.createObjectURL(file));
  };

  const postMessage = async () => {
    if (!advisor || !messageForm.groupId || !messageForm.text.trim()) return;
    setPosting(true);
    let imageUrl: string | null = null;

    if (messageImage) {
      setUploadProgress(20);
      const ext = messageImage.name.split('.').pop();
      const path = `${advisor.id}/${Date.now()}.${ext}`;
      setUploadProgress(50);
      const { data, error } = await supabase.storage.from('group-media').upload(path, messageImage);
      if (error) { toast.error('Image upload failed'); setPosting(false); setUploadProgress(0); return; }
      setUploadProgress(80);
      imageUrl = supabase.storage.from('group-media').getPublicUrl(data.path).data.publicUrl;
      setUploadProgress(100);
    }

    const { error } = await supabase.from('signals').insert({
      group_id: messageForm.groupId,
      advisor_id: advisor.id,
      post_type: 'message',
      message_text: sanitizeTextarea(messageForm.text),
      image_url: imageUrl,
      instrument: '',
      signal_type: '',
      entry_price: 0,
      target_price: 0,
      stop_loss: 0,
      timeframe: '',
      is_public: messageForm.isPublic,
    });

    if (error) { toast.error(error.message); }
    else { toast.success('Update posted!'); }
    setMessageForm({ groupId: messageForm.groupId, text: '', isPublic: false });
    setMessageImage(null);
    setMessageImagePreview(null);
    setUploadProgress(0);
    setPosting(false);
    fetchData();
  };

  const postSignal = async () => {
    if (!advisor) return;
    setPosting(true);
    const { data: newSignal, error } = await supabase.from('signals').insert({
      group_id: signalForm.groupId,
      advisor_id: advisor.id,
      post_type: 'signal',
      instrument: sanitizeText(signalForm.instrument),
      signal_type: signalForm.signalType,
      entry_price: parseFloat(sanitizeNumeric(signalForm.entryPrice)) || 0,
      target_price: parseFloat(sanitizeNumeric(signalForm.targetPrice)) || 0,
      stop_loss: parseFloat(sanitizeNumeric(signalForm.stopLoss)) || 0,
      timeframe: signalForm.timeframe,
      notes: sanitizeTextarea(signalForm.notes),
      is_public: signalForm.isPublic,
    }).select().single();

    if (error) { toast.error(error.message); setPosting(false); return; }
    toast.success('Signal posted! Sending Telegram alerts...');

    try {
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-telegram-signal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` },
        body: JSON.stringify({ signal_id: newSignal.id }),
      });
      const result = await res.json();
      if (result.sent > 0) toast.success(`Telegram sent to ${result.sent}/${result.total} users`);
    } catch (err) {
      console.error('Telegram send error:', err);
    }
    setSignalForm({ groupId: signalForm.groupId, instrument: '', signalType: 'BUY', entryPrice: '', targetPrice: '', stopLoss: '', timeframe: 'Intraday', notes: '', isPublic: false });
    setPosting(false);
    fetchData();
  };

  if (loading) return <div className="min-h-full h-full bg-background"><div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div></div>;
  if (!advisor) return <div className="min-h-full h-full bg-background"><div className="py-20 text-center text-muted-foreground">No advisor profile found.</div></div>;

  if (advisor.status === 'pending') return (
    <div className="min-h-full h-full flex flex-col bg-background">
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="tc-card-static p-8 text-center max-w-md">
          <span className="tc-badge-pending">Pending Review</span>
          <h2 className="mt-4 text-xl font-bold">Your application is under review</h2>
          <p className="mt-2 text-muted-foreground">We'll notify you once your SEBI verification is complete.</p>
        </div>
      </div>
    </div>
  );

  if (advisor.status === 'rejected') return (
    <div className="min-h-full h-full flex flex-col bg-background">
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="tc-card-static p-8 text-center max-w-md">
          <span className="tc-badge-rejected">Rejected</span>
          <h2 className="mt-4 text-xl font-bold">Application Rejected</h2>
          {advisor.rejection_reason && <p className="mt-2 text-muted-foreground">Reason: {advisor.rejection_reason}</p>}
        </div>
      </div>
    </div>
  );

  const now = Date.now();
  const activeSubs = subscribers.filter(s => s.status === 'active' && s.end_date && new Date(s.end_date).getTime() > now);
  const totalSubs = activeSubs.length;

  // === Display math: NO GST cut. Referral-aware platform fee (15% / 30%). Live from subscribers rows. ===
  const computeNet = (s: any) => {
    const gross = Number(s.amount_paid || 0);
    const pct = s.from_referral ? 15 : (Number(s.platform_fee_percent) || 30);
    return { gross, pct, fee: gross * pct / 100, net: gross - (gross * pct / 100), isReferral: !!s.from_referral };
  };

  const cutoff30 = now - 30 * 24 * 60 * 60 * 1000;
  const last30Subs = subscribers.filter(s => s.created_at && new Date(s.created_at).getTime() >= cutoff30);

  const sum = (arr: any[], key: 'gross' | 'fee' | 'net') => arr.reduce((acc, s) => acc + computeNet(s)[key], 0);
  const lifetimeGross = sum(subscribers, 'gross');
  const lifetimeFee = sum(subscribers, 'fee');
  const lifetimeNet = sum(subscribers, 'net');
  const rolling30Gross = sum(last30Subs, 'gross');
  const rolling30Fee = sum(last30Subs, 'fee');
  const rolling30Net = sum(last30Subs, 'net');

  // Referral vs direct split
  const referralSubs = subscribers.filter(s => s.from_referral);
  const directSubs = subscribers.filter(s => !s.from_referral);
  const referralGross = sum(referralSubs, 'gross');
  const referralNet = sum(referralSubs, 'net');
  const directGross = sum(directSubs, 'gross');
  const directNet = sum(directSubs, 'net');

  // Legacy aliases used elsewhere in JSX
  const totalRevenue = lifetimeGross;
  const totalNetEarnings = lifetimeNet;
  const totalPlatformFee = lifetimeFee;
  const monthGross = rolling30Gross;
  const monthNet = rolling30Net;
  const afterFees = (amount: number) => amount * 0.70; // legacy fallback for per-group display

  const resultIcon = (result: string | null) => {
    if (result === 'TARGET_HIT') return <CheckCircle2 className="h-4 w-4 text-primary" />;
    if (result === 'SL_HIT') return <XCircle className="h-4 w-4 text-destructive" />;
    return <Clock className="h-4 w-4 text-muted-foreground" />;
  };

  const tabs = [
    { key: 'groups' as const, label: 'Groups', icon: BarChart3 },
    { key: 'post' as const, label: 'Post', icon: Radio },
    { key: 'signals_history' as const, label: 'My Signals', icon: TrendingUp },
    { key: 'subscribers' as const, label: 'Subscribers', icon: Users },
    { key: 'revenue' as const, label: 'Revenue', icon: IndianRupee },
    { key: 'referrals' as const, label: 'Referrals', icon: Gift },
    { key: 'profile' as const, label: 'Profile', icon: UserCircle },
  ];

  const tabPathMap: Record<typeof tab, string> = {
    groups: '/advisor/dashboard/groups',
    post: '/advisor/dashboard/post',
    signals_history: '/advisor/dashboard/signals',
    subscribers: '/advisor/dashboard/subscribers',
    revenue: '/advisor/dashboard/earnings',
    referrals: '/advisor/dashboard',
    profile: '/advisor/dashboard',
  };

  const signalCount = signals.filter(s => (s as any).post_type !== 'message').length;
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="min-h-full h-full flex flex-col bg-background">
      
      <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-6 flex-1">

        <DashboardHero
          name={advisor.full_name}
          roleLabel="SEBI Verified Advisor"
          subtitle="Manage your groups, post signals, and grow your subscriber base."
          badge={`SEBI · ${advisor.sebi_reg_no}`}
          variant="advisor"
          stats={[
            { label: "Subscribers", value: totalSubs },
            { label: "Groups", value: groups.length },
            { label: "Signals", value: signalCount },
            { label: "30D Net", value: `₹${Math.round(rolling30Net).toLocaleString('en-IN')}` },
          ]}
          actions={
            <>
              <a href="/" target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 backdrop-blur px-3 h-9 text-[12px] font-bold text-white transition">
                <Globe className="h-3.5 w-3.5" /> Website
              </a>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white text-primary px-3.5 h-9 text-[12px] font-bold shadow-md">
                ✓ Approved & Active
              </span>
            </>
          }
        />

        {/* Stats Row */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {/* Subscribers — green gradient */}
          <div className="rounded-2xl bg-gradient-to-br from-primary to-[hsl(123,40%,35%)] p-5 text-primary-foreground">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20"><Users className="h-5 w-5" /></div>
            <p className="mt-3 text-xs text-white/80">Active Subscribers</p>
            <p className="text-4xl font-black tracking-tight">{totalSubs}</p>
          </div>
          {/* Groups */}
          <div className="rounded-2xl border-[1.5px] border-border bg-card p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-light-blue"><BarChart3 className="h-5 w-5 text-secondary" /></div>
            <p className="mt-3 text-xs text-[hsl(var(--small-text))]">Groups</p>
            <p className="text-4xl font-black tracking-tight text-foreground">{groups.length}</p>
          </div>
          {/* Signals */}
          <div className="rounded-2xl border-[1.5px] border-border bg-card p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(270,40%,94%)]"><Radio className="h-5 w-5 text-[hsl(270,50%,45%)]" /></div>
            <p className="mt-3 text-xs text-[hsl(var(--small-text))]">Signals Posted</p>
            <p className="text-4xl font-black tracking-tight text-foreground">{signalCount}</p>
          </div>
          {/* Earnings — navy gradient */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-secondary to-[hsl(214,70%,40%)] p-5 text-secondary-foreground">
            <span className="pointer-events-none absolute -bottom-5 -right-2.5 text-[120px] font-black leading-none text-white/[0.06]">₹</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20"><IndianRupee className="h-5 w-5" /></div>
            <p className="mt-3 text-xs text-white/80">Net · Last 30 Days</p>
            <p className="text-[32px] font-black tracking-tight">₹{Math.round(rolling30Net).toLocaleString('en-IN')}</p>
            <p className="text-[11px] text-white/60">Lifetime: ₹{Math.round(totalNetEarnings).toLocaleString('en-IN')}</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl border-[1.5px] border-border bg-card p-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key);
                if (t.key === 'post') setPostMode('choose');
                const path = tabPathMap[t.key];
                if (location.pathname !== path) navigate(path);
              }}
              className={`flex h-10 items-center gap-1.5 whitespace-nowrap rounded-lg px-4 text-[13px] font-semibold transition-all ${
                tab === t.key
                  ? 'bg-foreground text-background shadow-[0_2px_6px_rgba(0,0,0,0.15)]'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>

        {/* GROUPS TAB */}
        {tab === 'groups' && (
          <div>
            <button
              onClick={() => setShowGroupForm(!showGroupForm)}
              className="mb-4 flex items-center gap-2 rounded-[10px] bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              <Plus className="h-4 w-4" /> Create New Group
            </button>
            {showGroupForm && (
              <div className="mb-6 rounded-2xl border-[1.5px] border-border bg-card p-6 space-y-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <div><Label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--small-text))]">Group Name</Label><Input value={groupForm.name} onChange={e => setGroupForm({ ...groupForm, name: e.target.value })} className="mt-1.5" /></div>
                <div><Label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--small-text))]">Description</Label><Textarea value={groupForm.description} onChange={e => setGroupForm({ ...groupForm, description: e.target.value })} className="mt-1.5" /></div>
                <div><Label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--small-text))]">Monthly Price (₹)</Label><Input type="text" inputMode="numeric" pattern="[0-9]*" value={groupForm.monthlyPrice} onChange={e => setGroupForm({ ...groupForm, monthlyPrice: e.target.value.replace(/\D/g, '') })} placeholder="e.g. 4000" className="mt-1.5" /><p className="mt-1 text-[11px] text-muted-foreground">Whole rupees only. The exact amount you enter is saved — we never deduct fees from your listed price.</p></div>
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--small-text))]">Strategy Category</Label>
                  <Select value={groupForm.strategyCategory} onValueChange={v => setGroupForm({ ...groupForm, strategyCategory: v })}>
                    <SelectTrigger className="mt-1.5 border-[1.5px]"><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All</SelectItem>
                      <SelectItem value="Intraday">Intraday</SelectItem>
                      <SelectItem value="Swing">Swing</SelectItem>
                      <SelectItem value="Options">Options</SelectItem>
                      <SelectItem value="Equity">Equity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--small-text))]">Group Photo</Label><Input type="file" accept="image/*" onChange={e => setGroupDp(e.target.files?.[0] || null)} className="mt-1.5" /></div>
                <Button onClick={createGroup} className="font-semibold">Create Group</Button>
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              {groups.map(g => {
                const subCount = subscribers.filter(s => s.group_id === g.id && s.status === 'active' && s.end_date && new Date(s.end_date).getTime() > now).length;
                const revenue = subscribers.filter(s => s.group_id === g.id).reduce((sum, s) => sum + (s.amount_paid || 0), 0);
                const sigCount = signals.filter(s => s.group_id === g.id).length;
                return (
                  <div key={g.id} className="rounded-2xl border-[1.5px] border-border bg-card p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setFeedGroupId(g.id); setTab('post'); setPostMode('choose'); }}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-secondary text-lg font-bold text-primary-foreground overflow-hidden">
                        {g.dp_url ? <img src={g.dp_url} alt={g.name} className="h-full w-full object-cover" /> : g.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground truncate">{g.name}</p>
                        <p className="text-sm font-semibold text-primary">₹{g.monthly_price}/mo</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-xl bg-muted p-2.5">
                        <p className="text-lg font-bold text-foreground">{subCount}</p>
                        <p className="text-[10px] text-[hsl(var(--small-text))]">Subs</p>
                      </div>
                      <div className="rounded-xl bg-muted p-2.5">
                        <p className="text-lg font-bold text-foreground">{sigCount}</p>
                        <p className="text-[10px] text-[hsl(var(--small-text))]">Signals</p>
                      </div>
                      <div className="rounded-xl bg-light-green p-2.5">
                        <p className="text-lg font-bold text-primary">₹{Math.round(afterFees(revenue)).toLocaleString('en-IN')}</p>
                        <p className="text-[10px] text-[hsl(var(--small-text))]">Earnings</p>
                      </div>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <ReferralLinkCard groupId={g.id} groupName={g.name} advisorId={advisor.id} advisorName={advisor.full_name} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* POST TAB */}
        {tab === 'post' && (
          <div className="max-w-2xl">
            {postMode === 'choose' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* Post Update Card */}
                  <button onClick={() => setPostMode('message')} className="rounded-2xl border-2 border-border bg-card p-6 text-left transition-all hover:shadow-md hover:border-secondary/60">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-light-blue"><MessageSquare className="h-5 w-5 text-secondary" /></div>
                    <p className="mt-3 text-[17px] font-bold text-foreground">Post Update</p>
                    <p className="mt-1 text-[13px] text-muted-foreground">Share analysis, chart images, or market commentary</p>
                    <span className="mt-3 inline-block rounded-md bg-muted px-2.5 py-1 text-[11px] text-[hsl(var(--small-text))]">💬 No Telegram alert</span>
                  </button>
                  {/* Post Signal Card */}
                  <button onClick={() => setPostMode('signal')} className="rounded-2xl border-2 border-[hsl(120,30%,75%)] bg-[hsl(120,60%,97%)] p-6 text-left transition-all hover:shadow-md hover:border-primary/60">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[hsl(120,35%,80%)]"><Radio className="h-5 w-5 text-primary" /></div>
                    <p className="mt-3 text-[17px] font-bold text-foreground">Post Signal</p>
                    <p className="mt-1 text-[13px] text-muted-foreground">Entry, target and stop loss sent to all your subscribers</p>
                    <span className="mt-3 inline-block rounded-md bg-[hsl(120,35%,80%)] px-2.5 py-1 text-[11px] font-semibold text-primary">⚡ Sends Telegram alert</span>
                  </button>
                </div>

                {/* Group Feed */}
                {groups.length > 0 && (
                  <div className="mt-6">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-[17px] font-bold text-foreground">Group Feed</h3>
                      <Select value={feedGroupId || groups[0]?.id} onValueChange={v => setFeedGroupId(v)}>
                        <SelectTrigger className="w-48 h-9 text-sm rounded-lg border-[1.5px]"><SelectValue /></SelectTrigger>
                        <SelectContent>{groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <GroupFeed
                      groupId={feedGroupId || groups[0]?.id}
                      advisorName={advisor.full_name}
                      advisorPhoto={advisor.profile_photo_url || undefined}
                    />
                  </div>
                )}
              </div>
            )}

            {/* MESSAGE FORM */}
            {postMode === 'message' && (
              <div>
                <button onClick={() => setPostMode('choose')} className="mb-4 flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">← Back</button>
                <div className="rounded-2xl border-2 border-secondary/30 bg-card p-6 space-y-4">
                  <h2 className="text-lg font-bold flex items-center gap-2"><MessageSquare className="h-5 w-5 text-secondary" /> Post Update</h2>
                  <div>
                    <Label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--small-text))]">Select Group</Label>
                    <Select value={messageForm.groupId} onValueChange={v => setMessageForm({ ...messageForm, groupId: v })}>
                      <SelectTrigger className="mt-1.5 border-[1.5px]"><SelectValue placeholder="Choose group" /></SelectTrigger>
                      <SelectContent>{groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--small-text))]">Message</Label>
                    <Textarea
                      placeholder="Share market update, chart analysis, or any info with your group..."
                      value={messageForm.text}
                      onChange={e => { if (e.target.value.length <= 1000) setMessageForm({ ...messageForm, text: e.target.value }); }}
                      className="mt-1.5 min-h-[120px] border-[1.5px]"
                    />
                    <p className="text-xs text-[hsl(var(--small-text))] text-right mt-1">{messageForm.text.length}/1000</p>
                  </div>
                  <div>
                    <input type="file" ref={fileInputRef} accept="image/jpeg,image/png,image/webp" onChange={handleImageSelect} className="hidden" />
                    {messageImagePreview ? (
                      <div className="relative">
                        <img src={messageImagePreview} alt="Preview" className="w-full max-h-48 object-cover rounded-xl border-[1.5px] border-border" />
                        <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7 rounded-lg" onClick={() => { setMessageImage(null); setMessageImagePreview(null); }}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button variant="outline" className="gap-2 rounded-lg border-[1.5px]" onClick={() => fileInputRef.current?.click()}>
                        <ImageIcon className="h-4 w-4" /> Attach Chart/Screenshot
                      </Button>
                    )}
                    {uploadProgress > 0 && uploadProgress < 100 && <Progress value={uploadProgress} className="mt-2 h-2" />}
                  </div>
                  <div>
                    <Label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--small-text))]">Visibility</Label>
                    <div className="mt-1.5 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setMessageForm({ ...messageForm, isPublic: true })}
                        aria-pressed={messageForm.isPublic}
                        className={`rounded-xl border-[1.5px] p-3 text-left transition-all ${messageForm.isPublic ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border bg-card hover:border-primary/40'}`}
                      >
                        <div className="flex items-center gap-2"><Globe className="h-4 w-4 text-primary" /><span className="text-sm font-bold">🔓 Public</span></div>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">Visible to followers in their feed</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setMessageForm({ ...messageForm, isPublic: false })}
                        aria-pressed={!messageForm.isPublic}
                        className={`rounded-xl border-[1.5px] p-3 text-left transition-all ${!messageForm.isPublic ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border bg-card hover:border-primary/40'}`}
                      >
                        <div className="flex items-center gap-2"><Lock className="h-4 w-4 text-primary" /><span className="text-sm font-bold">🔒 Subscribers Only</span></div>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">Only paid subscribers can see this</p>
                      </button>
                    </div>
                  </div>
                  <button
                    className="flex h-[42px] w-full items-center justify-center rounded-lg bg-secondary text-sm font-semibold text-secondary-foreground disabled:opacity-50"
                    onClick={postMessage}
                    disabled={posting || !messageForm.groupId || !messageForm.text.trim()}
                  >
                    {posting ? 'Posting...' : '📝 Post Update'}
                  </button>
                  <p className="text-xs text-[hsl(var(--small-text))] text-center">This will appear in the group feed only. No Telegram alert will be sent.</p>
                </div>
              </div>
            )}

            {/* SIGNAL FORM */}
            {postMode === 'signal' && (
              <div>
                <button onClick={() => setPostMode('choose')} className="mb-4 flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">← Back</button>
                <div className="rounded-2xl border-2 border-primary/30 bg-card p-6 space-y-4">
                  <h2 className="text-lg font-bold flex items-center gap-2"><Radio className="h-5 w-5 text-primary" /> Post Signal / Trade</h2>
                  <div>
                    <Label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--small-text))]">Select Group</Label>
                    <Select value={signalForm.groupId} onValueChange={v => setSignalForm({ ...signalForm, groupId: v })}>
                      <SelectTrigger className="mt-1.5 border-[1.5px]"><SelectValue placeholder="Choose group" /></SelectTrigger>
                      <SelectContent>{groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--small-text))]">Instrument</Label>
                    <Input placeholder="NIFTY / BANKNIFTY / RELIANCE..." value={signalForm.instrument} onChange={e => setSignalForm({ ...signalForm, instrument: e.target.value })} className="mt-1.5 border-[1.5px]" />
                  </div>
                  <div>
                    <Label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--small-text))]">Signal Type</Label>
                    <div className="flex gap-2 mt-1.5">
                      <button className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${signalForm.signalType === 'BUY' ? 'bg-primary text-primary-foreground' : 'border-[1.5px] border-border bg-card text-muted-foreground'}`} onClick={() => setSignalForm({ ...signalForm, signalType: 'BUY' })}>🟢 BUY</button>
                      <button className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${signalForm.signalType === 'SELL' ? 'bg-[hsl(25,100%,40%)] text-white' : 'border-[1.5px] border-border bg-card text-muted-foreground'}`} onClick={() => setSignalForm({ ...signalForm, signalType: 'SELL' })}>🟠 SELL</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--small-text))]">Entry Price</Label><Input type="number" value={signalForm.entryPrice} onChange={e => setSignalForm({ ...signalForm, entryPrice: e.target.value })} className="mt-1.5 border-[1.5px]" /></div>
                    <div><Label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--small-text))]">Target Price</Label><Input type="number" value={signalForm.targetPrice} onChange={e => setSignalForm({ ...signalForm, targetPrice: e.target.value })} className="mt-1.5 border-[1.5px]" /></div>
                    <div><Label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--small-text))]">Stop Loss</Label><Input type="number" value={signalForm.stopLoss} onChange={e => setSignalForm({ ...signalForm, stopLoss: e.target.value })} className="mt-1.5 border-[1.5px]" /></div>
                    <div>
                      <Label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--small-text))]">Timeframe</Label>
                      <Select value={signalForm.timeframe} onValueChange={v => setSignalForm({ ...signalForm, timeframe: v })}>
                        <SelectTrigger className="mt-1.5 border-[1.5px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Intraday">Intraday</SelectItem>
                          <SelectItem value="Swing">Swing</SelectItem>
                          <SelectItem value="Positional">Positional</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--small-text))]">Notes (optional)</Label>
                    <Textarea value={signalForm.notes} onChange={e => setSignalForm({ ...signalForm, notes: e.target.value })} className="mt-1.5 border-[1.5px]" />
                  </div>
                  <div>
                    <Label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--small-text))]">Visibility</Label>
                    <div className="mt-1.5 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSignalForm({ ...signalForm, isPublic: true })}
                        aria-pressed={signalForm.isPublic}
                        className={`rounded-xl border-[1.5px] p-3 text-left transition-all ${signalForm.isPublic ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border bg-card hover:border-primary/40'}`}
                      >
                        <div className="flex items-center gap-2"><Globe className="h-4 w-4 text-primary" /><span className="text-sm font-bold">🔓 Public</span></div>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">Free after 24h (preview for non-subs)</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSignalForm({ ...signalForm, isPublic: false })}
                        aria-pressed={!signalForm.isPublic}
                        className={`rounded-xl border-[1.5px] p-3 text-left transition-all ${!signalForm.isPublic ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border bg-card hover:border-primary/40'}`}
                      >
                        <div className="flex items-center gap-2"><Lock className="h-4 w-4 text-primary" /><span className="text-sm font-bold">🔒 Subscribers Only</span></div>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">Only paid subscribers can see this</p>
                      </button>
                    </div>
                  </div>
                  <button
                    className="flex h-[42px] w-full items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground disabled:opacity-50"
                    onClick={postSignal}
                    disabled={posting || !signalForm.groupId || !signalForm.instrument || !signalForm.entryPrice}
                  >
                    {posting ? 'Posting...' : '📊 Post Signal'}
                  </button>
                  <p className="text-xs text-primary text-center font-medium">⚡ This will send a Telegram alert to all active subscribers</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* MY SIGNALS HISTORY TAB */}
        {tab === 'signals_history' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[17px] font-extrabold text-foreground">All Signals ({signalCount})</h2>
              <div className="flex gap-3 text-xs">
                <span className="flex items-center gap-1 text-primary"><CheckCircle2 className="h-3 w-3" /> Target Hit</span>
                <span className="flex items-center gap-1 text-[hsl(var(--small-text))]"><XCircle className="h-3 w-3" /> SL Hit</span>
                <span className="flex items-center gap-1 text-muted-foreground"><Clock className="h-3 w-3" /> Pending</span>
              </div>
            </div>

            {groups.map(g => {
              const groupSignals = signals.filter(s => s.group_id === g.id && (s as any).post_type !== 'message');
              if (groupSignals.length === 0) return null;
              const hits = groupSignals.filter(s => s.result === 'TARGET_HIT').length;
              const misses = groupSignals.filter(s => s.result === 'SL_HIT').length;
              const pending = groupSignals.filter(s => !s.result || s.result === 'PENDING').length;
              return (
                <div key={g.id} className="mb-6">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="font-bold text-foreground">{g.name}</h3>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{groupSignals.length} signals</span>
                    <span className="text-xs font-medium text-primary">{hits} hit</span>
                    <span className="text-xs font-medium text-[hsl(var(--small-text))]">{misses} miss</span>
                    <span className="text-xs text-muted-foreground">{pending} pending</span>
                  </div>
                  <div className="space-y-2">
                    {groupSignals.map(sig => {
                      const barColor = sig.result === 'TARGET_HIT' ? 'bg-primary' : sig.result === 'SL_HIT' ? 'bg-[hsl(var(--small-text))]' : 'bg-[hsl(var(--warning))]';
                      const isPending = !sig.result || sig.result === 'PENDING';
                      return (
                        <div key={sig.id} className="relative overflow-hidden rounded-2xl border-[1.5px] border-border bg-card p-4 pl-[18px]">
                          <div className={`absolute left-0 top-0 bottom-0 w-1 ${barColor}`} />
                          <div className="flex items-center gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-foreground uppercase">{sig.instrument}</span>
                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${sig.signal_type === 'BUY' ? 'bg-light-green text-primary' : 'bg-[hsl(45,100%,94%)] text-[hsl(25,100%,40%)]'}`}>{sig.signal_type}</span>
                                <span className="text-[11px] bg-muted px-2 py-0.5 rounded text-muted-foreground">{sig.timeframe}</span>
                              </div>
                              <div className="mt-1.5 flex gap-4 text-sm">
                                <span className="text-muted-foreground">Entry: <span className="font-semibold text-foreground">₹{Number(sig.entry_price).toLocaleString('en-IN')}</span></span>
                                <span className="text-muted-foreground">Target: <span className="font-semibold text-foreground">₹{Number(sig.target_price).toLocaleString('en-IN')}</span></span>
                                <span className="text-muted-foreground">SL: <span className="font-semibold text-foreground">₹{Number(sig.stop_loss).toLocaleString('en-IN')}</span></span>
                              </div>
                              {sig.notes && <p className="text-xs text-muted-foreground mt-1 italic">{sig.notes}</p>}
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <div className="flex items-center gap-1">
                                {resultIcon(sig.result)}
                                <span className="text-xs font-medium">{sig.result === 'TARGET_HIT' ? 'Hit' : sig.result === 'SL_HIT' ? 'Miss' : 'Pending'}</span>
                              </div>
                              <span className="text-[11px] text-[hsl(var(--small-text))]">{sig.signal_date ? new Date(sig.signal_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''}</span>
                            </div>
                          </div>
                          {/* Status update buttons for PENDING signals — no delete/edit allowed */}
                          {isPending && (
                            <div className="mt-3 pt-3 border-t border-border flex gap-2">
                              <button
                                className="flex-1 rounded-lg bg-primary/10 py-2 text-[12px] font-bold text-primary hover:bg-primary/20 transition-colors"
                                onClick={async () => {
                                  const { error } = await supabase.from('signals').update({ result: 'TARGET_HIT' } as any).eq('id', sig.id);
                                  if (error) toast.error('Update failed');
                                  else { toast.success('Marked as Target Hit ✅'); fetchData(); }
                                }}
                              >
                                ✅ Target Hit
                              </button>
                              <button
                                className="flex-1 rounded-lg bg-destructive/10 py-2 text-[12px] font-bold text-destructive hover:bg-destructive/20 transition-colors"
                                onClick={async () => {
                                  const { error } = await supabase.from('signals').update({ result: 'SL_HIT' } as any).eq('id', sig.id);
                                  if (error) toast.error('Update failed');
                                  else { toast.success('Marked as SL Hit ❌'); fetchData(); }
                                }}
                              >
                                ❌ SL Hit
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {signalCount === 0 && <div className="rounded-2xl border-[1.5px] border-border bg-card p-12 text-center text-muted-foreground">No signals posted yet</div>}
          </div>
        )}

        {/* SUBSCRIBERS TAB */}
        {tab === 'subscribers' && (
          <div>
            {/* SEBI Compliance Audit Log download */}
            {advisor && (
              <div className="mb-6 rounded-2xl border-[1.5px] border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-slate-900 leading-tight">SEBI Compliance Audit Log</h3>
                      <p className="mt-1 text-[12.5px] text-slate-600 leading-snug">Subscriber name, email, PAN, plan, payment ID and risk-disclosure consent timestamp. Phone numbers are intentionally excluded.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => downloadSebiAuditCsv(advisor.id, advisor.full_name)}
                    disabled={exportingCsv}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-[13px] font-bold text-white shadow-sm transition-colors hover:bg-slate-800 disabled:opacity-60"
                  >
                    {exportingCsv ? (
                      <><Clock className="h-4 w-4 animate-spin" /> Preparing…</>
                    ) : (
                      <><Download className="h-4 w-4" /> Download Audit Log (CSV)</>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Present vs Past subscriber summary */}
            {(() => {
              const present = subscribers.filter(s => s.status === 'active' && s.end_date && new Date(s.end_date).getTime() > now);
              const past = subscribers.filter(s => (s.status === 'cancelled' || s.status === 'expired') || (s.end_date && new Date(s.end_date).getTime() <= now));
              return (
                <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border-[1.5px] border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Present Subscribers</p>
                    <p className="mt-1 text-3xl font-extrabold text-emerald-900">{present.length}</p>
                    <p className="mt-1 text-xs text-emerald-800/70">Active with a valid end date in the future.</p>
                  </div>
                  <div className="rounded-2xl border-[1.5px] border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Past Subscribers</p>
                    <p className="mt-1 text-3xl font-extrabold text-slate-900">{past.length}</p>
                    <p className="mt-1 text-xs text-slate-600">Cancelled, expired, or end date has passed.</p>
                  </div>
                </div>
              );
            })()}


            {groups.map(g => {
              const groupSubs = subscribers.filter(s => s.group_id === g.id);
              const activeGroupSubs = groupSubs.filter(s => s.status === 'active' && s.end_date && new Date(s.end_date).getTime() > now);
              const groupRevenue = groupSubs.reduce((sum, s) => sum + (s.amount_paid || 0), 0);
              return (
                <div key={g.id} className="mb-8">
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <h3 className="text-lg font-bold text-foreground">{g.name}</h3>
                    <span className="rounded-full bg-light-green px-2.5 py-0.5 text-xs font-bold text-primary">{activeGroupSubs.length} active</span>
                    <span className="text-xs font-semibold text-primary">₹{groupRevenue.toLocaleString('en-IN')} collected</span>
                  </div>
                  <div className="overflow-hidden rounded-2xl border-[1.5px] border-border bg-card">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted">
                            <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--small-text))]">Name</th>
                            <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--small-text))]">Email</th>
                            <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--small-text))]">Period</th>
                            <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--small-text))]">Paid</th>
                            <th className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--small-text))]">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupSubs.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No subscribers yet</td></tr>}
                          {groupSubs.map((s: any) => (
                            <tr key={s.id} className="border-b border-muted last:border-0">
                              <td className="px-5 py-3.5 font-semibold text-foreground capitalize">{s.profiles?.full_name || '-'}</td>
                              <td className="px-5 py-3.5 text-[13px] text-muted-foreground">{s.profiles?.email || '-'}</td>
                              <td className="px-5 py-3.5 text-[13px] text-muted-foreground">
                                {s.start_date ? new Date(s.start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '-'}
                                {' → '}
                                {s.end_date ? new Date(s.end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '-'}
                              </td>
                              <td className="px-5 py-3.5 font-bold text-primary">₹{(s.amount_paid || 0).toLocaleString('en-IN')}</td>
                              <td className="px-5 py-3.5">
                                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.status === 'active' ? 'bg-light-green text-primary' : 'bg-muted text-[hsl(var(--small-text))]'}`}>{s.status}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })}
            {groups.length === 0 && <div className="rounded-2xl border-[1.5px] border-border bg-card p-12 text-center text-muted-foreground">Create a group first</div>}
          </div>
        )}

        {/* REVENUE TAB */}
        {tab === 'revenue' && (
          <div className="max-w-2xl space-y-4 animate-in fade-in duration-300">
            {/* Rolling 30-day hero */}
            <div className="rounded-2xl bg-gradient-to-br from-primary to-[hsl(160,84%,30%)] p-6 text-primary-foreground">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-white/70">Last 30 Days · Net Earnings</p>
                  <p className="mt-1 text-4xl font-black">₹{Math.round(rolling30Net).toLocaleString('en-IN')}</p>
                  <p className="mt-1 text-xs text-white/70">Collected ₹{Math.round(rolling30Gross).toLocaleString('en-IN')} · Platform fee ₹{Math.round(rolling30Fee).toLocaleString('en-IN')}</p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> Live
                </span>
              </div>
            </div>

            <div className="rounded-2xl border-[1.5px] border-border bg-card p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><IndianRupee className="h-5 w-5 text-primary" /> Lifetime Revenue Breakdown</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-3 border-b border-border">
                  <span className="text-muted-foreground">Total Collections</span>
                  <span className="text-xl font-bold text-foreground">₹{Math.round(totalRevenue).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground">RA Circle Platform Fee</span>
                  <span className="text-muted-foreground font-semibold">- ₹{Math.round(totalPlatformFee).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center py-3 rounded-xl bg-light-green px-4 -mx-1">
                  <span className="font-bold text-foreground text-lg">Your Earnings</span>
                  <span className="text-2xl font-black text-primary">₹{Math.round(totalNetEarnings).toLocaleString('en-IN')}</span>
                </div>
                <p className="text-[11px] text-muted-foreground italic">GST is collected separately for compliance and not deducted from your payout display.</p>
              </div>
            </div>

            {/* Direct vs Referral split */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border-[1.5px] border-border bg-card p-5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Direct Subs · 30%</p>
                <p className="mt-1 text-2xl font-extrabold text-foreground">{directSubs.length}</p>
                <p className="text-xs text-muted-foreground">Gross ₹{Math.round(directGross).toLocaleString('en-IN')}</p>
                <p className="text-sm font-bold text-primary mt-1">Net ₹{Math.round(directNet).toLocaleString('en-IN')}</p>
              </div>
              <div className="rounded-2xl border-[1.5px] border-secondary/40 bg-secondary/5 p-5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-secondary">Referral Subs · 15%</p>
                <p className="mt-1 text-2xl font-extrabold text-foreground">{referralSubs.length}</p>
                <p className="text-xs text-muted-foreground">Gross ₹{Math.round(referralGross).toLocaleString('en-IN')}</p>
                <p className="text-sm font-bold text-secondary mt-1">Net ₹{Math.round(referralNet).toLocaleString('en-IN')}</p>
              </div>
            </div>

            {/* Daily Earnings Breakdown — historical */}
            {dailyEarnings.length > 0 && (
              <div className="rounded-2xl border-[1.5px] border-border bg-card p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <h3 className="font-bold mb-3 text-foreground">Daily Earnings Log (history)</h3>
                <div className="overflow-hidden rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted">
                        <th className="px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--small-text))]">Date</th>
                        <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--small-text))]">Collected</th>
                        <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--small-text))]">Fee</th>
                        <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider text-primary">Net</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dailyEarnings.slice(0, 30).map((e, i) => (
                        <tr key={i} className="border-t border-muted">
                          <td className="px-4 py-2.5 font-medium text-foreground">{new Date(e.earning_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                          <td className="px-4 py-2.5 text-right text-foreground">₹{Math.round(e.gross_revenue).toLocaleString('en-IN')}</td>
                          <td className="px-4 py-2.5 text-right text-muted-foreground">-₹{Math.round(e.platform_fee).toLocaleString('en-IN')}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-primary">₹{Math.round(e.net_earning).toLocaleString('en-IN')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="rounded-2xl border-[1.5px] border-border bg-card p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <h3 className="font-bold mb-3 text-foreground">Per Group Earnings</h3>
              <div className="space-y-2">
                {groups.map(g => {
                  const subsForGroup = subscribers.filter(s => s.group_id === g.id);
                  const groupRev = sum(subsForGroup, 'gross');
                  const groupNet = sum(subsForGroup, 'net');
                  const activeForGroup = subsForGroup.filter(s => s.status === 'active' && s.end_date && new Date(s.end_date).getTime() > now).length;
                  const refCount = subsForGroup.filter(s => s.from_referral).length;
                  return (
                    <div key={g.id} className="flex items-center justify-between rounded-xl bg-muted p-3.5">
                      <div>
                        <p className="font-semibold text-foreground">{g.name}</p>
                        <p className="text-xs text-muted-foreground">{activeForGroup} active • {refCount} via referral • ₹{Math.round(groupRev).toLocaleString('en-IN')} collected</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">₹{Math.round(groupNet).toLocaleString('en-IN')}</p>
                        <p className="text-[10px] text-[hsl(var(--small-text))]">your earnings</p>
                      </div>
                    </div>
                  );
                })}
                {groups.length === 0 && <p className="text-center text-muted-foreground py-4">No groups yet</p>}
              </div>
            </div>
          </div>
        )}

        {/* REFERRALS TAB */}
        {tab === 'referrals' && (
          <ReferralStatsTab advisorId={advisor.id} />
        )}

        {/* PROFILE TAB */}
        {tab === 'profile' && (
          <div className="max-w-lg space-y-4">
            <div className="rounded-2xl border-[1.5px] border-border bg-card p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-4 mb-6">
                <label className="relative cursor-pointer group">
                  <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-2xl font-bold text-primary-foreground overflow-hidden">
                    {advisor.profile_photo_url ? <img src={advisor.profile_photo_url} alt="" className="h-full w-full object-cover" /> : advisor.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ImageIcon className="h-5 w-5 text-white" />
                  </div>
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5MB'); return; }
                    const ext = file.name.split('.').pop();
                    const path = `${advisor.id}/${Date.now()}.${ext}`;
                    const { data, error } = await supabase.storage.from('advisor-avatars').upload(path, file);
                    if (error) { toast.error('Upload failed'); return; }
                    const url = supabase.storage.from('advisor-avatars').getPublicUrl(data.path).data.publicUrl;
                    await supabase.from('advisors').update({ profile_photo_url: url }).eq('id', advisor.id);
                    toast.success('Profile photo updated!');
                    fetchData();
                  }} />
                </label>
                <div>
                  <h2 className="text-[22px] font-extrabold text-foreground capitalize">{advisor.full_name}</h2>
                  <span className="inline-flex items-center rounded-full bg-light-green px-3 py-0.5 text-xs font-semibold text-primary mt-1">✓ {advisor.status}</span>
                  <p className="text-[11px] text-muted-foreground mt-1">Tap photo to change</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl bg-muted p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--small-text))]">SEBI Reg No</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{advisor.sebi_reg_no}</p>
                </div>
                <div className="rounded-xl bg-muted p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--small-text))]">Strategy</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{advisor.strategy_type || '—'}</p>
                </div>
                <div className="col-span-2 rounded-xl bg-muted p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--small-text))]">Email</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{advisor.email}</p>
                </div>
                {advisor.bio && (
                  <div className="col-span-2 rounded-xl bg-muted p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--small-text))]">Bio</p>
                    <p className="mt-1 text-sm text-foreground leading-relaxed">{advisor.bio}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Edit Strategy & Bio */}
            <div className="rounded-2xl border-[1.5px] border-border bg-card p-6 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <h3 className="text-sm font-bold text-foreground mb-4">Update Profile Details</h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--small-text))]">Strategy Type</Label>
                  <Select defaultValue={advisor.strategy_type || ''} onValueChange={async (v) => {
                    await supabase.from('advisors').update({ strategy_type: v }).eq('id', advisor.id);
                    toast.success('Strategy updated');
                    fetchData();
                  }}>
                    <SelectTrigger className="mt-1.5 border-[1.5px]"><SelectValue placeholder="Select strategy" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All</SelectItem>
                      <SelectItem value="Intraday">Intraday</SelectItem>
                      <SelectItem value="Swing">Swing</SelectItem>
                      <SelectItem value="Options">Options</SelectItem>
                      <SelectItem value="Equity">Equity</SelectItem>
                      <SelectItem value="F&O">F&O</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--small-text))]">Risk Level (shown on profile)</Label>
                  <Select defaultValue={(advisor as any).risk_level || ''} onValueChange={async (v) => {
                    await supabase.from('advisors').update({ risk_level: v } as any).eq('id', advisor.id);
                    toast.success('Risk level updated');
                    fetchData();
                  }}>
                    <SelectTrigger className="mt-1.5 border-[1.5px]"><SelectValue placeholder="Select risk level" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Conservative">Conservative</SelectItem>
                      <SelectItem value="Moderate">Moderate</SelectItem>
                      <SelectItem value="Aggressive">Aggressive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--small-text))]">Preferred Trading Hours</Label>
                  <Input defaultValue={(advisor as any).preferred_trading_hours || ''} placeholder="e.g. 09:30 – 11:00 IST" className="mt-1.5 border-[1.5px]" onBlur={async (e) => {
                    const val = sanitizeText(e.target.value).trim();
                    if (val !== ((advisor as any).preferred_trading_hours || '')) {
                      await supabase.from('advisors').update({ preferred_trading_hours: val } as any).eq('id', advisor.id);
                      toast.success('Trading hours updated');
                      fetchData();
                    }
                  }} />
                </div>
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--small-text))]">Bio</Label>
                  <Textarea defaultValue={advisor.bio || ''} placeholder="Describe your trading style..." className="mt-1.5 border-[1.5px] min-h-[80px]" onBlur={async (e) => {
                    const val = e.target.value.trim();
                    if (val !== (advisor.bio || '')) {
                      await supabase.from('advisors').update({ bio: val }).eq('id', advisor.id);
                      toast.success('Bio updated');
                      fetchData();
                    }
                  }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
