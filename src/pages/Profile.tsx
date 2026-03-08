import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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

  // Password change
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
  const [showPasswords, setShowPasswords] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        fullName: profile.full_name || '',
        phone: profile.phone || '',
        telegramUsername: profile.telegram_username || '',
      });
    }
  }, [profile]);

  useEffect(() => {
    if (user) fetchSubscriptions();
  }, [user]);

  const fetchSubscriptions = async () => {
    const { data } = await supabase
      .from('subscriptions')
      .select('*, groups!inner(name, monthly_price), advisors!inner(full_name)')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });
    setSubscriptions(data || []);
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    const { error } = await supabase.from('profiles').update({
      full_name: form.fullName,
      phone: form.phone,
      telegram_username: form.telegramUsername,
    }).eq('id', user!.id);
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

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const tabs = [
    { key: 'details' as const, label: 'My Details', icon: User },
    { key: 'subscriptions' as const, label: 'Subscriptions', icon: Calendar },
    { key: 'security' as const, label: 'Security', icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">My Profile</h1>

        {/* Tab navigation */}
        <div className="mb-6 flex gap-2 overflow-x-auto rounded-lg border bg-card p-1">
          {tabs.map(t => (
            <Button
              key={t.key}
              variant={tab === t.key ? 'default' : 'ghost'}
              size="sm"
              className="gap-2"
              onClick={() => setTab(t.key)}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </Button>
          ))}
        </div>

        {/* Details Tab */}
        {tab === 'details' && (
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                  {(profile?.full_name || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{profile?.full_name || 'User'}</h2>
                  <p className="text-sm text-muted-foreground">{profile?.email}</p>
                  <Badge variant="secondary" className="mt-1 capitalize">{profile?.role || 'trader'}</Badge>
                </div>
              </div>
              {!editing && <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit</Button>}
            </div>

            {editing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} className="pl-10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="pl-10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Telegram Username</Label>
                  <Input value={form.telegramUsername} onChange={e => setForm({ ...form, telegramUsername: e.target.value })} placeholder="@username" />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveProfile} disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</Button>
                  <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div><p className="text-xs text-muted-foreground">Email</p><p className="font-medium">{profile?.email || '-'}</p></div>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div><p className="text-xs text-muted-foreground">Phone</p><p className="font-medium">{profile?.phone || '-'}</p></div>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div><p className="text-xs text-muted-foreground">Member Since</p><p className="font-medium">{formatDate(profile?.created_at || null)}</p></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Subscriptions Tab */}
        {tab === 'subscriptions' && (
          <div className="space-y-4">
            {subscriptions.length === 0 ? (
              <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
                <p className="text-muted-foreground">No subscriptions yet</p>
                <Button className="mt-4" onClick={() => navigate('/')}>Browse Advisors</Button>
              </div>
            ) : subscriptions.map((sub: any) => (
              <div key={sub.id} className="rounded-xl border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{sub.groups?.name}</p>
                    <p className="text-sm text-muted-foreground">by {sub.advisors?.full_name}</p>
                  </div>
                  <Badge variant={sub.status === 'active' ? 'default' : 'secondary'} className="capitalize">{sub.status}</Badge>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                  <div><p className="text-xs text-muted-foreground">Amount</p><p className="font-medium">₹{sub.amount_paid || 0}</p></div>
                  <div><p className="text-xs text-muted-foreground">Start</p><p className="font-medium">{formatDate(sub.start_date)}</p></div>
                  <div><p className="text-xs text-muted-foreground">End</p><p className="font-medium">{formatDate(sub.end_date)}</p></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Security Tab */}
        {tab === 'security' && (
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold">Change Password</h3>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label>New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type={showPasswords ? 'text' : 'password'} value={passwords.newPass} onChange={e => setPasswords({ ...passwords, newPass: e.target.value })} className="pl-10 pr-10" placeholder="Min 6 characters" required minLength={6} />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPasswords(!showPasswords)}>
                    {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Confirm New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="password" value={passwords.confirm} onChange={e => setPasswords({ ...passwords, confirm: e.target.value })} className="pl-10" placeholder="Confirm password" required minLength={6} />
                </div>
              </div>
              <Button type="submit" disabled={changingPassword}>{changingPassword ? 'Changing...' : 'Change Password'}</Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
