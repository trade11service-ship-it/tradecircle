import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { formatINR } from '@/lib/courses';
import { BadgeCheck, ChevronDown, ChevronRight, Download, Loader2, Users, Wallet } from 'lucide-react';

type CreatorRow = {
  creator_id: string;
  full_legal_name: string;
  email: string | null;
  phone: string | null;
  instagram_handle: string | null;
  youtube_channel: string | null;
  kyc_status: string;
  courses_live: number;
  courses_pending: number;
  courses_draft: number;
  sales_count: number;
  gross_revenue: number;
  platform_fee: number;
  creator_net: number;
  settled: number;
  unsettled: number;
  pending_requests: number;
  created_at: string;
};

type PurchaseRow = {
  id: string;
  purchase_timestamp: string;
  invoice_number: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  course_title: string | null;
  creator_id: string;
  creator_name: string | null;
  total_amount: number;
  platform_fee_amount: number;
  creator_payout_amount: number;
  payment_status: string;
  payment_reference_id: string | null;
  payment_method: string | null;
};

type PayoutRow = {
  id: string;
  creator_id: string;
  creator_name: string | null;
  creator_email: string | null;
  period_start: string;
  period_end: string;
  amount: number;
  status: string;
  admin_reference: string | null;
  requested_at: string;
  paid_at: string | null;
  bank_masked: string | null;
  kyc_status: string;
};

