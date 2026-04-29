import { Fragment, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ViewApplicationModal } from '@/components/ViewApplicationModal';
import { RejectApplicationModal } from '@/components/RejectApplicationModal';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { AdminReferralTab } from '@/components/AdminReferralTab';
import { Link } from 'react-router-dom';
import type { Tables } from '@/integrations/supabase/types';
import {
  LayoutDashboard, Clock, UserCheck, Users, CreditCard, Gift, FileText, Mail,
  ShieldAlert, IndianRupee, Search, Download, CheckCircle, UserPlus, BarChart3,
  ChevronRight, Lock, Shield, Eye, ExternalLink, Trash2, Radio,
} from 'lucide-react';

type Advisor = Tables<'advisors'>;

type TabKey = 'dashboard' | 'pending' | 'advisors' | 'users' | 'payments' | 'referrals' | 'legal' | 'requests' | 'content';

const NAV_SECTIONS = [
  {
    label: 'OVERVIEW',
    items: [{ key: 'dashboard' as TabKey, label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'MANAGEMENT',
    items: [
      { key: 'pending' as TabKey, label: 'Pending', icon: Clock, hasBadge: true },
      { key: 'advisors' as TabKey, label: 'All Advisors', icon: UserCheck },
      { key: 'content' as TabKey, label: 'Content Manager', icon: Radio },
      { key: 'users' as TabKey, label: 'All Users', icon: Users },
      { key: 'payments' as TabKey, label: 'Payments', icon: CreditCard },
      { key: 'referrals' as TabKey, label: 'Referrals', icon: Gift },
    ],
  },
  {
    label: 'COMPLIANCE',
    items: [
      { key: 'legal' as TabKey, label: 'Legal Records', icon: FileText },
      { key: 'requests' as TabKey, label: 'Contact Requests', icon: Mail, hasBadge: true },
    ],
  },
];

const PAGE_TITLES: Record<TabKey, string> = {
  dashboard: 'Dashboard Overview',
  pending: 'Pending Approvals',
  advisors: 'All Advisors',
  content: 'Content Manager',
  users: 'All Users',
  payments: 'Payments',
  referrals: 'Referral Program',
  legal: 'Legal Records',
  requests: 'Deletion & Removal Requests',
};

function formatDate(d: string | null) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function AdminAvatar({ name, size = 44 }: { name: string; size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-full text-primary-foreground font-extrabold shrink-0"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))',
        fontSize: size * 0.4,
      }}
    >
      {(name || '?')[0].toUpperCase()}
    </div>
  );
}

