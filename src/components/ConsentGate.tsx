import { useState } from "react";
import { Link } from "react-router-dom";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GENERAL_TERMS_TEXT, getDeviceInfo, getIpAddress } from "@/lib/legalTexts";
import { toast } from "sonner";

interface Props {
  userId: string;
  fullName: string;
  email: string;
  onAccepted: () => void;
  onDecline: () => void;
}

export function ConsentGate({ userId, fullName, email, onAccepted, onDecline }: Props) {
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);

  const accept = async () => {
    if (!checked || busy) return;
    setBusy(true);
    try {
      const ip = await getIpAddress();
      const { error } = await supabase.from("user_legal_acceptances").insert({
        user_id: userId,
        full_name: fullName || "User",
        email: email || "",
        acceptance_type: "general_terms",
        checkbox_text: GENERAL_TERMS_TEXT,
        accepted: true,
        ip_address: ip,
        user_agent: navigator.userAgent,
        device_info: getDeviceInfo(),
        page_url: window.location.href,
      });
      if (error) throw error;
      onAccepted();
    } catch (e: any) {
      toast.error(e?.message || "Could not record consent. Please try again.");
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onKeyDown={(e) => e.stopPropagation()}
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <Logo size={32} />
          <div className="h-6 w-px bg-border" />
          <div className="inline-flex items-center gap-1 rounded-full bg-emerald/10 px-2 py-0.5 text-[11px] font-semibold text-emerald">
            <ShieldCheck className="h-3 w-3" /> DPDP Act 2023
          </div>
        </div>
        <h2 className="text-[18px] font-bold text-foreground">One-time consent</h2>
        <p className="mt-2 text-[13px] text-muted-foreground leading-relaxed">
          Before you continue, please confirm you accept our terms. We ask this only once — you won't be prompted again.
        </p>

        <label
          htmlFor="consent-gate-check"
          className="mt-4 flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 cursor-pointer"
        >
          <Checkbox
            id="consent-gate-check"
            checked={checked}
            onCheckedChange={(v) => setChecked(!!v)}
            className="mt-0.5"
          />
          <span className="text-[12px] leading-snug text-muted-foreground">
            Your data is protected under India's DPDP Act 2023. We encrypt every session and never share your information with third parties. By continuing, you agree to our{" "}
            <Link to="/terms" className="text-primary underline">Terms</Link> &{" "}
            <Link to="/privacy" className="text-primary underline">Privacy Policy</Link>.
          </span>
        </label>

        <div className="mt-5 flex flex-col-reverse sm:flex-row gap-2">
          <Button
            variant="outline"
            className="flex-1 h-11 rounded-[10px] border-border text-[13px] font-semibold"
            onClick={onDecline}
            disabled={busy}
          >
            Decline & sign out
          </Button>
          <Button
            className="flex-1 h-11 rounded-[10px] text-[13px] font-semibold"
            onClick={accept}
            disabled={!checked || busy}
          >
            {busy ? "Saving…" : "Agree & Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
