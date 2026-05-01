import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Send, CheckCircle2, AlertTriangle, RotateCcw, ExternalLink, Loader2, Bell, BellOff, User } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

interface TelegramSetting {
  is_active: boolean;
  telegram_username: string;
  bot_started: boolean;
  telegram_chat_id: string | null;
}

const BOT_USERNAME = 'StockCircle_alerts_bot';

export function TelegramSettings() {
  const { user, profile } = useAuth();
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [telegramSettings, setTelegramSettings] = useState<Record<string, TelegramSetting>>({});
  const [telegramConnected, setTelegramConnected] = useState(false);
  const [telegramUsername, setTelegramUsername] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [usernameSaved, setUsernameSaved] = useState(false);
  const [checking, setChecking] = useState(false);
  const [loading, setLoading] = useState(true);

  const botLink = user ? `https://t.me/${BOT_USERNAME}?start=${user.id}` : `https://t.me/${BOT_USERNAME}`;

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    const now = new Date().toISOString();
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('*, groups!inner(id, name, advisor_id, dp_url, advisors!inner(full_name, profile_photo_url))')
      .eq('user_id', user!.id)
      .eq('status', 'active')
      .gte('end_date', now);

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
      }
    }));
    setSubscriptions(subList);

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
    await supabase.from('profiles').update({ telegram_username: clean }).eq('id', user!.id);
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
        const connectedSetting = (tSettings || []).find((t: any) => t.bot_started && t.telegram_chat_id);
        const savedClean = telegramUsername.replace(/^@/, '').toLowerCase();
        const botClean = (connectedSetting?.telegram_username || '').replace(/^@/, '').toLowerCase();
        
        if (botClean && savedClean && botClean !== savedClean) {
          toast.error(`Username mismatch! You saved @${savedClean} but started the bot as @${botClean}.`);
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
        const { data: prof } = await supabase.from('profiles').select('telegram_username').eq('id', user!.id).single();
        if (prof?.telegram_username && !telegramUsername) {
          setTelegramUsername(prof.telegram_username);
        }
        toast.info('Bot not started yet. Press START in Telegram.');
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
    toast.success('Telegram disconnected.');
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;

  return (
    <div style={{ background: 'white', borderRadius: 16, border: '1.5px solid #E5E7EB', padding: 20 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E', marginBottom: 4 }}>Telegram Alerts</h3>
      <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>Get instant trading signals delivered to your Telegram.</p>

      {subscriptions.length === 0 ? (
        <div className="text-center py-6 bg-muted/20 rounded-xl border border-border">
          <Send className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
          <p className="text-[13px] text-muted-foreground">Subscribe to an advisor to enable Telegram alerts.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {telegramConnected ? (
            <div className="p-4 rounded-xl border border-green-200 bg-green-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-[13px] font-bold text-green-700">Telegram Connected</p>
                    <p className="text-[11px] text-green-600/80">@{telegramUsername.replace(/^@/, '')}</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-xs text-destructive hover:bg-destructive/10 h-8" onClick={resetTelegram}>
                  Reset
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-xl border border-amber-200 bg-amber-50 space-y-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                <h3 className="text-[13px] font-bold text-amber-800">Setup Telegram Alerts</h3>
              </div>

              <div>
                <p className="text-[11px] font-bold text-amber-700/70 uppercase tracking-wider mb-1.5">1. Enter Telegram Username</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="username"
                    value={usernameInput}
                    onChange={(e) => {
                      setUsernameInput(e.target.value.replace(/^@/, ''));
                      setUsernameSaved(false);
                    }}
                    disabled={usernameSaved}
                    className="h-9 text-sm"
                  />
                  {!usernameSaved ? (
                    <Button size="sm" className="h-9 bg-amber-600 hover:bg-amber-700" onClick={saveUsername}>Save</Button>
                  ) : (
                    <Button size="sm" variant="outline" className="h-9 text-green-600 border-green-300 pointer-events-none">✓</Button>
                  )}
                </div>
              </div>

              <div className={!usernameSaved ? 'opacity-40 pointer-events-none' : ''}>
                <p className="text-[11px] font-bold text-amber-700/70 uppercase tracking-wider mb-1.5">2. Start the Bot</p>
                <a href={botLink} target="_blank" rel="noopener noreferrer">
                  <Button className="w-full gap-2 h-10 bg-[#0088cc] hover:bg-[#006699] text-white" disabled={!usernameSaved}>
                    <ExternalLink className="h-4 w-4" /> Open @{BOT_USERNAME}
                  </Button>
                </a>
              </div>

              <div className={!usernameSaved ? 'opacity-40 pointer-events-none' : ''}>
                <p className="text-[11px] font-bold text-amber-700/70 uppercase tracking-wider mb-1.5">3. Verify Connection</p>
                <Button variant="outline" className="w-full gap-2 h-10 border-amber-300 text-amber-800 hover:bg-amber-100" onClick={checkBotStatus} disabled={!usernameSaved || checking}>
                  {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Check Connection Status'}
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Group Alerts</h4>
            {subscriptions.map(sub => {
              const settings = telegramSettings[sub.group_id];
              const isActive = settings?.is_active || false;

              return (
                <div key={sub.group_id} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${isActive && telegramConnected ? 'border-primary/30 bg-primary/5' : 'border-border bg-card'}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-full overflow-hidden bg-muted shrink-0">
                      {sub.group.advisor_photo ? (
                        <img src={sub.group.advisor_photo} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-primary text-primary-foreground font-bold text-xs">
                          {sub.group.advisor_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-foreground truncate">{sub.group.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{isActive && telegramConnected ? <span className="text-primary flex items-center gap-1"><Bell className="h-3 w-3" /> ON</span> : 'Alerts OFF'}</p>
                    </div>
                  </div>
                  <Switch
                    checked={isActive}
                    disabled={!telegramConnected}
                    onCheckedChange={(v) => toggleTelegram(sub.group_id, v)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
