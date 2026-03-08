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
import { Bell, BellOff, Send, BarChart3, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Tables } from '@/integrations/supabase/types';

type Signal = Tables<'signals'>;
type Subscription = Tables<'subscriptions'>;
interface GroupInfo { id: string; name: string; advisor_name: string; advisor_photo?: string; }

export default function TraderDashboard() {
  const { user, profile } = useAuth();
  const [subscriptions, setSubscriptions] = useState<(Subscription & { group: GroupInfo })[]>([]);
  const [signals, setSignals] = useState<(Signal & { groupName: string; advisorName: string })[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'signals' | 'telegram'>('signals');
  const [telegramSettings, setTelegramSettings] = useState<Record<string, { is_active: boolean; telegram_username: string }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (user) fetchData(); }, [user]);

  const fetchData = async () => {
    const { data: subs } = await supabase.from('subscriptions').select('*, groups!inner(id, name, advisor_id, dp_url, advisors!inner(full_name, profile_photo_url))').eq('user_id', user!.id).eq('status', 'active');
    
    // Deduplicate by group_id - keep only latest subscription per group
    const uniqueMap = new Map<string, any>();
    (subs || []).forEach((s: any) => {
      const existing = uniqueMap.get(s.group_id);
      if (!existing || new Date(s.created_at || 0) > new Date(existing.created_at || 0)) {
        uniqueMap.set(s.group_id, s);
      }
    });
    
    const subList = Array.from(uniqueMap.values()).map((s: any) => ({ ...s, group: { id: s.groups.id, name: s.groups.name, advisor_name: s.groups.advisors.full_name, advisor_photo: s.groups.advisors.profile_photo_url } }));
    setSubscriptions(subList);
    
    const groupIds = [...new Set(subList.map((s: any) => s.group_id))];
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
    toast.success(active ? 'Telegram alerts activated!' : 'Telegram alerts deactivated');
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

  const activeAlerts = Object.values(telegramSettings).filter(t => t.is_active).length;

  return (
    <div className="min-h-screen flex flex-col bg-off-white">
      <Navbar />
      <div className="container mx-auto px-4 py-6 md:py-8 flex-1">
        <div className="mb-4 md:mb-6 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="tc-page-title text-xl md:text-3xl truncate">Welcome back, {profile?.full_name?.split(' ')[0] || 'Trader'}</h1>
            <p className="tc-small mt-1">{dateStr}</p>
          </div>
          <Button
            variant={activeTab === 'telegram' ? 'default' : 'outline'}
            size="sm"
            className="gap-1.5 tc-btn-click min-h-[44px] shrink-0"
            onClick={() => setActiveTab(activeTab === 'telegram' ? 'signals' : 'telegram')}
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Telegram</span>
            {activeAlerts > 0 && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-light-green text-xs font-bold text-primary">{activeAlerts}</span>}
          </Button>
        </div>

        {/* Tab navigation */}
        <div className="mb-4 md:mb-6 flex gap-2">
          <Button variant={activeTab === 'signals' ? 'default' : 'outline'} size="sm" className="gap-1.5 tc-btn-click min-h-[44px] flex-1 sm:flex-none" onClick={() => setActiveTab('signals')}>
            <BarChart3 className="h-4 w-4" /> Signals
          </Button>
          <Button variant={activeTab === 'telegram' ? 'default' : 'outline'} size="sm" className="gap-1.5 tc-btn-click min-h-[44px] flex-1 sm:flex-none" onClick={() => setActiveTab('telegram')}>
            <Send className="h-4 w-4" /> <span className="hidden sm:inline">Telegram</span> Settings
            {activeAlerts > 0 && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-light-green text-xs font-bold text-primary">{activeAlerts}</span>}
          </Button>
        </div>

        {activeTab === 'telegram' ? (
          <div>
            <div className="mb-4 md:mb-6">
              <h2 className="tc-section-title text-lg md:text-xl">Telegram Alert Settings</h2>
              <p className="tc-small mt-1">Manage Telegram notifications for each subscribed group.</p>
            </div>

            {subscriptions.length === 0 ? (
              <div className="tc-card-static p-8 md:p-12 text-center">
                <Send className="mx-auto mb-3 h-8 w-8 md:h-10 md:w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No active subscriptions. Subscribe to an advisor to enable Telegram alerts.</p>
                <Link to="/"><Button className="mt-4 tc-btn-click min-h-[44px]">Browse Advisors</Button></Link>
              </div>
            ) : (
              <div className="grid gap-3 md:gap-4 sm:grid-cols-2">
                {subscriptions.map(sub => {
                  const settings = telegramSettings[sub.group_id];
                  const isActive = settings?.is_active || false;
                  return (
                    <div key={sub.group_id} className={`tc-card p-4 md:p-5 ${isActive ? 'border-l-4 border-l-primary' : ''}`}>
                      <div className="flex items-center gap-3 mb-3 md:mb-4">
                        <div className="flex h-9 w-9 md:h-10 md:w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground overflow-hidden">
                          {sub.group.advisor_photo ? (
                            <img src={sub.group.advisor_photo} alt="" className="h-full w-full rounded-full object-cover" />
                          ) : (
                            sub.group.advisor_name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="tc-card-title truncate text-sm md:text-base">{sub.group.name}</p>
                          <p className="tc-small truncate">by {sub.group.advisor_name}</p>
                        </div>
                        <Switch
                          checked={isActive}
                          onCheckedChange={(v) => toggleTelegram(sub.group_id, v)}
                        />
                      </div>

                      {isActive ? (
                        <div className="space-y-2 md:space-y-3">
                          <div className="flex items-center gap-2">
                            <Bell className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium text-primary">🟢 Alerts Active</span>
                          </div>
                          <div>
                            <Label className="tc-small">Telegram Username</Label>
                            <div className="flex gap-2 mt-1">
                              <Input
                                placeholder="@yourusername"
                                className="tc-input-focus text-sm"
                                value={settings?.telegram_username || ''}
                                onChange={e => setTelegramSettings({ ...telegramSettings, [sub.group_id]: { ...telegramSettings[sub.group_id], telegram_username: e.target.value } })}
                              />
                              <Button size="sm" className="tc-btn-click min-h-[44px]" onClick={() => saveTelegramUsername(sub.group_id, telegramSettings[sub.group_id]?.telegram_username || '')}>Save</Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <BellOff className="h-4 w-4 text-muted-foreground" />
                          <span className="tc-small">⚫ Alerts Off — toggle to activate</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:gap-6 lg:grid-cols-4">
            {/* Sidebar - horizontal scroll on mobile */}
            <div className="lg:col-span-1">
              <div className="tc-card-static p-4 md:p-5">
                <h3 className="tc-card-title mb-3 md:mb-4 text-sm md:text-base">My Subscriptions</h3>
                <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
                  <Button variant={selectedGroup === null ? 'default' : 'outline'} size="sm" className="whitespace-nowrap justify-start tc-btn-click min-h-[44px]" onClick={() => setSelectedGroup(null)}>All Signals</Button>
                  {subscriptions.map(sub => (
                    <div key={sub.group_id} className="shrink-0 lg:shrink">
                      <Button variant={selectedGroup === sub.group_id ? 'default' : 'outline'} size="sm" className="whitespace-nowrap justify-start tc-btn-click min-h-[44px]" onClick={() => setSelectedGroup(sub.group_id)}>
                        {sub.group.name}
                      </Button>
                      <div className="mt-1 flex items-center gap-1 pl-2">
                        {telegramSettings[sub.group_id]?.is_active ? (
                          <span className="tc-small text-primary flex items-center gap-1"><Bell className="h-3 w-3" /> 🟢</span>
                        ) : (
                          <span className="tc-small flex items-center gap-1"><BellOff className="h-3 w-3" /> ⚫</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {subscriptions.length === 0 && <p className="tc-small">No active subscriptions</p>}
              </div>
            </div>

            {/* Signal feed */}
            <div className="lg:col-span-3">
              <div className="space-y-3">
                {filteredSignals.length === 0 ? (
                  <div className="tc-card-static p-8 md:p-12 text-center">
                    <p className="text-sm text-muted-foreground">No signals yet. Subscribe to an advisor to see signals here.</p>
                    <Link to="/"><Button className="mt-4 tc-btn-click min-h-[44px]">Browse Advisors</Button></Link>
                  </div>
                ) : (
                  filteredSignals.map(s => <SignalCard key={s.id} signal={s} groupName={s.groupName} advisorName={s.advisorName} />)
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
