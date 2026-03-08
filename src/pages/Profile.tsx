import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { User, Mail, Phone, Lock, Eye, EyeOff, Shield, Calendar } from 'lucide-react';

export default function Profile() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'details' | 'subscriptions' | 'security'>('details');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ fullName: '', phone: '', telegramUsername: '' });
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
  const [showPasswords, setShowPasswords] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => { if (profile) setForm({ fullName: profile.full_name || '', phone: profile.phone || '', telegramUsername: profile.telegram_username || '' }); }, [profile]);
  useEffect(() => { if (user) fetchSubscriptions(); }, [user]);

  const fetchSubscriptions = async () => {
    const { data } = await supabase.from('subscriptions').select('*, groups!inner(name, monthly_price), advisors!inner(full_name)').eq('user_id', user!.id).order('created_at', { ascending: false });
    setSubscriptions(data || []);
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    const { error } = await supabase.from('profiles').update({ full_name: form.fullName, phone: form.phone, telegram_username: form.telegramUsername }).eq('id', user!.id);
    if (error) toast.error(error.message);
    else { toast.success('Profile updated'); setEditing(false); }
    setLoading(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.newPass !== passwords.confirm) { toast.error('Passwords do not match'); return; }
    if (passwords.newPass.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: passwords.newPass });
    if (error) toast.error(error.message);
    else { toast.success('Password changed successfully'); setPasswords({ current: '', newPass: '', confirm: '' }); }
    setChangingPassword(false);
  };

  const formatDate = (date: string | null) => { if (!date) return '-'; return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); };

  const tabs = [
    { key: 'details' as const, label: 'My Details', icon: User },
    { key: 'subscriptions' as const, label: 'Subscriptions', icon: Calendar },
    { key: 'security' as const, label: 'Security', icon: Shield },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-off-white">
      <Navbar />
      <div className="flex-1 container mx-auto max-w-2xl px-4 py-8">
        <h1 className="tc-page-title text-3xl mb-6">My Profile</h1>

        <div className="mb-6 flex gap-2 overflow-x-auto">
          {tabs.map(t => (
            <Button key={t.key} variant={tab === t.key ? 'default' : 'outline'} size="sm" className="gap-2 tc-btn-click min-h-[44px]" onClick={() => setTab(t.key)}>
              <t.icon className="h-4 w-4" /> {t.label}
            </Button>
          ))}
        </div>

        {tab === 'details' && (
          <div className="tc-card-static p-6">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                  {(profile?.full_name || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="tc-card-title text-xl">{profile?.full_name || 'User'}</h2>
                  <p className="tc-small">{profile?.email}</p>
                  <span className="tc-badge-strategy mt-1 capitalize">{profile?.role || 'trader'}</span>
                </div>
              </div>
              {!editing && <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="tc-btn-click">Edit</Button>}
            </div>
            {editing ? (
              <div className="space-y-4">
                <div className="space-y-2"><Label>Full Name</Label><div className="relative"><User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} className="pl-10 tc-input-focus" /></div></div>
                <div className="space-y-2"><Label>Phone</Label><div className="relative"><Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="pl-10 tc-input-focus" /></div></div>
                <div className="space-y-2"><Label>Telegram Username</Label><Input value={form.telegramUsername} onChange={e => setForm({ ...form, telegramUsername: e.target.value })} placeholder="@username" className="tc-input-focus" /></div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveProfile} disabled={loading} className="tc-btn-click font-semibold">{loading ? 'Saving...' : 'Save Changes'}</Button>
                  <Button variant="outline" onClick={() => setEditing(false)} className="tc-btn-click">Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                {[
                  { icon: Mail, label: 'Email', value: profile?.email || '-' },
                  { icon: Phone, label: 'Phone', value: profile?.phone || '-' },
                  { icon: Calendar, label: 'Member Since', value: formatDate(profile?.created_at || null) },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3 rounded-lg bg-off-white p-3">
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    <div><p className="tc-small">{item.label}</p><p className="font-medium">{item.value}</p></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'subscriptions' && (
          <div className="space-y-4">
            {subscriptions.length === 0 ? (
              <div className="tc-card-static p-12 text-center">
                <p className="text-muted-foreground">No subscriptions yet</p>
                <Button className="mt-4 tc-btn-click" onClick={() => navigate('/')}>Browse Advisors</Button>
              </div>
            ) : subscriptions.map((sub: any) => (
              <div key={sub.id} className="tc-card p-5">
                <div className="flex items-center justify-between">
                  <div><p className="tc-card-title">{sub.groups?.name}</p><p className="tc-small">by {sub.advisors?.full_name}</p></div>
                  <span className={sub.status === 'active' ? 'tc-badge-active' : 'tc-badge-pending'}>{sub.status}</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                  <div><p className="tc-small">Amount</p><p className="tc-amount">₹{sub.amount_paid || 0}</p></div>
                  <div><p className="tc-small">Start</p><p className="font-medium">{formatDate(sub.start_date)}</p></div>
                  <div><p className="tc-small">End</p><p className="font-medium">{formatDate(sub.end_date)}</p></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'security' && (
          <div className="tc-card-static p-6">
            <h3 className="tc-card-title mb-4">Change Password</h3>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label>New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type={showPasswords ? 'text' : 'password'} value={passwords.newPass} onChange={e => setPasswords({ ...passwords, newPass: e.target.value })} className="pl-10 pr-10 tc-input-focus" placeholder="Min 6 characters" required minLength={6} />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPasswords(!showPasswords)}>
                    {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="password" value={passwords.confirm} onChange={e => setPasswords({ ...passwords, confirm: e.target.value })} className="pl-10 tc-input-focus" placeholder="Confirm password" required minLength={6} />
                </div>
              </div>
              <Button type="submit" disabled={changingPassword} className="tc-btn-click font-semibold">{changingPassword ? 'Changing...' : 'Change Password'}</Button>
            </form>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
