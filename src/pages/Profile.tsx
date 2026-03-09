import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sanitizeName, sanitizePhone, sanitizeText, sanitizeTextarea } from '@/lib/sanitize';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { User, Mail, Phone, Lock, Eye, EyeOff, Shield, Calendar, Settings, AlertTriangle, Trash2, Pencil, Users, Send, MapPin, CheckCircle } from 'lucide-react';
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

  // Following count
  const [followingCount, setFollowingCount] = useState(0);

  useEffect(() => { if (profile) setForm({ fullName: profile.full_name || '', phone: profile.phone || '', telegramUsername: profile.telegram_username || '' }); }, [profile]);
  useEffect(() => { if (user) { fetchSubscriptions(); fetchAdvisorData(); fetchDeletionRequests(); fetchFollowingCount(); } }, [user]);

  const fetchSubscriptions = async () => {
    const { data } = await supabase.from('subscriptions').select('*, groups!inner(name, monthly_price), advisors!inner(full_name)').eq('user_id', user!.id).order('created_at', { ascending: false });
    setSubscriptions(data || []);
  };

  const fetchFollowingCount = async () => {
    const { count } = await supabase.from('group_follows').select('*', { count: 'exact', head: true }).eq('user_id', user!.id);
    setFollowingCount(count || 0);
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
    const { error } = await supabase.from('profiles').update({ full_name: sanitizeName(form.fullName), phone: sanitizePhone(form.phone), telegram_username: sanitizeText(form.telegramUsername) }).eq('id', user!.id);
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

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const activeSubs = subscriptions.filter(s => s.status === 'active');
  const daysSinceJoined = profile?.created_at ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0;

  const getDaysRemaining = (endDate: string | null) => {
    if (!endDate) return 0;
    const days = Math.max(0, Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    return days;
  };

  const tabs = [
    { key: 'details' as const, label: 'My Details', icon: '👤' },
    { key: 'subscriptions' as const, label: 'Subscriptions', icon: '📋' },
    { key: 'security' as const, label: 'Security', icon: '🛡️' },
    { key: 'settings' as const, label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F8F9FA' }}>
      <Navbar />

      {/* ===== PROFILE HERO ===== */}
      <div className="bg-card shadow-[0_4px_20px_rgba(0,0,0,0.07)]" style={{ borderRadius: '0 0 28px 28px', marginBottom: 16 }}>
        {/* Cover strip */}
        <div className="relative h-[90px]" style={{ background: 'linear-gradient(135deg, #0D47A1 0%, #1B5E20 100%)', borderRadius: '0 0 28px 28px' }}>
          {/* Avatar */}
          <div
            className="absolute flex items-center justify-center text-[28px] font-extrabold text-white"
            style={{
              bottom: -36, left: 20, width: 72, height: 72, borderRadius: '50%',
              background: 'linear-gradient(135deg, #1B5E20, #0D47A1)',
              border: '3px solid white', boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            }}
          >
            {(profile?.full_name || 'U').charAt(0).toUpperCase()}
          </div>
        </div>

        {/* Content below cover */}
        <div className="px-5 pb-5" style={{ paddingTop: 48 }}>
          {/* Name row */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-[22px] font-extrabold capitalize" style={{ color: '#1A1A2E' }}>
                {profile?.full_name || 'User'}
              </h1>
              <span
                className="inline-flex items-center gap-1 mt-1"
                style={{
                  background: 'linear-gradient(135deg, #E8F5E9, #E3F2FD)',
                  border: '1px solid #1B5E20', borderRadius: 100,
                  padding: '3px 12px', fontSize: 11, fontWeight: 700, color: '#1B5E20',
                }}
              >
                🎯 Active {profile?.role === 'advisor' ? 'Advisor' : 'Trader'}
              </span>
            </div>
            <button
              onClick={() => { setTab('details'); setEditing(true); }}
              className="flex items-center gap-1.5 transition-colors hover:border-primary"
              style={{
                background: 'white', border: '1.5px solid #E5E7EB', borderRadius: 10,
                padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#1A1A2E',
              }}
            >
              <Pencil className="h-3.5 w-3.5" style={{ color: '#6B7280' }} /> Edit Profile
            </button>
          </div>

          {/* Stats row */}
          <div className="mt-5 grid grid-cols-3" style={{ background: '#F8F9FA', borderRadius: 12, padding: '14px 16px' }}>
            <div className="text-center">
              <p className="text-[20px] font-bold" style={{ color: '#1B5E20' }}>{activeSubs.length}</p>
              <p className="text-[10px] font-medium" style={{ color: '#9CA3AF' }}>Subscriptions</p>
            </div>
            <div className="text-center" style={{ borderLeft: '1px solid #E5E7EB', borderRight: '1px solid #E5E7EB' }}>
              <p className="text-[20px] font-bold" style={{ color: '#0D47A1' }}>{daysSinceJoined}</p>
              <p className="text-[10px] font-medium" style={{ color: '#9CA3AF' }}>Days Active</p>
            </div>
            <div className="text-center">
              <p className="text-[20px] font-bold" style={{ color: '#1A1A2E' }}>{followingCount}</p>
              <p className="text-[10px] font-medium" style={{ color: '#9CA3AF' }}>Following</p>
            </div>
          </div>

          {/* Member since strip */}
          <div className="mt-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" style={{ color: '#9CA3AF' }} />
              <span className="text-xs" style={{ color: '#9CA3AF' }}>Member since {formatDate(profile?.created_at || null)}</span>
            </div>
            {user?.email_confirmed_at && (
              <span
                className="flex items-center gap-1"
                style={{
                  background: '#E8F5E9', color: '#1B5E20', borderRadius: 100,
                  padding: '2px 8px', fontSize: 10, fontWeight: 600,
                }}
              >
                ✓ Verified Account
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ===== TAB NAVIGATION ===== */}
      <div className="mx-4 mb-4">
        <div
          className="flex gap-1 overflow-x-auto"
          style={{ background: 'white', borderRadius: 12, padding: 6, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
        >
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex items-center gap-1.5 whitespace-nowrap transition-all"
              style={{
                height: 40, padding: '0 16px', borderRadius: 8,
                fontSize: 13, fontWeight: 600,
                background: tab === t.key ? '#1A1A2E' : 'transparent',
                color: tab === t.key ? 'white' : '#6B7280',
                boxShadow: tab === t.key ? '0 2px 6px rgba(0,0,0,0.15)' : 'none',
              }}
            >
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ===== TAB CONTENT ===== */}
      <div className="mx-4 pb-8">
        {/* MY DETAILS TAB */}
        {tab === 'details' && (
          <div
            className="overflow-hidden"
            style={{ background: 'white', borderRadius: 16, border: '1.5px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
          >
            {/* Section header */}
            <div
              className="flex items-center justify-between"
              style={{ background: '#F8F9FA', borderBottom: '1px solid #E5E7EB', padding: '14px 20px' }}
            >
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E' }}>Personal Information</span>
              {!editing && (
                <button onClick={() => setEditing(true)} className="transition-colors hover:text-primary">
                  <Pencil className="h-4 w-4" style={{ color: '#6B7280' }} />
                </button>
              )}
            </div>

            {editing ? (
              <div className="p-5 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase" style={{ color: '#9CA3AF' }}>Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} className="pl-10" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase" style={{ color: '#9CA3AF' }}>Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="pl-10" placeholder="+91 XXXXX XXXXX" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase" style={{ color: '#9CA3AF' }}>Telegram Username</Label>
                  <div className="relative">
                    <Send className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={form.telegramUsername} onChange={e => setForm({ ...form, telegramUsername: e.target.value })} className="pl-10" placeholder="@username" />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button onClick={handleSaveProfile} disabled={loading} className="font-semibold" style={{ background: '#1B5E20' }}>
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div>
                {[
                  { icon: Mail, label: 'EMAIL', value: profile?.email, iconBg: '#E3F2FD', iconColor: '#0D47A1' },
                  { icon: Phone, label: 'PHONE', value: profile?.phone, iconBg: '#E8F5E9', iconColor: '#1B5E20', addable: true },
                  { icon: Send, label: 'TELEGRAM', value: profile?.telegram_username, iconBg: '#EDE7F6', iconColor: '#7B1FA2', addable: true },
                  { icon: Calendar, label: 'MEMBER SINCE', value: formatDate(profile?.created_at || null), iconBg: '#FFF8E1', iconColor: '#F59E0B' },
                ].map((item, i, arr) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-3.5"
                    style={{ padding: '16px 20px', borderBottom: i < arr.length - 1 ? '1px solid #F8F9FA' : 'none' }}
                  >
                    <div
                      className="flex items-center justify-center shrink-0"
                      style={{ width: 36, height: 36, borderRadius: 8, background: item.iconBg }}
                    >
                      <item.icon className="h-4 w-4" style={{ color: item.iconColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase' as const }}>{item.label}</p>
                      <p className="truncate" style={{
                        fontSize: 14, fontWeight: 500, color: item.value ? '#1A1A2E' : '#9CA3AF',
                        fontStyle: item.value ? 'normal' : 'italic',
                      }}>
                        {item.value || 'Not added yet'}
                      </p>
                    </div>
                    {item.addable && !item.value && (
                      <button
                        onClick={() => setEditing(true)}
                        style={{ fontSize: 12, color: '#0D47A1', fontWeight: 600 }}
                      >
                        Add
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SUBSCRIPTIONS TAB */}
        {tab === 'subscriptions' && (
          <div>
            <h2 className="mb-3" style={{ fontSize: 16, fontWeight: 700, color: '#1A1A2E' }}>Your Active Subscriptions</h2>

            {subscriptions.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center text-center"
                style={{
                  background: 'white', borderRadius: 16, border: '1.5px dashed #E5E7EB',
                  padding: '40px 20px',
                }}
              >
                <Users className="h-10 w-10" style={{ color: '#E5E7EB' }} />
                <h3 className="mt-3" style={{ fontSize: 16, fontWeight: 700, color: '#1A1A2E' }}>No subscriptions yet</h3>
                <p className="mt-1.5 max-w-xs" style={{ fontSize: 13, color: '#6B7280' }}>
                  Browse verified advisors and subscribe to start getting signals
                </p>
                <Button
                  className="mt-4"
                  onClick={() => navigate('/')}
                  style={{ background: '#1B5E20', borderRadius: 8, padding: '10px 20px' }}
                >
                  Browse Advisors
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {subscriptions.map((sub: any) => {
                  const daysLeft = getDaysRemaining(sub.end_date);
                  const totalDays = 30;
                  const progressPct = Math.min(100, Math.round((daysLeft / totalDays) * 100));

                  return (
                    <div
                      key={sub.id}
                      style={{
                        background: 'white', borderRadius: 14, border: '1.5px solid #E5E7EB',
                        padding: 16,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="flex items-center justify-center shrink-0 text-sm font-bold text-white"
                          style={{
                            width: 44, height: 44, borderRadius: '50%',
                            background: 'linear-gradient(135deg, #1B5E20, #0D47A1)',
                          }}
                        >
                          {(sub.advisors?.full_name || 'A').charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="capitalize truncate" style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E' }}>
                            {sub.advisors?.full_name}
                          </p>
                          <p className="truncate" style={{ fontSize: 12, color: '#6B7280' }}>{sub.groups?.name}</p>
                          <p style={{ fontSize: 11, color: '#1B5E20', fontWeight: 500 }}>Signals on Telegram</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span
                            style={{
                              display: 'inline-block',
                              fontSize: 11, fontWeight: 700, borderRadius: 100,
                              padding: '2px 10px',
                              background: sub.status === 'active' ? '#E8F5E9' : '#F5F5F5',
                              color: sub.status === 'active' ? '#1B5E20' : '#9CA3AF',
                            }}
                          >
                            {sub.status === 'active' ? 'Active' : 'Expired'}
                          </span>
                          <p className="mt-1" style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E' }}>₹{sub.amount_paid || sub.groups?.monthly_price || 0}</p>
                          <p style={{ fontSize: 11, color: '#9CA3AF' }}>Expires {formatDate(sub.end_date)}</p>
                        </div>
                      </div>

                      {sub.status === 'active' && (
                        <div className="mt-3">
                          <div style={{ background: '#F0FFF4', borderRadius: 4, height: 4, overflow: 'hidden' }}>
                            <div style={{ width: `${progressPct}%`, height: '100%', background: '#1B5E20', borderRadius: 4 }} />
                          </div>
                          <p className="mt-1" style={{ fontSize: 11, color: '#6B7280' }}>{daysLeft} days remaining</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SECURITY TAB */}
        {tab === 'security' && (
          <div
            className="overflow-hidden"
            style={{ background: 'white', borderRadius: 16, border: '1.5px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
          >
            {/* Password row */}
            <div className="flex items-center gap-3.5" style={{ padding: '16px 20px', borderBottom: '1px solid #F8F9FA' }}>
              <div className="flex items-center justify-center shrink-0" style={{ width: 36, height: 36, borderRadius: 8, background: '#FFF3E0' }}>
                <Lock className="h-4 w-4" style={{ color: '#E65100' }} />
              </div>
              <div className="flex-1">
                <p style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase' as const }}>PASSWORD</p>
                <p style={{ fontSize: 14, fontWeight: 500, color: '#1A1A2E' }}>••••••••</p>
              </div>
              <button
                onClick={() => {
                  const el = document.getElementById('change-password-section');
                  if (el) el.classList.toggle('hidden');
                }}
                style={{ fontSize: 12, color: '#0D47A1', fontWeight: 600 }}
              >
                Change
              </button>
            </div>

            {/* Account Status row */}
            <div className="flex items-center gap-3.5" style={{ padding: '16px 20px', borderBottom: '1px solid #F8F9FA' }}>
              <div className="flex items-center justify-center shrink-0" style={{ width: 36, height: 36, borderRadius: 8, background: '#E8F5E9' }}>
                <Shield className="h-4 w-4" style={{ color: '#1B5E20' }} />
              </div>
              <div className="flex-1">
                <p style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase' as const }}>ACCOUNT STATUS</p>
                <p style={{ fontSize: 14, fontWeight: 500, color: '#1A1A2E' }}>Active & Verified</p>
              </div>
              <div className="h-2.5 w-2.5 rounded-full" style={{ background: '#1B5E20' }} />
            </div>

            {/* Login Email row */}
            <div className="flex items-center gap-3.5" style={{ padding: '16px 20px', borderBottom: '1px solid #F8F9FA' }}>
              <div className="flex items-center justify-center shrink-0" style={{ width: 36, height: 36, borderRadius: 8, background: '#E3F2FD' }}>
                <Mail className="h-4 w-4" style={{ color: '#0D47A1' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 700, textTransform: 'uppercase' as const }}>LOGIN EMAIL</p>
                <p className="truncate" style={{ fontSize: 14, fontWeight: 500, color: '#1A1A2E' }}>{profile?.email}</p>
              </div>
              <button
                onClick={() => {
                  const el = document.getElementById('change-email-section');
                  if (el) el.classList.toggle('hidden');
                }}
                style={{ fontSize: 12, color: '#0D47A1', fontWeight: 600 }}
              >
                Change
              </button>
            </div>

            {/* Expandable: Change Password */}
            <div id="change-password-section" className="hidden" style={{ padding: '16px 20px', borderBottom: '1px solid #F8F9FA', background: '#FAFAFA' }}>
              <form onSubmit={handleChangePassword} className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase" style={{ color: '#9CA3AF' }}>New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input type={showPasswords ? 'text' : 'password'} value={passwords.newPass} onChange={e => setPasswords({ ...passwords, newPass: e.target.value })} className="pl-10 pr-10" placeholder="Min 6 characters" required minLength={6} />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPasswords(!showPasswords)}>
                      {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase" style={{ color: '#9CA3AF' }}>Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input type="password" value={passwords.confirm} onChange={e => setPasswords({ ...passwords, confirm: e.target.value })} className="pl-10" placeholder="Confirm password" required minLength={6} />
                  </div>
                </div>
                <Button type="submit" disabled={changingPassword} size="sm" style={{ background: '#1B5E20' }}>
                  {changingPassword ? 'Changing...' : 'Update Password'}
                </Button>
              </form>
            </div>

            {/* Expandable: Change Email */}
            <div id="change-email-section" className="hidden" style={{ padding: '16px 20px', background: '#FAFAFA' }}>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase" style={{ color: '#9CA3AF' }}>New Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="pl-10" placeholder="New email address" />
                  </div>
                </div>
                <Button onClick={handleChangeEmail} disabled={changingEmail || !newEmail} size="sm" style={{ background: '#0D47A1' }}>
                  {changingEmail ? 'Sending...' : 'Send Verification'}
                </Button>
                <p style={{ fontSize: 11, color: '#9CA3AF' }}>A verification link will be sent to both your current and new email.</p>
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {tab === 'settings' && (
          <div className="space-y-4">
            {/* Advisor-specific settings */}
            {advisor && (
              <div style={{ background: 'white', borderRadius: 16, border: '1.5px solid #E5E7EB', padding: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E', marginBottom: 4 }}>Advisor Settings</h3>
                <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>Manage your advisor account and groups</p>

                {advisorGroups.length > 0 && (
                  <div className="space-y-2.5 mb-5">
                    <h4 style={{ fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase' as const, letterSpacing: 1 }}>Your Groups</h4>
                    {advisorGroups.map(g => (
                      <div key={g.id} className="flex items-center justify-between" style={{ borderRadius: 10, border: '1px solid #E5E7EB', padding: 12 }}>
                        <div className="flex items-center gap-3">
                          {g.dp_url ? (
                            <img src={g.dp_url} alt={g.name} className="h-10 w-10 rounded-full object-cover" />
                          ) : (
                            <div className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #1B5E20, #0D47A1)' }}>{g.name.charAt(0)}</div>
                          )}
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E' }}>{g.name}</p>
                            <p style={{ fontSize: 11, color: '#6B7280' }}>₹{g.monthly_price}/month</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-1"
                          onClick={() => openDeleteDialog('group', g)}
                        >
                          <Trash2 className="h-3 w-3" /> Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)', padding: 16 }}>
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <h4 style={{ fontSize: 13, fontWeight: 600 }}>Delete Advisor Account</h4>
                      <p style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
                        Account deletion requires manual review. All groups and subscribers will be handled carefully.
                      </p>
                      <Button variant="destructive" size="sm" className="mt-3 gap-1" onClick={() => openDeleteDialog('account')}>
                        <Trash2 className="h-3 w-3" /> Request Account Deletion
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Trader account deletion */}
            {!advisor && (
              <div style={{ background: 'white', borderRadius: 16, border: '1.5px solid #E5E7EB', padding: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E', marginBottom: 4 }}>Account Settings</h3>
                <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>Manage your account</p>
                <div style={{ borderRadius: 10, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)', padding: 16 }}>
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <h4 style={{ fontSize: 13, fontWeight: 600 }}>Delete Account</h4>
                      <p style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
                        Request account deletion. Our team will review and process within 24-48 hours.
                      </p>
                      <Button variant="destructive" size="sm" className="mt-3 gap-1" onClick={() => openDeleteDialog('account')}>
                        <Trash2 className="h-3 w-3" /> Request Account Deletion
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Existing Requests */}
            {existingRequests.length > 0 && (
              <div style={{ background: 'white', borderRadius: 16, border: '1.5px solid #E5E7EB', padding: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E', marginBottom: 12 }}>Your Requests</h3>
                <div className="space-y-2.5">
                  {existingRequests.map(req => (
                    <div key={req.id} style={{ borderRadius: 10, border: '1px solid #E5E7EB', padding: 12 }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="capitalize" style={{ fontSize: 13, fontWeight: 600 }}>{req.request_type.replace(/_/g, ' ')}</p>
                          {req.group_name && <p style={{ fontSize: 11, color: '#6B7280' }}>Group: {req.group_name}</p>}
                        </div>
                        <span
                          style={{
                            fontSize: 11, fontWeight: 600, borderRadius: 100, padding: '2px 10px',
                            background: req.status === 'pending' ? '#FFF8E1' : req.status === 'approved' ? '#E8F5E9' : 'rgba(239,68,68,0.1)',
                            color: req.status === 'pending' ? '#E65100' : req.status === 'approved' ? '#1B5E20' : '#DC2626',
                          }}
                        >
                          {req.status}
                        </span>
                      </div>
                      <p style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>Submitted: {formatDate(req.created_at)}</p>
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
              This request will be sent to the Trade<span className="text-primary font-semibold">Circle</span> team for manual review. Your {deleteType === 'group' ? 'group' : 'account'} will not be deleted immediately.
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
              <Textarea value={deleteReason} onChange={e => setDeleteReason(e.target.value)} placeholder="Please explain why you want to proceed..." rows={3} />
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
            <Button variant="destructive" onClick={handleSubmitDeletionRequest} disabled={submittingRequest || !deleteReason.trim()}>
              {submittingRequest ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
