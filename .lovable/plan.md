## What I found

The biggest issue is backend auth is currently auto-confirming email/password signups. The latest auth logs show `immediate_login_after_signup: true`, and the newest test user already has `email_confirmed_at` populated immediately. That means the backend is treating signup as verified instantly, so no verification email is sent and the profile trigger correctly creates the profile because the user already appears verified.

A second issue is the custom auth email pipeline is not logging any email sends. The sender domain is verified and auth emails are enabled, but `email_send_log` is empty and the auth email hook has no recent send/error logs, which matches “no email ever came”.

A third issue is frontend auth state still trusts cached sessions too much in `src/lib/auth.tsx`; it uses `getSession()` and accepts `currentUser` without re-validating with the auth server via `getUser()`. That can make old/cached sessions look logged in.

## Implementation plan

1. **Disable automatic email confirmation at the backend**
   - Configure auth so email/password signup requires verification.
   - Keep signup enabled.
   - Keep leaked-password protection enabled.
   - Disable anonymous users.

2. **Make phone number optional in registration**
   - Update `Register.tsx` so phone can be blank.
   - If phone is provided, still sanitize and validate it.
   - Pass `phone: null` or omit it when blank.
   - Keep name, email, password, and consent required.

3. **Harden signup session cleanup**
   - After `signUp()`, if a session exists but the user is not confirmed, immediately sign out locally.
   - Clear auth tokens from local storage and session storage.
   - Keep the user on a “Check your email” screen, but change the CTA text so it does not imply they are already verified.
   - Do not save legal acceptance or referral signup until a verified auth session exists, to avoid creating compliance rows for unverified users.

4. **Harden global auth state against cached/cookie sessions**
   - Update `src/lib/auth.tsx` to call `supabase.auth.getUser()` when a session exists.
   - If `getUser()` fails, clear local session and treat the user as signed out.
   - If the user is email/password and `email_confirmed_at` is missing, clear local session and block dashboard/profile access.
   - Only fetch `profiles` after the user is verified or is an OAuth user that is already confirmed.

5. **Harden login form behavior**
   - Keep the existing backend invalid-credentials behavior.
   - After `signInWithPassword`, re-check the authenticated user using `getUser()` before navigation.
   - If no verified profile exists, sign out and show a clear error instead of navigating.
   - This fixes “random password lets me login” if it is caused by stale existing session/cached auth state rather than the password request itself.

6. **Fix custom verification email delivery path**
   - Re-run the auth email template scaffold only if needed to repair hook wiring.
   - Deploy `auth-email-hook` and `process-email-queue`.
   - Verify the project email domain remains `notify.racircle.in`.
   - Check that a signup produces an auth email queue/log row.
   - If the hook still does not fire, fall back to default managed auth emails temporarily so users receive verification emails while custom templates are investigated.

7. **Database safety check**
   - Verify triggers remain:
     - profile creation on confirmed email only
     - no profile creation for unverified email/password users
   - Add or adjust trigger logic only if current functions still create profiles before confirmation.

8. **End-to-end validation**
   - Test signup with a fresh email:
     - user should not be logged into the app before email verification
     - no profile should exist before confirmation
     - a verification email should be queued/sent
   - Test login with random password:
     - should show invalid credentials
     - should not reuse cached auth
   - Test login with an unverified user:
     - should be blocked and signed out
   - Test after verification:
     - profile should be created
     - login should route by role correctly

## Expected final behavior

- Signup creates an auth user but does not create a public profile until email is verified.
- Verification email is sent from the verified RA Circle sender domain.
- Phone number is optional.
- Cached cookies/local storage cannot bypass verification.
- Random passwords cannot log in; stale sessions are cleared before routing.
- Users only reach dashboards after a verified backend-authenticated session exists.