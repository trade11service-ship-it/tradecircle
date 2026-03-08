import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
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
import { BarChart3, Radio, Users, UserCircle, IndianRupee, TrendingUp, Clock, CheckCircle2, XCircle, AlertTriangle, MessageSquare, ImageIcon, X, Globe, Lock, Gift } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Advisor = Tables<'advisors'>;
type Group = Tables<'groups'>;
type Signal = Tables<'signals'>;

export default function AdvisorDashboard() {
  const { user } = useAuth();
  const [advisor, setAdvisor] = useState<Advisor | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [tab, setTab] = useState<'groups' | 'post' | 'signals_history' | 'subscribers' | 'revenue' | 'referrals' | 'profile'>('groups');
  const [loading, setLoading] = useState(true);
  const [groupForm, setGroupForm] = useState({ name: '', description: '', monthlyPrice: '' });
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

  useEffect(() => { if (user) fetchData(); }, [user]);

  useEffect(() => {
    if (!advisor) return;
    const channel = supabase.channel('advisor-subs-realtime').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'subscriptions', filter: `advisor_id=eq.${advisor.id}` }, () => { toast.info('New subscriber joined!'); fetchData(); }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [advisor]);

  const fetchData = async () => {
    const { data: advList, error: advError } = await supabase.from('advisors').select('*').eq('user_id', user!.id).order('status', { ascending: true });
    if (advError) console.error('Advisor fetch error:', advError);
    const adv = advList?.find(a => a.status === 'approved') || advList?.[0] || null;
    setAdvisor(adv);
    if (adv) {
      const [grpsRes, subsRes, sigsRes] = await Promise.all([
        supabase.from('groups').select('*').eq('advisor_id', adv.id),
        supabase.from('subscriptions').select('*, profiles!inner(full_name, email), groups!inner(name)').eq('advisor_id', adv.id).order('created_at', { ascending: false }),
        supabase.from('signals').select('*').eq('advisor_id', adv.id).order('created_at', { ascending: false }),
      ]);
      setGroups(grpsRes.data || []);
      setSubscribers(subsRes.data || []);
      setSignals(sigsRes.data || []);
    }
    setLoading(false);
  };

  const createGroup = async () => {
    if (!advisor) return;
    let dpUrl = '';
    if (groupDp) {
      const { data } = await supabase.storage.from('kyc-documents').upload(`groups/${advisor.id}/${Date.now()}.${groupDp.name.split('.').pop()}`, groupDp);
      if (data) dpUrl = supabase.storage.from('kyc-documents').getPublicUrl(data.path).data.publicUrl;
    }
    const { data: newGroup, error } = await supabase.from('groups').insert({ advisor_id: advisor.id, name: groupForm.name, description: groupForm.description, monthly_price: parseInt(groupForm.monthlyPrice), dp_url: dpUrl }).select().single();
    if (error) { toast.error(error.message); return; }
    toast.info('Creating payment link...');
    const { data: session } = await supabase.auth.getSession();
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-payment-link`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.session?.access_token}` }, body: JSON.stringify({ group_id: newGroup.id, group_name: groupForm.name, amount: parseInt(groupForm.monthlyPrice) }) });
    const result = await res.json();
    if (res.ok) toast.success('Group created with payment link!');
    else toast.warning('Group created but payment link generation failed: ' + (result.error || 'Unknown error'));
    setShowGroupForm(false);
    setGroupForm({ name: '', description: '', monthlyPrice: '' });
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
      message_text: messageForm.text,
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
      instrument: signalForm.instrument,
      signal_type: signalForm.signalType,
      entry_price: parseFloat(signalForm.entryPrice),
      target_price: parseFloat(signalForm.targetPrice),
      stop_loss: parseFloat(signalForm.stopLoss),
      timeframe: signalForm.timeframe,
      notes: signalForm.notes,
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

  if (loading) return <div className="min-h-screen bg-background"><Navbar /><div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div></div>;
  if (!advisor) return <div className="min-h-screen bg-background"><Navbar /><div className="py-20 text-center text-muted-foreground">No advisor profile found.</div><Footer /></div>;

  if (advisor.status === 'pending') return (
    <div className="min-h-screen flex flex-col bg-background"><Navbar />
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="tc-card-static p-8 text-center max-w-md">
          <span className="tc-badge-pending">Pending Review</span>
          <h2 className="mt-4 text-xl font-bold">Your application is under review</h2>
          <p className="mt-2 text-muted-foreground">We'll notify you once your SEBI verification is complete.</p>
        </div>
      </div>
      <Footer />
    </div>
  );

  if (advisor.status === 'rejected') return (
    <div className="min-h-screen flex flex-col bg-background"><Navbar />
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="tc-card-static p-8 text-center max-w-md">
          <span className="tc-badge-rejected">Rejected</span>
          <h2 className="mt-4 text-xl font-bold">Application Rejected</h2>
          {advisor.rejection_reason && <p className="mt-2 text-muted-foreground">Reason: {advisor.rejection_reason}</p>}
        </div>
      </div>
      <Footer />
    </div>
  );

  const activeSubs = subscribers.filter(s => s.status === 'active');
  const totalSubs = activeSubs.length;
  const totalRevenue = subscribers.reduce((sum, s) => sum + (s.amount_paid || 0), 0);
  const thisMonthSubs = subscribers.filter(s => { const d = new Date(s.created_at); const now = new Date(); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
  const thisMonthRevenue = thisMonthSubs.reduce((sum, s) => sum + (s.amount_paid || 0), 0);

  const afterGST = (amount: number) => amount * 0.82;
  const afterFees = (amount: number) => afterGST(amount) * 0.70;
  const gstAmount = (amount: number) => amount * 0.18;
  const tcFee = (amount: number) => afterGST(amount) * 0.30;

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

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 flex-1">
        <h1 className="text-3xl font-bold mb-6">Advisor Dashboard</h1>

        {/* Quick Stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Active Subscribers', value: totalSubs, icon: Users },
            { label: 'Groups', value: groups.length, icon: BarChart3 },
            { label: 'Signals Posted', value: signals.filter(s => (s as any).post_type !== 'message').length, icon: Radio },
            { label: 'Your Earnings', value: `₹${Math.round(afterFees(totalRevenue)).toLocaleString('en-IN')}`, icon: IndianRupee, highlight: true },
          ].map((stat, i) => (
            <div key={i} className={`rounded-xl border p-5 ${stat.highlight ? 'bg-primary/5 border-primary/20' : 'bg-card'}`}>
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`h-4 w-4 ${stat.highlight ? 'text-primary' : 'text-muted-foreground'}`} />
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
              <p className={`text-2xl font-bold ${stat.highlight ? 'text-primary' : 'text-foreground'}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
          {tabs.map(t => (
            <Button key={t.key} variant={tab === t.key ? 'default' : 'outline'} size="sm" className="gap-2 min-h-[44px] whitespace-nowrap" onClick={() => { setTab(t.key); if (t.key === 'post') setPostMode('choose'); }}>
              <t.icon className="h-4 w-4" /> {t.label}
            </Button>
          ))}
        </div>

        {/* GROUPS TAB */}
        {tab === 'groups' && (
          <div>
            <Button className="mb-4 font-semibold" onClick={() => setShowGroupForm(!showGroupForm)}>+ Create New Group</Button>
            {showGroupForm && (
              <div className="mb-6 rounded-xl border bg-card p-6 space-y-4">
                <div><Label>Group Name</Label><Input value={groupForm.name} onChange={e => setGroupForm({ ...groupForm, name: e.target.value })} /></div>
                <div><Label>Description</Label><Textarea value={groupForm.description} onChange={e => setGroupForm({ ...groupForm, description: e.target.value })} /></div>
                <div><Label>Monthly Price (₹)</Label><Input type="number" value={groupForm.monthlyPrice} onChange={e => setGroupForm({ ...groupForm, monthlyPrice: e.target.value })} /></div>
                <div><Label>Group Photo</Label><Input type="file" accept="image/*" onChange={e => setGroupDp(e.target.files?.[0] || null)} /></div>
                <Button onClick={createGroup} className="font-semibold">Create Group</Button>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              {groups.map(g => {
                const subCount = subscribers.filter(s => s.group_id === g.id && s.status === 'active').length;
                const revenue = subscribers.filter(s => s.group_id === g.id).reduce((sum, s) => sum + (s.amount_paid || 0), 0);
                const sigCount = signals.filter(s => s.group_id === g.id).length;
                return (
                  <div key={g.id} className="rounded-xl border bg-card p-5 hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setFeedGroupId(g.id); setTab('post'); setPostMode('choose'); }}>
                    <div className="flex items-center gap-3 mb-3">
                      {g.dp_url ? (
                        <img src={g.dp_url} alt={g.name} className="h-10 w-10 rounded-full object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">{g.name.charAt(0)}</div>
                      )}
                      <div>
                        <p className="font-bold text-foreground">{g.name}</p>
                        <p className="text-sm text-primary font-semibold">₹{g.monthly_price}/mo</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-muted/50 p-2">
                        <p className="text-lg font-bold text-foreground">{subCount}</p>
                        <p className="text-xs text-muted-foreground">Subs</p>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-2">
                        <p className="text-lg font-bold text-foreground">{sigCount}</p>
                        <p className="text-xs text-muted-foreground">Posts</p>
                      </div>
                      <div className="rounded-lg bg-primary/5 p-2">
                        <p className="text-lg font-bold text-primary">₹{Math.round(afterFees(revenue)).toLocaleString('en-IN')}</p>
                        <p className="text-xs text-muted-foreground">Earnings</p>
                      </div>
                    </div>
                    <ReferralLinkCard groupId={g.id} groupName={g.name} advisorId={advisor.id} advisorName={advisor.full_name} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* POST TAB */}
        {tab === 'post' && (
          <div className="max-w-2xl">
            {/* Post type chooser */}
            {postMode === 'choose' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setPostMode('message')}
                    className="rounded-xl border-2 border-secondary bg-card p-6 text-left hover:shadow-md transition-all hover:border-secondary/80 group"
                  >
                    <MessageSquare className="h-8 w-8 text-secondary mb-3" />
                    <p className="font-bold text-foreground text-lg">📝 Post Update</p>
                    <p className="text-xs text-muted-foreground mt-1">Share market analysis, chart screenshots, or info with your group</p>
                    <p className="text-[10px] text-muted-foreground mt-2 border-t pt-2">No Telegram alert sent</p>
                  </button>
                  <button
                    onClick={() => setPostMode('signal')}
                    className="rounded-xl border-2 border-primary bg-primary/5 p-6 text-left hover:shadow-md transition-all hover:border-primary/80 group"
                  >
                    <Radio className="h-8 w-8 text-primary mb-3" />
                    <p className="font-bold text-foreground text-lg">📊 Post Signal</p>
                    <p className="text-xs text-muted-foreground mt-1">Post a trading signal with entry, target, stop loss</p>
                    <p className="text-[10px] text-primary mt-2 border-t pt-2 font-semibold">⚡ Sends Telegram alert</p>
                  </button>
                </div>

                {/* Group feed preview */}
                {groups.length > 0 && (
                  <div className="mt-6">
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="font-bold text-foreground">Group Feed</h3>
                      <Select value={feedGroupId || groups[0]?.id} onValueChange={v => setFeedGroupId(v)}>
                        <SelectTrigger className="w-48 h-8 text-xs"><SelectValue /></SelectTrigger>
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
                <Button variant="ghost" size="sm" className="mb-4 gap-1" onClick={() => setPostMode('choose')}>← Back</Button>
                <div className="rounded-xl border-2 border-secondary bg-card p-6 space-y-4">
                  <h2 className="text-lg font-bold flex items-center gap-2"><MessageSquare className="h-5 w-5 text-secondary" /> Post Update</h2>
                  <div>
                    <Label>Select Group</Label>
                    <Select value={messageForm.groupId} onValueChange={v => setMessageForm({ ...messageForm, groupId: v })}>
                      <SelectTrigger><SelectValue placeholder="Choose group" /></SelectTrigger>
                      <SelectContent>{groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Message</Label>
                    <Textarea
                      placeholder="Share market update, chart analysis, or any info with your group..."
                      value={messageForm.text}
                      onChange={e => { if (e.target.value.length <= 1000) setMessageForm({ ...messageForm, text: e.target.value }); }}
                      className="min-h-[120px]"
                    />
                    <p className="text-xs text-muted-foreground text-right mt-1">{messageForm.text.length}/1000</p>
                  </div>
                  <div>
                    <input type="file" ref={fileInputRef} accept="image/jpeg,image/png,image/webp" onChange={handleImageSelect} className="hidden" />
                    {messageImagePreview ? (
                      <div className="relative">
                        <img src={messageImagePreview} alt="Preview" className="w-full max-h-48 object-cover rounded-lg border" />
                        <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => { setMessageImage(null); setMessageImagePreview(null); }}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Button variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()}>
                        <ImageIcon className="h-4 w-4" /> Attach Chart/Screenshot
                      </Button>
                    )}
                    {uploadProgress > 0 && uploadProgress < 100 && <Progress value={uploadProgress} className="mt-2 h-2" />}
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
                    <div className="flex items-center gap-2">
                      {messageForm.isPublic ? <Globe className="h-4 w-4 text-primary" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                      <div>
                        <p className="text-sm font-medium">{messageForm.isPublic ? 'Public' : 'Subscribers Only'}</p>
                        <p className="text-[11px] text-muted-foreground">{messageForm.isPublic ? 'Visible to followers in their feed' : 'Only paid subscribers can see this'}</p>
                      </div>
                    </div>
                    <Switch checked={messageForm.isPublic} onCheckedChange={v => setMessageForm({ ...messageForm, isPublic: v })} />
                  </div>
                  <Button className="w-full font-semibold bg-secondary hover:bg-secondary/90 text-secondary-foreground" onClick={postMessage} disabled={posting || !messageForm.groupId || !messageForm.text.trim()}>
                    {posting ? 'Posting...' : '📝 Post Update'}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">This will appear in the group feed only. No Telegram alert will be sent.</p>
                </div>
              </div>
            )}

            {/* SIGNAL FORM */}
            {postMode === 'signal' && (
              <div>
                <Button variant="ghost" size="sm" className="mb-4 gap-1" onClick={() => setPostMode('choose')}>← Back</Button>
                <div className="rounded-xl border-2 border-primary bg-card p-6 space-y-4">
                  <h2 className="text-lg font-bold flex items-center gap-2"><Radio className="h-5 w-5 text-primary" /> Post Signal / Trade</h2>
                  <div>
                    <Label>Select Group</Label>
                    <Select value={signalForm.groupId} onValueChange={v => setSignalForm({ ...signalForm, groupId: v })}>
                      <SelectTrigger><SelectValue placeholder="Choose group" /></SelectTrigger>
                      <SelectContent>{groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Instrument</Label><Input placeholder="NIFTY / BANKNIFTY / RELIANCE..." value={signalForm.instrument} onChange={e => setSignalForm({ ...signalForm, instrument: e.target.value })} /></div>
                  <div>
                    <Label>Signal Type</Label>
                    <div className="flex gap-2 mt-1">
                      <Button className="flex-1 font-semibold" variant={signalForm.signalType === 'BUY' ? 'default' : 'outline'} onClick={() => setSignalForm({ ...signalForm, signalType: 'BUY' })}>🟢 BUY</Button>
                      <Button className="flex-1 font-semibold" variant={signalForm.signalType === 'SELL' ? 'destructive' : 'outline'} onClick={() => setSignalForm({ ...signalForm, signalType: 'SELL' })}>🔴 SELL</Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Entry Price</Label><Input type="number" value={signalForm.entryPrice} onChange={e => setSignalForm({ ...signalForm, entryPrice: e.target.value })} /></div>
                    <div><Label>Target Price</Label><Input type="number" value={signalForm.targetPrice} onChange={e => setSignalForm({ ...signalForm, targetPrice: e.target.value })} /></div>
                    <div><Label>Stop Loss</Label><Input type="number" value={signalForm.stopLoss} onChange={e => setSignalForm({ ...signalForm, stopLoss: e.target.value })} /></div>
                    <div>
                      <Label>Timeframe</Label>
                      <Select value={signalForm.timeframe} onValueChange={v => setSignalForm({ ...signalForm, timeframe: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Intraday">Intraday</SelectItem>
                          <SelectItem value="Swing">Swing</SelectItem>
                          <SelectItem value="Positional">Positional</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div><Label>Notes (optional)</Label><Textarea value={signalForm.notes} onChange={e => setSignalForm({ ...signalForm, notes: e.target.value })} /></div>
                  <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
                    <div className="flex items-center gap-2">
                      {signalForm.isPublic ? <Globe className="h-4 w-4 text-primary" /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                      <div>
                        <p className="text-sm font-medium">{signalForm.isPublic ? 'Public' : 'Subscribers Only'}</p>
                        <p className="text-[11px] text-muted-foreground">{signalForm.isPublic ? 'Visible to followers (blurred for non-subs)' : 'Only paid subscribers can see this'}</p>
                      </div>
                    </div>
                    <Switch checked={signalForm.isPublic} onCheckedChange={v => setSignalForm({ ...signalForm, isPublic: v })} />
                  </div>
                  <Button className="w-full font-semibold" onClick={postSignal} disabled={posting || !signalForm.groupId || !signalForm.instrument || !signalForm.entryPrice}>
                    {posting ? 'Posting...' : '📊 Post Signal'}
                  </Button>
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
              <h2 className="text-lg font-bold">All Signals ({signals.filter(s => (s as any).post_type !== 'message').length})</h2>
              <div className="flex gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-primary" /> Target Hit</span>
                <span className="flex items-center gap-1"><XCircle className="h-3 w-3 text-destructive" /> SL Hit</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-muted-foreground" /> Pending</span>
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
                    <span className="text-xs text-muted-foreground">{groupSignals.length} signals</span>
                    <span className="text-xs text-primary font-medium">{hits} hit</span>
                    <span className="text-xs text-destructive font-medium">{misses} miss</span>
                    <span className="text-xs text-muted-foreground">{pending} pending</span>
                  </div>
                  <div className="space-y-2">
                    {groupSignals.map(sig => (
                      <div key={sig.id} className="rounded-xl border bg-card p-4 flex items-center gap-4">
                        <div className={`w-1 self-stretch rounded-full ${sig.signal_type === 'BUY' ? 'bg-primary' : 'bg-destructive'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-foreground">{sig.instrument}</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${sig.signal_type === 'BUY' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>{sig.signal_type}</span>
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{sig.timeframe}</span>
                          </div>
                          <div className="mt-1 flex gap-4 text-sm">
                            <span className="text-muted-foreground">Entry: <span className="font-semibold text-foreground">₹{Number(sig.entry_price).toLocaleString('en-IN')}</span></span>
                            <span className="text-muted-foreground">Target: <span className="font-semibold text-primary">₹{Number(sig.target_price).toLocaleString('en-IN')}</span></span>
                            <span className="text-muted-foreground">SL: <span className="font-semibold text-destructive">₹{Number(sig.stop_loss).toLocaleString('en-IN')}</span></span>
                          </div>
                          {sig.notes && <p className="text-xs text-muted-foreground mt-1 truncate">{sig.notes}</p>}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1">
                            {resultIcon(sig.result)}
                            <span className="text-xs font-medium">{sig.result === 'TARGET_HIT' ? 'Hit' : sig.result === 'SL_HIT' ? 'Miss' : 'Pending'}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">{sig.signal_date ? new Date(sig.signal_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {signals.filter(s => (s as any).post_type !== 'message').length === 0 && <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">No signals posted yet</div>}
          </div>
        )}

        {/* SUBSCRIBERS TAB */}
        {tab === 'subscribers' && (
          <div>
            {groups.map(g => {
              const groupSubs = subscribers.filter(s => s.group_id === g.id);
              const activeGroupSubs = groupSubs.filter(s => s.status === 'active');
              const groupRevenue = groupSubs.reduce((sum, s) => sum + (s.amount_paid || 0), 0);
              return (
                <div key={g.id} className="mb-8">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="font-bold text-lg">{g.name}</h3>
                    <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">{activeGroupSubs.length} active</span>
                    <span className="text-xs text-muted-foreground">• ₹{groupRevenue.toLocaleString('en-IN')} collected</span>
                  </div>
                  <div className="rounded-xl border bg-card overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b bg-muted/50 text-left">
                        <th className="p-3 font-medium text-muted-foreground">Name</th>
                        <th className="p-3 font-medium text-muted-foreground">Email</th>
                        <th className="p-3 font-medium text-muted-foreground">Start</th>
                        <th className="p-3 font-medium text-muted-foreground">End</th>
                        <th className="p-3 font-medium text-muted-foreground">Paid</th>
                        <th className="p-3 font-medium text-muted-foreground">Payment ID</th>
                        <th className="p-3 font-medium text-muted-foreground">Status</th>
                      </tr></thead>
                      <tbody>
                        {groupSubs.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No subscribers yet</td></tr>}
                        {groupSubs.map((s: any, i: number) => (
                          <tr key={s.id} className={`border-b last:border-0 ${i % 2 === 1 ? 'bg-muted/30' : ''}`}>
                            <td className="p-3 font-medium">{s.profiles?.full_name || '-'}</td>
                            <td className="p-3 text-muted-foreground">{s.profiles?.email || '-'}</td>
                            <td className="p-3">{s.start_date ? new Date(s.start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</td>
                            <td className="p-3">{s.end_date ? new Date(s.end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</td>
                            <td className="p-3 font-semibold">₹{(s.amount_paid || 0).toLocaleString('en-IN')}</td>
                            <td className="p-3 font-mono text-xs text-muted-foreground">{s.razorpay_payment_id || '-'}</td>
                            <td className="p-3"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.status === 'active' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>{s.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
            {groups.length === 0 && <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">Create a group first</div>}
          </div>
        )}

        {/* REVENUE TAB */}
        {tab === 'revenue' && (
          <div className="max-w-2xl">
            <div className="rounded-xl border bg-card p-6 mb-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><IndianRupee className="h-5 w-5 text-primary" /> Revenue Breakdown</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-3 border-b">
                  <span className="text-muted-foreground">Total Collections</span>
                  <span className="text-xl font-bold text-foreground">₹{totalRevenue.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> GST (18%)</span>
                  <span className="text-destructive font-semibold">- ₹{Math.round(gstAmount(totalRevenue)).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">After GST</span>
                  <span className="font-semibold text-foreground">₹{Math.round(afterGST(totalRevenue)).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-muted-foreground">TradeCircle Fee (30%)</span>
                  <span className="text-destructive font-semibold">- ₹{Math.round(tcFee(totalRevenue)).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-t-2 border-primary/20 bg-primary/5 rounded-lg px-3 -mx-3">
                  <span className="font-bold text-foreground text-lg">Your Earnings</span>
                  <span className="text-2xl font-bold text-primary">₹{Math.round(afterFees(totalRevenue)).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-6 mb-6">
              <h3 className="font-bold mb-3">This Month</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Collections</p>
                  <p className="text-lg font-bold text-foreground">₹{thisMonthRevenue.toLocaleString('en-IN')}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Deductions</p>
                  <p className="text-lg font-bold text-destructive">₹{Math.round(thisMonthRevenue - afterFees(thisMonthRevenue)).toLocaleString('en-IN')}</p>
                </div>
                <div className="rounded-lg bg-primary/5 p-3">
                  <p className="text-xs text-muted-foreground">Your Earnings</p>
                  <p className="text-lg font-bold text-primary">₹{Math.round(afterFees(thisMonthRevenue)).toLocaleString('en-IN')}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-card p-6">
              <h3 className="font-bold mb-3">Per Group Earnings</h3>
              <div className="space-y-3">
                {groups.map(g => {
                  const groupRev = subscribers.filter(s => s.group_id === g.id).reduce((sum, s) => sum + (s.amount_paid || 0), 0);
                  const groupSubs = subscribers.filter(s => s.group_id === g.id && s.status === 'active').length;
                  return (
                    <div key={g.id} className="flex items-center justify-between rounded-lg bg-muted/30 p-3">
                      <div>
                        <p className="font-semibold text-foreground">{g.name}</p>
                        <p className="text-xs text-muted-foreground">{groupSubs} active subs • ₹{groupRev.toLocaleString('en-IN')} collected</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">₹{Math.round(afterFees(groupRev)).toLocaleString('en-IN')}</p>
                        <p className="text-xs text-muted-foreground">your earnings</p>
                      </div>
                    </div>
                  );
                })}
                {groups.length === 0 && <p className="text-center text-muted-foreground py-4">No groups yet</p>}
              </div>
            </div>
          </div>
        )}

        {/* PROFILE TAB */}
        {tab === 'profile' && (
          <div className="max-w-lg">
            <div className="rounded-xl border bg-card p-6 space-y-3">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground overflow-hidden">
                  {advisor.profile_photo_url ? <img src={advisor.profile_photo_url} alt="" className="h-full w-full object-cover" /> : advisor.full_name.charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{advisor.full_name}</h2>
                  <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">{advisor.status}</span>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between rounded-lg bg-muted/50 p-3"><span className="text-muted-foreground">SEBI Reg No</span><span className="font-medium">{advisor.sebi_reg_no}</span></div>
                <div className="flex justify-between rounded-lg bg-muted/50 p-3"><span className="text-muted-foreground">Strategy</span><span className="font-medium">{advisor.strategy_type}</span></div>
                <div className="flex justify-between rounded-lg bg-muted/50 p-3"><span className="text-muted-foreground">Email</span><span className="font-medium">{advisor.email}</span></div>
              </div>
              {advisor.bio && <div className="rounded-lg bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Bio</p><p className="text-sm mt-1">{advisor.bio}</p></div>}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
