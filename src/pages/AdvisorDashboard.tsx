import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { BarChart3, Radio, Users, UserCircle, IndianRupee } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Advisor = Tables<'advisors'>;
type Group = Tables<'groups'>;

export default function AdvisorDashboard() {
  const { user } = useAuth();
  const [advisor, setAdvisor] = useState<Advisor | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [tab, setTab] = useState<'groups' | 'signal' | 'subscribers' | 'profile'>('groups');
  const [loading, setLoading] = useState(true);
  const [groupForm, setGroupForm] = useState({ name: '', description: '', monthlyPrice: '' });
  const [groupDp, setGroupDp] = useState<File | null>(null);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [signalForm, setSignalForm] = useState({ groupId: '', instrument: '', signalType: 'BUY', entryPrice: '', targetPrice: '', stopLoss: '', timeframe: 'Intraday', notes: '' });

  useEffect(() => { if (user) fetchData(); }, [user]);

  useEffect(() => {
    if (!advisor) return;
    const channel = supabase.channel('advisor-subs-realtime').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'subscriptions', filter: `advisor_id=eq.${advisor.id}` }, () => { toast.info('New subscriber joined!'); fetchData(); }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [advisor]);

  const fetchData = async () => {
    const { data: adv } = await supabase.from('advisors').select('*').eq('user_id', user!.id).single();
    setAdvisor(adv);
    if (adv) {
      const { data: grps } = await supabase.from('groups').select('*').eq('advisor_id', adv.id);
      setGroups(grps || []);
      const { data: subs } = await supabase.from('subscriptions').select('*, profiles!inner(full_name, email), groups!inner(name)').eq('advisor_id', adv.id).order('created_at', { ascending: false });
      setSubscribers(subs || []);
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

  const postSignal = async () => {
    if (!advisor) return;
    const { data: newSignal, error } = await supabase.from('signals').insert({ group_id: signalForm.groupId, advisor_id: advisor.id, instrument: signalForm.instrument, signal_type: signalForm.signalType, entry_price: parseFloat(signalForm.entryPrice), target_price: parseFloat(signalForm.targetPrice), stop_loss: parseFloat(signalForm.stopLoss), timeframe: signalForm.timeframe, notes: signalForm.notes }).select().single();
    if (error) { toast.error(error.message); return; }
    toast.success('Signal posted! Sending Telegram alerts...');
    // Trigger telegram notifications
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
    setSignalForm({ groupId: '', instrument: '', signalType: 'BUY', entryPrice: '', targetPrice: '', stopLoss: '', timeframe: 'Intraday', notes: '' });
  };

  if (loading) return <div className="min-h-screen bg-off-white"><Navbar /><div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div></div>;
  if (!advisor) return <div className="min-h-screen bg-off-white"><Navbar /><div className="py-20 text-center text-muted-foreground">No advisor profile found.</div><Footer /></div>;

  if (advisor.status === 'pending') return (
    <div className="min-h-screen flex flex-col bg-off-white"><Navbar />
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
    <div className="min-h-screen flex flex-col bg-off-white"><Navbar />
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

  const totalSubs = subscribers.filter(s => s.status === 'active').length;
  const thisMonthRevenue = subscribers.filter(s => { const d = new Date(s.created_at); const now = new Date(); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).reduce((sum, s) => sum + (s.amount_paid || 0), 0);

  const tabs = [
    { key: 'groups' as const, label: 'My Groups', icon: BarChart3 },
    { key: 'signal' as const, label: 'Post Signal', icon: Radio },
    { key: 'subscribers' as const, label: 'Subscribers', icon: Users },
    { key: 'profile' as const, label: 'My Profile', icon: UserCircle },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-off-white">
      <Navbar />
      <div className="container mx-auto px-4 py-8 flex-1">
        <h1 className="tc-page-title text-3xl mb-6">Advisor Dashboard</h1>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: 'Total Subscribers', value: totalSubs, color: 'text-foreground' },
            { label: 'Active Groups', value: groups.length, color: 'text-foreground' },
            { label: 'This Month Revenue', value: `₹${thisMonthRevenue.toLocaleString('en-IN')}`, color: 'text-primary' },
            { label: 'Signals Posted', value: subscribers.length, color: 'text-foreground' },
          ].map((stat, i) => (
            <div key={i} className="tc-card-static p-5">
              <p className="tc-small">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto">
          {tabs.map(t => (
            <Button key={t.key} variant={tab === t.key ? 'default' : 'outline'} size="sm" className="gap-2 tc-btn-click min-h-[44px]" onClick={() => setTab(t.key)}>
              <t.icon className="h-4 w-4" /> {t.label}
            </Button>
          ))}
        </div>

        {tab === 'groups' && (
          <div>
            <Button className="mb-4 tc-btn-click font-semibold" onClick={() => setShowGroupForm(!showGroupForm)}>+ Create New Group</Button>
            {showGroupForm && (
              <div className="mb-6 tc-card-static p-6 space-y-4">
                <div><Label>Group Name</Label><Input value={groupForm.name} onChange={e => setGroupForm({ ...groupForm, name: e.target.value })} className="tc-input-focus" /></div>
                <div><Label>Description</Label><Textarea value={groupForm.description} onChange={e => setGroupForm({ ...groupForm, description: e.target.value })} /></div>
                <div><Label>Monthly Price (₹)</Label><Input type="number" value={groupForm.monthlyPrice} onChange={e => setGroupForm({ ...groupForm, monthlyPrice: e.target.value })} className="tc-input-focus" /></div>
                <div><Label>Group Photo</Label><Input type="file" accept="image/*" onChange={e => setGroupDp(e.target.files?.[0] || null)} /></div>
                <Button onClick={createGroup} className="tc-btn-click font-semibold">Create Group</Button>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              {groups.map(g => {
                const subCount = subscribers.filter(s => s.group_id === g.id && s.status === 'active').length;
                const revenue = subscribers.filter(s => s.group_id === g.id).reduce((sum, s) => sum + (s.amount_paid || 0), 0);
                return (
                  <div key={g.id} className="tc-card p-5">
                    <p className="tc-card-title">{g.name}</p>
                    <p className="tc-amount mt-1">₹{g.monthly_price}/month</p>
                    <p className="tc-small mt-2">{subCount} subscribers • <span className="tc-amount">₹{revenue.toLocaleString('en-IN')}</span> total revenue</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'signal' && (
          <div className="max-w-lg">
            <div className="tc-card-static p-6 space-y-4">
              <h2 className="tc-card-title">Post New Signal</h2>
              <div>
                <Label>Select Group</Label>
                <Select value={signalForm.groupId} onValueChange={v => setSignalForm({ ...signalForm, groupId: v })}>
                  <SelectTrigger className="tc-input-focus"><SelectValue placeholder="Choose group" /></SelectTrigger>
                  <SelectContent>{groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Instrument</Label><Input placeholder="NIFTY / BANKNIFTY / RELIANCE..." value={signalForm.instrument} onChange={e => setSignalForm({ ...signalForm, instrument: e.target.value })} className="tc-input-focus" /></div>
              <div>
                <Label>Signal Type</Label>
                <div className="flex gap-2 mt-1">
                  <Button className={`flex-1 tc-btn-click font-semibold ${signalForm.signalType === 'BUY' ? '' : ''}`} variant={signalForm.signalType === 'BUY' ? 'default' : 'outline'} onClick={() => setSignalForm({ ...signalForm, signalType: 'BUY' })}>BUY</Button>
                  <Button className="flex-1 tc-btn-click font-semibold" variant={signalForm.signalType === 'SELL' ? 'destructive' : 'outline'} onClick={() => setSignalForm({ ...signalForm, signalType: 'SELL' })}>SELL</Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Entry Price</Label><Input type="number" value={signalForm.entryPrice} onChange={e => setSignalForm({ ...signalForm, entryPrice: e.target.value })} className="tc-input-focus" /></div>
                <div><Label>Target Price</Label><Input type="number" value={signalForm.targetPrice} onChange={e => setSignalForm({ ...signalForm, targetPrice: e.target.value })} className="tc-input-focus" /></div>
                <div><Label>Stop Loss</Label><Input type="number" value={signalForm.stopLoss} onChange={e => setSignalForm({ ...signalForm, stopLoss: e.target.value })} className="tc-input-focus" /></div>
                <div>
                  <Label>Timeframe</Label>
                  <Select value={signalForm.timeframe} onValueChange={v => setSignalForm({ ...signalForm, timeframe: v })}>
                    <SelectTrigger className="tc-input-focus"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Intraday">Intraday</SelectItem>
                      <SelectItem value="Swing">Swing</SelectItem>
                      <SelectItem value="Positional">Positional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Notes</Label><Textarea value={signalForm.notes} onChange={e => setSignalForm({ ...signalForm, notes: e.target.value })} /></div>
              <Button className="w-full tc-btn-click font-semibold" onClick={postSignal} disabled={!signalForm.groupId || !signalForm.instrument || !signalForm.entryPrice}>Post Signal</Button>
            </div>

            {/* Preview */}
            {signalForm.instrument && (
              <div className="mt-6">
                <p className="tc-small mb-2">Signal Preview</p>
                <div className="tc-card-static p-4 overflow-hidden">
                  <div className="flex">
                    <div className={`w-1 rounded-full mr-3 self-stretch ${signalForm.signalType === 'BUY' ? 'bg-primary' : 'bg-destructive'}`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="tc-card-title">{signalForm.instrument}</p>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${signalForm.signalType === 'BUY' ? 'bg-light-green text-primary' : 'bg-[hsl(0,100%,95%)] text-destructive'}`}>{signalForm.signalType}</span>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                        <div><span className="text-muted-foreground">Entry:</span> <span className="tc-amount">₹{signalForm.entryPrice || '—'}</span></div>
                        <div><span className="text-muted-foreground">Target:</span> <span className="tc-amount">₹{signalForm.targetPrice || '—'}</span></div>
                        <div><span className="text-muted-foreground">SL:</span> <span className="font-bold text-destructive">₹{signalForm.stopLoss || '—'}</span></div>
                      </div>
                      <div className="mt-2"><span className="tc-badge-strategy">{signalForm.timeframe}</span></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'subscribers' && (
          <div>
            {groups.map(g => {
              const groupSubs = subscribers.filter(s => s.group_id === g.id);
              const activeSubs = groupSubs.filter(s => s.status === 'active');
              const groupRevenue = groupSubs.reduce((sum, s) => sum + (s.amount_paid || 0), 0);
              return (
                <div key={g.id} className="mb-8">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="tc-card-title text-lg">{g.name}</h3>
                    <span className="tc-badge-active">{activeSubs.length} active</span>
                    <span className="tc-small">• <span className="tc-amount">₹{groupRevenue.toLocaleString('en-IN')}</span> revenue</span>
                  </div>
                  <div className="tc-card-static overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b bg-off-white text-left">
                        <th className="p-3 font-medium text-muted-foreground">User Name</th>
                        <th className="p-3 font-medium text-muted-foreground">Email</th>
                        <th className="p-3 font-medium text-muted-foreground">Start Date</th>
                        <th className="p-3 font-medium text-muted-foreground">End Date</th>
                        <th className="p-3 font-medium text-muted-foreground">Payment</th>
                        <th className="p-3 font-medium text-muted-foreground">Payment ID</th>
                        <th className="p-3 font-medium text-muted-foreground">Status</th>
                      </tr></thead>
                      <tbody>
                        {groupSubs.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No subscribers in this group yet</td></tr>}
                        {groupSubs.map((s: any, i: number) => (
                          <tr key={s.id} className={`border-b last:border-0 ${i % 2 === 1 ? 'bg-off-white' : ''}`}>
                            <td className="p-3 font-medium">{s.profiles?.full_name || '-'}</td>
                            <td className="p-3 text-muted-foreground">{s.profiles?.email || '-'}</td>
                            <td className="p-3">{s.start_date ? new Date(s.start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</td>
                            <td className="p-3">{s.end_date ? new Date(s.end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</td>
                            <td className="p-3 tc-amount">₹{(s.amount_paid || 0).toLocaleString('en-IN')}</td>
                            <td className="p-3 font-mono text-xs text-muted-foreground">{s.razorpay_payment_id || '-'}</td>
                            <td className="p-3"><span className={s.status === 'active' ? 'tc-badge-active' : 'tc-badge-pending'}>{s.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
            {groups.length === 0 && <div className="tc-card-static p-12 text-center"><p className="text-muted-foreground">Create a group first to see subscribers</p></div>}
          </div>
        )}

        {tab === 'profile' && (
          <div className="max-w-lg">
            <div className="tc-card-static p-6 space-y-3">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                  {advisor.full_name.charAt(0)}
                </div>
                <div>
                  <h2 className="tc-card-title text-xl">{advisor.full_name}</h2>
                  <span className="tc-badge-active mt-1">{advisor.status}</span>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between rounded-lg bg-off-white p-3"><span className="text-muted-foreground">SEBI Reg No</span><span className="font-medium">{advisor.sebi_reg_no}</span></div>
                <div className="flex justify-between rounded-lg bg-off-white p-3"><span className="text-muted-foreground">Strategy</span><span className="tc-badge-strategy">{advisor.strategy_type}</span></div>
                <div className="flex justify-between rounded-lg bg-off-white p-3"><span className="text-muted-foreground">Email</span><span className="font-medium">{advisor.email}</span></div>
              </div>
              {advisor.bio && <div className="rounded-lg bg-off-white p-3"><p className="tc-small">Bio</p><p className="text-sm mt-1">{advisor.bio}</p></div>}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
