import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Copy, Share2, QrCode, Eye, Users, IndianRupee, TrendingUp, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface ReferralLinkCardProps {
  groupId: string;
  groupName: string;
  advisorId: string;
  advisorName: string;
}

export function ReferralLinkCard({ groupId, groupName, advisorId, advisorName }: ReferralLinkCardProps) {
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [stats, setStats] = useState({ clicks: 0, signups: 0, conversions: 0, revenue: 0 });
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [fetched, setFetched] = useState(false);

  const generateCode = () => {
    const namePrefix = advisorName.replace(/[^A-Za-z]/g, '').substring(0, 3).toUpperCase() || 'ADV';
    const groupPrefix = groupId.substring(0, 4).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `TC-${namePrefix}-${groupPrefix}-${random}`;
  };

  const getReferralLink = async () => {
    if (fetched) return;
    setLoading(true);
    // Check if referral link already exists
    const { data: existing } = await supabase
      .from('referral_links')
      .select('*')
      .eq('advisor_id', advisorId)
      .eq('group_id', groupId)
      .maybeSingle();

    if (existing) {
      setReferralCode(existing.referral_code);
      setStats({
        clicks: existing.total_clicks || 0,
        signups: existing.total_signups || 0,
        conversions: existing.total_conversions || 0,
        revenue: existing.total_revenue_generated || 0,
      });
    } else {
      const code = generateCode();
      const { error } = await supabase.from('referral_links').insert({
        advisor_id: advisorId,
        group_id: groupId,
        referral_code: code,
      });
      if (error) {
        toast.error('Failed to generate referral link');
        setLoading(false);
        return;
      }
      setReferralCode(code);
    }
    setFetched(true);
    setLoading(false);
  };

  const referralUrl = referralCode ? `${window.location.origin}/join/${referralCode}` : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    const text = `Join my trading signal group on TradeCircle!\nGet SEBI-verified signals directly to your Telegram. Check my track record here:\n${referralUrl}`;
    if (navigator.share) {
      navigator.share({ title: `Join ${groupName} on TradeCircle`, text, url: referralUrl });
    } else {
      navigator.clipboard.writeText(text);
      toast.success('Share message copied!');
    }
  };

  const downloadQR = () => {
    const svg = document.querySelector(`#qr-${groupId} svg`);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    canvas.width = 400; canvas.height = 400;
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, 400, 400);
      ctx.drawImage(img, 0, 0, 400, 400);
      const a = document.createElement('a');
      a.download = `referral-${referralCode}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const convRate = stats.clicks > 0 ? Math.round((stats.conversions / stats.clicks) * 100) : 0;

  if (!fetched) {
    return (
      <div className="mt-4 rounded-xl border-l-4 border-l-primary bg-card p-4">
        <p className="font-semibold text-sm flex items-center gap-2">📨 Share & Earn More</p>
        <p className="text-xs text-muted-foreground mt-1">Share your group link. Subscribers who join through your link pay only 15% platform fee instead of 30%.</p>
        <Button size="sm" className="mt-3 gap-2" onClick={getReferralLink} disabled={loading}>
          {loading ? 'Generating...' : '🔗 Get Referral Link'}
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border-l-4 border-l-primary bg-card p-4 space-y-3">
      <div>
        <p className="font-semibold text-sm flex items-center gap-2">📨 Share & Earn More</p>
        <p className="text-xs text-muted-foreground mt-1">Subscribers via this link → 15% platform fee instead of 30%</p>
      </div>

      {/* Link box */}
      <div className={`flex items-center gap-2 rounded-lg border bg-muted/50 p-2 ${copied ? 'animate-green-flash' : ''}`}>
        <input
          readOnly
          value={referralUrl}
          className="flex-1 bg-transparent text-xs font-mono truncate outline-none"
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" className="gap-1.5 text-xs flex-1" onClick={handleCopy}>
          {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied!' : 'Copy'}
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs flex-1" onClick={handleShare}>
          <Share2 className="h-3.5 w-3.5" /> Share
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5 text-xs flex-1" onClick={() => setShowQR(!showQR)}>
          <QrCode className="h-3.5 w-3.5" /> QR
        </Button>
      </div>

      {/* QR Modal */}
      {showQR && (
        <div className="flex flex-col items-center gap-3 p-4 rounded-lg border bg-background">
          <div id={`qr-${groupId}`}>
            <QRCodeSVG value={referralUrl} size={180} />
          </div>
          <Button size="sm" variant="outline" onClick={downloadQR} className="text-xs">Download QR</Button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { icon: Eye, value: stats.clicks, label: 'Clicks' },
          { icon: Users, value: stats.signups, label: 'Signups' },
          { icon: IndianRupee, value: stats.conversions, label: 'Paid' },
          { icon: TrendingUp, value: `${convRate}%`, label: 'Conv.' },
        ].map((s, i) => (
          <div key={i} className="rounded-lg bg-muted/50 p-2 text-center">
            <p className="text-sm font-bold text-foreground">{s.value}</p>
            <p className="text-[10px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
