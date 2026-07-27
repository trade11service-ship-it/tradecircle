import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1';
import { corsHeaders, json, decryptValue, buildMitc, MITC_VERSION } from '../_shared/compliance.ts';

/**
 * Hardened agreement generator.
 * Decrypts the PAN in memory only, burns the full record into a flattened PDF
 * (text-only, no form fields, so nothing is editable), stores it in the private
 * compliance-vault bucket and notifies both parties.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { onboarding_id } = await req.json().catch(() => ({}));
    if (!onboarding_id) return json({ error: 'onboarding_id is required' }, 400);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: onboarding } = await admin
      .from('client_onboarding')
      .select('*')
      .eq('id', onboarding_id)
      .maybeSingle();
    if (!onboarding) return json({ error: 'Onboarding not found' }, 404);
    if (onboarding.payment_status !== 'captured') return json({ error: 'Payment is not captured' }, 400);
    if (onboarding.pdf_vault_url) return json({ ok: true, pdf_path: onboarding.pdf_vault_url, cached: true });

    const [{ data: group }, { data: advisor }, { data: profile }] = await Promise.all([
      admin.from('groups').select('id, name, monthly_price, duration_days').eq('id', onboarding.group_id).maybeSingle(),
      admin.from('advisors').select('id, full_name, sebi_reg_no, email').eq('id', onboarding.advisor_id).maybeSingle(),
      admin.from('profiles').select('id, full_name, email').eq('id', onboarding.user_id).maybeSingle(),
    ]);
    if (!group || !advisor) return json({ error: 'Group or analyst missing' }, 404);

    const fullPan = onboarding.encrypted_pan ? await decryptValue(onboarding.encrypted_pan) : 'NOT PROVIDED';

    /* ---------------- Build the PDF ---------------- */
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const MARGIN = 50;
    const WIDTH = 595.28;
    const HEIGHT = 841.89;
    const MAX = WIDTH - MARGIN * 2;
    let page = pdf.addPage([WIDTH, HEIGHT]);
    let y = HEIGHT - MARGIN;

    const wrap = (text: string, size: number, f = font) => {
      const words = text.split(/\s+/);
      const lines: string[] = [];
      let line = '';
      for (const w of words) {
        const candidate = line ? `${line} ${w}` : w;
        if (f.widthOfTextAtSize(candidate, size) > MAX) {
          if (line) lines.push(line);
          line = w;
        } else {
          line = candidate;
        }
      }
      if (line) lines.push(line);
      return lines;
    };

    const write = (text: string, opts: { size?: number; bold?: boolean; gap?: number; color?: [number, number, number] } = {}) => {
      const size = opts.size ?? 10;
      const f = opts.bold ? bold : font;
      const color = opts.color ?? [0.12, 0.16, 0.22];
      for (const line of wrap(text, size, f)) {
        if (y < MARGIN + 40) {
          page = pdf.addPage([WIDTH, HEIGHT]);
          y = HEIGHT - MARGIN;
        }
        page.drawText(line, { x: MARGIN, y, size, font: f, color: rgb(color[0], color[1], color[2]) });
        y -= size + 4;
      }
      y -= opts.gap ?? 4;
    };

    const rule = () => {
      if (y < MARGIN + 40) { page = pdf.addPage([WIDTH, HEIGHT]); y = HEIGHT - MARGIN; }
      page.drawLine({ start: { x: MARGIN, y }, end: { x: WIDTH - MARGIN, y }, thickness: 0.8, color: rgb(0.8, 0.84, 0.89) });
      y -= 14;
    };

    write('RESEARCH ANALYST SUBSCRIPTION AGREEMENT', { size: 16, bold: true });
    write('Most Important Terms & Conditions (SEBI Research Analyst Regulations, 2014)', { size: 9.5, color: [0.4, 0.45, 0.52] });
    write(`Agreement reference: ${onboarding.id}  |  MITC version: ${onboarding.mitc_version ?? MITC_VERSION}`, { size: 9, color: [0.4, 0.45, 0.52], gap: 8 });
    rule();

    write('1. RESEARCH ANALYST', { size: 11, bold: true, gap: 2 });
    write(`Name: ${advisor.full_name}`);
    write(`SEBI Registration Number: ${advisor.sebi_reg_no}`);
    write(`Research package: ${group.name}`);
    write(`Fee: INR ${group.monthly_price} for ${group.duration_days ?? 30} days`, { gap: 8 });

    write('2. SUBSCRIBER', { size: 11, bold: true, gap: 2 });
    write(`Name: ${profile?.full_name || 'Not provided'}`);
    write(`Email: ${profile?.email || 'Not provided'}`);
    write(`PAN: ${fullPan}`);
    write(`KYC status: ${onboarding.kra_status ?? 'N/A'}  |  KYC reference: ${onboarding.kyc_reference_id ?? 'N/A'}`, { gap: 8 });

    write('3. EXECUTION & CONSENT METADATA', { size: 11, bold: true, gap: 2 });
    write(`Consent accepted at (UTC): ${onboarding.consent_timestamp ?? 'N/A'}`);
    write(`IP address: ${onboarding.consent_ip_address ?? 'N/A'}`);
    write(`Browser user-agent: ${onboarding.consent_user_agent ?? 'N/A'}`);
    write(`Payment reference: ${onboarding.payment_reference_id ?? 'N/A'}`);
    write(`Document generated at (UTC): ${new Date().toISOString()}`, { gap: 8 });
    rule();

    write('4. MOST IMPORTANT TERMS & CONDITIONS', { size: 11, bold: true, gap: 4 });
    for (const clause of buildMitc({
      advisorName: advisor.full_name,
      sebiRegNo: advisor.sebi_reg_no,
      groupName: group.name,
      price: Number(group.monthly_price),
      durationDays: Number(group.duration_days ?? 30),
    })) {
      write(clause, { size: 9.5, gap: 4 });
    }

    rule();
    write(
      'This document was generated electronically and constitutes a flattened, non-editable record executed by the subscriber through click-wrap acceptance. RA Circle (STREZONIC PRIVATE LIMITED, CIN U62099MH2025PTC453360) acts solely as a technology service provider and is not a party to this advisory relationship.',
      { size: 8.5, color: [0.4, 0.45, 0.52] },
    );

    pdf.setTitle(`RA Circle Agreement ${onboarding.id}`);
    pdf.setProducer('RA Circle Compliance Vault');
    pdf.setCreator('RA Circle');
    const bytes = await pdf.save();

    /* ---------------- Store in the vault ---------------- */
    const path = `${onboarding.advisor_id}/${onboarding.id}.pdf`;
    const { error: upErr } = await admin.storage
      .from('compliance-vault')
      .upload(path, bytes, { contentType: 'application/pdf', upsert: true });
    if (upErr) throw upErr;

    await admin.from('client_onboarding').update({ pdf_vault_url: path }).eq('id', onboarding.id);

    await admin.from('compliance_logs').insert({
      onboarding_id: onboarding.id,
      ra_id: onboarding.advisor_id,
      user_id: onboarding.user_id,
      client_email: profile?.email ?? null,
      event_type: 'PDF_HARDENED',
      metadata_json: { path, bytes: bytes.length },
    });

    /* ---------------- Notify both parties ---------------- */
    const { data: signed } = await admin.storage
      .from('compliance-vault')
      .createSignedUrl(path, 60 * 60 * 24 * 7);

    const link = signed?.signedUrl;
    if (link) {
      const html = `<div style="font-family:Arial,sans-serif;color:#1f2937;max-width:640px;margin:0 auto;padding:24px">
        <h2 style="margin:0 0 12px">Your signed research subscription agreement</h2>
        <p><strong>${group.name}</strong> by ${advisor.full_name} (SEBI Reg. ${advisor.sebi_reg_no})</p>
        <p>A hardened copy of the SEBI MITC agreement for this subscription has been generated and archived.</p>
        <p style="margin:24px 0"><a href="${link}" style="background:#0EA5E9;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700">Download agreement (PDF)</a></p>
        <p style="font-size:12px;color:#64748B">This download link expires in 7 days. You can always re-download it from your RA Circle account.</p>
      </div>`;
      const text = `Your agreement for ${group.name} is ready: ${link}`;

      for (const [recipient, label] of [
        [profile?.email, 'client'],
        [advisor.email, 'advisor'],
      ] as const) {
        if (!recipient) continue;
        const messageId = `compliance-agreement-${onboarding.id}-${label}`;
        await admin.from('email_send_log').insert({
          message_id: messageId,
          template_name: 'compliance-agreement',
          recipient_email: recipient,
          status: 'queued',
          metadata: { onboarding_id: onboarding.id, role: label },
        });
        await admin.rpc('enqueue_email', {
          queue_name: 'transactional_emails',
          payload: {
            message_id: messageId,
            to: recipient,
            from: 'notify@notify.racircle.in',
            sender_domain: 'notify.racircle.in',
            subject: `Your SEBI subscription agreement — ${group.name}`,
            html,
            text,
            purpose: 'transactional',
            label: 'compliance-agreement',
            idempotency_key: messageId,
            queued_at: new Date().toISOString(),
          },
        });
      }
    }

    return json({ ok: true, pdf_path: path });
  } catch (error) {
    console.error('generate-compliance-pdf failed:', error);
    return json({ error: (error as Error).message }, 500);
  }
});
