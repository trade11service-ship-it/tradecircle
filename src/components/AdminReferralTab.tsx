import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Eye, Users, IndianRupee, TrendingUp, Link2, Pencil } from 'lucide-react';

export function AdminReferralTab() {
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [newCode, setNewCode] = useState('');
  const [saving, setSaving] = useState(false);

  const saveCode = async () => {
    if (!editing) return;
    const code = newCode.trim().toUpperCase();
    if (code.length < 4) { toast.error('Code must be at least 4 characters'); return; }
    setSaving(true);
    const { error } = await supabase.from('referral_links').update({ referral_code: code }).eq('id', editing.id);
    setSaving(false);
    if (error) { toast.error(error.message.includes('duplicate') ? 'Code already in use' : 'Update failed'); return; }
    toast.success('Referral code updated');
    setEditing(null);
    fetchData();
  };

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data } = await supabase.from('referral_links')
      .select('*, advisors!inner(full_name), groups!inner(name)')
      .order('created_at', { ascending: false });
    setLinks(data || []);
    setLoading(false);
  };

  const toggleLink = async (id: string, currentActive: boolean) => {
    const { error } = await supabase.from('referral_links').update({ is_active: !currentActive }).eq('id', id);
    if (error) toast.error('Failed to update');
    else { toast.success(currentActive ? 'Link deactivated' : 'Link activated'); fetchData(); }
  };

  if (loading) return <div className="py-8 text-center text-muted-foreground">Loading referral data...</div>;

  const totalClicks = links.reduce((s, l) => s + (l.total_clicks || 0), 0);
  const totalConversions = links.reduce((s, l) => s + (l.total_conversions || 0), 0);
  const totalRevenue = links.reduce((s, l) => s + (l.total_revenue_generated || 0), 0);
  // Revenue difference: what platform loses from 15% vs 30%
  const revenueDiff = Math.round(totalRevenue * 0.15);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { icon: Link2, label: 'Referral Links', value: links.length },
          { icon: Eye, label: 'Total Clicks', value: totalClicks },
          { icon: Users, label: 'Total Conversions', value: totalConversions },
          { icon: IndianRupee, label: 'Program Cost', value: `₹${revenueDiff.toLocaleString('en-IN')}`, sub: '15% vs 30% difference' },
        ].map((s, i) => (
          <div key={i} className="tc-card-static p-5">
            <s.icon className="h-4 w-4 text-muted-foreground mb-1" />
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="tc-small">{s.label}</p>
            {s.sub && <p className="text-[10px] text-muted-foreground">{s.sub}</p>}
          </div>
        ))}
      </div>

      <div className="tc-card-static overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-[hsl(var(--off-white))] text-left">
              <th className="p-3 font-medium text-muted-foreground">Advisor</th>
              <th className="p-3 font-medium text-muted-foreground">Group</th>
              <th className="p-3 font-medium text-muted-foreground">Code</th>
              <th className="p-3 font-medium text-muted-foreground">Clicks</th>
              <th className="p-3 font-medium text-muted-foreground">Conv.</th>
              <th className="p-3 font-medium text-muted-foreground">Revenue</th>
              <th className="p-3 font-medium text-muted-foreground">Status</th>
              <th className="p-3 font-medium text-muted-foreground">Action</th>
            </tr>
          </thead>
          <tbody>
            {links.length === 0 && <tr><td colSpan={8} className="p-12 text-center text-muted-foreground">No referral links yet</td></tr>}
            {links.map((l: any, i: number) => (
              <tr key={l.id} className={`border-b last:border-0 ${i % 2 === 1 ? 'bg-[hsl(var(--off-white))]' : ''}`}>
                <td className="p-3 font-medium">{l.advisors?.full_name}</td>
                <td className="p-3">{l.groups?.name}</td>
                <td className="p-3 font-mono text-xs">{l.referral_code}</td>
                <td className="p-3">{l.total_clicks}</td>
                <td className="p-3">{l.total_conversions}</td>
                <td className="p-3 tc-amount">₹{(l.total_revenue_generated || 0).toLocaleString('en-IN')}</td>
                <td className="p-3"><span className={l.is_active ? 'tc-badge-active' : 'tc-badge-rejected'}>{l.is_active ? 'Active' : 'Inactive'}</span></td>
                <td className="p-3 flex gap-2">
                  <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => { setEditing(l); setNewCode(l.referral_code); }}>
                    <Pencil className="h-3 w-3" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => toggleLink(l.id, l.is_active)}>
                    {l.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Referral Code</DialogTitle></DialogHeader>
          <p className="text-xs text-muted-foreground">Advisor: <b>{editing?.advisors?.full_name}</b> · Group: <b>{editing?.groups?.name}</b></p>
          <Input value={newCode} onChange={e => setNewCode(e.target.value.toUpperCase())} className="font-mono mt-2" />
          <p className="text-[11px] text-muted-foreground">Codes must be unique across the platform.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveCode} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
