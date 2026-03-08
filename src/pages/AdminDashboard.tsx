import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import { ShieldAlert } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Advisor = Tables<'advisors'>;

export default function AdminDashboard() {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'pending' | 'advisors' | 'users' | 'payments'>('pending');
  const [pendingAdvisors, setPendingAdvisors] = useState<Advisor[]>([]);
  const [allAdvisors, setAllAdvisors] = useState<Advisor[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [expandedAdvisor, setExpandedAdvisor] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [isVerifiedAdmin, setIsVerifiedAdmin] = useState(false);
  const [verifying, setVerifying] = useState(true);

  // Server-side admin verification - don't trust client profile.role
  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login', { replace: true }); return; }

    const verifyAdmin = async () => {
      // Query the database directly to verify admin role
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (error || data?.role !== 'admin') {
        setIsVerifiedAdmin(false);
        setVerifying(false);
        return;
      }
      setIsVerifiedAdmin(true);
      setVerifying(false);
    };

    verifyAdmin();
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (isVerifiedAdmin) fetchData();
  }, [isVerifiedAdmin]);

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
    setLoading(false);
  };

  const approveAdvisor = async (advisor: Advisor) => {
    // Update advisor status AND the profile role to 'advisor'
    const [advisorUpdate, profileUpdate] = await Promise.all([
      supabase.from('advisors').update({ status: 'approved' }).eq('id', advisor.id),
      supabase.from('profiles').update({ role: 'advisor' }).eq('id', advisor.user_id),
    ]);
    if (advisorUpdate.error || profileUpdate.error) {
      toast.error('Failed to approve advisor');
      return;
    }
    toast.success('Advisor approved successfully');
    fetchData();
  };

  const rejectAdvisor = async (id: string) => {
    if (!rejectReason.trim()) { toast.error('Please provide a rejection reason'); return; }
    const { error } = await supabase.from('advisors').update({ status: 'rejected', rejection_reason: rejectReason }).eq('id', id);
    if (error) { toast.error('Failed to reject'); return; }
    toast.success('Advisor rejected');
    setRejectReason('');
    fetchData();
  };

  const suspendAdvisor = async (advisor: Advisor) => {
    await Promise.all([
      supabase.from('advisors').update({ status: 'suspended' }).eq('id', advisor.id),
      supabase.from('profiles').update({ role: 'trader' }).eq('id', advisor.user_id),
    ]);
    toast.success('Advisor suspended');
    fetchData();
  };

  // Loading states
  if (authLoading || verifying) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Access denied
  if (!isVerifiedAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto flex max-w-md flex-col items-center px-4 py-16">
          <div className="rounded-xl border border-destructive/30 bg-card p-8 text-center shadow-sm">
            <ShieldAlert className="mx-auto h-16 w-16 text-destructive" />
            <h2 className="mt-4 text-xl font-bold text-destructive">Access Denied</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              You do not have permission to access this page. Admin access is strictly restricted.
            </p>
            <Button className="mt-6" variant="outline" onClick={() => navigate('/')}>Go Home</Button>
          </div>
        </div>
      </div>
    );
  }

  const totalRevenue = payments.reduce((sum, p) => sum + (p.amount_paid || 0), 0);

  const tabs = [
    { key: 'pending', label: `Pending (${pendingAdvisors.length})` },
    { key: 'advisors', label: 'All Advisors' },
    { key: 'users', label: 'All Users' },
    { key: 'payments', label: 'Payments' },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <ShieldAlert className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <Badge variant="destructive" className="text-xs">ADMIN ONLY</Badge>
        </div>

        {/* Stats row */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">Pending Approvals</p>
            <p className="text-2xl font-bold text-orange-500">{pendingAdvisors.length}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">Total Advisors</p>
            <p className="text-2xl font-bold">{allAdvisors.length}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">Total Users</p>
            <p className="text-2xl font-bold">{users.length}</p>
          </div>
          <div className="rounded-lg border bg-card p-4">
            <p className="text-xs text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-bold text-primary">₹{totalRevenue.toLocaleString('en-IN')}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto rounded-lg border bg-card p-1">
          {tabs.map(t => (
            <Button key={t.key} variant={tab === t.key ? 'default' : 'ghost'} size="sm" onClick={() => setTab(t.key)}>{t.label}</Button>
          ))}
        </div>

        {loading && <div className="text-center text-muted-foreground py-8">Loading data...</div>}

        {/* Pending Tab */}
        {tab === 'pending' && !loading && (
          <div className="space-y-4">
            {pendingAdvisors.length === 0 && (
              <div className="rounded-xl border bg-card p-8 text-center">
                <p className="text-muted-foreground">No pending applications 🎉</p>
              </div>
            )}
            {pendingAdvisors.map(a => (
              <div key={a.id} className="rounded-xl border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-lg">{a.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      SEBI: {a.sebi_reg_no} • Applied: {new Date(a.created_at!).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setExpandedAdvisor(expandedAdvisor === a.id ? null : a.id)}>
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
                        <div key={item.label} className="rounded-lg bg-muted/50 p-3">
                          <p className="text-xs text-muted-foreground">{item.label}</p>
                          <p className="font-medium text-sm">{item.value}</p>
                        </div>
                      ))}
                    </div>
                    {a.bio && (
                      <div className="rounded-lg bg-muted/50 p-3">
                        <p className="text-xs text-muted-foreground">Bio</p>
                        <p className="text-sm">{a.bio}</p>
                      </div>
                    )}
                    <div className="flex gap-2 items-end flex-wrap">
                      <Button onClick={() => approveAdvisor(a)} className="bg-primary hover:bg-primary/90">✓ Approve</Button>
                      <div className="flex-1 min-w-[200px]">
                        <Input placeholder="Rejection reason (required)..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
                      </div>
                      <Button variant="destructive" onClick={() => rejectAdvisor(a.id)}>✕ Reject</Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Advisors Tab */}
        {tab === 'advisors' && !loading && (
          <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50 text-left"><th className="p-3 font-medium">Name</th><th className="p-3 font-medium">SEBI No</th><th className="p-3 font-medium">Strategy</th><th className="p-3 font-medium">Status</th><th className="p-3 font-medium">Actions</th></tr></thead>
              <tbody>
                {allAdvisors.map(a => (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="p-3">{a.full_name}</td>
                    <td className="p-3 font-mono text-xs">{a.sebi_reg_no}</td>
                    <td className="p-3">{a.strategy_type}</td>
                    <td className="p-3">
                      <Badge variant={a.status === 'approved' ? 'default' : a.status === 'rejected' ? 'destructive' : 'secondary'} className="capitalize">
                        {a.status}
                      </Badge>
                    </td>
                    <td className="p-3">
                      {a.status === 'approved' && (
                        <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => suspendAdvisor(a)}>Suspend</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Users Tab */}
        {tab === 'users' && !loading && (
          <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50 text-left"><th className="p-3 font-medium">Name</th><th className="p-3 font-medium">Email</th><th className="p-3 font-medium">Role</th><th className="p-3 font-medium">Joined</th></tr></thead>
              <tbody>
                {users.map((u: any) => (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="p-3">{u.full_name || '-'}</td>
                    <td className="p-3">{u.email}</td>
                    <td className="p-3"><Badge variant={u.role === 'admin' ? 'destructive' : 'secondary'} className="capitalize">{u.role}</Badge></td>
                    <td className="p-3">{u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Payments Tab */}
        {tab === 'payments' && !loading && (
          <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/50 text-left"><th className="p-3 font-medium">User</th><th className="p-3 font-medium">Advisor</th><th className="p-3 font-medium">Group</th><th className="p-3 font-medium">Amount</th><th className="p-3 font-medium">Date</th><th className="p-3 font-medium">Status</th></tr></thead>
              <tbody>
                {payments.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No payments yet</td></tr>}
                {payments.map((p: any) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="p-3">{p.profiles?.full_name}</td>
                    <td className="p-3">{p.advisors?.full_name}</td>
                    <td className="p-3">{p.groups?.name}</td>
                    <td className="p-3 font-medium">₹{(p.amount_paid || 0).toLocaleString('en-IN')}</td>
                    <td className="p-3">{p.created_at ? new Date(p.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}</td>
                    <td className="p-3"><Badge variant={p.status === 'active' ? 'default' : 'secondary'} className="capitalize">{p.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
