import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { SignalCard } from '@/components/SignalCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { Bell, BellOff } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Signal = Tables<'signals'>;
type Subscription = Tables<'subscriptions'>;
interface GroupInfo { id: string; name: string; advisor_name: string; }

export default function TraderDashboard() {
  const { user, profile } = useAuth();
  const [subscriptions, setSubscriptions] = useState<(Subscription & { group: GroupInfo })[]>([]);
  const [signals, setSignals] = useState<(Signal & { groupName: string; advisorName: string })[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [telegramSettings, setTelegramSettings] = useState<Record<string, { is_active: boolean; telegram_username: string }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (user) fetchData(); }, [user]);

  const fetchData = async () => {
    const { data: subs } = await supabase.from('subscriptions').select('*, groups!inner(id, name, advisor_id, advisors!inner(full_name))').eq('user_id', user!.id).eq('status', 'active');
    const subList = (subs || []).map((s: any) => ({ ...s, group: { id: s.groups.id, name: s.groups.name, advisor_name: s.groups.advisors.full_name } }));
    setSubscriptions(subList);
    const groupIds = subList.map((s: any) => s.group_id);
    if (groupIds.length > 0) {
      const { data: sigs } = await supabase.from('signals').select('*').in('group_id', groupIds).order('created_at', { ascending: false }).limit(50);
      const enriched = (sigs || []).map(sig => { const sub = subList.find((s: any) => s.group_id === sig.group_id); return { ...sig, groupName: sub?.group?.name || '', advisorName: sub?.group?.advisor_name || '' }; });
      setSignals(enriched);
    }
    const { data: tSettings } = await supabase.from('telegram_settings').select('*').eq('user_id', user!.id);
    const tMap: Record<string, { is_active: boolean; telegram_username: string }> = {};
    (tSettings || []).forEach(t => { tMap[t.group_id] = { is_active: t.is_active || false, telegram_username: t.telegram_username || '' }; });
    setTelegramSettings(tMap);
    setLoading(false);
  };

  const toggleTelegram = async (groupId: string, active: boolean) => {
    const existing = telegramSettings[groupId];
    if (existing) await supabase.from('telegram_settings').update({ is_active: active }).eq('user_id', user!.id).eq('group_id', groupId);
    else await supabase.from('telegram_settings').insert({ user_id: user!.id, group_id: groupId, is_active: active });
    setTelegramSettings({ ...telegramSettings, [groupId]: { ...telegramSettings[groupId], is_active: active, telegram_username: existing?.telegram_username || '' } });
  };

  const saveTelegramUsername = async (groupId: string, username: string) => {
    const existing = telegramSettings[groupId];
    if (existing) await supabase.from('telegram_settings').update({ telegram_username: username }).eq('user_id', user!.id).eq('group_id', groupId);
    else await supabase.from('telegram_settings').insert({ user_id: user!.id, group_id: groupId, telegram_username: username });
    setTelegramSettings({ ...telegramSettings, [groupId]: { ...telegramSettings[groupId], telegram_username: username } });
    toast.success('Telegram username saved');
  };

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('signals-realtime').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'signals' }, (payload) => {
      const newSignal = payload.new as Signal;
      const sub = subscriptions.find(s => s.group_id === newSignal.group_id);
      if (sub) { setSignals(prev => [{ ...newSignal, groupName: sub.group.name, advisorName: sub.group.advisor_name }, ...prev]); toast.info(`New signal: ${newSignal.instrument} ${newSignal.signal_type}`); }
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, subscriptions]);

  const filteredSignals = selectedGroup ? signals.filter(s => s.group_id === selectedGroup) : signals;

  if (loading) return <div className="min-h-screen bg-off-white"><Navbar /><div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div></div>;

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen flex flex-col bg-off-white">
      <Navbar />
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="mb-6">
          <h1 className="tc-page-title text-3xl">Welcome back, {profile?.full_name?.split(' ')[0] || 'Trader'}</h1>
          <p className="tc-small mt-1">{dateStr}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="tc-card-static p-5">
              <h3 className="tc-card-title mb-4">My Subscriptions</h3>
              <Button variant={selectedGroup === null ? 'default' : 'outline'} size="sm" className="mb-3 w-full justify-start tc-btn-click" onClick={() => setSelectedGroup(null)}>All Signals</Button>
              {subscriptions.map(sub => (
                <div key={sub.id} className="mb-4">
                  <Button variant={selectedGroup === sub.group_id ? 'default' : 'outline'} size="sm" className="w-full justify-start tc-btn-click" onClick={() => setSelectedGroup(sub.group_id)}>
                    {sub.group.name}
                  </Button>
                  {/* Telegram settings */}
                  <div className="mt-2 tc-card-static p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="tc-small flex items-center gap-1">
                        {telegramSettings[sub.group_id]?.is_active ? <Bell className="h-3 w-3 text-primary" /> : <BellOff className="h-3 w-3" />}
                        Telegram Alerts
                      </Label>
                      <Switch checked={telegramSettings[sub.group_id]?.is_active || false} onCheckedChange={(v) => toggleTelegram(sub.group_id, v)} />
                    </div>
                    {telegramSettings[sub.group_id]?.is_active && (
                      <div className="space-y-1">
                        <Input placeholder="@yourusername" className="h-7 text-xs tc-input-focus" value={telegramSettings[sub.group_id]?.telegram_username || ''} onChange={e => setTelegramSettings({ ...telegramSettings, [sub.group_id]: { ...telegramSettings[sub.group_id], telegram_username: e.target.value } })} />
                        <Button size="sm" variant="outline" className="h-6 w-full text-xs tc-btn-click" onClick={() => saveTelegramUsername(sub.group_id, telegramSettings[sub.group_id]?.telegram_username || '')}>Save</Button>
                        <p className="tc-small text-primary">🟢 Alerts Active</p>
                      </div>
                    )}
                    {!telegramSettings[sub.group_id]?.is_active && <p className="tc-small">⚫ Alerts Off</p>}
                  </div>
                </div>
              ))}
              {subscriptions.length === 0 && <p className="tc-small">No active subscriptions</p>}
            </div>
          </div>

          {/* Signal feed */}
          <div className="lg:col-span-3">
            <div className="space-y-3">
              {filteredSignals.length === 0 ? (
                <div className="tc-card-static p-12 text-center">
                  <p className="text-muted-foreground">No signals yet. Subscribe to an advisor to see signals here.</p>
                  <Link to="/"><Button className="mt-4 tc-btn-click">Browse Advisors</Button></Link>
                </div>
              ) : (
                filteredSignals.map(s => <SignalCard key={s.id} signal={s} groupName={s.groupName} advisorName={s.advisorName} />)
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
