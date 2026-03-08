import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
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

  // Group form
  const [groupForm, setGroupForm] = useState({ name: '', description: '', monthlyPrice: '', razorpayLink: '' });
  const [groupDp, setGroupDp] = useState<File | null>(null);
  const [showGroupForm, setShowGroupForm] = useState(false);

  // Signal form
  const [signalForm, setSignalForm] = useState({ groupId: '', instrument: '', signalType: 'BUY', entryPrice: '', targetPrice: '', stopLoss: '', timeframe: 'Intraday', notes: '' });

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    const { data: adv } = await supabase.from('advisors').select('*').eq('user_id', user!.id).single();
    setAdvisor(adv);

    if (adv) {
      const { data: grps } = await supabase.from('groups').select('*').eq('advisor_id', adv.id);
      setGroups(grps || []);

      const { data: subs } = await supabase.from('subscriptions').select('*, profiles!inner(full_name, email), groups!inner(name)').eq('advisor_id', adv.id);
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
    const { error } = await supabase.from('groups').insert({
      advisor_id: advisor.id,
      name: groupForm.name,
      description: groupForm.description,
      monthly_price: parseInt(groupForm.monthlyPrice),
      razorpay_payment_link: groupForm.razorpayLink,
      dp_url: dpUrl,
    });
    if (error) toast.error(error.message);
    else { toast.success('Group created!'); setShowGroupForm(false); setGroupForm({ name: '', description: '', monthlyPrice: '', razorpayLink: '' }); fetchData(); }
  };

  const postSignal = async () => {
    if (!advisor) return;
    const { error } = await supabase.from('signals').insert({
      group_id: signalForm.groupId,
      advisor_id: advisor.id,
      instrument: signalForm.instrument,
      signal_type: signalForm.signalType,
      entry_price: parseFloat(signalForm.entryPrice),
      target_price: parseFloat(signalForm.targetPrice),
      stop_loss: parseFloat(signalForm.stopLoss),
      timeframe: signalForm.timeframe,
      notes: signalForm.notes,
    });
    if (error) { toast.error(error.message); return; }

    // Check telegram settings for this group
    const { data: tSettings } = await supabase.from('telegram_settings').select('*').eq('group_id', signalForm.groupId).eq('is_active', true);
    const telegramCount = tSettings?.length || 0;

    toast.success(`Signal posted! ${telegramCount > 0 ? `Telegram alerts queued for ${telegramCount} users` : ''}`);
    setSignalForm({ groupId: '', instrument: '', signalType: 'BUY', entryPrice: '', targetPrice: '', stopLoss: '', timeframe: 'Intraday', notes: '' });
  };

  if (loading) return <div className="min-h-screen bg-background"><Navbar /><div className="p-8 text-center">Loading...</div></div>;

  if (!advisor) return <div className="min-h-screen bg-background"><Navbar /><div className="p-8 text-center">No advisor profile found.</div></div>;

  if (advisor.status === 'pending') return (
    <div className="min-h-screen bg-background"><Navbar />
      <div className="container mx-auto max-w-md px-4 py-12 text-center">
        <Badge variant="secondary" className="mb-4">Pending Review</Badge>
        <h2 className="text-xl font-bold">Your application is under review</h2>
        <p className="mt-2 text-muted-foreground">We'll notify you once your SEBI verification is complete.</p>
      </div>
    </div>
  );

  if (advisor.status === 'rejected') return (
    <div className="min-h-screen bg-background"><Navbar />
      <div className="container mx-auto max-w-md px-4 py-12 text-center">
        <Badge variant="destructive" className="mb-4">Rejected</Badge>
        <h2 className="text-xl font-bold">Application Rejected</h2>
        {advisor.rejection_reason && <p className="mt-2 text-muted-foreground">Reason: {advisor.rejection_reason}</p>}
      </div>
    </div>
  );

  const tabs = [
    { key: 'groups', label: 'My Groups' },
    { key: 'signal', label: 'Post Signal' },
    { key: 'subscribers', label: 'Subscribers' },
    { key: 'profile', label: 'My Profile' },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">Advisor Dashboard</h1>
        <div className="mb-6 flex gap-2 overflow-x-auto">
          {tabs.map(t => (
            <Button key={t.key} variant={tab === t.key ? 'default' : 'outline'} size="sm" onClick={() => setTab(t.key)}>{t.label}</Button>
          ))}
        </div>

        {tab === 'groups' && (
          <div>
            <Button className="mb-4" onClick={() => setShowGroupForm(!showGroupForm)}>+ Create New Group</Button>
            {showGroupForm && (
              <div className="mb-6 rounded-lg border bg-card p-4 space-y-3">
                <div><Label>Group Name</Label><Input value={groupForm.name} onChange={e => setGroupForm({ ...groupForm, name: e.target.value })} /></div>
                <div><Label>Description</Label><Textarea value={groupForm.description} onChange={e => setGroupForm({ ...groupForm, description: e.target.value })} /></div>
                <div><Label>Monthly Price (₹)</Label><Input type="number" value={groupForm.monthlyPrice} onChange={e => setGroupForm({ ...groupForm, monthlyPrice: e.target.value })} /></div>
                <div><Label>Group Photo</Label><Input type="file" accept="image/*" onChange={e => setGroupDp(e.target.files?.[0] || null)} /></div>
                <div><Label>Razorpay Payment Link</Label><Input placeholder="Paste your Razorpay payment link" value={groupForm.razorpayLink} onChange={e => setGroupForm({ ...groupForm, razorpayLink: e.target.value })} /></div>
                <Button onClick={createGroup}>Create Group</Button>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              {groups.map(g => {
                const subCount = subscribers.filter(s => s.group_id === g.id && s.status === 'active').length;
                const revenue = subscribers.filter(s => s.group_id === g.id).reduce((sum, s) => sum + (s.amount_paid || 0), 0);
                return (
                  <div key={g.id} className="rounded-lg border bg-card p-4">
                    <p className="font-semibold">{g.name}</p>
                    <p className="text-sm text-muted-foreground">₹{g.monthly_price}/month</p>
                    <p className="text-sm">{subCount} subscribers • ₹{revenue} total revenue</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'signal' && (
          <div className="max-w-lg space-y-4">
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
                <Button variant={signalForm.signalType === 'BUY' ? 'default' : 'outline'} onClick={() => setSignalForm({ ...signalForm, signalType: 'BUY' })}>BUY</Button>
                <Button variant={signalForm.signalType === 'SELL' ? 'destructive' : 'outline'} onClick={() => setSignalForm({ ...signalForm, signalType: 'SELL' })}>SELL</Button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Entry Price</Label><Input type="number" value={signalForm.entryPrice} onChange={e => setSignalForm({ ...signalForm, entryPrice: e.target.value })} /></div>
              <div><Label>Target Price</Label><Input type="number" value={signalForm.targetPrice} onChange={e => setSignalForm({ ...signalForm, targetPrice: e.target.value })} /></div>
              <div><Label>Stop Loss</Label><Input type="number" value={signalForm.stopLoss} onChange={e => setSignalForm({ ...signalForm, stopLoss: e.target.value })} /></div>
            </div>
            <div>
              <Label>Timeframe</Label>
              <div className="flex gap-2 mt-1">
                {['Intraday', 'Swing', 'Positional'].map(t => (
                  <Button key={t} variant={signalForm.timeframe === t ? 'default' : 'outline'} size="sm" onClick={() => setSignalForm({ ...signalForm, timeframe: t })}>{t}</Button>
                ))}
              </div>
            </div>
            <div><Label>Notes</Label><Textarea value={signalForm.notes} onChange={e => setSignalForm({ ...signalForm, notes: e.target.value })} /></div>
            <Button onClick={postSignal} disabled={!signalForm.groupId || !signalForm.instrument || !signalForm.entryPrice}>Post Signal</Button>
          </div>
        )}

        {tab === 'subscribers' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left"><th className="p-2">User</th><th className="p-2">Group</th><th className="p-2">Start</th><th className="p-2">End</th><th className="p-2">Amount</th><th className="p-2">Status</th></tr></thead>
              <tbody>
                {subscribers.map((s: any) => (
                  <tr key={s.id} className="border-b">
                    <td className="p-2">{s.profiles?.full_name || s.profiles?.email}</td>
                    <td className="p-2">{s.groups?.name}</td>
                    <td className="p-2">{s.start_date ? new Date(s.start_date).toLocaleDateString('en-IN') : '-'}</td>
                    <td className="p-2">{s.end_date ? new Date(s.end_date).toLocaleDateString('en-IN') : '-'}</td>
                    <td className="p-2">₹{s.amount_paid || 0}</td>
                    <td className="p-2"><Badge variant={s.status === 'active' ? 'default' : 'secondary'}>{s.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {subscribers.length === 0 && <p className="mt-4 text-center text-muted-foreground">No subscribers yet</p>}
          </div>
        )}

        {tab === 'profile' && (
          <div className="max-w-lg space-y-4">
            <div className="rounded-lg border bg-card p-4">
              <p><strong>Name:</strong> {advisor.full_name}</p>
              <p><strong>SEBI Reg No:</strong> {advisor.sebi_reg_no}</p>
              <p><strong>Strategy:</strong> {advisor.strategy_type}</p>
              <p><strong>Status:</strong> <Badge>{advisor.status}</Badge></p>
              <p className="mt-2"><strong>Bio:</strong> {advisor.bio}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
