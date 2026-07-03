
-- Step 1
TRUNCATE public.financial_compliance_archive, public.subscriptions, public.user_legal_acceptances, public.advisor_legal_acceptances CASCADE;

-- Step 2
TRUNCATE public.signals, public.group_feed_events, public.signal_deliveries, public.group_follows, public.telegram_settings, public.deletion_requests CASCADE;

-- Step 3
TRUNCATE public.referral_visits, public.referral_signups, public.referral_links, public.advisor_daily_earnings, public.kyc_documents, public.groups, public.advisors, public.rejected_advisor_applications CASCADE;

-- Step 4: Delete all non-admin users
DELETE FROM public.profiles WHERE id <> '1e92073f-bc8f-49fa-aecb-1cc6ce36704c';
DELETE FROM auth.users WHERE id <> '1e92073f-bc8f-49fa-aecb-1cc6ce36704c';
