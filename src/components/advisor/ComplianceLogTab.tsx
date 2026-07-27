import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { FileText, Loader2, ShieldCheck } from 'lucide-react';

type OnboardingRow = {
  id: string;
  created_at: string;
  pan_masked: string | null;
  kra_status: string | null;
  consent_timestamp: string | null;
  consent_ip_address: string | null;
  payment_status: string | null;
  payment_reference_id: string | null;
  pdf_vault_url: string | null;
  group_id: string;
  user_id: string;
};

/** SEBI client compliance register for a research analyst. */
export function ComplianceLogTab({ advisorId }: { advisorId: string }) {
  const [rows, setRows] = useState<OnboardingRow[]>([]);
  const [groupNames, setGroupNames] = useState<Record<string, string>>({});
  const [clientNames, setClientNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('client_onboarding')
        .select('id, created_at, pan_masked, kra_status, consent_timestamp, consent_ip_address, payment_status, payment_reference_id, pdf_vault_url, group_id, user_id')
        .eq('advisor_id', advisorId)
        .order('created_at', { ascending: false });

      const list = (data as OnboardingRow[]) || [];
      setRows(list);

      const groupIds = [...new Set(list.map((r) => r.group_id))];
      const userIds = [...new Set(list.map((r) => r.user_id))];
      const [{ data: groups }, { data: profiles }] = await Promise.all([
        groupIds.length ? supabase.from('groups').select('id, name').in('id', groupIds) : Promise.resolve({ data: [] as any }),
        userIds.length ? supabase.from('profiles').select('id, full_name').in('id', userIds) : Promise.resolve({ data: [] as any }),
      ]);
      setGroupNames(Object.fromEntries((groups || []).map((g: any) => [g.id, g.name])));
      setClientNames(Object.fromEntries((profiles || []).map((p: any) => [p.id, p.full_name])));
      setLoading(false);
    })();
  }, [advisorId]);

  const download = async (onboardingId: string) => {
    setDownloading(onboardingId);
    const { data, error } = await supabase.functions.invoke('compliance-doc-url', {
      body: { onboarding_id: onboardingId },
    });
    setDownloading(null);
    if (error || data?.error || !data?.url) {
      toast.error(data?.error || 'Agreement is not available yet');
      return;
    }
    window.open(data.url, '_blank', 'noopener');
  };

  const exportCsv = () => {
    const header = ['Onboarded on', 'Client', 'Package', 'PAN (masked)', 'KRA status', 'Consent at', 'Consent IP', 'Payment status', 'Payment reference'];
    const lines = rows.map((r) => [
      new Date(r.created_at).toISOString(),
      clientNames[r.user_id] || '',
      groupNames[r.group_id] || '',
      r.pan_masked || '',
      r.kra_status || '',
      r.consent_timestamp || '',
      r.consent_ip_address || '',
      r.payment_status || '',
      r.payment_reference_id || '',
    ]);
    const csv = [header, ...lines].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `ra-circle-compliance-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading compliance register…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
          <p className="max-w-xl text-[12px] leading-relaxed text-muted-foreground">
            Every subscriber's identity check, MITC acceptance and payment reference, retained for five years. Client
            PAN is stored encrypted and only ever shown masked.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={exportCsv} disabled={!rows.length}>
          Export CSV
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground opacity-40" />
          <p className="mt-2 text-sm font-semibold">No client records yet</p>
          <p className="text-xs text-muted-foreground">Records appear here as soon as a subscriber completes onboarding.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-[12px]">
            <thead className="bg-muted">
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2 font-bold">Date</th>
                <th className="px-3 py-2 font-bold">Client</th>
                <th className="px-3 py-2 font-bold">Package</th>
                <th className="px-3 py-2 font-bold">PAN</th>
                <th className="px-3 py-2 font-bold">KYC</th>
                <th className="px-3 py-2 font-bold">Consent</th>
                <th className="px-3 py-2 font-bold">Payment</th>
                <th className="px-3 py-2 font-bold">Agreement</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-3 py-2 whitespace-nowrap">{new Date(r.created_at).toLocaleDateString('en-IN')}</td>
                  <td className="px-3 py-2">{clientNames[r.user_id] || '—'}</td>
                  <td className="px-3 py-2">{groupNames[r.group_id] || '—'}</td>
                  <td className="px-3 py-2 font-mono">{r.pan_masked || '—'}</td>
                  <td className="px-3 py-2">{r.kra_status || '—'}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {r.consent_timestamp ? new Date(r.consent_timestamp).toLocaleString('en-IN') : 'Pending'}
                  </td>
                  <td className="px-3 py-2">
                    <span className={r.payment_status === 'captured' ? 'font-semibold text-primary' : 'text-muted-foreground'}>
                      {r.payment_status === 'captured' ? 'Captured' : 'Pending'}
                    </span>
                    {r.payment_reference_id && (
                      <span className="ml-1 font-mono text-[10px] text-muted-foreground">{r.payment_reference_id}</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {r.pdf_vault_url ? (
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => download(r.id)} disabled={downloading === r.id}>
                        {downloading === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Download PDF'}
                      </Button>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ComplianceLogTab;