export default function AdminDashboard() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>('dashboard');
  const [pendingAdvisors, setPendingAdvisors] = useState<Advisor[]>([]);
  const [allAdvisors, setAllAdvisors] = useState<Advisor[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [expandedAdvisor, setExpandedAdvisor] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [isVerifiedAdmin, setIsVerifiedAdmin] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [legalTab, setLegalTab] = useState<'advisor' | 'user'>('advisor');
  const [advisorLegal, setAdvisorLegal] = useState<any[]>([]);
  const [userLegal, setUserLegal] = useState<any[]>([]);
  const [legalSearch, setLegalSearch] = useState('');
  const [deletionRequests, setDeletionRequests] = useState<any[]>([]);
  const [editingAdvisorId, setEditingAdvisorId] = useState<string | null>(null);
  const [publicProfileForm, setPublicProfileForm] = useState({
    featured: false,
    sortOrder: 999,
    tagline: '',
    description: '',
    yearsExperience: '',
  });
  const [viewApplicationModalOpen, setViewApplicationModalOpen] = useState(false);
  const [selectedAdvisorForView, setSelectedAdvisorForView] = useState<Advisor | null>(null);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedAdvisorForReject, setSelectedAdvisorForReject] = useState<Advisor | null>(null);
  const [approvingAdvisorId, setApprovingAdvisorId] = useState<string | null>(null);
  const [rejectingAdvisorId, setRejectingAdvisorId] = useState<string | null>(null);

  // Create/Edit Advisor Modal
  const [createAdvisorModalOpen, setCreateAdvisorModalOpen] = useState(false);
  const [editingAdvisorModal, setEditingAdvisorModal] = useState<Advisor | null>(null);
  const [advisorFormData, setAdvisorFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    sebi_reg_no: '',
    strategy_type: 'Options' as 'Options' | 'Equity' | 'Futures' | 'All',
    bio: '',
  });
  const [savingAdvisor, setSavingAdvisor] = useState(false);
  const [deletingAdvisorId, setDeletingAdvisorId] = useState<string | null>(null);

  // Deletion Request Review Modal
  const [deletionRequestModalOpen, setDeletionRequestModalOpen] = useState(false);
  const [selectedDeletionRequest, setSelectedDeletionRequest] = useState<any | null>(null);

  // Content Manager state
  const [contentAdvisorId, setContentAdvisorId] = useState<string | null>(null);
  const [contentSignals, setContentSignals] = useState<any[]>([]);
  const [contentGroups, setContentGroups] = useState<any[]>([]);
  const [loadingContent, setLoadingContent] = useState(false);
  const [deletingSignalId, setDeletingSignalId] = useState<string | null>(null);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);

  const fetchAdvisorContent = async (advisorId: string) => {
    setContentAdvisorId(advisorId);
    setLoadingContent(true);
    const [sigs, grps] = await Promise.all([
      supabase.from('signals').select('*').eq('advisor_id', advisorId).order('created_at', { ascending: false }).limit(50),
      supabase.from('groups').select('*').eq('advisor_id', advisorId),
    ]);
    setContentSignals(sigs.data || []);
    setContentGroups(grps.data || []);
    setLoadingContent(false);
  };

  const adminDeleteSignal = async (signalId: string) => {
    setDeletingSignalId(signalId);
    const { error } = await supabase.from('signals').delete().eq('id', signalId);
    if (error) toast.error('Failed to delete post: ' + error.message);
    else { toast.success('Post deleted'); setContentSignals(prev => prev.filter(s => s.id !== signalId)); }
    setDeletingSignalId(null);
  };

  const adminDeleteGroup = async (groupId: string) => {
    setDeletingGroupId(groupId);
    // First delete signals in that group
    await supabase.from('signals').delete().eq('group_id', groupId);
    const { error } = await supabase.from('groups').delete().eq('id', groupId);
    if (error) toast.error('Failed to delete group: ' + error.message);
    else { toast.success('Group deleted'); setContentGroups(prev => prev.filter(g => g.id !== groupId)); setContentSignals(prev => prev.filter(s => s.group_id !== groupId)); }
    setDeletingGroupId(null);
  };

  const handleApproveDeletionRequest = async (reqId: string) => {
    const { error } = await supabase.from('deletion_requests').update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: user!.id }).eq('id', reqId);
    if (error) toast.error('Failed to approve request');
    else { toast.success('Request approved'); fetchData(); setDeletionRequestModalOpen(false); }
  };

  const handleRejectDeletionRequest = async (reqId: string) => {
    const { error } = await supabase.from('deletion_requests').update({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: user!.id }).eq('id', reqId);
    if (error) toast.error('Failed to reject request');
    else { toast.success('Request rejected'); fetchData(); setDeletionRequestModalOpen(false); }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login', { replace: true }); return; }
    const verifyAdmin = async () => {
      const { data, error } = await supabase.from('profiles').select('role').eq('id', user.id).single();
      if (error || data?.role !== 'admin') { setIsVerifiedAdmin(false); setVerifying(false); return; }
      setIsVerifiedAdmin(true); setVerifying(false);
    };
    verifyAdmin();
  }, [user, authLoading, navigate]);

  useEffect(() => { if (isVerifiedAdmin) fetchData(); }, [isVerifiedAdmin]);

  const fetchData = async () => {
    const [pending, all, usersData, paymentsData] = await Promise.all([
      supabase.from('advisors').select('*').eq('status', 'pending').order('created_at', { ascending: false }),
      supabase.from('advisors').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('subscriptions').select('*, profiles!inner(full_name), advisors!inner(full_name), groups!inner(name)').order('created_at', { ascending: false }),
    ]);
    setPendingAdvisors(pending.data || []);
    setAllAdvisors(all.data || []);
    setUsers(usersData.data || []);
    setPayments(paymentsData.data || []);

    const [advLegal, usrLegal] = await Promise.all([
      supabase.from('advisor_legal_acceptances').select('*').order('form_submitted_at', { ascending: false }),
      supabase.from('user_legal_acceptances').select('*').order('accepted_at', { ascending: false }),
    ]);
    setAdvisorLegal(advLegal.data || []);
    setUserLegal(usrLegal.data || []);

    const { data: delReqs } = await supabase.from('deletion_requests').select('*').order('created_at', { ascending: false });
    setDeletionRequests(delReqs || []);
    setLoading(false);
  };

  const approveAdvisor = async (advisor: Advisor) => {
    setApprovingAdvisorId(advisor.id);
    try {
      // Update advisor status
      const { error: advisorError } = await supabase
        .from('advisors')
        .update({ status: 'approved' })
        .eq('id', advisor.id);

      if (advisorError) throw advisorError;

      // Update profile role to advisor
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role: 'advisor' })
        .eq('id', advisor.user_id);

      if (profileError) throw profileError;

      // Send approval email via edge function
      try {
        const { data: session } = await supabase.auth.getSession();
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-advisor-approval-email`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.session?.access_token}`,
            },
            body: JSON.stringify({
              advisor_id: advisor.id,
              email: advisor.email,
              full_name: advisor.full_name,
            }),
          }
        );

        if (!response.ok) {
          console.warn('Email notification failed, but approval succeeded');
        }
      } catch (emailErr) {
        console.warn('Could not send approval email:', emailErr);
      }

      toast.success(`${advisor.full_name} approved! Email sent.`);
      fetchData();
    } catch (err) {
      toast.error((err as Error).message || 'Failed to approve advisor');
      console.error(err);
    } finally {
      setApprovingAdvisorId(null);
    }
  };

  const rejectAdvisor = async (advisor: Advisor, reason: string) => {
    setRejectingAdvisorId(advisor.id);
    try {
      // Update advisor status with rejection reason
      const { error: advisorError } = await supabase
        .from('advisors')
        .update({ 
          status: 'rejected',
          rejection_reason: reason,
        })
        .eq('id', advisor.id);

      if (advisorError) throw advisorError;

      // Send rejection email via edge function
      try {
        const { data: session } = await supabase.auth.getSession();
        await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-advisor-rejection-email`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.session?.access_token}`,
            },
            body: JSON.stringify({
              advisor_id: advisor.id,
              email: advisor.email,
              full_name: advisor.full_name,
              rejection_reason: reason,
            }),
          }
        );
      } catch (emailErr) {
        console.warn('Could not send rejection email:', emailErr);
      }

      toast.success(`${advisor.full_name} rejected. Email sent with reason.`);
      fetchData();
    } catch (err) {
      toast.error((err as Error).message || 'Failed to reject advisor');
      console.error(err);
    } finally {
      setRejectingAdvisorId(null);
    }
  };

  const suspendAdvisor = async (advisor: Advisor) => {
    try {
      const [a, p] = await Promise.all([
        supabase.from('advisors').update({ status: 'suspended' }).eq('id', advisor.id),
        supabase.from('profiles').update({ role: 'trader' }).eq('id', advisor.user_id),
      ]);
      if (a.error || p.error) throw new Error('Failed to suspend');
      toast.success('Advisor suspended');
      fetchData();
    } catch (err) {
      toast.error((err as Error).message || 'Failed to suspend advisor');
    }
  };

  const deleteAdvisor = async (advisor: Advisor) => {
    setDeletingAdvisorId(advisor.id);
    try {
      const { error: delError } = await supabase.from('advisors').delete().eq('id', advisor.id);
      if (delError) throw delError;
      toast.success(`${advisor.full_name} deleted successfully`);
      fetchData();
    } catch (err) {
      toast.error((err as Error).message || 'Failed to delete advisor');
    } finally {
      setDeletingAdvisorId(null);
    }
  };

  const openCreateAdvisorModal = () => {
    setAdvisorFormData({
      full_name: '',
      email: '',
      phone: '',
      sebi_reg_no: '',
      strategy_type: 'Options',
      bio: '',
    });
    setEditingAdvisorModal(null);
    setCreateAdvisorModalOpen(true);
  };

  const openEditAdvisorModal = (advisor: Advisor) => {
    setAdvisorFormData({
      full_name: advisor.full_name || '',
      email: advisor.email || '',
      phone: advisor.phone || '',
      sebi_reg_no: advisor.sebi_reg_no || '',
      strategy_type: (advisor.strategy_type as any) || 'Options',
      bio: advisor.bio || '',
    });
    setEditingAdvisorModal(advisor);
    setCreateAdvisorModalOpen(true);
  };

  const saveAdvisor = async () => {
    if (!advisorFormData.full_name.trim() || !advisorFormData.email.trim() || !advisorFormData.sebi_reg_no.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSavingAdvisor(true);
    try {
      if (editingAdvisorModal) {
        // Update existing advisor
        const { error } = await supabase
          .from('advisors')
          .update({
            full_name: advisorFormData.full_name,
            email: advisorFormData.email,
            phone: advisorFormData.phone,
            sebi_reg_no: advisorFormData.sebi_reg_no,
            strategy_type: advisorFormData.strategy_type,
            bio: advisorFormData.bio,
          })
          .eq('id', editingAdvisorModal.id);

        if (error) throw error;
        toast.success('Advisor updated successfully');
      } else {
        // Create new advisor (without user account - admin creation)
        // First, create a dummy profile for the advisor
        const tempUser = `advisor-${Math.random().toString(36).substr(2, 9)}@system.local`;
        
        // For now, we'll insert into advisors table with a placeholder user_id
        // In production, you'd want a proper user account creation flow
        const tempUserId = 'temp-' + Math.random().toString(36).substr(2, 9);
        
        const { error, data } = await supabase
          .from('advisors')
          .insert({
            full_name: advisorFormData.full_name,
            email: advisorFormData.email,
            phone: advisorFormData.phone,
            sebi_reg_no: advisorFormData.sebi_reg_no,
            strategy_type: advisorFormData.strategy_type,
            bio: advisorFormData.bio,
            status: 'pending', // New advisors start as pending
            user_id: user!.id, // Temporary: use admin's ID (should be fixed in production)
          })
          .select();

        if (error) throw error;
        toast.success('Advisor created successfully - set to pending approval');
      }
      setCreateAdvisorModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error((err as Error).message || 'Failed to save advisor');
      console.error(err);
    } finally {
      setSavingAdvisor(false);
    }
  };

  const startPublicProfileEdit = async (advisor: Advisor) => {
    const a = advisor as any;
    setEditingAdvisorId(advisor.id);
    setPublicProfileForm({
      featured: !!a.is_public_featured,
      sortOrder: Number(a.public_sort_order ?? 999),
      tagline: a.public_tagline || '',
      description: a.public_description || '',
      yearsExperience: a.public_years_experience ? String(a.public_years_experience) : '',
    });
  };

  const savePublicProfile = async (advisorId: string) => {
    const payload = {
      is_public_featured: publicProfileForm.featured,
      public_sort_order: Number(publicProfileForm.sortOrder) || 999,
      public_tagline: publicProfileForm.tagline.trim() || null,
      public_description: publicProfileForm.description.trim() || null,
      public_years_experience: publicProfileForm.yearsExperience ? Number(publicProfileForm.yearsExperience) : null,
    };
    const { error } = await (supabase.from('advisors') as any).update(payload).eq('id', advisorId);
    if (error) {
      toast.error('Failed to save public advisor profile');
      return;
    }
    toast.success('Public advisor profile saved');
    setEditingAdvisorId(null);
    fetchData();
  };

  const exportCsv = (data: any[], filename: string) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const csv = [headers.join(','), ...data.map(row => headers.map(h => `"${(row[h] ?? '').toString().replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${filename}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // Loading / Auth states
  if (authLoading || verifying) return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );

  if (!isVerifiedAdmin) return (
    <div className="min-h-screen flex items-center justify-center bg-muted px-4">
      <div className="bg-card rounded-2xl border border-border p-8 text-center max-w-md shadow-lg">
        <ShieldAlert className="mx-auto h-16 w-16 text-destructive" />
        <h2 className="mt-4 text-xl font-bold text-destructive">Access Denied</h2>
        <p className="mt-2 text-sm text-muted-foreground">You do not have permission to access this page.</p>
        <Button className="mt-6" variant="outline" onClick={() => navigate('/')}>Go Home</Button>
      </div>
    </div>
  );

  const totalRevenue = payments.reduce((sum, p) => sum + (p.amount_paid || 0), 0);
  const approvedCount = allAdvisors.filter(a => a.status === 'approved').length;
  const pendingRequestCount = deletionRequests.filter(r => r.status === 'pending').length;
  const activeSubCount = payments.filter(p => p.status === 'active').length;

  const filteredAdvisorLegal = advisorLegal.filter((r: any) =>
    !legalSearch || r.full_name?.toLowerCase().includes(legalSearch.toLowerCase()) || r.sebi_reg_no?.toLowerCase().includes(legalSearch.toLowerCase())
  );
  const filteredUserLegal = userLegal.filter((r: any) =>
    !legalSearch || r.full_name?.toLowerCase().includes(legalSearch.toLowerCase()) || r.email?.toLowerCase().includes(legalSearch.toLowerCase())
  );

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Build recent activity from real data
  const recentActivity: { icon: typeof Users; iconBg: string; iconColor: string; text: string; detail: string; time: string }[] = [];
  users.slice(0, 2).forEach(u => {
    recentActivity.push({
      icon: Users, iconBg: 'bg-[hsl(213,100%,94%)]', iconColor: 'text-secondary',
      text: 'New user registered', detail: u.full_name || u.email || 'Unknown', time: formatDate(u.created_at),
    });
  });
  payments.slice(0, 2).forEach(p => {
    recentActivity.push({
      icon: CreditCard, iconBg: 'bg-[hsl(var(--light-green))]', iconColor: 'text-primary',
      text: 'New subscription', detail: `₹${(p.amount_paid || 0).toLocaleString('en-IN')}`, time: formatDate(p.created_at),
    });
  });
  pendingAdvisors.slice(0, 1).forEach(a => {
    recentActivity.push({
      icon: UserPlus, iconBg: 'bg-[hsl(var(--light-green))]', iconColor: 'text-primary',
      text: 'New advisor application', detail: a.full_name, time: formatDate(a.created_at),
    });
  });

  const quickActions = [
    { icon: UserPlus, label: 'Add Advisor', onClick: () => setTab('pending') },
    { icon: Mail, label: 'View Contacts', onClick: () => setTab('requests') },
    { icon: FileText, label: 'Legal Records', onClick: () => setTab('legal') },
    { icon: BarChart3, label: 'Revenue Report', onClick: () => setTab('payments') },
  ];

  // Status pill helper
  const statusPill = (status: string) => {
    if (status === 'approved' || status === 'active') return 'bg-[hsl(var(--light-green))] text-primary';
    if (status === 'pending') return 'bg-muted text-muted-foreground';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <div className="flex min-h-screen" style={{ background: '#F0F2F5' }}>
      {/* ===== SIDEBAR ===== */}
      <aside className="w-[240px] min-w-[240px] bg-foreground sticky top-0 h-screen flex flex-col overflow-y-auto">
        {/* Logo */}
        <div className="px-5 py-6 border-b border-white/[0.08]">
          <div className="text-[20px] font-extrabold text-white">
            Trade<span style={{ color: '#69F0AE' }}>Circle</span>
          </div>
          <div className="text-[10px] text-white/40 tracking-[3px] uppercase mt-1">Admin Console</div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4">
          {NAV_SECTIONS.map(section => (
            <div key={section.label} className="mb-4">
              <div className="text-[10px] text-white/30 tracking-[2px] uppercase px-2 mb-1.5">{section.label}</div>
              {section.items.map(item => {
                const isActive = tab === item.key;
                const badgeCount = item.key === 'pending' ? pendingAdvisors.length :
                  item.key === 'requests' ? pendingRequestCount : 0;
                return (
                  <button
                    key={item.key}
                    onClick={() => setTab(item.key)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-[13px] font-medium mb-0.5 transition-all duration-150 cursor-pointer ${
                      isActive
                        ? 'bg-white/10 text-white font-semibold border-l-[3px]'
                        : 'text-white/60 hover:bg-white/[0.06] hover:text-white/90 border-l-[3px] border-transparent'
                    }`}
                    style={isActive ? { borderLeftColor: '#69F0AE' } : {}}
                  >
                    <item.icon size={18} />
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.hasBadge && badgeCount > 0 && (
                      <span className="w-5 h-5 rounded-full bg-destructive text-white text-[10px] font-bold flex items-center justify-center">
                        {badgeCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Go to Website */}
        <div className="px-3 pb-2">
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-[13px] font-medium text-white/60 hover:bg-white/[0.06] hover:text-white/90 transition-all duration-150 cursor-pointer"
          >
            <ExternalLink size={18} />
            <span>Go to Website</span>
          </button>
        </div>

        {/* Admin profile */}
        <div className="px-3 py-4 border-t border-white/[0.08]">
          <div className="flex items-center gap-3">
            <AdminAvatar name={profile?.full_name || 'A'} size={36} />
            <div className="min-w-0">
              <div className="text-[13px] font-bold text-white truncate">{profile?.full_name || 'Admin'}</div>
              <div className="text-[11px] text-white/40">Super Admin</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <main className="flex-1 overflow-y-auto p-7">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[24px] font-extrabold text-foreground">{PAGE_TITLES[tab]}</h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">{today}</p>
          </div>
          <div className="flex items-center gap-1.5 bg-[hsl(var(--light-green))] border border-primary rounded-full px-4 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span className="text-[13px] text-primary font-semibold">Platform Live</span>
          </div>
        </div>

        {loading && <div className="py-20 text-center text-muted-foreground">Loading data...</div>}

        {/* ===== DASHBOARD TAB ===== */}
        {tab === 'dashboard' && !loading && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              {/* Pending */}
              <div className="bg-card rounded-2xl p-5 border border-border border-l-4 border-l-[hsl(var(--warning))] shadow-sm cursor-pointer" onClick={() => setTab('pending')}>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-muted-foreground font-semibold">Pending Approvals</span>
                  <Clock size={18} className="text-[hsl(var(--warning))]" />
                </div>
                <p className="text-[40px] font-black text-foreground tracking-tight mt-2 leading-none">{pendingAdvisors.length}</p>
                <p className="text-[11px] text-[hsl(var(--warning))] mt-2 flex items-center gap-1">
                  Needs review today <ChevronRight size={12} />
                </p>
              </div>

              {/* Approved */}
              <div className="bg-card rounded-2xl p-5 border border-border border-l-4 border-l-primary shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-muted-foreground font-semibold">Approved Advisors</span>
                  <UserCheck size={18} className="text-primary" />
                </div>
                <p className="text-[40px] font-black text-foreground tracking-tight mt-2 leading-none">{approvedCount}</p>
                <p className="text-[11px] text-primary mt-2">Active on platform</p>
              </div>

              {/* Users */}
              <div className="bg-card rounded-2xl p-5 border border-border border-l-4 border-l-secondary shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-muted-foreground font-semibold">Total Users</span>
                  <Users size={18} className="text-secondary" />
                </div>
                <p className="text-[40px] font-black text-foreground tracking-tight mt-2 leading-none">{users.length}</p>
                <p className="text-[11px] text-secondary mt-2">Registered traders</p>
              </div>

              {/* Revenue */}
              <div className="rounded-2xl p-5 shadow-lg relative overflow-hidden text-white" style={{ background: 'linear-gradient(135deg, hsl(214,89%,34%), hsl(214,72%,42%))' }}>
                <span className="absolute -right-2 -bottom-4 text-[100px] font-black opacity-[0.06] leading-none select-none">₹</span>
                <div className="flex items-center justify-between relative z-10">
                  <span className="text-[12px] text-white/70 font-semibold">Total Revenue</span>
                  <IndianRupee size={18} className="text-white" />
                </div>
                <p className="text-[36px] font-black tracking-tight mt-2 leading-none relative z-10">₹{totalRevenue.toLocaleString('en-IN')}</p>
                <p className="text-[11px] text-white/60 mt-2 relative z-10">Platform commission earned</p>
              </div>
            </div>

            {/* Main content grid */}
            <div className="grid grid-cols-[1fr_380px] gap-5">
              {/* Left column */}
              <div className="space-y-5">
                {/* Pending Approvals Card */}
                <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between px-5 py-4 bg-muted border-b border-border">
                    <span className="text-[15px] font-bold text-foreground">⏳ Pending Approvals</span>
                    <span className="bg-[hsl(45,100%,94%)] border border-[hsl(var(--warning))] rounded-full px-2.5 py-0.5 text-[12px] font-semibold text-foreground">
                      {pendingAdvisors.length} waiting
                    </span>
                  </div>
                  {pendingAdvisors.length === 0 ? (
                    <div className="py-10 text-center">
                      <CheckCircle size={32} className="mx-auto text-primary" />
                      <p className="text-[14px] text-muted-foreground mt-2">All caught up!</p>
                    </div>
                  ) : (
                    pendingAdvisors.map(a => (
                      <div key={a.id} className="px-5 py-4 border-b border-muted last:border-0 flex items-center gap-3.5">
                        <AdminAvatar name={a.full_name} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] font-bold text-foreground capitalize">{a.full_name}</p>
                          <p className="text-[12px] text-muted-foreground">SEBI: {a.sebi_reg_no}</p>
                          <p className="text-[11px] text-muted-foreground">Applied {formatDate(a.created_at)}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg px-4 text-[13px] font-semibold" onClick={() => approveAdvisor(a)} disabled={approvingAdvisorId === a.id}>
                            {approvingAdvisorId === a.id ? 'Approving...' : 'Approve'}
                          </Button>
                          <Button size="sm" variant="outline" className="rounded-lg px-4 text-[13px] font-semibold" onClick={() => { setSelectedAdvisorForView(a); setViewApplicationModalOpen(true); }}>View Application</Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Recent Activity */}
                <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                  <div className="px-5 py-4 border-b border-border">
                    <span className="text-[15px] font-bold text-foreground">Recent Activity</span>
                  </div>
                  {recentActivity.length === 0 ? (
                    <div className="py-10 text-center text-muted-foreground text-[13px]">No recent activity</div>
                  ) : (
                    recentActivity.slice(0, 5).map((act, i) => (
                      <div key={i} className="px-5 py-3 border-b border-muted last:border-0 flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${act.iconBg}`}>
                          <act.icon size={14} className={act.iconColor} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-foreground">{act.text}</p>
                          <p className="text-[12px] text-muted-foreground truncate">{act.detail}</p>
                        </div>
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap">{act.time}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right column */}
              <div className="space-y-5">
                {/* Platform Health */}
                <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
                  <h3 className="text-[15px] font-bold text-foreground mb-4">Platform Health</h3>
                  {[
                    { label: 'Advisor Approval Rate', value: allAdvisors.length ? `${Math.round((approvedCount / allAdvisors.length) * 100)}%` : '0%', pct: allAdvisors.length ? (approvedCount / allAdvisors.length) * 100 : 0, color: 'bg-primary' },
                    { label: 'Active Subscriptions', value: `${activeSubCount} / ${users.length} users`, pct: users.length ? (activeSubCount / users.length) * 100 : 0, color: 'bg-primary' },
                    { label: 'Signal Activity', value: `${allAdvisors.length} advisors`, pct: 40, color: 'bg-secondary' },
                    { label: 'Revenue This Month', value: `₹${totalRevenue.toLocaleString('en-IN')}`, pct: 75, color: 'bg-primary' },
                  ].map((m, i) => (
                    <div key={i} className="mb-3.5 last:mb-0">
                      <div className="flex justify-between mb-1">
                        <span className="text-[12px] text-muted-foreground">{m.label}</span>
                        <span className="text-[12px] font-bold text-foreground">{m.value}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${m.color}`} style={{ width: `${Math.min(m.pct, 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Quick Actions */}
                <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
                  <h3 className="text-[15px] font-bold text-foreground mb-3.5">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    {quickActions.map((qa, i) => (
                      <button
                        key={i}
                        onClick={qa.onClick}
                        className="bg-muted border border-border rounded-xl p-3.5 text-center cursor-pointer transition-all hover:bg-[hsl(var(--light-green))] hover:border-primary group"
                      >
                        <qa.icon size={24} className="mx-auto text-primary" />
                        <span className="text-[12px] font-semibold text-foreground mt-1.5 block">{qa.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* System Info */}
                <div className="bg-foreground rounded-2xl p-5 text-white">
                  <h3 className="text-[14px] font-bold text-white/80 mb-3.5">System Info</h3>
                  {[
                    { label: 'Platform', value: 'StockCircle v1.0' },
                    { label: 'Operator', value: 'STREZONIC PVT LTD' },
                    { label: 'CIN', value: 'U62099MH2025PTC453360' },
                  ].map((row, i) => (
                    <div key={i} className="flex justify-between mb-2.5">
                      <span className="text-[11px] text-white/40">{row.label}</span>
                      <span className="text-[12px] font-semibold">{row.value}</span>
                    </div>
                  ))}
                  <div className="flex justify-between">
                    <span className="text-[11px] text-white/40">Environment</span>
                    <span className="text-[12px] font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#69F0AE] inline-block" />
                      Production
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ===== PENDING TAB ===== */}
        {tab === 'pending' && !loading && (
          <div className="space-y-4">
            {pendingAdvisors.length === 0 && (
              <div className="bg-card rounded-2xl border border-border p-12 text-center shadow-sm">
                <CheckCircle size={40} className="mx-auto text-primary" />
                <p className="text-[16px] font-bold text-foreground mt-3">All caught up!</p>
                <p className="text-[13px] text-muted-foreground mt-1">No pending applications</p>
              </div>
            )}
            {pendingAdvisors.map(a => (
              <div key={a.id} className="bg-card rounded-2xl border border-border p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AdminAvatar name={a.full_name} />
                    <div>
                      <p className="text-[16px] font-bold text-foreground capitalize">{a.full_name}</p>
                      <p className="text-[13px] text-muted-foreground">SEBI: {a.sebi_reg_no} • Applied: {formatDate(a.created_at)}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-lg" onClick={() => { setSelectedAdvisorForView(a); setViewApplicationModalOpen(true); }}>
                    View Application
                  </Button>
                </div>
                {expandedAdvisor === a.id && (
                  <div className="mt-4 space-y-4 border-t border-border pt-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        { label: 'Email', value: a.email },
                        { label: 'Phone', value: a.phone || '-' },
                        { label: 'Aadhaar No', value: a.aadhaar_no ? `••••••••${a.aadhaar_no.slice(-4)}` : '-' },
                        { label: 'PAN No', value: a.pan_no || '-' },
                        { label: 'Strategy', value: a.strategy_type || '-' },
                        { label: 'Address', value: a.address || '-' },
                      ].map(item => (
                        <div key={item.label} className="rounded-xl bg-muted p-3">
                          <p className="text-[11px] text-muted-foreground font-semibold uppercase">{item.label}</p>
                          <p className="font-medium text-[14px] text-foreground mt-0.5">{item.value}</p>
                        </div>
                      ))}
                    </div>
                    {a.bio && <div className="rounded-xl bg-muted p-3"><p className="text-[11px] text-muted-foreground font-semibold uppercase">Bio</p><p className="text-[14px] text-foreground mt-0.5">{a.bio}</p></div>}
                    <div className="flex gap-2 items-end flex-wrap">
                      <Button onClick={() => approveAdvisor(a)} className="bg-primary hover:bg-primary/90 font-semibold rounded-lg" disabled={approvingAdvisorId === a.id}>
                        {approvingAdvisorId === a.id ? 'Approving...' : '✓ Approve'}
                      </Button>
                      <Button variant="destructive" className="font-semibold rounded-lg" onClick={() => { setSelectedAdvisorForReject(a); setRejectModalOpen(true); }} disabled={rejectingAdvisorId === a.id}>
                        {rejectingAdvisorId === a.id ? 'Rejecting...' : '✕ Reject'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ===== ADVISORS TAB ===== */}
        {tab === 'advisors' && !loading && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-[15px] font-bold text-foreground">All Advisors ({allAdvisors.length})</h3>
              <Button onClick={openCreateAdvisorModal} className="gap-2 bg-primary hover:bg-primary/90 rounded-lg">
                <UserPlus size={16} /> Create New Advisor
              </Button>
            </div>
            <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
              <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted border-b border-border text-left">
                  <th className="p-4 text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Name</th>
                  <th className="p-4 text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">SEBI No</th>
                  <th className="p-4 text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Strategy</th>
                  <th className="p-4 text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="p-4 text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Public Page</th>
                  <th className="p-4 text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {allAdvisors.map((a, i) => (
                  <Fragment key={a.id}>
                    <tr key={`${a.id}-row`} className={`border-b border-muted ${i % 2 === 1 ? 'bg-muted/50' : ''}`}>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <AdminAvatar name={a.full_name} size={32} />
                          <span className="font-semibold text-foreground capitalize">{a.full_name}</span>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-[12px] text-muted-foreground">{a.sebi_reg_no}</td>
                      <td className="p-4"><span className="bg-[hsl(var(--light-blue))] text-secondary px-2.5 py-1 rounded-full text-[12px] font-semibold">{a.strategy_type || '-'}</span></td>
                      <td className="p-4"><span className={`px-2.5 py-1 rounded-full text-[12px] font-semibold ${statusPill(a.status || '')}`}>{a.status}</span></td>
                      <td className="p-4">
                        {a.status === 'approved' ? (
                          <div className="space-y-1">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              (a as any).is_public_featured ? 'bg-[hsl(var(--light-green))] text-primary' : 'bg-muted text-muted-foreground'
                            }`}>
                              {(a as any).is_public_featured ? 'Published' : 'Hidden'}
                            </span>
                            <p className="text-[11px] text-muted-foreground">Order {(a as any).public_sort_order ?? 999}</p>
                          </div>
                        ) : (
                          <span className="text-[12px] text-muted-foreground">Approve first</span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2 flex-wrap">
                          {a.status === 'approved' && (
                            <>
                              <Button variant="outline" size="sm" className="rounded-lg text-[12px]" onClick={() => startPublicProfileEdit(a)}>
                                Edit Public Page
                              </Button>
                              <Button variant="outline" size="sm" className="rounded-lg text-[12px]" asChild>
                                <Link to={`/advisor/${a.id}`} target="_blank">Preview</Link>
                              </Button>
                              <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10 rounded-lg text-[12px]" onClick={() => suspendAdvisor(a)}>
                                Suspend
                              </Button>
                            </>
                          )}
                          <Button variant="outline" size="sm" className="rounded-lg text-[12px]" onClick={() => openEditAdvisorModal(a)}>
                            Edit Details
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-destructive border-destructive/30 hover:bg-destructive/10 rounded-lg text-[12px]" 
                            onClick={() => deleteAdvisor(a)}
                            disabled={deletingAdvisorId === a.id}
                          >
                            {deletingAdvisorId === a.id ? 'Deleting...' : 'Delete'}
                          </Button>
                        </div>
                      </td>
                    </tr>,
                    {editingAdvisorId === a.id && (
                      <tr key={`${a.id}-editor`} className="border-b border-muted bg-background">
                        <td colSpan={6} className="p-4">
                          <div className="rounded-xl border border-border bg-card p-4">
                            <h4 className="text-sm font-bold text-foreground">Public Advisor Page Template</h4>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Fill this once and advisor frame will auto-show on landing. Full profile page already uses advisor details and groups automatically.
                            </p>
                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                              <label className="rounded-lg border border-border bg-muted/40 p-3">
                                <p className="text-[11px] font-semibold text-muted-foreground">Show on Landing Frames</p>
                                <div className="mt-2 flex gap-2">
                                  <Button type="button" size="sm" variant={publicProfileForm.featured ? 'default' : 'outline'} onClick={() => setPublicProfileForm(prev => ({ ...prev, featured: true }))}>Yes</Button>
                                  <Button type="button" size="sm" variant={!publicProfileForm.featured ? 'default' : 'outline'} onClick={() => setPublicProfileForm(prev => ({ ...prev, featured: false }))}>No</Button>
                                </div>
                              </label>
                              <label className="rounded-lg border border-border bg-muted/40 p-3">
                                <p className="text-[11px] font-semibold text-muted-foreground">Frame Sort Order</p>
                                <Input
                                  type="number"
                                  value={publicProfileForm.sortOrder}
                                  onChange={(e) => setPublicProfileForm(prev => ({ ...prev, sortOrder: Number(e.target.value) || 999 }))}
                                  className="mt-2"
                                />
                              </label>
                              <label className="rounded-lg border border-border bg-muted/40 p-3 md:col-span-2">
                                <p className="text-[11px] font-semibold text-muted-foreground">Card Tagline (minimal home version)</p>
                                <Input
                                  placeholder="Options specialist with disciplined risk-first approach"
                                  value={publicProfileForm.tagline}
                                  onChange={(e) => setPublicProfileForm(prev => ({ ...prev, tagline: e.target.value }))}
                                  className="mt-2"
                                />
                              </label>
                              <label className="rounded-lg border border-border bg-muted/40 p-3 md:col-span-2">
                                <p className="text-[11px] font-semibold text-muted-foreground">Public Description</p>
                                <Textarea
                                  placeholder="Write advisor intro for public profile card and detail context..."
                                  value={publicProfileForm.description}
                                  onChange={(e) => setPublicProfileForm(prev => ({ ...prev, description: e.target.value }))}
                                  className="mt-2 min-h-[110px]"
                                />
                              </label>
                              <label className="rounded-lg border border-border bg-muted/40 p-3">
                                <p className="text-[11px] font-semibold text-muted-foreground">Years of Experience</p>
                                <Input
                                  type="number"
                                  placeholder="7"
                                  value={publicProfileForm.yearsExperience}
                                  onChange={(e) => setPublicProfileForm(prev => ({ ...prev, yearsExperience: e.target.value }))}
                                  className="mt-2"
                                />
                              </label>
                            </div>
                            <div className="mt-4 flex items-center gap-2">
                              <Button onClick={() => savePublicProfile(a.id)}>Save Public Page</Button>
                              <Button variant="outline" onClick={() => setEditingAdvisorId(null)}>Cancel</Button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {/* ===== CREATE/EDIT ADVISOR MODAL ===== */}
        {createAdvisorModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-2xl border border-border p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold text-foreground mb-4">
                {editingAdvisorModal ? 'Edit Advisor Details' : 'Create New Advisor'}
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <label>
                    <p className="text-sm font-semibold text-muted-foreground mb-1">Full Name *</p>
                    <Input
                      placeholder="Advisor Name"
                      value={advisorFormData.full_name}
                      onChange={(e) => setAdvisorFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    />
                  </label>
                  <label>
                    <p className="text-sm font-semibold text-muted-foreground mb-1">Email *</p>
                    <Input
                      type="email"
                      placeholder="advisor@example.com"
                      value={advisorFormData.email}
                      onChange={(e) => setAdvisorFormData(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </label>
                  <label>
                    <p className="text-sm font-semibold text-muted-foreground mb-1">Phone</p>
                    <Input
                      type="tel"
                      placeholder="+91 XXXXX XXXXX"
                      value={advisorFormData.phone}
                      onChange={(e) => setAdvisorFormData(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </label>
                  <label>
                    <p className="text-sm font-semibold text-muted-foreground mb-1">SEBI Registration No *</p>
                    <Input
                      placeholder="SEBI/RIA/XXXXXX"
                      value={advisorFormData.sebi_reg_no}
                      onChange={(e) => setAdvisorFormData(prev => ({ ...prev, sebi_reg_no: e.target.value }))}
                    />
                  </label>
                  <label>
                    <p className="text-sm font-semibold text-muted-foreground mb-1">Strategy Type</p>
                    <select 
                      value={advisorFormData.strategy_type}
                      onChange={(e) => setAdvisorFormData(prev => ({ ...prev, strategy_type: e.target.value as any }))}
                      className="w-full border border-border rounded-lg px-3 py-2 bg-background text-foreground"
                    >
                      <option value="Options">Options</option>
                      <option value="Equity">Equity</option>
                      <option value="Futures">Futures</option>
                      <option value="All">All</option>
                    </select>
                  </label>
                </div>
                <label>
                  <p className="text-sm font-semibold text-muted-foreground mb-1">Bio</p>
                  <Textarea
                    placeholder="Brief biography..."
                    value={advisorFormData.bio}
                    onChange={(e) => setAdvisorFormData(prev => ({ ...prev, bio: e.target.value }))}
                    className="min-h-[100px]"
                  />
                </label>
              </div>
              <div className="mt-6 flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setCreateAdvisorModalOpen(false)} disabled={savingAdvisor}>
                  Cancel
                </Button>
                <Button onClick={saveAdvisor} disabled={savingAdvisor} className="bg-primary hover:bg-primary/90">
                  {savingAdvisor ? 'Saving...' : (editingAdvisorModal ? 'Update Advisor' : 'Create Advisor')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ===== CONTENT MANAGER TAB ===== */}
        {tab === 'content' && !loading && (
          <div className="space-y-4">
            <p className="text-[13px] text-muted-foreground">Select an advisor to manage their posts and groups. Only admins can delete advisor content.</p>
            <div className="flex flex-wrap gap-2">
              {allAdvisors.filter(a => a.status === 'approved').map(a => (
                <Button
                  key={a.id}
                  variant={contentAdvisorId === a.id ? 'default' : 'outline'}
                  size="sm"
                  className="rounded-lg"
                  onClick={() => fetchAdvisorContent(a.id)}
                >
                  {a.full_name}
                </Button>
              ))}
            </div>

            {loadingContent && <div className="py-10 text-center text-muted-foreground">Loading content...</div>}

            {contentAdvisorId && !loadingContent && (
              <div className="space-y-6">
                {/* Groups */}
                <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                  <div className="px-5 py-4 bg-muted border-b border-border flex items-center justify-between">
                    <span className="text-[15px] font-bold text-foreground">Groups ({contentGroups.length})</span>
                  </div>
                  {contentGroups.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">No groups</div>
                  ) : (
                    contentGroups.map(g => (
                      <div key={g.id} className="px-5 py-3 border-b border-muted last:border-0 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-foreground">{g.name}</p>
                          <p className="text-xs text-muted-foreground">₹{g.monthly_price}/mo · {g.is_active ? 'Active' : 'Inactive'}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive border-destructive/30 hover:bg-destructive/10 rounded-lg text-[12px] gap-1"
                          onClick={() => { if (confirm(`Delete group "${g.name}" and all its signals? This cannot be undone.`)) adminDeleteGroup(g.id); }}
                          disabled={deletingGroupId === g.id}
                        >
                          <Trash2 size={12} /> {deletingGroupId === g.id ? 'Deleting...' : 'Delete Group'}
                        </Button>
                      </div>
                    ))
                  )}
                </div>

                {/* Signals/Posts */}
                <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
                  <div className="px-5 py-4 bg-muted border-b border-border">
                    <span className="text-[15px] font-bold text-foreground">Posts & Signals ({contentSignals.length})</span>
                  </div>
                  {contentSignals.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">No posts</div>
                  ) : (
                    contentSignals.map(s => (
                      <div key={s.id} className="px-5 py-3 border-b border-muted last:border-0 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.post_type === 'signal' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}>
                              {s.post_type === 'signal' ? '📊 Signal' : '💬 Update'}
                            </span>
                            {s.instrument && <span className="text-sm font-bold text-foreground">{s.instrument}</span>}
                            {s.signal_type && <span className={`text-[10px] font-bold ${s.signal_type === 'BUY' ? 'text-primary' : 'text-destructive'}`}>{s.signal_type}</span>}
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {s.message_text || s.notes || `Entry: ₹${s.entry_price} | Target: ₹${s.target_price} | SL: ₹${s.stop_loss}`}
                          </p>
                          <p className="text-[10px] text-muted-foreground">{formatDate(s.created_at)} · {s.is_public ? 'Public' : 'Private'}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive border-destructive/30 hover:bg-destructive/10 rounded-lg text-[12px] gap-1 shrink-0"
                          onClick={() => { if (confirm('Delete this post? This cannot be undone.')) adminDeleteSignal(s.id); }}
                          disabled={deletingSignalId === s.id}
                        >
                          <Trash2 size={12} /> {deletingSignalId === s.id ? '...' : 'Delete'}
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== USERS TAB ===== */}
        {tab === 'users' && !loading && (
          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted border-b border-border text-left">
                  <th className="p-4 text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Name</th>
                  <th className="p-4 text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Email</th>
                  <th className="p-4 text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Role</th>
                  <th className="p-4 text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u: any, i: number) => (
                  <tr key={u.id} className={`border-b border-muted last:border-0 ${i % 2 === 1 ? 'bg-muted/50' : ''}`}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <AdminAvatar name={u.full_name || u.email || '?'} size={32} />
                        <span className="font-semibold text-foreground">{u.full_name || '-'}</span>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">{u.email}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[12px] font-semibold ${
                        u.role === 'admin' ? 'bg-secondary text-secondary-foreground' :
                        u.role === 'advisor' ? 'bg-[hsl(var(--light-green))] text-primary' :
                        'bg-muted text-muted-foreground'
                      }`}>{u.role || 'trader'}</span>
                    </td>
                    <td className="p-4 text-muted-foreground">{formatDate(u.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ===== PAYMENTS TAB ===== */}
        {tab === 'payments' && !loading && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" className="gap-2 rounded-lg" onClick={() => exportCsv(payments, 'payments')}>
                <Download size={14} /> Export CSV
              </Button>
            </div>
            <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted border-b border-border text-left">
                    <th className="p-4 text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">User</th>
                    <th className="p-4 text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Advisor</th>
                    <th className="p-4 text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Group</th>
                    <th className="p-4 text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
                    <th className="p-4 text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                    <th className="p-4 text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length === 0 && <tr><td colSpan={6} className="p-12 text-center text-muted-foreground">No payments yet</td></tr>}
                  {payments.map((p: any, i: number) => (
                    <tr key={p.id} className={`border-b border-muted last:border-0 ${i % 2 === 1 ? 'bg-muted/50' : ''}`}>
                      <td className="p-4 font-semibold text-foreground">{p.profiles?.full_name}</td>
                      <td className="p-4 text-muted-foreground">{p.advisors?.full_name}</td>
                      <td className="p-4 text-muted-foreground">{p.groups?.name}</td>
                      <td className="p-4 font-bold text-primary">₹{(p.amount_paid || 0).toLocaleString('en-IN')}</td>
                      <td className="p-4 text-muted-foreground">{formatDate(p.created_at)}</td>
                      <td className="p-4"><span className={`px-2.5 py-1 rounded-full text-[12px] font-semibold ${statusPill(p.status || '')}`}>{p.status}</span></td>
                    </tr>
                  ))}
                  {payments.length > 0 && (
                    <tr className="bg-muted font-bold">
                      <td className="p-4" colSpan={3}>Total</td>
                      <td className="p-4 text-primary">₹{totalRevenue.toLocaleString('en-IN')}</td>
                      <td colSpan={2} />
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== LEGAL TAB ===== */}
        {tab === 'legal' && !loading && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 items-center">
              <Button variant={legalTab === 'advisor' ? 'default' : 'outline'} size="sm" className="rounded-lg" onClick={() => setLegalTab('advisor')}>Advisor Acceptances</Button>
              <Button variant={legalTab === 'user' ? 'default' : 'outline'} size="sm" className="rounded-lg" onClick={() => setLegalTab('user')}>User Acceptances</Button>
              <div className="flex-1" />
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by name..." value={legalSearch} onChange={e => setLegalSearch(e.target.value)} className="pl-9 w-56 rounded-lg" />
              </div>
              <Button variant="outline" size="sm" className="gap-1 rounded-lg" onClick={() => exportCsv(legalTab === 'advisor' ? filteredAdvisorLegal : filteredUserLegal, `${legalTab}-legal-records`)}>
                <Download className="h-4 w-4" /> Export CSV
              </Button>
            </div>

            {legalTab === 'advisor' && (
              <div className="bg-card rounded-2xl border border-border overflow-x-auto shadow-sm">
                <table className="w-full text-sm">
                  <thead><tr className="bg-muted border-b border-border text-left">
                    <th className="p-4 text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Name</th>
                    <th className="p-4 text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">SEBI No</th>
                    <th className="p-4 text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">CB 1</th>
                    <th className="p-4 text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">CB 2</th>
                    <th className="p-4 text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">IP</th>
                    <th className="p-4 text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Submitted</th>
                    <th className="p-4 text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  </tr></thead>
                  <tbody>
                    {filteredAdvisorLegal.length === 0 && <tr><td colSpan={7} className="p-12 text-center text-muted-foreground">No records</td></tr>}
                    {filteredAdvisorLegal.map((r: any, i: number) => (
                      <tr key={r.id} className={`border-b border-muted last:border-0 ${i % 2 === 1 ? 'bg-muted/50' : ''}`}>
                        <td className="p-4 font-semibold text-foreground">{r.full_name}</td>
                        <td className="p-4 font-mono text-[12px] text-muted-foreground">{r.sebi_reg_no}</td>
                        <td className="p-4">{r.checkbox_1_sebi_responsibility ? '✅' : '❌'}</td>
                        <td className="p-4">{r.checkbox_2_indemnity ? '✅' : '❌'}</td>
                        <td className="p-4 font-mono text-[12px] text-muted-foreground">{r.ip_address || '-'}</td>
                        <td className="p-4 text-muted-foreground">{r.form_submitted_at ? new Date(r.form_submitted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                        <td className="p-4"><span className={`px-2.5 py-1 rounded-full text-[12px] font-semibold ${statusPill(r.status)}`}>{r.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {legalTab === 'user' && (
              <div className="bg-card rounded-2xl border border-border overflow-x-auto shadow-sm">
                <table className="w-full text-sm">
                  <thead><tr className="bg-muted border-b border-border text-left">
                    <th className="p-4 text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Name</th>
                    <th className="p-4 text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Email</th>
                    <th className="p-4 text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
                    <th className="p-4 text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Page</th>
                    <th className="p-4 text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">IP</th>
                    <th className="p-4 text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Accepted</th>
                  </tr></thead>
                  <tbody>
                    {filteredUserLegal.length === 0 && <tr><td colSpan={6} className="p-12 text-center text-muted-foreground">No records</td></tr>}
                    {filteredUserLegal.map((r: any, i: number) => (
                      <tr key={r.id} className={`border-b border-muted last:border-0 ${i % 2 === 1 ? 'bg-muted/50' : ''}`}>
                        <td className="p-4 font-semibold text-foreground">{r.full_name || '-'}</td>
                        <td className="p-4 text-muted-foreground">{r.email || '-'}</td>
                        <td className="p-4"><span className="bg-[hsl(var(--light-blue))] text-secondary px-2.5 py-1 rounded-full text-[12px] font-semibold">{r.acceptance_type}</span></td>
                        <td className="p-4 text-[12px] max-w-[200px] truncate text-muted-foreground">{r.page_url || '-'}</td>
                        <td className="p-4 font-mono text-[12px] text-muted-foreground">{r.ip_address || '-'}</td>
                        <td className="p-4 text-muted-foreground">{r.accepted_at ? new Date(r.accepted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ===== REQUESTS TAB ===== */}
        {tab === 'requests' && !loading && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" className="gap-2 rounded-lg" onClick={() => exportCsv(deletionRequests, 'deletion-requests')}>
                <Download size={14} /> Export CSV
              </Button>
            </div>
            <div className="bg-card rounded-2xl border border-border overflow-x-auto shadow-sm">
              <table className="w-full text-sm">
                <thead><tr className="bg-muted border-b border-border text-left">
                  <th className="p-4 text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
                  <th className="p-4 text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Name</th>
                  <th className="p-4 text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Email</th>
                  <th className="p-4 text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Group</th>
                  <th className="p-4 text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="p-4 text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                  <th className="p-4 text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
                </tr></thead>
                <tbody>
                  {deletionRequests.length === 0 && <tr><td colSpan={7} className="p-12 text-center text-muted-foreground">No requests</td></tr>}
                  {deletionRequests.map((r: any, i: number) => (
                    <tr key={r.id} className={`border-b border-muted last:border-0 ${i % 2 === 1 ? 'bg-muted/50' : ''}`}>
                      <td className="p-4"><span className="bg-[hsl(var(--light-blue))] text-secondary px-2.5 py-1 rounded-full text-[12px] font-semibold capitalize">{r.request_type?.replace(/_/g, ' ')}</span></td>
                      <td className="p-4 font-semibold text-foreground">{r.advisor_name || '-'}</td>
                      <td className="p-4 text-muted-foreground">{r.email || '-'}</td>
                      <td className="p-4 text-muted-foreground">{r.group_name || '-'}</td>
                      <td className="p-4"><span className={`px-2.5 py-1 rounded-full text-[12px] font-semibold ${statusPill(r.status)}`}>{r.status}</span></td>
                      <td className="p-4 text-muted-foreground">{formatDate(r.created_at)}</td>
                      <td className="p-4">
                        <Button variant="outline" size="sm" className="rounded-lg text-[12px]" onClick={() => {
                          setSelectedDeletionRequest(r);
                          setDeletionRequestModalOpen(true);
                        }}>
                          <Eye size={14} className="mr-1" /> View Reason
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== REFERRALS TAB ===== */}
        {tab === 'referrals' && !loading && (
          <AdminReferralTab />
        )}
      </main>

      {/* MODALS */}
      <ViewApplicationModal
        open={viewApplicationModalOpen}
        onOpenChange={setViewApplicationModalOpen}
        advisor={selectedAdvisorForView}
        onApprove={approveAdvisor}
        onRejectClick={(adv) => {
          setSelectedAdvisorForReject(adv);
          setRejectModalOpen(true);
        }}
        isApproving={approvingAdvisorId === selectedAdvisorForView?.id}
      />

      <RejectApplicationModal
        open={rejectModalOpen}
        onOpenChange={setRejectModalOpen}
        advisorName={selectedAdvisorForReject?.full_name || ''}
        onConfirm={(reason) => rejectAdvisor(selectedAdvisorForReject!, reason)}
        isLoading={rejectingAdvisorId === selectedAdvisorForReject?.id}
      />

      {/* ===== DELETION REQUEST REVIEW MODAL ===== */}
      {deletionRequestModalOpen && selectedDeletionRequest && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card rounded-2xl border border-border p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-foreground mb-4">Account Deletion Request</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 bg-muted p-4 rounded-lg">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Type</p>
                  <p className="text-sm font-bold text-foreground capitalize">{selectedDeletionRequest.request_type?.replace(/_/g, ' ')}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Status</p>
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-[12px] font-semibold ${statusPill(selectedDeletionRequest.status)}`}>
                    {selectedDeletionRequest.status}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Date</p>
                  <p className="text-sm font-bold text-foreground">{formatDate(selectedDeletionRequest.created_at)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Request ID</p>
                  <p className="text-xs font-mono text-foreground truncate">{selectedDeletionRequest.id}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-2">Requester Information</p>
                <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Name:</span>
                    <span className="text-sm font-bold text-foreground">{selectedDeletionRequest.advisor_name || selectedDeletionRequest.full_name || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Email:</span>
                    <span className="text-sm font-bold text-foreground">{selectedDeletionRequest.email || '-'}</span>
                  </div>
                  {selectedDeletionRequest.group_name && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Group:</span>
                      <span className="text-sm font-bold text-foreground">{selectedDeletionRequest.group_name}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-muted-foreground mb-2">Reason for Deletion</p>
                <div className="bg-slate-50 p-4 rounded-lg border border-border min-h-24">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{selectedDeletionRequest.reason || 'No reason provided'}</p>
                </div>
              </div>

              <div className="mt-6 flex gap-2 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setDeletionRequestModalOpen(false)}
                >
                  Close
                </Button>
                {selectedDeletionRequest.status === 'pending' && (
                  <>
                    <Button 
                      variant="destructive"
                      onClick={() => handleRejectDeletionRequest(selectedDeletionRequest.id)}
                    >
                      Reject Request
                    </Button>
                    <Button 
                      className="bg-primary hover:bg-primary/90"
                      onClick={() => handleApproveDeletionRequest(selectedDeletionRequest.id)}
                    >
                      Approve & Delete
                    </Button>
                  </>
                )}
                <Button 
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedDeletionRequest.reason || '');
                    toast.success('Reason copied to clipboard');
                  }}
                >
                  Copy
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
