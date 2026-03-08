import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

type Advisor = Tables<'advisors'>;

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<'pending' | 'advisors' | 'users' | 'payments'>('pending');
  const [pendingAdvisors, setPendingAdvisors] = useState<Advisor[]>([]);
  const [allAdvisors, setAllAdvisors] = useState<Advisor[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [expandedAdvisor, setExpandedAdvisor] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: pending } = await supabase.from('advisors').select('*').eq('status', 'pending').order('created_at', { ascending: false });
    setPendingAdvisors(pending || []);

    const { data: all } = await supabase.from('advisors').select('*').order('created_at', { ascending: false });
    setAllAdvisors(all || []);

    const { data: usersData } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    setUsers(usersData || []);

    const { data: paymentsData } = await supabase.from('subscriptions').select('*, profiles!inner(full_name), advisors!inner(full_name), groups!inner(name)').order('created_at', { ascending: false });
    setPayments(paymentsData || []);

    setLoading(false);
  };

  const approveAdvisor = async (id: string) => {
    await supabase.from('advisors').update({ status: 'approved' }).eq('id', id);
    toast.success('Advisor approved');
    fetchData();
  };

  const rejectAdvisor = async (id: string) => {
    if (!rejectReason.trim()) { toast.error('Please provide a rejection reason'); return; }
    await supabase.from('advisors').update({ status: 'rejected', rejection_reason: rejectReason }).eq('id', id);
    toast.success('Advisor rejected');
    setRejectReason('');
    fetchData();
  };

  const suspendAdvisor = async (id: string) => {
    await supabase.from('advisors').update({ status: 'suspended' }).eq('id', id);
    toast.success('Advisor suspended');
    fetchData();
  };

  if (profile?.role !== 'admin') {
    return <div className="min-h-screen bg-background"><Navbar /><div className="p-8 text-center text-destructive">Access denied. Admin only.</div></div>;
  }

  const totalRevenue = payments.reduce((sum, p) => sum + (p.amount_paid || 0), 0);

  const tabs = [
    { key: 'pending', label: `Pending (${pendingAdvisors.length})` },
    { key: 'advisors', label: 'Advisors' },
    { key: 'users', label: 'Users' },
    { key: 'payments', label: 'Payments' },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold">Admin Dashboard</h1>
        <div className="mb-6 flex gap-2 overflow-x-auto">
          {tabs.map(t => (
            <Button key={t.key} variant={tab === t.key ? 'default' : 'outline'} size="sm" onClick={() => setTab(t.key)}>{t.label}</Button>
          ))}
        </div>

        {loading && <div className="text-center text-muted-foreground">Loading...</div>}

        {tab === 'pending' && (
          <div className="space-y-4">
            {pendingAdvisors.length === 0 && <p className="text-muted-foreground">No pending applications</p>}
            {pendingAdvisors.map(a => (
              <div key={a.id} className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{a.full_name}</p>
                    <p className="text-sm text-muted-foreground">SEBI: {a.sebi_reg_no} • {new Date(a.created_at!).toLocaleDateString('en-IN')}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setExpandedAdvisor(expandedAdvisor === a.id ? null : a.id)}>
                    {expandedAdvisor === a.id ? 'Collapse' : 'View Details'}
                  </Button>
                </div>
                {expandedAdvisor === a.id && (
                  <div className="mt-4 space-y-3 border-t pt-4">
                    <div className="grid gap-4 sm:grid-cols-2 text-sm">
                      <div><strong>Email:</strong> {a.email}</div>
                      <div><strong>Phone:</strong> {a.phone}</div>
                      <div><strong>Aadhaar:</strong> {a.aadhaar_no}</div>
                      <div><strong>PAN:</strong> {a.pan_no}</div>
                      <div><strong>Strategy:</strong> {a.strategy_type}</div>
                      <div><strong>Address:</strong> {a.address}</div>
                    </div>
                    <div><strong>Bio:</strong> {a.bio}</div>
                    <div className="flex gap-4 flex-wrap">
                      {a.profile_photo_url && <div><p className="text-xs text-muted-foreground mb-1">Profile Photo</p><img src={a.profile_photo_url} alt="Profile" className="h-32 rounded border object-cover" /></div>}
                      {a.aadhaar_photo_url && <div><p className="text-xs text-muted-foreground mb-1">Aadhaar</p><img src={a.aadhaar_photo_url} alt="Aadhaar" className="h-32 rounded border object-cover" /></div>}
                      {a.pan_photo_url && <div><p className="text-xs text-muted-foreground mb-1">PAN</p><img src={a.pan_photo_url} alt="PAN" className="h-32 rounded border object-cover" /></div>}
                    </div>
                    <div className="flex gap-2 items-end">
                      <Button onClick={() => approveAdvisor(a.id)}>Approve</Button>
                      <div className="flex-1">
                        <Input placeholder="Rejection reason..." value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
                      </div>
                      <Button variant="destructive" onClick={() => rejectAdvisor(a.id)}>Reject</Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'advisors' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left"><th className="p-2">Name</th><th className="p-2">SEBI No</th><th className="p-2">Strategy</th><th className="p-2">Status</th><th className="p-2">Actions</th></tr></thead>
              <tbody>
                {allAdvisors.map(a => (
                  <tr key={a.id} className="border-b">
                    <td className="p-2">{a.full_name}</td>
                    <td className="p-2">{a.sebi_reg_no}</td>
                    <td className="p-2">{a.strategy_type}</td>
                    <td className="p-2"><Badge variant={a.status === 'approved' ? 'default' : a.status === 'rejected' ? 'destructive' : 'secondary'}>{a.status}</Badge></td>
                    <td className="p-2">
                      {a.status === 'approved' && <Button variant="outline" size="sm" onClick={() => suspendAdvisor(a.id)}>Suspend</Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'users' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left"><th className="p-2">Name</th><th className="p-2">Email</th><th className="p-2">Role</th><th className="p-2">Joined</th></tr></thead>
              <tbody>
                {users.map((u: any) => (
                  <tr key={u.id} className="border-b">
                    <td className="p-2">{u.full_name}</td>
                    <td className="p-2">{u.email}</td>
                    <td className="p-2"><Badge variant="secondary">{u.role}</Badge></td>
                    <td className="p-2">{u.created_at ? new Date(u.created_at).toLocaleDateString('en-IN') : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'payments' && (
          <div>
            <div className="mb-4 rounded-lg border bg-card p-4">
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold">₹{totalRevenue.toLocaleString('en-IN')}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left"><th className="p-2">User</th><th className="p-2">Advisor</th><th className="p-2">Group</th><th className="p-2">Amount</th><th className="p-2">Date</th><th className="p-2">Status</th></tr></thead>
                <tbody>
                  {payments.map((p: any) => (
                    <tr key={p.id} className="border-b">
                      <td className="p-2">{p.profiles?.full_name}</td>
                      <td className="p-2">{p.advisors?.full_name}</td>
                      <td className="p-2">{p.groups?.name}</td>
                      <td className="p-2">₹{p.amount_paid || 0}</td>
                      <td className="p-2">{p.created_at ? new Date(p.created_at).toLocaleDateString('en-IN') : '-'}</td>
                      <td className="p-2"><Badge variant={p.status === 'active' ? 'default' : 'secondary'}>{p.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
