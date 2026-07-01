import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Copy, Share2, QrCode, Eye, Users, IndianRupee, TrendingUp, Gift, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface ReferralStatsTabProps {
  advisorId: string;
}

interface DashData {
  link: {
    referral_code: string;
    is_active: boolean;
    total_clicks: number;
    total_signups: number;
    total_conversions: number;
    total_revenue_generated: number;
  } | null;
  signups: Array<{
    id: string;
    user_id: string;
    signed_up_at: string;
    converted_to_paid: boolean;
    platform_fee_percent: number;
    user_label: string;
  }>;
  active_subs: Array<{
    id: string;
    group_id: string;
    group_name: string | null;
    amount_paid: number;
    start_date: string;
    end_date: string;
    status: string;
    platform_fee_percent: number;
  }>;
  stats: {
    referral_revenue: number;
    standard_revenue: number;
    referral_subs_count: number;
    fee_saved: number;
  };
}

export function ReferralStatsTab({ advisorId }: ReferralStatsTabProps) {
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    fetchData();
    // Realtime updates for referral signups + subscriptions
    const ch = supabase
      .channel(`ref-dash-${advisorId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'referral_signups', filter: `advisor_id=eq.${advisorId}` }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions', filter: `advisor_id=eq.${advisorId}` }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advisorId]);

  const fetchData = async () => {
    const { data: d, error } = await supabase.rpc('get_advisor_referral_dashboard', { _advisor_id: advisorId });
    if (error) { toast.error('Failed to load referral data'); setLoading(false); return; }
    setData(d as unknown as DashData);
    setLoading(false);
  };

  if (loading) return <div className="py-8 text-center text-muted-foreground">Loading referral stats...</div>;
  if (!data) return <div className="py-8 text-center text-muted-foreground">No data available.</div>;

  const link = data.link;
  const referralUrl = link ? `${window.location.origin}/join/${link.referral_code}` : '';

  const copyLink = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = () => {
    const text = `Join my SEBI-verified signal groups on RA Circle:\n${referralUrl}`;
    if (navigator.share) navigator.share({ title: 'RA Circle', text, url: referralUrl });
    else { navigator.clipboard.writeText(text); toast.success('Copied to clipboard!'); }
  };

  const convRate = link && link.total_clicks > 0 ? Math.round((link.total_conversions / link.total_clicks) * 100) : 0;
  const maskUser = (name: string) => (name || 'User').substring(0, 2) + '••';

  return (
    <div className="space-y-6">
      {/* Permanent Link Card */}
      <div className="rounded-xl border-l-4 border-l-primary bg-card p-5 space-y-3">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <p className="font-semibold text-sm flex items-center gap-2">🎯 Your Permanent Referral Link</p>
            <p className="text-xs text-muted-foreground mt-1">One link for your entire profile · unlocks 15% fee (vs standard 30%) for anyone who joins via this URL.</p>
          </div>
          <span className="text-[10px] text-muted-foreground italic self-start">🔒 Only admin can change</span>
        </div>

        <div className={`flex items-center gap-2 rounded-lg border bg-muted/50 p-2 ${copied ? 'animate-green-flash' : ''}`}>
          <input readOnly value={referralUrl} className="flex-1 bg-transparent text-xs font-mono truncate outline-none" />
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1.5 text-xs flex-1" onClick={copyLink}>
            {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied!' : 'Copy'}
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs flex-1" onClick={shareLink}>
            <Share2 className="h-3.5 w-3.5" /> Share
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs flex-1" onClick={() => setShowQR(v => !v)}>
            <QrCode className="h-3.5 w-3.5" /> QR
          </Button>
        </div>

        {showQR && referralUrl && (
          <div className="flex flex-col items-center gap-3 p-4 rounded-lg border bg-background">
            <QRCodeSVG value={referralUrl} size={180} />
            <p className="text-[11px] text-muted-foreground">Scan to open your referral page</p>
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {[
          { icon: Eye, label: 'Total Clicks', value: link?.total_clicks ?? 0 },
          { icon: Users, label: 'Total Signups', value: link?.total_signups ?? 0 },
          { icon: IndianRupee, label: 'Paid Conversions', value: link?.total_conversions ?? 0 },
          { icon: TrendingUp, label: 'Conv. Rate', value: `${convRate}%` },
          { icon: Gift, label: 'Fee Saved', value: `₹${Number(data.stats.fee_saved || 0).toLocaleString('en-IN')}`, highlight: true },
        ].map((s, i) => (
          <div key={i} className={`rounded-xl border p-4 ${s.highlight ? 'bg-primary/5 border-primary/20' : 'bg-card'}`}>
            <s.icon className={`h-4 w-4 mb-1 ${s.highlight ? 'text-primary' : 'text-muted-foreground'}`} />
            <p className={`text-xl font-bold ${s.highlight ? 'text-primary' : 'text-foreground'}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Referred users table */}
      <div className="rounded-xl border bg-card overflow-x-auto">
        <div className="p-4 border-b"><h3 className="font-bold">Users Who Signed Up Via Your Link</h3></div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="p-3 font-medium text-muted-foreground">User</th>
              <th className="p-3 font-medium text-muted-foreground">Signed Up</th>
              <th className="p-3 font-medium text-muted-foreground">Paid</th>
              <th className="p-3 font-medium text-muted-foreground">Fee Rate</th>
            </tr>
          </thead>
          <tbody>
            {data.signups.length === 0 && (
              <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No signups yet. Share your link to start earning at the 15% rate!</td></tr>
            )}
            {data.signups.map((s, i) => (
              <tr key={s.id} className={`border-b last:border-0 ${i % 2 === 1 ? 'bg-muted/30' : ''}`}>
                <td className="p-3 font-medium">{maskUser(s.user_label)}</td>
                <td className="p-3">{new Date(s.signed_up_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                <td className="p-3">{s.converted_to_paid ? <span className="tc-badge-active">Yes</span> : <span className="text-muted-foreground">Not yet</span>}</td>
                <td className="p-3 font-semibold text-primary">{s.platform_fee_percent ?? 15}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Active referred subscriptions */}
      <div className="rounded-xl border bg-card overflow-x-auto">
        <div className="p-4 border-b"><h3 className="font-bold">Active Referred Subscriptions</h3></div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left">
              <th className="p-3 font-medium text-muted-foreground">Group</th>
              <th className="p-3 font-medium text-muted-foreground">Amount</th>
              <th className="p-3 font-medium text-muted-foreground">Start</th>
              <th className="p-3 font-medium text-muted-foreground">Ends</th>
              <th className="p-3 font-medium text-muted-foreground">Status</th>
              <th className="p-3 font-medium text-muted-foreground">Fee</th>
            </tr>
          </thead>
          <tbody>
            {data.active_subs.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No referred subscriptions yet.</td></tr>
            )}
            {data.active_subs.map((s, i) => (
              <tr key={s.id} className={`border-b last:border-0 ${i % 2 === 1 ? 'bg-muted/30' : ''}`}>
                <td className="p-3 font-medium">{s.group_name || '—'}</td>
                <td className="p-3 tc-amount">₹{Number(s.amount_paid || 0).toLocaleString('en-IN')}</td>
                <td className="p-3">{s.start_date ? new Date(s.start_date).toLocaleDateString('en-IN') : '—'}</td>
                <td className="p-3">{s.end_date ? new Date(s.end_date).toLocaleDateString('en-IN') : '—'}</td>
                <td className="p-3">{s.status === 'active' ? <span className="tc-badge-active">Active</span> : <span className="tc-badge-rejected">{s.status}</span>}</td>
                <td className="p-3 font-semibold text-primary">{s.platform_fee_percent}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
