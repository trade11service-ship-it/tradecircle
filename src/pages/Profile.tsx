import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { User, Mail, Phone, Lock, Eye, EyeOff, Shield, Calendar, Settings, AlertTriangle, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function Profile() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'details' | 'subscriptions' | 'security' | 'settings'>('details');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ fullName: '', phone: '', telegramUsername: '' });
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
  const [showPasswords, setShowPasswords] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Settings state
  const [advisor, setAdvisor] = useState<any>(null);
  const [advisorGroups, setAdvisorGroups] = useState<any[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteType, setDeleteType] = useState<'account' | 'group'>('account');
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [existingRequests, setExistingRequests] = useState<any[]>([]);

  // Email change
  const [newEmail, setNewEmail] = useState('');
  const [changingEmail, setChangingEmail] = useState(false);

  useEffect(() => { if (profile) setForm({ fullName: profile.full_name || '', phone: profile.phone || '', telegramUsername: profile.telegram_username || '' }); }, [profile]);
  useEffect(() => { if (user) { fetchSubscriptions(); fetchAdvisorData(); fetchDeletionRequests(); } }, [user]);

  const fetchSubscriptions = async () => {
    const { data } = await supabase.from('subscriptions').select('*, groups!inner(name, monthly_price), advisors!inner(full_name)').eq('user_id', user!.id).order('created_at', { ascending: false });
    setSubscriptions(data || []);
  };

  const fetchAdvisorData = async () => {
    const { data: adv } = await supabase.from('advisors').select('*').eq('user_id', user!.id).single();
    if (adv) {
      setAdvisor(adv);
      const { data: grps } = await supabase.from('groups').select('*').eq('advisor_id', adv.id);
      setAdvisorGroups(grps || []);
    }
  };

  const fetchDeletionRequests = async () => {
    const { data } = await supabase.from('deletion_requests').select('*').eq('user_id', user!.id).order('created_at', { ascending: false });
    setExistingRequests(data || []);
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

  const handleChangeEmail = async () => {
    if (!newEmail || newEmail === profile?.email) return;
    setChangingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) toast.error(error.message);
    else { toast.success('Verification email sent to your new address. Please check both inboxes.'); setNewEmail(''); }
    setChangingEmail(false);
  };

  const openDeleteDialog = (type: 'account' | 'group', group?: any) => {
    setDeleteType(type);
    setSelectedGroup(group || null);
    setDeleteReason('');
    setDeleteDialogOpen(true);
  };

  const getDeleteTemplate = () => {
    if (deleteType === 'account' && advisor) {
      return `Dear TradeCircle Team,\n\nI am a registered advisor on TradeCircle platform.\n\nAdvisor Name: ${advisor.full_name}\nSEBI Reg No: ${advisor.sebi_reg_no}\nEmail: ${advisor.email}\n\nI would like to request the deletion of my advisor account and all associated data.\n\nReason: ${deleteReason || '(Please specify your reason)'}\n\nI understand that:\n- All my groups and subscriber data will be reviewed\n- Active subscribers will be notified\n- This process will be handled manually by the TradeCircle team\n- This action cannot be undone once processed\n\nPlease review and process this request.\n\nRegards,\n${advisor.full_name}`;
    }
    if (deleteType === 'group' && selectedGroup) {
      return `Dear TradeCircle Team,\n\nI am a registered advisor on TradeCircle platform.\n\nAdvisor Name: ${advisor?.full_name}\nSEBI Reg No: ${advisor?.sebi_reg_no}\n\nI would like to request the deletion/cancellation of the following group:\n\nGroup Name: ${selectedGroup.name}\nGroup ID: ${selectedGroup.id}\nMonthly Price: ₹${selectedGroup.monthly_price}\n\nReason: ${deleteReason || '(Please specify your reason)'}\n\nI understand that:\n- Active subscribers in this group will be notified\n- This process will be handled manually by the TradeCircle team\n- This action cannot be undone once processed\n\nPlease review and process this request.\n\nRegards,\n${advisor?.full_name}`;
    }
    // Trader account deletion
    return `Dear TradeCircle Team,\n\nI would like to request the deletion of my TradeCircle account.\n\nName: ${profile?.full_name}\nEmail: ${profile?.email}\n\nReason: ${deleteReason || '(Please specify your reason)'}\n\nI understand that:\n- All my subscriptions and data will be removed\n- This process will be handled manually by the TradeCircle team\n- This action cannot be undone once processed\n\nPlease review and process this request.\n\nRegards,\n${profile?.full_name}`;
  };

  const handleSubmitDeletionRequest = async () => {
    if (!deleteReason.trim()) { toast.error('Please provide a reason for your request'); return; }
    setSubmittingRequest(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-deletion-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.session?.access_token}` },
        body: JSON.stringify({
          request_type: deleteType === 'group' ? 'group_deletion' : advisor ? 'advisor_account_deletion' : 'trader_account_deletion',
          reason: getDeleteTemplate(),
          group_id: selectedGroup?.id,
          group_name: selectedGroup?.name,
          advisor_name: advisor?.full_name,
          email: profile?.email || user?.email,
        }),
      });
      const result = await res.json();
      if (res.ok) {
        toast.success('Request submitted successfully. Our team will review and contact you within 24-48 hours.');
        setDeleteDialogOpen(false);
        fetchDeletionRequests();
      } else {
        toast.error(result.error || 'Failed to submit request');
      }
    } catch { toast.error('Failed to submit request'); }
    setSubmittingRequest(false);
  };

  const formatDate = (date: string | null) => { if (!date) return '-'; return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); };

  const tabs = [
    { key: 'details' as const, label: 'My Details', icon: User },
    { key: 'subscriptions' as const, label: 'Subscriptions', icon: Calendar },
    { key: 'security' as const, label: 'Security', icon: Shield },
    { key: 'settings' as const, label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <div className="flex-1 container mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">My Profile</h1>

        <div className="mb-6 flex gap-2 overflow-x-auto">
          {tabs.map(t => (
            <Button key={t.key} variant={tab === t.key ? 'default' : 'outline'} size="sm" className="gap-2 min-h-[44px]" onClick={() => setTab(t.key)}>
              <t.icon className="h-4 w-4" /> {t.label}
            </Button>
          ))}
        </div>

        {tab === 'details' && (
          <div className="rounded-xl border bg-card p-6">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                  {(profile?.full_name || 'U').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{profile?.full_name || 'User'}</h2>
                  <p className="text-sm text-muted-foreground">{profile?.email}</p>
                  <span className="inline-block mt-1 text-xs font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full capitalize">{profile?.role || 'trader'}</span>
                </div>
              </div>
              {!editing && <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit</Button>}
            </div>
            {editing ? (
              <div className="space-y-4">
                <div className="space-y-2"><Label>Full Name</Label><div className="relative"><User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} className="pl-10" /></div></div>
                <div className="space-y-2"><Label>Phone</Label><div className="relative"><Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="pl-10" /></div></div>
                <div className="space-y-2"><Label>Telegram Username</Label><Input value={form.telegramUsername} onChange={e => setForm({ ...form, telegramUsername: e.target.value })} placeholder="@username" /></div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveProfile} disabled={loading} className="font-semibold">{loading ? 'Saving...' : 'Save Changes'}</Button>
                  <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                {[
                  { icon: Mail, label: 'Email', value: profile?.email || '-' },
                  { icon: Phone, label: 'Phone', value: profile?.phone || '-' },
                  { icon: Calendar, label: 'Member Since', value: formatDate(profile?.created_at || null) },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    <div><p className="text-xs text-muted-foreground">{item.label}</p><p className="font-medium">{item.value}</p></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'subscriptions' && (
          <div className="space-y-4">
            {subscriptions.length === 0 ? (
              <div className="rounded-xl border bg-card p-12 text-center">
                <p className="text-muted-foreground">No subscriptions yet</p>
                <Button className="mt-4" onClick={() => navigate('/')}>Browse Advisors</Button>
              </div>
            ) : subscriptions.map((sub: any) => (
              <div key={sub.id} className="rounded-xl border bg-card p-5">
                <div className="flex items-center justify-between">
                  <div><p className="font-bold">{sub.groups?.name}</p><p className="text-sm text-muted-foreground">by {sub.advisors?.full_name}</p></div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${sub.status === 'active' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>{sub.status}</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                  <div><p className="text-xs text-muted-foreground">Amount</p><p className="font-bold text-primary">₹{sub.amount_paid || 0}</p></div>
                  <div><p className="text-xs text-muted-foreground">Start</p><p className="font-medium">{formatDate(sub.start_date)}</p></div>
                  <div><p className="text-xs text-muted-foreground">End</p><p className="font-medium">{formatDate(sub.end_date)}</p></div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'security' && (
          <div className="space-y-6">
            <div className="rounded-xl border bg-card p-6">
              <h3 className="font-bold mb-4">Change Password</h3>
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
                <Button type="submit" disabled={changingPassword} className="font-semibold">{changingPassword ? 'Changing...' : 'Change Password'}</Button>
              </form>
            </div>

            <div className="rounded-xl border bg-card p-6">
              <h3 className="font-bold mb-4">Change Email</h3>
              <p className="text-sm text-muted-foreground mb-3">Current email: <strong>{profile?.email}</strong></p>
              <div className="space-y-3">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="pl-10" placeholder="New email address" />
                </div>
                <Button onClick={handleChangeEmail} disabled={changingEmail || !newEmail} className="font-semibold">{changingEmail ? 'Sending verification...' : 'Change Email'}</Button>
                <p className="text-xs text-muted-foreground">A verification link will be sent to both your current and new email.</p>
              </div>
            </div>
          </div>
        )}

        {tab === 'settings' && (
          <div className="space-y-6">
            {/* Advisor-specific settings */}
            {advisor && (
              <div className="rounded-xl border bg-card p-6">
                <h3 className="font-bold mb-1">Advisor Settings</h3>
                <p className="text-sm text-muted-foreground mb-4">Manage your advisor account and groups</p>

                {advisorGroups.length > 0 && (
                  <div className="space-y-3 mb-6">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Your Groups</h4>
                    {advisorGroups.map(g => (
                      <div key={g.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="flex items-center gap-3">
                          {g.dp_url ? (
                            <img src={g.dp_url} alt={g.name} className="h-10 w-10 rounded-full object-cover" />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">{g.name.charAt(0)}</div>
                          )}
                          <div>
                            <p className="font-semibold text-sm">{g.name}</p>
                            <p className="text-xs text-muted-foreground">₹{g.monthly_price}/month</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1"
                          onClick={() => openDeleteDialog('group', g)}
                        >
                          <Trash2 className="h-3 w-3" /> Request Removal
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-sm">Delete Advisor Account</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Account deletion requires manual review by our team. All your groups and subscribers will be handled carefully.
                      </p>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="mt-3 gap-1"
                        onClick={() => openDeleteDialog('account')}
                      >
                        <Trash2 className="h-3 w-3" /> Request Account Deletion
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Trader account deletion */}
            {!advisor && (
              <div className="rounded-xl border bg-card p-6">
                <h3 className="font-bold mb-1">Account Settings</h3>
                <p className="text-sm text-muted-foreground mb-4">Manage your account</p>
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-sm">Delete Account</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Request account deletion. Our team will review and process your request within 24-48 hours.
                      </p>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="mt-3 gap-1"
                        onClick={() => openDeleteDialog('account')}
                      >
                        <Trash2 className="h-3 w-3" /> Request Account Deletion
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Existing Requests */}
            {existingRequests.length > 0 && (
              <div className="rounded-xl border bg-card p-6">
                <h3 className="font-bold mb-4">Your Requests</h3>
                <div className="space-y-3">
                  {existingRequests.map(req => (
                    <div key={req.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm capitalize">{req.request_type.replace(/_/g, ' ')}</p>
                          {req.group_name && <p className="text-xs text-muted-foreground">Group: {req.group_name}</p>}
                        </div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${req.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : req.status === 'approved' ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
                          {req.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Submitted: {formatDate(req.created_at)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      

      {/* Deletion Request Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {deleteType === 'group' ? 'Request Group Removal' : 'Request Account Deletion'}
            </DialogTitle>
            <DialogDescription>
              This request will be sent to the TradeCircle team for manual review. Your {deleteType === 'group' ? 'group' : 'account'} will not be deleted immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
              <p className="font-semibold">⚠️ Important Notice:</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                <li>All active subscribers will be notified before any action</li>
                <li>Our team will review your request within 24-48 hours</li>
                <li>You will be contacted before any permanent action is taken</li>
                <li>This process cannot be reversed once completed</li>
              </ul>
            </div>

            <div className="space-y-2">
              <Label>Reason for {deleteType === 'group' ? 'group removal' : 'account deletion'} *</Label>
              <Textarea
                value={deleteReason}
                onChange={e => setDeleteReason(e.target.value)}
                placeholder="Please explain why you want to proceed..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Request Preview</Label>
              <div className="rounded-lg border bg-muted/30 p-3 text-xs whitespace-pre-wrap max-h-40 overflow-y-auto font-mono">
                {getDeleteTemplate()}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleSubmitDeletionRequest}
              disabled={submittingRequest || !deleteReason.trim()}
            >
              {submittingRequest ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
