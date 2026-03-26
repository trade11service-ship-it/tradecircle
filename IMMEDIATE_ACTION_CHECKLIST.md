# ✅ IMMEDIATE ACTION CHECKLIST

**What**: Step-by-step checklist to complete backend setup today  
**Time**: ~20 minutes  
**Difficulty**: Easy (copy-paste mostly)

---

## TODO #1: Create SendGrid Account (5 min)
- [ ] Open https://sendgrid.com
- [ ] Click "Sign Up Free"
- [ ] Fill signup form
- [ ] Verify email (check spam folder)
- [ ] Login to SendGrid
- [ ] Go to Settings → API Keys
- [ ] Click "Create API Key"
- [ ] Give it a name like "TradeCircle"
- [ ] Copy the key (save it somewhere safe)
- [ ] ✅ DONE

---

## TODO #2: Add API Key to Supabase (2 min)

**Method A: Via Supabase Dashboard** (Easiest)
1. [ ] Open Supabase Dashboard
2. [ ] Select your TradeCircle project
3. [ ] Go to: **Settings** → **Secrets**
4. [ ] Click **New Secret**
5. [ ] Fill in:
   - Name: `SENDGRID_API_KEY`
   - Value: [Paste your API key from TODO #1]
6. [ ] Click **Save**
7. [ ] ✅ DONE

**Method B: Via Supabase CLI** (If you prefer terminal)
```bash
# Run this in your project directory
supabase secrets set SENDGRID_API_KEY=YOUR_API_KEY_HERE
```

---

## TODO #3: Deploy Database Migration (2 min)
- [ ] Open terminal in your project directory
- [ ] Run:
  ```bash
  cd supabase
  supabase db push
  ```
- [ ] Wait for "Migration applied successfully"
- [ ] ✅ DONE

**Note**: If you get error "column already exists", that's okay - migration was already applied

---

## TODO #4: Deploy Email Functions (5 min)

**Option A: CLI (Recommended)**
```bash
# In project root directory
supabase functions deploy send-advisor-approval-email
supabase functions deploy send-advisor-rejection-email

# You should see:
# ✔ send-advisor-approval-email published
# ✔ send-advisor-rejection-email published
```
- [ ] Both functions deployed successfully
- [ ] ✅ DONE

**Option B: Supabase Dashboard**
1. [ ] Open Supabase Dashboard
2. [ ] Go to **Functions**
3. [ ] Click **Create New Function**
4. [ ] Name: `send-advisor-approval-email`
5. [ ] Language: TypeScript
6. [ ] Delete default code
7. [ ] Open: `supabase/functions/send-advisor-approval-email/index.ts` in your project
8. [ ] Copy ALL the code
9. [ ] Paste into dashboard editor
10. [ ] Click **Deploy**
11. [ ] Repeat steps 3-10 for `send-advisor-rejection-email`
12. [ ] ✅ DONE

---

## TODO #5: Verify Functions Deployed (3 min)
- [ ] Open Supabase Dashboard
- [ ] Go to **Functions**
- [ ] Look for:
  - [ ] `send-advisor-approval-email` → Status: "Deployed"
  - [ ] `send-advisor-rejection-email` → Status: "Deployed"
- [ ] ✅ DONE

---

## TODO #6: Test Approval Email (3 min)

1. [ ] Open TradeCircle app in browser: `http://localhost:5173`
2. [ ] Login as admin
3. [ ] Go to: **Admin Dashboard** → **Pending Approvals** tab
4. [ ] Find a pending advisor application
5. [ ] Click **View Application**
6. [ ] Click **Approve** button
7. [ ] Should see toast: "Admin approved successfully! Email sent."
8. [ ] Go to that advisor's email inbox (or spam folder)
9. [ ] Should see email: "Your TradeCircle Advisor Account Has Been Approved!"
10. [ ] ✅ DONE

**If no email arrives**:
- Check spam folder
- Check Supabase Dashboard → Functions → send-advisor-approval-email → Logs
- Look for error message
- See troubleshooting section below

---

## TODO #7: Test Rejection Email (3 min)

1. [ ] Admin Dashboard → **Pending Approvals**
2. [ ] Find another pending advisor
3. [ ] Click **View Application**
4. [ ] Click **Reject** button
5. [ ] Enter rejection reason (must be 10+ characters):
   - Example: "Please provide your complete SEBI registration details"
6. [ ] Click **Reject Application**
7. [ ] Should see toast: "Admin rejected successfully. Email sent with reason."
8. [ ] Check advisor's email inbox
9. [ ] Should see email: "Application Under Review" with your rejection reason
10. [ ] ✅ DONE

---

## TROUBLESHOOTING

### ❌ Email function returns 400 error
```
"error": "SendGrid not configured"
```
**Fix**: 
- Go back to TODO #2
- Check that SENDGRID_API_KEY is in Supabase Secrets
- Try again

### ❌ "401 Unauthorized" error
**Fix**:
- Your SendGrid API key is wrong
- Go to SendGrid → Settings → API Keys
- Check the key matches what's in Supabase Secrets

### ❌ Email goes to spam folder
**Why**: New sender domain gets flagged  
**Fix**: This is normal for testing. In production:
1. Verify your domain in SendGrid (Settings → Sender Authentication)
2. Add SPF + DKIM records to your domain DNS

### ❌ Function deployment fails
```
"error": "Unauthorized"
```
**Fix**:
```bash
# Login to Supabase CLI
supabase login

# Link your project
supabase link

# Try deploying again
supabase functions deploy send-advisor-approval-email
```

### ❌ Migration fails with "column already exists"
**Why**: The migration probably already ran  
**Fix**: This is okay! Just continue. Your database is already updated.

---

## ✅ ALL DONE!

Once you complete all 7 TODOs:
- ✅ Backend is fully functional
- ✅ Emails send automatically
- ✅ Admin approvals working end-to-end

**Next Steps**:
1. Read [PROJECT_STATUS.md](PROJECT_STATUS.md) for overall status
2. Read [DATABASE_AND_BACKEND_SETUP.md](DATABASE_AND_BACKEND_SETUP.md) for details
3. Start Phase 3: Footer + Bottom Nav

---

## QUICK REFERENCE

| TODO | Time | Tool | Status |
|------|------|------|--------|
| #1: SendGrid Account | 5 min | Browser | Get API key |
| #2: Add to Supabase | 2 min | Dashboard | Set secret |
| #3: Database Migration | 2 min | CLI | Deploy migration |
| #4: Email Functions | 5 min | CLI/Dashboard | Deploy functions |
| #5: Verify Deployment | 3 min | Dashboard | Check status |
| #6: Test Approval | 3 min | App | Verify email |
| #7: Test Rejection | 3 min | App | Verify email |

**Total Time**: ~23 minutes

---

## COMMANDS TO COPY-PASTE

```bash
# Verify login
supabase login

# Deploy functions
supabase functions deploy send-advisor-approval-email
supabase functions deploy send-advisor-rejection-email

# Check function logs
supabase functions list

# View logs in real-time
supabase functions logs send-advisor-approval-email
```

---

**Date Created**: March 25, 2026  
**Priority**: HIGH - Do this today!  
**Time Estimate**: 20 minutes
