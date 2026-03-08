import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Eye, Users, IndianRupee, TrendingUp, Gift } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface ReferralStatsTabProps {
  advisorId: string;
}

export function ReferralStatsTab({ advisorId }: ReferralStatsTabProps) {
  const [links, setLinks] = useState<any[]>([]);
  const [signups, setSignups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [advisorId]);

  const fetchData = async () => {
    const [linksRes, signupsRes] = await Promise.all([
      supabase.from('referral_links').select('*').eq('advisor_id', advisorId),
      supabase.from('referral_signups').select('*').eq('advisor_id', advisorId).order('signed_up_at', { ascending: false }),
    ]);
    setLinks(linksRes.data || []);
    setSignups(signupsRes.data || []);
    setLoading(false);
  };

  if (loading) return <div className="py-8 text-center text-muted-foreground">Loading referral stats...</div>;

  const totalClicks = links.reduce((s, l) => s + (l.total_clicks || 0), 0);
  const totalSignups = links.reduce((s, l) => s + (l.total_signups || 0), 0);
  const totalConversions = links.reduce((s, l) => s + (l.total_conversions || 0), 0);
  const totalRevenue = links.reduce((s, l) => s + (l.total_revenue_generated || 0), 0);
  // Fee saved: what they'd pay at 30% vs 15% = 15% of revenue
  const feeSaved = Math.round(totalRevenue * 0.15);

  // Monthly chart data
  const monthlyData: Record<string, number> = {};
  signups.filter(s => s.converted_to_paid).forEach(s => {
    const month = new Date(s.signed_up_at).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    monthlyData[month] = (monthlyData[month] || 0) + 1;
  });
  const chartData = Object.entries(monthlyData).map(([month, count]) => ({ month, conversions: count })).reverse();

  const maskName = (name: string | null) => {
    if (!name) return '***';
    return name.substring(0, 2) + '**';
  };

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {[
          { icon: Eye, label: 'Total Clicks', value: totalClicks },
          { icon: Users, label: 'Total Signups', value: totalSignups },
          { icon: IndianRupee, label: 'Paid Conversions', value: totalConversions },
          { icon: TrendingUp, label: 'Revenue Generated', value: `₹${totalRevenue.toLocaleString('en-IN')}` },
          { icon: Gift, label: 'Fee Saved', value: `₹${feeSaved.toLocaleString('en-IN')}`, highlight: true },
        ].map((s, i) => (
          <div key={i} className={`rounded-xl border p-4 ${s.highlight ? 'bg-primary/5 border-primary/20' : 'bg-card'}`}>
            <s.icon className={`h-4 w-4 mb-1 ${s.highlight ? 'text-primary' : 'text-muted-foreground'}`} />
            <p className={`text-xl font-bold ${s.highlight ? 'text-primary' : 'text-foreground'}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Monthly chart */}
      {chartData.length > 0 && (
        <div className="rounded-xl border bg-card p-6">
          <h3 className="font-bold mb-4">Monthly Referral Conversions</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="conversions" fill="hsl(123, 56%, 24%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Referred users table */}
      <div className="rounded-xl border bg-card overflow-x-auto">
        <div className="p-4 border-b"><h3 className="font-bold">Referred Users</h3></div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="p-3 font-medium text-muted-foreground">User</th>
              <th className="p-3 font-medium text-muted-foreground">Signed Up</th>
              <th className="p-3 font-medium text-muted-foreground">Paid</th>
              <th className="p-3 font-medium text-muted-foreground">Fee Rate</th>
              <th className="p-3 font-medium text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {signups.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No referrals yet. Share your referral links to get started!</td></tr>
            )}
            {signups.map((s, i) => (
              <tr key={s.id} className={`border-b last:border-0 ${i % 2 === 1 ? 'bg-muted/30' : ''}`}>
                <td className="p-3 font-medium">{maskName(s.user_id?.substring(0, 4))}</td>
                <td className="p-3">{new Date(s.signed_up_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                <td className="p-3">{s.converted_to_paid ? <span className="tc-badge-active">Yes</span> : <span className="text-muted-foreground">No</span>}</td>
                <td className="p-3 font-semibold text-primary">{s.platform_fee_percent}%</td>
                <td className="p-3">{s.is_referral_active ? <span className="tc-badge-active">Active</span> : <span className="tc-badge-rejected">Expired</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
