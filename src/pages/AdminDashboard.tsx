import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { ShieldAlert, Users, IndianRupee, Clock, Download, Search } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Advisor = Tables<'advisors'>;

export default function AdminDashboard() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'pending' | 'advisors' | 'users' | 'payments' | 'legal' | 'requests'>('pending');
  const [pendingAdvisors, setPendingAdvisors] = useState<Advisor[]>([]);
  const [allAdvisors, setAllAdvisors] = useState<Advisor[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [expandedAdvisor, setExpandedAdvisor] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [isVerifiedAdmin, setIsVerifiedAdmin] = useState(false);
  const [verifying, setVerifying] = useState(true);

  // Legal records state
  const [legalTab, setLegalTab] = useState<'advisor' | 'user'>('advisor');
  const [advisorLegal, setAdvisorLegal] = useState<any[]>([]);
  const [userLegal, setUserLegal] = useState<any[]>([]);
  const [legalSearch, setLegalSearch] = useState('');
  const [deletionRequests, setDeletionRequests] = useState<any[]>([]);

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
    setPendingAdvisors(pending.data || []); setAllAdvisors(all.data || []); setUsers(usersData.data || []); setPayments(paymentsData.data || []);

    // Fetch legal records
    const [advLegal, usrLegal] = await Promise.all([
      supabase.from('advisor_legal_acceptances').select('*').order('form_submitted_at', { ascending: false }),
      supabase.from('user_legal_acceptances').select('*').order('accepted_at', { ascending: false }),
    ]);
    setAdvisorLegal(advLegal.data || []);
    setUserLegal(usrLegal.data || []);

    setLoading(false);
  };

  const approveAdvisor = async (advisor: Advisor) => {
    const [a, p] = await Promise.all([
      supabase.from('advisors').update({ status: 'approved' }).eq('id', advisor.id),
      supabase.from('profiles').update({ role: 'advisor' }).eq('id', advisor.user_id),
    ]);
    if (a.error || p.error) { toast.error('Failed to approve advisor'); return; }
    toast.success('Advisor approved successfully'); fetchData();
  };

  const rejectAdvisor = async (id: string) => {
    if (!rejectReason.trim()) { toast.error('Please provide a rejection reason'); return; }
    const { error } = await supabase.from('advisors').update({ status: 'rejected', rejection_reason: rejectReason }).eq('id', id);
    if (error) { toast.error('Failed to reject'); return; }
    toast.success('Advisor rejected'); setRejectReason(''); fetchData();
  };

  const suspendAdvisor = async (advisor: Advisor) => {
    await Promise.all([
      supabase.from('advisors').update({ status: 'suspended' }).eq('id', advisor.id),
      supabase.from('profiles').update({ role: 'trader' }).eq('id', advisor.user_id),
    ]);
    toast.success('Advisor suspended'); fetchData();
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

  if (authLoading || verifying) return <div className="flex min-h-screen items-center justify-center bg-off-white"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  if (!isVerifiedAdmin) return (
    <div className="min-h-screen flex flex-col bg-off-white"><Navbar />
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="tc-card-static p-8 text-center max-w-md border-destructive/30">
          <ShieldAlert className="mx-auto h-16 w-16 text-destructive" />
          <h2 className="mt-4 text-xl font-bold text-destructive">Access Denied</h2>
          <p className="mt-2 text-sm text-muted-foreground">You do not have permission to access this page.</p>
          <Button className="mt-6 tc-btn-click" variant="outline" onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
      <Footer />
    </div>
  );

  const totalRevenue = payments.reduce((sum, p) => sum + (p.amount_paid || 0), 0);
  const tabs = [
    { key: 'pending' as const, label: `Pending (${pendingAdvisors.length})` },
    { key: 'advisors' as const, label: 'All Advisors' },
    { key: 'users' as const, label: 'All Users' },
    { key: 'payments' as const, label: 'Payments' },
    { key: 'legal' as const, label: 'Legal Records' },
  ];

  const filteredAdvisorLegal = advisorLegal.filter((r: any) =>
    !legalSearch || r.full_name?.toLowerCase().includes(legalSearch.toLowerCase()) || r.sebi_reg_no?.toLowerCase().includes(legalSearch.toLowerCase())
  );
  const filteredUserLegal = userLegal.filter((r: any) =>
    !legalSearch || r.full_name?.toLowerCase().includes(legalSearch.toLowerCase()) || r.email?.toLowerCase().includes(legalSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-off-white">
      <Navbar />
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="mb-6 flex items-center gap-3">
          <ShieldAlert className="h-6 w-6 text-secondary" />
          <h1 className="tc-page-title text-3xl">Admin Dashboard</h1>
          <span className="tc-badge-admin">ADMIN</span>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="tc-card-static p-5"><p className="tc-small">Pending Approvals</p><p className="text-2xl font-bold text-[hsl(var(--warning))]">{pendingAdvisors.length}</p></div>
          <div className="tc-card-static p-5"><p className="tc-small">Approved Advisors</p><p className="text-2xl font-bold text-primary">{allAdvisors.filter(a => a.status === 'approved').length}</p></div>
          <div className="tc-card-static p-5"><p className="tc-small">Total Users</p><p className="text-2xl font-bold text-secondary">{users.length}</p></div>
          <div className="tc-card-static p-5"><p className="tc-small">Total Revenue</p><p className="text-2xl font-bold tc-amount">₹{totalRevenue.toLocaleString('en-IN')}</p></div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto">
          {tabs.map(t => (
            <Button key={t.key} variant={tab === t.key ? 'default' : 'outline'} size="sm" className="tc-btn-click min-h-[44px]" onClick={() => setTab(t.key)}>{t.label}</Button>
          ))}
        </div>

        {loading && <div className="py-8 text-center text-muted-foreground">Loading data...</div>}

        {tab === 'pending' && !loading && (
          <div className="space-y-4">
            {pendingAdvisors.length === 0 && <div className="tc-card-static p-12 text-center"><p className="text-muted-foreground">No pending applications 🎉</p></div>}
            {pendingAdvisors.map(a => (
              <div key={a.id} className="tc-card-static p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="tc-card-title text-lg">{a.full_name}</p>
                    <p className="tc-small">SEBI: {a.sebi_reg_no} • Applied: {new Date(a.created_at!).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  </div>
                  <Button variant="outline" size="sm" className="tc-btn-click" onClick={() => setExpandedAdvisor(expandedAdvisor === a.id ? null : a.id)}>
                    {expandedAdvisor === a.id ? 'Collapse' : 'Review'}
                  </Button>
                </div>
                {expandedAdvisor === a.id && (
                  <div className="mt-4 space-y-4 border-t pt-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        { label: 'Email', value: a.email },
                        { label: 'Phone', value: a.phone || '-' },
                        { label: 'Aadhaar No', value: a.aadhaar_no ? `••••••••${a.aadhaar_no.slice(-4)}` : '-' },
                        { label: 'PAN No', value: a.pan_no || '-' },
                        { label: 'Strategy', value: a.strategy_type || '-' },
                        { label: 'Address', value: a.address || '-' },
                      ].map(item => (
                        <div key={item.label} className="rounded-lg bg-off-white p-3">
                          <p className="tc-small">{item.label}</p>
                          <p className="font-medium text-sm">{item.value}</p>
                        </div>
                      ))}
                    </div>
                    {a.bio && <div className="rounded-lg bg-off-white p-3"><p className="tc-small">Bio</p><p className="text-sm">{a.bio}</p></div>}
                    <div className="flex gap-2 items-end flex-wrap">
                      <Button onClick={() => approveAdvisor(a)} className="tc-btn-click font-semibold">✓ Approve</Button>
                      <div className="flex-1 min-w-[200px]">
                        <Input placeholder="Rejection reason (required)..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="tc-input-focus" />
                      </div>
                      <Button variant="destructive" className="tc-btn-click font-semibold" onClick={() => rejectAdvisor(a.id)}>✕ Reject</Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'advisors' && !loading && (
          <div className="tc-card-static overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-off-white text-left"><th className="p-3 font-medium text-muted-foreground">Name</th><th className="p-3 font-medium text-muted-foreground">SEBI No</th><th className="p-3 font-medium text-muted-foreground">Strategy</th><th className="p-3 font-medium text-muted-foreground">Status</th><th className="p-3 font-medium text-muted-foreground">Actions</th></tr></thead>
              <tbody>
                {allAdvisors.map((a, i) => (
                  <tr key={a.id} className={`border-b last:border-0 ${i % 2 === 1 ? 'bg-off-white' : ''}`}>
                    <td className="p-3 font-medium">{a.full_name}</td>
                    <td className="p-3 font-mono text-xs">{a.sebi_reg_no}</td>
                    <td className="p-3"><span className="tc-badge-strategy">{a.strategy_type}</span></td>
                    <td className="p-3"><span className={a.status === 'approved' ? 'tc-badge-active' : a.status === 'rejected' ? 'tc-badge-rejected' : 'tc-badge-pending'}>{a.status}</span></td>
                    <td className="p-3">
                      {a.status === 'approved' && <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10 tc-btn-click" onClick={() => suspendAdvisor(a)}>Suspend</Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'users' && !loading && (
          <div className="tc-card-static overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-off-white text-left"><th className="p-3 font-medium text-muted-foreground">Name</th><th className="p-3 font-medium text-muted-foreground">Email</th><th className="p-3 font-medium text-muted-foreground">Role</th><th className="p-3 font-medium text-muted-foreground">Joined</th></tr></thead>
              <tbody>
                {users.map((u: any, i: number) => (
                  <tr key={u.id} className={`border-b last:border-0 ${i % 2 === 1 ? 'bg-off-white' : ''}`}>
                    <td className="p-3 font-medium">{u.full_name || '-'}</td>
                    <td className="p-3 text-muted-foreground">{u.email}</td>
                    <td className="p-3"><span className={u.role === 'admin' ? 'tc-badge-admin' : u.role === 'advisor' ? 'tc-badge-sebi' : 'tc-badge-strategy'}>{u.role}</span></td>
                    <td className="p-3">{u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'payments' && !loading && (
          <div className="tc-card-static overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-off-white text-left"><th className="p-3 font-medium text-muted-foreground">User</th><th className="p-3 font-medium text-muted-foreground">Advisor</th><th className="p-3 font-medium text-muted-foreground">Group</th><th className="p-3 font-medium text-muted-foreground">Amount</th><th className="p-3 font-medium text-muted-foreground">Date</th><th className="p-3 font-medium text-muted-foreground">Status</th></tr></thead>
              <tbody>
                {payments.length === 0 && <tr><td colSpan={6} className="p-12 text-center text-muted-foreground">No payments yet</td></tr>}
                {payments.map((p: any, i: number) => (
                  <tr key={p.id} className={`border-b last:border-0 ${i % 2 === 1 ? 'bg-off-white' : ''}`}>
                    <td className="p-3 font-medium">{p.profiles?.full_name}</td>
                    <td className="p-3">{p.advisors?.full_name}</td>
                    <td className="p-3">{p.groups?.name}</td>
                    <td className="p-3 tc-amount">₹{(p.amount_paid || 0).toLocaleString('en-IN')}</td>
                    <td className="p-3">{p.created_at ? new Date(p.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</td>
                    <td className="p-3"><span className={p.status === 'active' ? 'tc-badge-active' : 'tc-badge-pending'}>{p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'legal' && !loading && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 items-center">
              <Button variant={legalTab === 'advisor' ? 'default' : 'outline'} size="sm" className="tc-btn-click" onClick={() => setLegalTab('advisor')}>Advisor Acceptances</Button>
              <Button variant={legalTab === 'user' ? 'default' : 'outline'} size="sm" className="tc-btn-click" onClick={() => setLegalTab('user')}>User Acceptances</Button>
              <div className="flex-1" />
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by name..." value={legalSearch} onChange={e => setLegalSearch(e.target.value)} className="pl-9 w-56 tc-input-focus" />
              </div>
              <Button variant="outline" size="sm" className="tc-btn-click gap-1" onClick={() => exportCsv(legalTab === 'advisor' ? filteredAdvisorLegal : filteredUserLegal, `${legalTab}-legal-records`)}>
                <Download className="h-4 w-4" /> Export CSV
              </Button>
            </div>

            {legalTab === 'advisor' && (
              <div className="tc-card-static overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-off-white text-left">
                    <th className="p-3 font-medium text-muted-foreground">Name</th>
                    <th className="p-3 font-medium text-muted-foreground">SEBI No</th>
                    <th className="p-3 font-medium text-muted-foreground">CB 1 ✅</th>
                    <th className="p-3 font-medium text-muted-foreground">CB 2 ✅</th>
                    <th className="p-3 font-medium text-muted-foreground">IP Address</th>
                    <th className="p-3 font-medium text-muted-foreground">Submitted At</th>
                    <th className="p-3 font-medium text-muted-foreground">Status</th>
                  </tr></thead>
                  <tbody>
                    {filteredAdvisorLegal.length === 0 && <tr><td colSpan={7} className="p-12 text-center text-muted-foreground">No records</td></tr>}
                    {filteredAdvisorLegal.map((r: any, i: number) => (
                      <tr key={r.id} className={`border-b last:border-0 ${i % 2 === 1 ? 'bg-off-white' : ''}`}>
                        <td className="p-3 font-medium">{r.full_name}</td>
                        <td className="p-3 font-mono text-xs">{r.sebi_reg_no}</td>
                        <td className="p-3">{r.checkbox_1_sebi_responsibility ? '✅' : '❌'}</td>
                        <td className="p-3">{r.checkbox_2_indemnity ? '✅' : '❌'}</td>
                        <td className="p-3 font-mono text-xs">{r.ip_address || '-'}</td>
                        <td className="p-3">{r.form_submitted_at ? new Date(r.form_submitted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                        <td className="p-3"><span className={r.status === 'approved' ? 'tc-badge-active' : r.status === 'rejected' ? 'tc-badge-rejected' : 'tc-badge-pending'}>{r.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {legalTab === 'user' && (
              <div className="tc-card-static overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-off-white text-left">
                    <th className="p-3 font-medium text-muted-foreground">Name</th>
                    <th className="p-3 font-medium text-muted-foreground">Email</th>
                    <th className="p-3 font-medium text-muted-foreground">Type</th>
                    <th className="p-3 font-medium text-muted-foreground">Page</th>
                    <th className="p-3 font-medium text-muted-foreground">IP</th>
                    <th className="p-3 font-medium text-muted-foreground">Accepted At</th>
                  </tr></thead>
                  <tbody>
                    {filteredUserLegal.length === 0 && <tr><td colSpan={6} className="p-12 text-center text-muted-foreground">No records</td></tr>}
                    {filteredUserLegal.map((r: any, i: number) => (
                      <tr key={r.id} className={`border-b last:border-0 ${i % 2 === 1 ? 'bg-off-white' : ''}`}>
                        <td className="p-3 font-medium">{r.full_name || '-'}</td>
                        <td className="p-3 text-muted-foreground">{r.email || '-'}</td>
                        <td className="p-3"><span className="tc-badge-strategy">{r.acceptance_type}</span></td>
                        <td className="p-3 text-xs max-w-[200px] truncate">{r.page_url || '-'}</td>
                        <td className="p-3 font-mono text-xs">{r.ip_address || '-'}</td>
                        <td className="p-3">{r.accepted_at ? new Date(r.accepted_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
