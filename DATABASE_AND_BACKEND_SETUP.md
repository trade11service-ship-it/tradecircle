# TradeCircle Backend & Database Implementation Guide

**Document Date**: March 25, 2026  
**Scope**: Complete setup for all 3 phases + email functions + missing migrations

---

## TABLE OF CONTENTS
1. [Database Migrations](#database-migrations)
2. [Supabase Edge Functions (Email)](#supabase-edge-functions-for-email)
3. [Supabase Environment Variables](#supabase-environment-variables)
4. [Database Functions & Triggers](#database-functions--triggers)
5. [Testing Checklist](#testing-checklist)

---

## DATABASE MIGRATIONS

### Migration 1: Add PAN & Consent to Subscriptions (ALREADY CREATED)
**File**: `supabase/migrations/20260325_add_pan_consent_to_subscriptions.sql`  
**Status**: ✅ READY TO DEPLOY

**What it does**:
- Adds `pan_number` (text) - PAN required for SEBI compliance
- Adds `consent_given` (boolean) - Whether user consented to research service terms
- Adds `consent_timestamp` (timestamptz) - UTC timestamp of consent
- Adds `consent_ip` (text) - IP address when consent was given

**How to deploy**:
```bash
# Via Supabase CLI
supabase db push

# OR via Supabase Dashboard:
# 1. Go to SQL Editor
# 2. Paste the migration SQL file content
# 3. Click "Run"
```

**Verify in Supabase Dashboard**:
```sql
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'subscriptions' 
AND column_name IN ('pan_number', 'consent_given', 'consent_timestamp', 'consent_ip');
```

Should return 4 rows with the new columns.

---

## SUPABASE EDGE FUNCTIONS FOR EMAIL

### What Are Edge Functions?
Supabase Edge Functions are serverless functions that run in Deno runtime. They're perfect for sending emails because they:
- Run in the cloud (no server setup needed)
- Can be called from frontend with authentication
- Have access to Supabase database & auth
- Can call external services (email APIs)

### Email Service Options
Choose ONE of these:

**Option A: SendGrid (RECOMMENDED)**
- Free tier: 100 emails/day
- Cost: $0.10/email after free tier
- Sign up: https://sendgrid.com

**Option B: Resend** 
- Free tier: 3,500 emails/month
- Cost: Pay as you go (~$0.2/email)
- Sign up: https://resend.com

**Option C: Gmail SMTP** (Only for testing)
- Free but requires App Password
- Not recommended for production
- Limited to 500/day

---

### Function 1: Send Advisor Approval Email

**File to create**: `supabase/functions/send-advisor-approval-email/index.ts`

**Code**:
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user?.user_metadata?.role !== 'admin') throw new Error('Admin only');

    const { advisor_id, email, full_name } = await req.json();

    // Send email using SendGrid
    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
    if (!SENDGRID_API_KEY) throw new Error('SendGrid not configured');

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email }] }],
        from: { email: 'noreply@tradecircle.in', name: 'TradeCircle Team' },
        subject: 'Your TradeCircle Advisor Account Has Been Approved! 🎉',
        html: `
          <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
            <h1 style="color: #1B5E20;">Congratulations!</h1>
            <p>Hi <strong>${full_name}</strong>,</p>
            <p>Your TradeCircle advisor application has been <strong>approved</strong>!</p>
            <p>You can now:</p>
            <ul>
              <li>Login to your advisor dashboard</li>
              <li>Create trading groups</li>
              <li>Post trading signals</li>
              <li>Start earning from subscribers</li>
            </ul>
            <p style="margin-top: 30px;">
              <a href="https://tradecircle.in/advisor/dashboard" 
                 style="background-color: #1B5E20; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 6px; display: inline-block;">
                Go to Dashboard
              </a>
            </p>
            <p style="color: #999; font-size: 12px; margin-top: 40px;">
              SEBI Disclaimer: You are SEBI registered (INH). You are solely responsible for regulatory compliance.
            </p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('SendGrid error:', error);
      throw new Error(`Email failed: ${response.status}`);
    }

    return new Response(JSON.stringify({ success: true, advisor_id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

**Where to create it**:
1. Create folder: `supabase/functions/send-advisor-approval-email/`
2. Create file: `index.ts`
3. Copy code above

---

### Function 2: Send Advisor Rejection Email

**File to create**: `supabase/functions/send-advisor-rejection-email/index.ts`

**Code**:
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user?.user_metadata?.role !== 'admin') throw new Error('Admin only');

    const { advisor_id, email, full_name, rejection_reason } = await req.json();

    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
    if (!SENDGRID_API_KEY) throw new Error('SendGrid not configured');

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email }] }],
        from: { email: 'noreply@tradecircle.in', name: 'TradeCircle Team' },
        subject: 'TradeCircle Application - Action Required',
        html: `
          <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
            <h1 style="color: #D32F2F;">Application Under Review</h1>
            <p>Hi <strong>${full_name}</strong>,</p>
            <p>We've reviewed your TradeCircle advisor application. To proceed, please address the following:</p>
            <div style="background-color: #FFF3E0; border-left: 4px solid #FF9800; padding: 16px; margin: 20px 0;">
              <p style="color: #E65100; margin: 0;"><strong>Reason:</strong></p>
              <p style="color: #E65100; margin: 8px 0 0 0;">${rejection_reason}</p>
            </div>
            <p style="margin-top: 20px;">You can reapply once you've addressed these points.</p>
            <p style="margin-top: 30px;">
              <a href="https://tradecircle.in/advisor/register" 
                 style="background-color: #1B5E20; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 6px; display: inline-block;">
                Reapply Now
              </a>
            </p>
            <p style="color: #999; font-size: 12px; margin-top: 40px; border-top: 1px solid #ddd; padding-top: 20px;">
              Questions? Email us: support@tradecircle.in
            </p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('SendGrid error:', error);
      throw new Error(`Email failed: ${response.status}`);
    }

    return new Response(JSON.stringify({ success: true, advisor_id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

**Where to create it**:
1. Create folder: `supabase/functions/send-advisor-rejection-email/`
2. Create file: `index.ts`
3. Copy code above

---

## SUPABASE ENVIRONMENT VARIABLES

After setting up SendGrid account, add these secrets to Supabase:

**In Supabase Dashboard**:
1. Go to: **Settings** → **Secrets**
2. Add these environment variables:

| Variable | Value | Where to get |
|----------|-------|--------------|
| `SENDGRID_API_KEY` | Your SendGrid API key | https://app.sendgrid.com/settings/api_keys |
| `SENDGRID_FROM_EMAIL` | noreply@tradecircle.in | Your domain / SendGrid verified sender |

**If you don't have a verified domain yet**:
- Use SendGrid's default: `hello@[your-sendgrid-subdomain].com`
- Replace in email functions above

---

## DATABASE FUNCTIONS & TRIGGERS

### Function 1: Auto-populate signal stats (ALREADY EXISTS)
**Name**: `get_advisor_signal_stats`  
**Status**: ✅ READY (already in migrations)

Used by: Advisor profile page to calculate accuracy

**Verify it exists**:
```sql
SELECT proname FROM pg_proc WHERE proname = 'get_advisor_signal_stats';
```

---

### Function 2: Get subscriber count (ALREADY EXISTS)
**Name**: `get_advisor_subscriber_count`  
**Status**: ✅ READY (already in migrations)

Used by: Public advisor cards to show subscriber count

---

### Function 3: Check if user is admin (ALREADY EXISTS)
**Name**: `is_admin`  
**Status**: ✅ READY (already in migrations)

Used by: Row-level security policies to restrict admin pages

---

### Function 4: Record subscription earnings (ALREADY EXISTS)
**Name**: `record_subscription_earning`  
**Trigger**: `on_subscription_created`  
**Status**: ✅ READY (already in migrations)

**What it does**:
- When subscription created → auto-populates `advisor_daily_earnings`
- Calculates: gross - GST - platform fee = net
- Used for admin revenue dashboard

**Verify trigger exists**:
```sql
SELECT trigger_name FROM information_schema.triggers 
WHERE trigger_name = 'on_subscription_created';
```

---

## TESTING CHECKLIST

### Phase 1: Subscription Flow (PAN + Consent)
- [ ] User can subscribe from advisor profile
- [ ] Modal appears asking for PAN + Consent checkbox
- [ ] PAN validation works (ABCDE1234F format)
- [ ] Consent checkbox required
- [ ] Payment redirects to Razorpay
- [ ] After payment, subscription created with:
  - [ ] `pan_number` saved
  - [ ] `consent_given` = true
  - [ ] `consent_timestamp` recorded

**Test SQL**:
```sql
SELECT user_id, pan_number, consent_given, consent_timestamp 
FROM subscriptions 
WHERE consent_given = true 
ORDER BY created_at DESC 
LIMIT 5;
```

---

### Phase 2: Admin Approvals (Email Functions)
- [ ] Admin can view pending advisor applications
- [ ] "View Application" modal shows all details
- [ ] SEBI verification button opens sebi.gov.in
- [ ] Approve button:
  - [ ] Updates advisor status to "approved"
  - [ ] Updates profile role to "advisor"
  - [ ] Sends approval email (if SendGrid configured)
  
- [ ] Reject button:
  - [ ] Opens rejection modal with reason input
  - [ ] Validates reason (min 10 chars)
  - [ ] Saves rejection_reason to DB
  - [ ] Sends rejection email (if SendGrid configured)

**Test SQL**:
```sql
-- Check advisor status after approval
SELECT id, full_name, status, created_at 
FROM advisors 
WHERE status IN ('approved', 'rejected') 
ORDER BY created_at DESC 
LIMIT 10;

-- Check rejection reasons
SELECT id, full_name, rejection_reason 
FROM advisors 
WHERE rejection_reason IS NOT NULL 
LIMIT 10;
```

---

### Phase 3: Emails (Setup & Testing)
**After deploying Edge Functions**:

1. **Test Approval Email**:
   - Deploy both edge functions to Supabase
   - Go to Admin Dashboard → Pending
   - Click Approve on any pending advisor
   - Check advisor's email inbox (and spam folder)
   - Should receive: "Your TradeCircle Advisor Account Has Been Approved"

2. **Test Rejection Email**:
   - Go to Admin Dashboard → Pending
   - Click Reject on any pending advisor
   - Enter rejection reason
   - Check advisor's email (and spam folder)
   - Should receive: "Application Under Review" with reason

3. **Verify in Supabase Logs**:
   - Go to: **Functions** → **send-advisor-approval-email**
   - Click **Logs**
   - Should see successful calls with no errors

---

## DEPLOYMENT STEPS (IN ORDER)

### Step 1: Deploy Database Migration
```bash
cd supabase
supabase db push
# OR use Supabase Dashboard → SQL Editor → paste migration SQL
```

### Step 2: Create SendGrid Account
1. Go to https://sendgrid.com/
2. Sign up (free tier: 100/day)
3. Verify sender domain OR use SendGrid default
4. Create API key at: Settings → API Keys
5. Copy the API key

### Step 3: Add Secrets to Supabase
1. Supabase Dashboard → Settings → Secrets
2. Add: `SENDGRID_API_KEY` = [your API key from step 2]
3. Click Save

### Step 4: Deploy Edge Functions
```bash
# Navigate to functions directory
cd supabase/functions

# Create approval function
mkdir send-advisor-approval-email
# Create: send-advisor-approval-email/index.ts with code above

# Create rejection function  
mkdir send-advisor-rejection-email
# Create: send-advisor-rejection-email/index.ts with code above

# Deploy to Supabase
supabase functions deploy send-advisor-approval-email
supabase functions deploy send-advisor-rejection-email
```

OR via Supabase Dashboard:
1. Go to **Functions**
2. Create New Function
3. Name: `send-advisor-approval-email`
4. Paste code above
5. Deploy
6. Repeat for `send-advisor-rejection-email`

### Step 5: Test Everything
Follow Testing Checklist above ↑

---

## FILES TO CREATE/MODIFY

| File | Action | Type |
|------|--------|------|
| `supabase/migrations/20260325_add_pan_consent_to_subscriptions.sql` | ALREADY EXISTS | ✅ Ready |
| `supabase/functions/send-advisor-approval-email/index.ts` | CREATE | Email function |
| `supabase/functions/send-advisor-rejection-email/index.ts` | CREATE | Email function |
| `src/components/SubscriptionModal.tsx` | ALREADY EXISTS | ✅ Done |
| `src/components/ViewApplicationModal.tsx` | ALREADY EXISTS | ✅ Done |
| `src/components/RejectApplicationModal.tsx` | ALREADY EXISTS | ✅ Done |
| `src/pages/AdvisorProfile.tsx` | ALREADY MODIFIED | ✅ Done |
| `src/pages/AdminDashboard.tsx` | ALREADY MODIFIED | ✅ Done |
| `src/pages/PaymentSuccess.tsx` | ALREADY MODIFIED | ✅ Done |

---

## NEXT STEPS AFTER THIS

Once all above is deployed:
- [ ] Implement Footer with SEBI disclaimer on all pages
- [ ] Add empty states to all feeds
- [ ] Add loading skeletons
- [ ] Add bottom navigation for mobile
- [ ] Test complete advisor signup → approval → first signal flow

---

## TROUBLESHOOTING

### Email function returns 400 error
**Problem**: "SendGrid not configured"  
**Solution**: 
- Check Supabase Secrets are added
- Refresh page, try again
- Check SendGrid API key is correct

### Emails go to spam
**Problem**: Emails marked as spam  
**Solution**:
- Verify sender domain in SendGrid (https://app.sendgrid.com/settings/sender_auth)
- Add SPF + DKIM records to your domain DNS
- Use "noreply@[yourdomain]" instead of generic domain

### Migration fails with "column already exists"
**Problem**: Column already in database  
**Solution**: The migration was already applied. Skip this step.

### Can't deploy edge functions
**Problem**: Permission denied or auth error  
**Solution**:
- Make sure you're logged in: `supabase login`
- Project linked: `supabase link`
- Try deploying via Supabase Dashboard instead

---

## SUPPORT

For issues, check:
1. Supabase Docs: https://supabase.com/docs
2. Edge Functions: https://supabase.com/docs/guides/functions
3. SendGrid Docs: https://docs.sendgrid.com/

---

**Document Version**: 1.0  
**Last Updated**: March 25, 2026  
**Status**: Ready for Implementation
