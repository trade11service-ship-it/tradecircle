import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { SignalCard } from '@/components/SignalCard';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { Bell, BellOff, Send, BarChart3, ExternalLink, CheckCircle2, AlertTriangle, RotateCcw, Shield, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Tables } from '@/integrations/supabase/types';

type Signal = Tables<'signals'>;
type Subscription = Tables<'subscriptions'>;
interface GroupInfo {
  id: string;
  name: string;
  advisor_name: string;
  advisor_photo?: string;
  sebi_reg_no?: string;
  bio?: string;
}
interface TelegramSetting {
  is_active: boolean;
  telegram_username: string;
  bot_started: boolean;
  telegram_chat_id: string | null;
}

const BOT_USERNAME = 'tradecircle_alerts_bot';

export default function TraderDashboard() {
  const { user, profile } = useAuth();
  const [subscriptions, setSubscriptions] = useState<(Subscription & { group: GroupInfo })[]>([]);
  const [signals, setSignals] = useState<(Signal & { groupName: string; advisorName: string })[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'signals' | 'telegram'>('signals');
  const [telegramSettings, setTelegramSettings] = useState<Record<string, TelegramSetting>>({});
  const [telegramConnected, setTelegramConnected] = useState(false);
  const [telegramUsername, setTelegramUsername] = useState('');
  const [loading, setLoading] = useState(true);

  const botLink = user ? `https://t.me/${BOT_USERNAME}?start=${user.id}` : `https://t.me/${BOT_USERNAME}`;

  useEffect(() => { if (user) fetchData(); }, [user]);

  const fetchData = async () => {
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('*, groups!inner(id, name, advisor_id, dp_url, advisors!inner(full_name, profile_photo_url, sebi_reg_no, bio))')
      .eq('user_id', user!.id)
      .eq('status', 'active');

    const uniqueMap = new Map<string, any>();
    (subs || []).forEach((s: any) => {
      const existing = uniqueMap.get(s.group_id);
      if (!existing || new Date(s.created_at || 0) > new Date(existing.created_at || 0)) {
        uniqueMap.set(s.group_id, s);
      }
    });

    const subList = Array.from(uniqueMap.values()).map((s: any) => ({
      ...s,
      group: {
        id: s.groups.id,
        name: s.groups.name,
        advisor_name: s.groups.advisors.full_name,
        advisor_photo: s.groups.advisors.profile_photo_url,
        sebi_reg_no: s.groups.advisors.sebi_reg_no,
        bio: s.groups.advisors.bio,
      }
    }));
    setSubscriptions(subList);

    const groupIds = [...new Set(subList.map((s: any) => s.group_id))];
    if (groupIds.length > 0) {
      const { data: sigs } = await supabase.from('signals').select('*').in('group_id', groupIds).order('created_at', { ascending: false }).limit(50);
      const enriched = (sigs || []).map(sig => {
        const sub = subList.find((s: any) => s.group_id === sig.group_id);
        return { ...sig, groupName: sub?.group?.name || '', advisorName: sub?.group?.advisor_name || '' };
      });
      setSignals(enriched);
    }

    // Telegram settings
    const { data: tSettings } = await supabase.from('telegram_settings').select('*').eq('user_id', user!.id);
    const tMap: Record<string, TelegramSetting> = {};
    (tSettings || []).forEach((t: any) => {
      tMap[t.group_id] = {
        is_active: t.is_active || false,
        telegram_username: t.telegram_username || '',
        bot_started: t.bot_started || false,
        telegram_chat_id: t.telegram_chat_id || null,
      };
    });
    setTelegramSettings(tMap);

    // Check if bot is connected globally (any setting has bot_started)
    const anyConnected = (tSettings || []).some((t: any) => t.bot_started && t.telegram_chat_id);
    setTelegramConnected(anyConnected);
    const savedUsername = (tSettings || []).find((t: any) => t.telegram_username)?.telegram_username || profile?.telegram_username || '';
    setTelegramUsername(savedUsername);

    setLoading(false);
  };

  const toggleTelegram = async (groupId: string, active: boolean) => {
    const existing = telegramSettings[groupId];
    // Get chat_id from any connected setting
    const chatId = existing?.telegram_chat_id || Object.values(telegramSettings).find(t => t.telegram_chat_id)?.telegram_chat_id || null;
    const username = existing?.telegram_username || telegramUsername || '';

    if (existing?.telegram_username || existing?.telegram_chat_id) {
      await supabase.from('telegram_settings').update({ is_active: active }).eq('user_id', user!.id).eq('group_id', groupId);
    } else {
      await supabase.from('telegram_settings').insert({
        user_id: user!.id,
        group_id: groupId,
        is_active: active,
        telegram_username: username,
        telegram_chat_id: chatId,
        bot_started: !!chatId,
      });
    }
    setTelegramSettings(prev => ({
      ...prev,
      [groupId]: {
        is_active: active,
        telegram_username: username,
        bot_started: existing?.bot_started || !!chatId,
        telegram_chat_id: chatId,
      }
    }));
    toast.success(active ? 'Telegram alerts activated!' : 'Telegram alerts deactivated');
  };

  const refreshBotStatus = async () => {
    const { data: tSettings } = await supabase.from('telegram_settings').select('*').eq('user_id', user!.id);
    const anyConnected = (tSettings || []).some((t: any) => t.bot_started && t.telegram_chat_id);
    setTelegramConnected(anyConnected);

    if (anyConnected) {
      // Update local state
      const tMap: Record<string, TelegramSetting> = {};
      (tSettings || []).forEach((t: any) => {
        tMap[t.group_id] = {
          is_active: t.is_active || false,
          telegram_username: t.telegram_username || '',
          bot_started: t.bot_started || false,
          telegram_chat_id: t.telegram_chat_id || null,
        };
      });
      setTelegramSettings(tMap);
      const uname = (tSettings || []).find((t: any) => t.telegram_username)?.telegram_username || '';
      setTelegramUsername(uname);
      toast.success('✅ Bot connected successfully!');
    } else {
      // Also check profile for telegram_username (webhook may have saved it there)
      const { data: prof } = await supabase.from('profiles').select('telegram_username').eq('id', user!.id).single();
      if (prof?.telegram_username) {
        setTelegramUsername(prof.telegram_username);
        toast.info('Username captured! Now enable alerts for your groups below.');
      } else {
        toast.info('Bot not started yet. Click the link and press START in Telegram.');
      }
    }
  };

  const resetTelegram = async () => {
    await supabase.from('telegram_settings').update({ bot_started: false, telegram_chat_id: null, telegram_username: null, is_active: false }).eq('user_id', user!.id);
    await supabase.from('profiles').update({ telegram_username: null }).eq('id', user!.id);
    setTelegramConnected(false);
    setTelegramUsername('');
    setTelegramSettings({});
    toast.success('Telegram disconnected. You can reconnect anytime.');
  };

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel('signals-realtime').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'signals' }, (payload) => {
      const newSignal = payload.new as Signal;
      const sub = subscriptions.find(s => s.group_id === newSignal.group_id);
      if (sub) {
        setSignals(prev => [{ ...newSignal, groupName: sub.group.name, advisorName: sub.group.advisor_name }, ...prev]);
        toast.info(`New signal: ${newSignal.instrument} ${newSignal.signal_type}`);
      }
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, subscriptions]);

  const filteredSignals = selectedGroup ? signals.filter(s => s.group_id === selectedGroup) : signals;

  if (loading) return (
    <div className="min-h-screen bg-off-white">
      <Navbar />
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    </div>
  );

  const today = new Date();
  const dateStr = today.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const activeAlerts = Object.values(telegramSettings).filter(t => t.is_active && t.bot_started).length;

  return (
    <div className="min-h-screen flex flex-col bg-off-white">
      <Navbar />
      <div className="container mx-auto px-4 py-6 md:py-8 flex-1">
        <div className="mb-4 md:mb-6 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h1 className="tc-page-title text-xl md:text-3xl truncate">Welcome back, {profile?.full_name?.split(' ')[0] || 'Trader'}</h1>
            <p className="tc-small mt-1">{dateStr}</p>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="mb-4 md:mb-6 flex gap-2">
          <Button variant={activeTab === 'signals' ? 'default' : 'outline'} size="sm" className="gap-1.5 tc-btn-click min-h-[44px] flex-1 sm:flex-none" onClick={() => setActiveTab('signals')}>
            <BarChart3 className="h-4 w-4" /> Signals
          </Button>
          <Button variant={activeTab === 'telegram' ? 'default' : 'outline'} size="sm" className="gap-1.5 tc-btn-click min-h-[44px] flex-1 sm:flex-none" onClick={() => setActiveTab('telegram')}>
            <Send className="h-4 w-4" /> Telegram
            {activeAlerts > 0 && <span className="flex h-5 w-5 items-center justify-center rounded-full bg-light-green text-xs font-bold text-primary">{activeAlerts}</span>}
          </Button>
        </div>

        {activeTab === 'telegram' ? (
          <div>
            <div className="mb-4 md:mb-6">
              <h2 className="tc-section-title text-lg md:text-xl">Telegram Alert Settings</h2>
              <p className="tc-small mt-1">Get trading signals delivered directly to your Telegram.</p>
            </div>

            {subscriptions.length === 0 ? (
              <div className="tc-card-static p-8 md:p-12 text-center">
                <Send className="mx-auto mb-3 h-8 w-8 md:h-10 md:w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No active subscriptions. Subscribe to an advisor to enable Telegram alerts.</p>
                <Link to="/"><Button className="mt-4 tc-btn-click min-h-[44px]">Browse Advisors</Button></Link>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Global Bot Connection Card */}
                {!telegramConnected ? (
                  <div className="tc-card p-4 md:p-6 border-l-4 border-l-amber-500">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                      <h3 className="text-sm md:text-base font-semibold text-amber-700 dark:text-amber-400">Connect Telegram to Get Alerts</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Click the button below to open our bot in Telegram. Press <strong>START</strong> — that's it! We'll automatically link your account.
                    </p>
                    <a href={botLink} target="_blank" rel="noopener noreferrer">
                      <Button className="w-full gap-2 tc-btn-click min-h-[44px] bg-[#0088cc] hover:bg-[#006699] text-white">
                        <ExternalLink className="h-4 w-4" /> Open @{BOT_USERNAME} in Telegram
                      </Button>
                    </a>
                    <Button variant="ghost" size="sm" className="mt-3 w-full text-xs" onClick={refreshBotStatus}>
                      🔄 I've started the bot — check status
                    </Button>
                  </div>
                ) : (
                  <div className="tc-card p-4 md:p-5 border-l-4 border-l-green-500">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="text-sm font-semibold text-green-700 dark:text-green-400">Telegram Connected</p>
                          {telegramUsername && <p className="text-xs text-muted-foreground">@{telegramUsername}</p>}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-xs text-muted-foreground gap-1" onClick={resetTelegram}>
                        <RotateCcw className="h-3 w-3" /> Reset
                      </Button>
                    </div>
                  </div>
                )}

                {/* Per-group toggle cards */}
                <div className="grid gap-3 sm:grid-cols-2">
                  {subscriptions.map(sub => {
                    const settings = telegramSettings[sub.group_id];
                    const isActive = settings?.is_active || false;

                    return (
                      <div key={sub.group_id} className={`tc-card p-4 ${isActive && telegramConnected ? 'border-l-4 border-l-primary' : ''}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground overflow-hidden">
                              {sub.group.advisor_photo ? (
                                <img src={sub.group.advisor_photo} alt="" className="h-full w-full rounded-full object-cover" />
                              ) : sub.group.advisor_name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{sub.group.name}</p>
                              <p className="text-xs text-muted-foreground truncate">by {sub.group.advisor_name}</p>
                            </div>
                          </div>
                          <Switch
                            checked={isActive}
                            disabled={!telegramConnected}
                            onCheckedChange={(v) => toggleTelegram(sub.group_id, v)}
                          />
                        </div>
                        {!telegramConnected && (
                          <p className="text-xs text-muted-foreground mt-2">Connect Telegram above first</p>
                        )}
                        {isActive && telegramConnected && (
                          <p className="text-xs text-green-600 mt-2">✅ Receiving signals</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:gap-6 lg:grid-cols-4">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="tc-card-static p-4 md:p-5">
                <h3 className="tc-card-title mb-3 md:mb-4 text-sm md:text-base">My Subscriptions</h3>
                <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
                  <Button variant={selectedGroup === null ? 'default' : 'outline'} size="sm" className="whitespace-nowrap justify-start tc-btn-click min-h-[44px]" onClick={() => setSelectedGroup(null)}>All Signals</Button>
                  {subscriptions.map((sub, idx) => (
                    <div key={sub.group_id} className="shrink-0 lg:shrink">
                      <Button variant={selectedGroup === sub.group_id ? 'default' : 'outline'} size="sm" className="whitespace-nowrap justify-start tc-btn-click min-h-[44px] w-full" onClick={() => setSelectedGroup(sub.group_id)}>
                        {sub.group.name}
                      </Button>
                      {/* Show group info when selected or first one */}
                      {(selectedGroup === sub.group_id || (selectedGroup === null && idx === 0)) && (
                        <div className="mt-2 rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground overflow-hidden">
                              {sub.group.advisor_photo ? (
                                <img src={sub.group.advisor_photo} alt="" className="h-full w-full rounded-full object-cover" />
                              ) : <User className="h-4 w-4" />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold truncate">{sub.group.advisor_name}</p>
                              {sub.group.sebi_reg_no && (
                                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Shield className="h-3 w-3 text-primary" /> {sub.group.sebi_reg_no}
                                </p>
                              )}
                            </div>
                          </div>
                          {sub.group.bio && (
                            <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{sub.group.bio}</p>
                          )}
                          <div className="flex items-center gap-1">
                            {telegramSettings[sub.group_id]?.is_active && telegramSettings[sub.group_id]?.bot_started ? (
                              <span className="text-[10px] text-primary flex items-center gap-1"><Bell className="h-3 w-3" /> Alerts ON</span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1"><BellOff className="h-3 w-3" /> Alerts OFF</span>
                            )}
                          </div>
                        </div>
                      )}
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
