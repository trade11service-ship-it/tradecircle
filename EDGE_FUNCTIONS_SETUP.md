# QUICK START: Edge Functions Deployment

## What You Just Got
✅ `supabase/functions/send-advisor-approval-email/index.ts` - Ready to deploy  
✅ `supabase/functions/send-advisor-rejection-email/index.ts` - Ready to deploy  
✅ `DATABASE_AND_BACKEND_SETUP.md` - Complete setup guide

---

## STEP 1: Setup SendGrid (5 minutes)
1. Go to https://sendgrid.com
2. Click "Sign Up Free"
3. Complete signup (free tier = 100 emails/day)
4. Verify email
5. Go to **Settings** → **API Keys**
6. Click **Create API Key**
7. Copy the key (you'll need it in Step 2)

---

## STEP 2: Add SendGrid Key to Supabase (2 minutes)
1. Open Supabase Dashboard
2. Go to your project
3. **Settings** → **Secrets**
4. Click **New Secret**
5. Name: `SENDGRID_API_KEY`
6. Value: [Paste the API key from Step 1]
7. Click **Save**

---

## STEP 3: Deploy Functions to Supabase (5 minutes)

### Option A: Using Command Line (Recommended)
```bash
# In terminal, navigate to project root
cd c:\Users\Checkmate\tradecircle

# Make sure you're logged in to Supabase
supabase login

# Deploy both functions
supabase functions deploy send-advisor-approval-email
supabase functions deploy send-advisor-rejection-email

# You should see:
# ✓ send-advisor-approval-email deployed
# ✓ send-advisor-rejection-email deployed
```

### Option B: Using Supabase Dashboard
1. Go to **Functions** in Supabase Dashboard
2. Click **Create New Function**
3. Name it: `send-advisor-approval-email`
4. Language: TypeScript
5. Delete the default code
6. Paste the code from: `supabase/functions/send-advisor-approval-email/index.ts`
7. Click **Deploy**
8. Repeat steps 2-7 for `send-advisor-rejection-email`

---

## STEP 4: Verify Deployment (2 minutes)
1. Go to **Functions** in Supabase Dashboard
2. You should see both functions listed:
   - `send-advisor-approval-email` ✓
   - `send-advisor-rejection-email` ✓
3. Click on each → should say "Deployed"

---

## STEP 5: Test Everything (5 minutes)

### Test Approval Email:
1. Go to your TradeCircle app → Admin Dashboard
2. Go to **Pending Approvals** tab
3. Find a pending advisor application
4. Click **View Application**
5. Click **Approve**
6. Check that advisor's email inbox
7. Should receive: "Your TradeCircle Advisor Account Has Been Approved!"

### Test Rejection Email:
1. Same steps, but click **Reject**
2. Enter rejection reason (min 10 chars)
3. Click **Reject Application**
4. Check advisor's email inbox
5. Should receive: "Application Under Review" with your rejection reason

---

## STEP 6: Check Function Logs (Troubleshooting)

If email doesn't arrive:
1. Go to **Functions** in Supabase Dashboard
2. Click on **send-advisor-approval-email**
3. Click **Logs**
4. Scroll to latest entry
5. Look for errors

Common errors:
- "SendGrid not configured" → Go back to Step 2, make sure secret is saved
- "401 Unauthorized" → Wrong API key, check SendGrid dashboard
- "No authorization header" → You need to be logged in as admin

---

## ALL DONE! 🎉

Your setup is complete:
- ✅ Database migrations ready
- ✅ Edge functions deployed
- ✅ SendGrid configured
- ✅ Emails sending automatically when admin approves/rejects

---

## NEXT STEPS

Read [DATABASE_AND_BACKEND_SETUP.md](DATABASE_AND_BACKEND_SETUP.md) for:
- Complete setup guide
- Testing checklist
- Troubleshooting
- All database information

Then implement Phase 3:
- [ ] Footer component with SEBI disclaimer
- [ ] Bottom nav for mobile
- [ ] Empty state components
- [ ] Loading skeletons
