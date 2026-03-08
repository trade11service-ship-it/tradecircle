import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { GroupFeed } from '@/components/GroupFeed';
import { FollowFeed } from '@/components/FollowFeed';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { Bell, BellOff, Send, BarChart3, ExternalLink, CheckCircle2, AlertTriangle, RotateCcw, Shield, User, Loader2, Rss } from 'lucide-react';
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
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'signals' | 'telegram' | 'feed'>('signals');
  const [telegramSettings, setTelegramSettings] = useState<Record<string, TelegramSetting>>({});
  const [telegramConnected, setTelegramConnected] = useState(false);
  const [telegramUsername, setTelegramUsername] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [usernameSaved, setUsernameSaved] = useState(false);
  const [checking, setChecking] = useState(false);
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

    const anyConnected = (tSettings || []).some((t: any) => t.bot_started && t.telegram_chat_id);
    setTelegramConnected(anyConnected);
    const savedUsername = (tSettings || []).find((t: any) => t.telegram_username)?.telegram_username || profile?.telegram_username || '';
    setTelegramUsername(savedUsername);
    setUsernameInput(savedUsername.replace(/^@/, ''));
    setUsernameSaved(!!savedUsername);

    setLoading(false);
  };

  const saveUsername = async () => {
    const clean = usernameInput.trim().replace(/^@/, '');
    if (!clean || clean.length < 3) {
      toast.error('Please enter a valid Telegram username (at least 3 characters)');
      return;
    }
    // Save to profile
    await supabase.from('profiles').update({ telegram_username: clean }).eq('id', user!.id);
    // Also save to all existing telegram_settings rows
    await supabase.from('telegram_settings').update({ telegram_username: clean }).eq('user_id', user!.id);
    setTelegramUsername(clean);
    setUsernameSaved(true);
    toast.success(`Username @${clean} saved!`);
  };

  const toggleTelegram = async (groupId: string, active: boolean) => {
    const existing = telegramSettings[groupId];
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

  const checkBotStatus = async () => {
    setChecking(true);
    try {
      const { data: tSettings } = await supabase.from('telegram_settings').select('*').eq('user_id', user!.id);
      const anyConnected = (tSettings || []).some((t: any) => t.bot_started && t.telegram_chat_id);
      
      if (anyConnected) {
        // Verify the username matches what we saved
        const connectedSetting = (tSettings || []).find((t: any) => t.bot_started && t.telegram_chat_id);
        const savedClean = telegramUsername.replace(/^@/, '').toLowerCase();
        const botClean = (connectedSetting?.telegram_username || '').replace(/^@/, '').toLowerCase();
        
        if (botClean && savedClean && botClean !== savedClean) {
          toast.error(`Username mismatch! You saved @${savedClean} but started the bot as @${botClean}. Please reset and try again.`);
          setChecking(false);
          return;
        }

        setTelegramConnected(true);
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
        toast.success('✅ Bot connected successfully!');
      } else {
        // Check profile too
        const { data: prof } = await supabase.from('profiles').select('telegram_username').eq('id', user!.id).single();
        if (prof?.telegram_username && !telegramUsername) {
          setTelegramUsername(prof.telegram_username);
        }
        toast.info('Bot not started yet. Open the link above and press START in Telegram.');
      }
    } finally {
      setChecking(false);
    }
  };

  const resetTelegram = async () => {
    await supabase.from('telegram_settings').update({ bot_started: false, telegram_chat_id: null, telegram_username: null, is_active: false }).eq('user_id', user!.id);
    await supabase.from('profiles').update({ telegram_username: null }).eq('id', user!.id);
    setTelegramConnected(false);
    setTelegramUsername('');
    setUsernameInput('');
    setUsernameSaved(false);
    setTelegramSettings({});
    toast.success('Telegram disconnected. You can reconnect anytime.');
  };

  const currentSub = selectedGroup ? subscriptions.find(s => s.group_id === selectedGroup) : subscriptions[0];

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
                {/* Connected state */}
                {telegramConnected ? (
                  <div className="tc-card p-4 md:p-5 border-l-4 border-l-green-500">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="text-sm font-semibold text-green-700 dark:text-green-400">Telegram Connected</p>
                          <p className="text-xs text-muted-foreground">@{telegramUsername.replace(/^@/, '')}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-xs text-destructive gap-1" onClick={resetTelegram}>
                        <RotateCcw className="h-3 w-3" /> Reset
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Step-by-step setup */
                  <div className="tc-card p-4 md:p-6 border-l-4 border-l-amber-500">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                      <h3 className="text-sm md:text-base font-semibold text-amber-700 dark:text-amber-400">Setup Telegram Alerts</h3>
                    </div>

                    {/* Step 1: Enter username */}
                    <div className="mb-4">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">STEP 1 — Enter your Telegram username</p>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">@</span>
                          <Input
                            placeholder="yourusername"
                            value={usernameInput}
                            onChange={(e) => {
                              setUsernameInput(e.target.value.replace(/^@/, ''));
                              setUsernameSaved(false);
                            }}
                            className="pl-8"
                            disabled={usernameSaved}
                          />
                        </div>
                        {!usernameSaved ? (
                          <Button size="sm" className="min-h-[40px] shrink-0" onClick={saveUsername}>Save</Button>
                        ) : (
                          <Button size="sm" variant="outline" className="min-h-[40px] shrink-0 text-green-600 border-green-300">
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      {usernameSaved && (
                        <p className="text-xs text-green-600 mt-1">✓ Username saved as @{usernameInput}</p>
                      )}
                    </div>

                    {/* Step 2: Open bot link */}
                    <div className={`mb-4 ${!usernameSaved ? 'opacity-40 pointer-events-none' : ''}`}>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">STEP 2 — Open bot & press START</p>
                      <a href={botLink} target="_blank" rel="noopener noreferrer">
                        <Button className="w-full gap-2 tc-btn-click min-h-[44px] bg-[#0088cc] hover:bg-[#006699] text-white" disabled={!usernameSaved}>
                          <ExternalLink className="h-4 w-4" /> Open @{BOT_USERNAME} in Telegram
                        </Button>
                      </a>
                      <p className="text-[11px] text-muted-foreground mt-1">Make sure you're logged in as <strong>@{usernameInput || '...'}</strong> on Telegram</p>
                    </div>

                    {/* Step 3: Verify */}
                    <div className={`${!usernameSaved ? 'opacity-40 pointer-events-none' : ''}`}>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">STEP 3 — Verify connection</p>
                      <Button variant="outline" className="w-full gap-2 tc-btn-click min-h-[44px]" onClick={checkBotStatus} disabled={!usernameSaved || checking}>
                        {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : '🔄'} I've started the bot — check status
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

            {/* Group Feed */}
            <div className="lg:col-span-3">
              {currentSub ? (
                <GroupFeed
                  groupId={currentSub.group_id}
                  advisorName={currentSub.group.advisor_name}
                  advisorPhoto={currentSub.group.advisor_photo}
                />
              ) : (
                <div className="tc-card-static p-8 md:p-12 text-center">
                  <p className="text-sm text-muted-foreground">No active subscriptions. Subscribe to an advisor to see their feed.</p>
                  <Link to="/"><Button className="mt-4 tc-btn-click min-h-[44px]">Browse Advisors</Button></Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