function toCsv(rows: Record<string, unknown>[], name: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const body = rows
    .map((r) => headers.map((h) => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([`${headers.join(',')}\n${body}`], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

const d = (v: string | null) => (v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-');

export function CreatorEarningsTab() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [creators, setCreators] = useState<CreatorRow[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [refs, setRefs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: cr, error: e1 }, { data: pu }, { data: pr }] = await Promise.all([
      supabase.rpc('admin_list_creator_earnings'),
      supabase.rpc('admin_list_course_purchases', { _creator_id: null }),
      supabase.rpc('admin_list_payout_requests'),
    ]);
    if (e1) toast({ title: 'Could not load creators', description: e1.message, variant: 'destructive' });
    setCreators((cr as CreatorRow[]) ?? []);
    setPurchases((pu as PurchaseRow[]) ?? []);
    setPayouts((pr as PayoutRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const totals = useMemo(() => ({
    gross: creators.reduce((s, c) => s + Number(c.gross_revenue || 0), 0),
    fee: creators.reduce((s, c) => s + Number(c.platform_fee || 0), 0),
    net: creators.reduce((s, c) => s + Number(c.creator_net || 0), 0),
    owed: creators.reduce((s, c) => s + Number(c.unsettled || 0), 0),
  }), [creators]);

  const markPaid = async (row: PayoutRow) => {
    const reference = (refs[row.id] ?? '').trim();
    if (reference.length < 4) {
      toast({ title: 'Add the bank/UTR reference first', variant: 'destructive' });
      return;
    }
    setBusy(row.id);
    const { error } = await supabase.rpc('admin_mark_payout_paid', {
      _request_id: row.id,
      _reference: reference,
      _note: null,
    });
    setBusy(null);
    if (error) { toast({ title: 'Could not mark paid', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Payout marked as paid' });
    load();
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const pendingPayouts = payouts.filter((p) => p.status === 'requested');

  return (
    <div className="space-y-5">
      {/* Totals */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Course gross revenue', value: formatINR(totals.gross) },
          { label: 'Platform fee earned', value: formatINR(totals.fee) },
          { label: 'Creator net share', value: formatINR(totals.net) },
          { label: 'Outstanding payable', value: formatINR(totals.owed) },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-[20px] font-extrabold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Payout requests */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-[15px] font-extrabold text-foreground">
            <Wallet className="h-4 w-4" /> Payout requests
            {pendingPayouts.length > 0 && (
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                {pendingPayouts.length} pending
              </span>
            )}
          </h3>
          <Button variant="outline" size="sm" className="rounded-lg gap-1"
            onClick={() => toCsv(payouts as unknown as Record<string, unknown>[], 'creator-payout-requests')}>
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
        </div>

        {payouts.length === 0 ? (
          <p className="mt-3 text-[13px] text-muted-foreground">No payout requests yet. Creators can request between Saturday and Sunday.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3 font-semibold">Creator</th>
                  <th className="py-2 pr-3 font-semibold">Period</th>
                  <th className="py-2 pr-3 font-semibold">Amount</th>
                  <th className="py-2 pr-3 font-semibold">Bank</th>
                  <th className="py-2 pr-3 font-semibold">Status</th>
                  <th className="py-2 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => (
                  <tr key={p.id} className="border-b border-border/60 align-middle">
                    <td className="py-2.5 pr-3">
                      <span className="font-bold text-foreground">{p.creator_name}</span>
                      <span className="block text-[11.5px] text-muted-foreground">{p.creator_email}</span>
                    </td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{d(p.period_start)} – {d(p.period_end)}</td>
                    <td className="py-2.5 pr-3 font-bold text-foreground">{formatINR(Number(p.amount))}</td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{p.bank_masked ?? '—'}</td>
                    <td className="py-2.5 pr-3">
                      <span className={`rounded-md px-2 py-1 text-[10.5px] font-bold uppercase ${p.status === 'paid' ? 'bg-emerald/10 text-emerald' : 'bg-amber-500/10 text-amber-700'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-2.5">
                      {p.status === 'paid' ? (
                        <span className="text-[12px] text-muted-foreground">{p.admin_reference} · {d(p.paid_at)}</span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Input
                            value={refs[p.id] ?? ''}
                            onChange={(e) => setRefs((r) => ({ ...r, [p.id]: e.target.value }))}
                            placeholder="UTR / reference"
                            className="h-9 w-[150px] rounded-lg"
                          />
                          <Button size="sm" className="rounded-lg" disabled={busy === p.id} onClick={() => markPaid(p)}>
                            Mark paid
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Creators */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-[15px] font-extrabold text-foreground">
            <Users className="h-4 w-4" /> Creators ({creators.length})
          </h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="rounded-lg gap-1"
              onClick={() => toCsv(creators as unknown as Record<string, unknown>[], 'creator-earnings')}>
              <Download className="h-3.5 w-3.5" /> Creators CSV
            </Button>
            <Button variant="outline" size="sm" className="rounded-lg gap-1"
              onClick={() => toCsv(purchases as unknown as Record<string, unknown>[], 'course-purchases')}>
              <Download className="h-3.5 w-3.5" /> Sales CSV
            </Button>
          </div>
        </div>

        {creators.length === 0 ? (
          <p className="mt-3 text-[13px] text-muted-foreground">No course creators have registered yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {creators.map((c) => {
              const rows = purchases.filter((p) => p.creator_id === c.creator_id);
              const isOpen = open === c.creator_id;
              return (
                <div key={c.creator_id} className="rounded-xl border border-border">
                  <button
                    onClick={() => setOpen(isOpen ? null : c.creator_id)}
                    className="flex w-full flex-wrap items-center gap-3 px-3 py-3 text-left hover:bg-muted/40"
                  >
                    {isOpen ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                    <div className="min-w-[150px] flex-1">
                      <span className="flex items-center gap-1.5 text-[14px] font-bold text-foreground">
                        {c.full_legal_name}
                        {c.kyc_status === 'approved' && <BadgeCheck className="h-3.5 w-3.5 text-emerald" />}
                      </span>
                      <span className="block text-[11.5px] text-muted-foreground">{c.email ?? '—'}</span>
                    </div>
                    <div className="text-[11.5px] text-muted-foreground">
                      {c.courses_live} live · {c.courses_pending} in review · {c.courses_draft} draft
                    </div>
                    <div className="text-right">
                      <span className="block text-[13.5px] font-extrabold text-foreground">{formatINR(Number(c.gross_revenue))}</span>
                      <span className="block text-[11px] text-muted-foreground">{c.sales_count} sale{c.sales_count === 1 ? '' : 's'}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[13.5px] font-extrabold text-emerald">{formatINR(Number(c.unsettled))}</span>
                      <span className="block text-[11px] text-muted-foreground">unpaid</span>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-border px-3 py-3">
                      <div className="grid gap-2 sm:grid-cols-4">
                        {[
                          { l: 'Platform fee', v: formatINR(Number(c.platform_fee)) },
                          { l: 'Creator net', v: formatINR(Number(c.creator_net)) },
                          { l: 'Already paid', v: formatINR(Number(c.settled)) },
                          { l: 'Requested', v: formatINR(Number(c.pending_requests)) },
                        ].map((s) => (
                          <div key={s.l} className="rounded-lg border border-border bg-muted/20 p-2.5">
                            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">{s.l}</p>
                            <p className="mt-0.5 text-[14px] font-bold text-foreground">{s.v}</p>
                          </div>
                        ))}
                      </div>

                      <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Buyers</p>
                      {rows.length === 0 ? (
                        <p className="mt-1.5 text-[12.5px] text-muted-foreground">No purchases yet.</p>
                      ) : (
                        <div className="mt-1.5 overflow-x-auto">
                          <table className="w-full min-w-[700px] text-left text-[12.5px]">
                            <thead>
                              <tr className="border-b border-border text-[10.5px] uppercase tracking-wide text-muted-foreground">
                                <th className="py-1.5 pr-3 font-semibold">Date</th>
                                <th className="py-1.5 pr-3 font-semibold">Invoice</th>
                                <th className="py-1.5 pr-3 font-semibold">Buyer</th>
                                <th className="py-1.5 pr-3 font-semibold">Course</th>
                                <th className="py-1.5 pr-3 font-semibold">Paid</th>
                                <th className="py-1.5 pr-3 font-semibold">Creator net</th>
                                <th className="py-1.5 font-semibold">Reference</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((p) => (
                                <tr key={p.id} className="border-b border-border/60">
                                  <td className="py-1.5 pr-3 text-muted-foreground">{d(p.purchase_timestamp)}</td>
                                  <td className="py-1.5 pr-3 text-muted-foreground">{p.invoice_number ?? '—'}</td>
                                  <td className="py-1.5 pr-3 text-foreground">{p.buyer_name}<span className="block text-[11px] text-muted-foreground">{p.buyer_email}</span></td>
                                  <td className="py-1.5 pr-3 text-foreground">{p.course_title}</td>
                                  <td className="py-1.5 pr-3 font-bold text-foreground">{formatINR(Number(p.total_amount))}</td>
                                  <td className="py-1.5 pr-3 text-foreground">{formatINR(Number(p.creator_payout_amount))}</td>
                                  <td className="py-1.5 text-muted-foreground">{p.payment_reference_id ?? '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
