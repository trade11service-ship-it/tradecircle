# TradeCircle Codebase Catalog

**Generated**: March 25, 2026  
**Project**: Trading signals & advisor marketplace platform  
**Status**: Active development

---

## 1. DATABASE SCHEMA (Supabase PostgreSQL)

### Core Tables

#### `profiles` (Auth integrations table)
- **Primary Key**: `id` (UUID, references auth.users)
- **Columns**:
  - `email` TEXT
  - `full_name` TEXT
  - `phone` TEXT
  - `role` TEXT - CHECK constraint: ('trader', 'advisor', 'admin') - DEFAULT 'trader'
  - `telegram_username` TEXT
  - `created_at` TIMESTAMP WITH TIME ZONE
- **RLS**: Enabled (users read own, admin reads all, advisors read subscriber profiles)
- **Relationships**: Referenced by advisors, subscriptions, signal_deliveries, referral_signups, deletion_requests, legal acceptances

#### `advisors`
- **Primary Key**: `id` (UUID)
- **Columns**:
  - `user_id` UUID (FK → profiles.id) - NOT NULL
  - `full_name` TEXT - NOT NULL
  - `email` TEXT - NOT NULL
  - `phone` TEXT
  - `address` TEXT
  - `sebi_reg_no` TEXT - UNIQUE, NOT NULL
  - `aadhaar_no` TEXT
  - `pan_no` TEXT
  - `profile_photo_url` TEXT
  - `aadhaar_photo_url` TEXT
  - `pan_photo_url` TEXT
  - `bio` TEXT
  - `strategy_type` TEXT - CHECK: ('Options', 'Equity', 'Futures', 'All')
  - `status` TEXT - CHECK: ('pending', 'approved', 'rejected', 'suspended') - DEFAULT 'pending'
  - `rejection_reason` TEXT
  - `cover_image_url` TEXT (NEW in migration 20260316)
  - `is_public_featured` BOOLEAN - DEFAULT false (showcase on landing)
  - `public_sort_order` INTEGER - DEFAULT 999
  - `public_tagline` TEXT (short tagline for featured cards)
  - `public_description` TEXT (longer description)
  - `public_years_experience` INTEGER
  - `created_at` TIMESTAMP WITH TIME ZONE
- **RLS**: Enabled (view approved or own, admin can see all)
- **Key Functions**:
  - `get_advisor_subscriber_count(uuid)` - returns active subscription count
  - `get_advisor_signal_stats(uuid)` - returns JSON: total_signals, win_count, loss_count, resolved_count

#### `groups`
- **Primary Key**: `id` (UUID)
- **Columns**:
  - `advisor_id` UUID (FK → advisors.id) - NOT NULL
  - `name` TEXT - NOT NULL
  - `description` TEXT
  - `dp_url` TEXT (group display picture)
  - `monthly_price` INTEGER - NOT NULL (in paisa, e.g., 99900 = ₹999)
  - `razorpay_payment_link` TEXT
  - `is_active` BOOLEAN - DEFAULT true
  - `created_at` TIMESTAMP WITH TIME ZONE
- **RLS**: Enabled (public read, advisor insert/update own)
- **Relationships**: FK to advisors, referenced by subscriptions, signals, group_follows

#### `signals` (Dual-purpose: trading signals + message posts)
- **Primary Key**: `id` (UUID)
- **Columns**:
  - `group_id` UUID (FK → groups.id) - NOT NULL
  - `advisor_id` UUID (FK → advisors.id) - NOT NULL
  - `post_type` TEXT - DEFAULT 'signal' - VALUES: 'signal', 'message'
  - **SIGNAL fields** (NULL for message posts):
    - `instrument` TEXT (e.g., "BankNifty", "Sensex")
    - `signal_type` TEXT - FORMERLY CONSTRAINED: ('BUY', 'SELL') - now nullable
    - `entry_price` DECIMAL
    - `target_price` DECIMAL
    - `stop_loss` DECIMAL
    - `timeframe` TEXT - FORMERLY CONSTRAINED: ('Intraday', 'Swing', 'Positional') - now nullable
    - `result` TEXT - CHECK: ('PENDING', 'WIN', 'LOSS') - DEFAULT 'PENDING'
  - **MESSAGE fields**:
    - `message_text` TEXT
    - `image_url` TEXT
  - `notes` TEXT
  - `is_public` BOOLEAN - DEFAULT false (followers can see public message posts)
  - `signal_date` DATE - DEFAULT CURRENT_DATE
  - `created_at` TIMESTAMP WITH TIME ZONE
- **RLS**: Enabled (complex - past signals to authenticated, subscribers, followers for public messages, advisor can see own)
- **Realtime**: Enabled for subscription feeds
- **Business Logic**:
  - F&O signals free after 24h (regardless of is_public)
  - Non-F&O signals: public after 24h if is_public=true
  - Message posts (analysis): always public to followers

#### `subscriptions`
- **Primary Key**: `id` (UUID)
- **Columns**:
  - `user_id` UUID (FK → profiles.id) - NOT NULL
  - `group_id` UUID (FK → groups.id) - NOT NULL
  - `advisor_id` UUID (FK → advisors.id) - NOT NULL
  - `start_date` TIMESTAMP WITH TIME ZONE - DEFAULT now()
  - `end_date` TIMESTAMP WITH TIME ZONE
  - `status` TEXT - CHECK: ('active', 'expired', 'cancelled') - DEFAULT 'active'
  - `amount_paid` INTEGER (in paisa)
  - `razorpay_payment_id` TEXT
  - **Referral fields**:
    - `from_referral` BOOLEAN - DEFAULT false
    - `referral_code` TEXT
    - `referral_advisor_id` UUID
    - `platform_fee_percent` INTEGER - DEFAULT 30
  - `created_at` TIMESTAMP WITH TIME ZONE
- **RLS**: Enabled (users read own, advisors read own group subs, admin reads all)
- **Realtime**: Enabled
- **Trigger**: `on_subscription_created` → auto-record to `advisor_daily_earnings`

#### `group_follows`
- **Primary Key**: `id` (UUID)
- **Columns**:
  - `user_id` UUID (FK → auth.users) - NOT NULL
  - `group_id` UUID (FK → groups.id) - NOT NULL
  - `created_at` TIMESTAMP WITH TIME ZONE
  - **UNIQUE**: (user_id, group_id)
- **RLS**: Enabled (users insert/delete own, advisors see followers, public read not allowed)
- **Purpose**: Track unfollowed (non-subscribed) followers for public message posts

#### `signal_deliveries`
- **Primary Key**: `id` (UUID)
- **Columns**:
  - `signal_id` UUID (FK → signals.id) - NOT NULL
  - `user_id` UUID (FK → profiles.id) - NOT NULL
  - `advisor_id` UUID (FK → advisors.id) - NOT NULL
  - `group_id` UUID (FK → groups.id) - NOT NULL
  - `delivered_at` TIMESTAMP WITH TIME ZONE - DEFAULT now()
  - `delivery_method` TEXT - DEFAULT 'telegram'
  - `status` TEXT - DEFAULT 'sent'
- **RLS**: Enabled (users read own, advisors read own, admin reads all)
- **Purpose**: Track telegram/notification delivery for analytics

#### `telegram_settings`
- **Primary Key**: `id` (UUID)
- **Columns**:
  - `user_id` UUID (FK → profiles.id) - NOT NULL
  - `group_id` UUID (FK → groups.id) - NOT NULL
  - `telegram_username` TEXT
  - `telegram_chat_id` TEXT (added in migration 20260308111839)
  - `is_active` BOOLEAN - DEFAULT false
  - `bot_started` BOOLEAN - DEFAULT false (added in migration 20260308111839)
  - `created_at` TIMESTAMP WITH TIME ZONE
  - **UNIQUE**: (user_id, group_id)
- **RLS**: Enabled (users manage own settings)
- **Bot**: tradecircle_alerts_bot

### Referral System Tables

#### `referral_links`
- **Primary Key**: `id` (UUID)
- **Columns**:
  - `advisor_id` UUID (FK → advisors.id) - NOT NULL
  - `group_id` UUID (FK → groups.id) - NOT NULL
  - `referral_code` TEXT - UNIQUE, NOT NULL
  - `total_clicks` INTEGER - DEFAULT 0
  - `total_signups` INTEGER - DEFAULT 0
  - `total_conversions` INTEGER - DEFAULT 0
  - `total_revenue_generated` INTEGER - DEFAULT 0 (in paisa)
  - `is_active` BOOLEAN - DEFAULT true
  - `created_at` TIMESTAMP WITH TIME ZONE
  - **UNIQUE**: (advisor_id, group_id)
- **RLS**: Enabled (advisors read own, authenticated read active, admin can update)
- **Helper Functions**:
  - `increment_referral_clicks(text)` - SECURITY DEFINER
  - `increment_referral_signups(text)` - SECURITY DEFINER
  - `increment_referral_conversions(text, integer)` - SECURITY DEFINER
  - `get_referral_link_by_code(text)` - SECURITY DEFINER (returns safe subset)

#### `referral_visits`
- **Primary Key**: `id` (UUID)
- **Columns**:
  - `referral_code` TEXT (FK → referral_links.referral_code) - NOT NULL
  - `advisor_id` UUID (FK → advisors.id) - NOT NULL
  - `group_id` UUID (FK → groups.id) - NOT NULL
  - `visitor_ip` TEXT
  - `user_agent` TEXT
  - `visited_at` TIMESTAMP WITH TIME ZONE - DEFAULT now()
  - `converted_to_signup` BOOLEAN - DEFAULT false
  - `converted_to_paid` BOOLEAN - DEFAULT false
  - `user_id` UUID (FK → profiles.id) - optional (filled after signup)
- **RLS**: Enabled (anyone can insert; advisors/admin read own)

#### `referral_signups`
- **Primary Key**: `id` (UUID)
- **Columns**:
  - `referral_code` TEXT - NOT NULL
  - `advisor_id` UUID (FK → advisors.id) - NOT NULL
  - `group_id` UUID (FK → groups.id) - NOT NULL
  - `user_id` UUID (FK → profiles.id) - NOT NULL
  - `signed_up_at` TIMESTAMP WITH TIME ZONE - DEFAULT now()
  - `converted_to_paid` BOOLEAN - DEFAULT false
  - `subscription_id` UUID (FK → subscriptions.id) - optional
  - `platform_fee_percent` INTEGER - DEFAULT 15
  - `is_referral_active` BOOLEAN - DEFAULT true
  - **UNIQUE**: (user_id, group_id)
- **RLS**: Enabled (users read own, advisors read own)

### Compliance & Legal Tables

#### `advisor_legal_acceptances`
- **Primary Key**: `id` (UUID)
- **Columns**:
  - `advisor_id` UUID (FK → advisors.id) - NOT NULL
  - `full_name` TEXT - NOT NULL
  - `sebi_reg_no` TEXT - NOT NULL
  - `pan_no` TEXT
  - `checkbox_1_sebi_responsibility` BOOLEAN - NOT NULL
  - `checkbox_1_text` TEXT - NOT NULL
  - `checkbox_1_accepted_at` TIMESTAMP WITH TIME ZONE - DEFAULT now()
  - `checkbox_2_indemnity` BOOLEAN - NOT NULL
  - `checkbox_2_text` TEXT - NOT NULL
  - `checkbox_2_accepted_at` TIMESTAMP WITH TIME ZONE - DEFAULT now()
  - `ip_address` TEXT
  - `user_agent` TEXT
  - `device_info` TEXT
  - `form_submitted_at` TIMESTAMP WITH TIME ZONE - DEFAULT now()
  - `company_cin` TEXT - DEFAULT 'U62099MH2025PTC453360'
  - `status` TEXT - DEFAULT 'submitted'
- **RLS**: Enabled (advisors read own, admin reads all; IMMUTABLE)

#### `user_legal_acceptances`
- **Primary Key**: `id` (UUID)
- **Columns**:
  - `user_id` UUID (FK → profiles.id) - NOT NULL
  - `full_name` TEXT
  - `email` TEXT
  - `acceptance_type` TEXT - NOT NULL (e.g., 'terms', 'privacy', 'disclaimer')
  - `checkbox_text` TEXT - NOT NULL
  - `accepted` BOOLEAN - NOT NULL - DEFAULT false
  - `ip_address` TEXT
  - `user_agent` TEXT
  - `device_info` TEXT
  - `accepted_at` TIMESTAMP WITH TIME ZONE - DEFAULT now()
  - `page_url` TEXT
  - `company_cin` TEXT - DEFAULT 'U62099MH2025PTC453360'
- **RLS**: Enabled (users read own, admin reads all; IMMUTABLE)

#### `deletion_requests`
- **Primary Key**: `id` (UUID)
- **Columns**:
  - `user_id` UUID - NOT NULL
  - `request_type` TEXT - NOT NULL ('account_deletion', 'group_exit', etc.)
  - `reason` TEXT
  - `group_id` UUID (FK → groups.id) - optional
  - `group_name` TEXT
  - `advisor_name` TEXT
  - `email` TEXT
  - `status` TEXT - DEFAULT 'pending' - VALUES: ('pending', 'approved', 'rejected')
  - `admin_notes` TEXT
  - `created_at` TIMESTAMP WITH TIME ZONE - DEFAULT now()
  - `reviewed_at` TIMESTAMP WITH TIME ZONE
  - `reviewed_by` UUID (admin who reviewed)
- **RLS**: Enabled (users insert own, read own; admin read/update all)

### Earnings & Analytics Tables

#### `advisor_daily_earnings`
- **Primary Key**: `id` (UUID)
- **Columns**:
  - `advisor_id` UUID (FK → advisors.id) - NOT NULL
  - `earning_date` DATE - DEFAULT CURRENT_DATE
  - `gross_revenue` NUMERIC - DEFAULT 0 (total from subs)
  - `gst_amount` NUMERIC - DEFAULT 0 (calculated: gross * 0.18)
  - `platform_fee` NUMERIC - DEFAULT 0 (calculated: (gross - gst) * fee_percent)
  - `net_earning` NUMERIC - DEFAULT 0 (calculated: gross - gst - platform_fee)
  - `subscription_count` INTEGER - DEFAULT 0
  - `created_at` TIMESTAMP WITH TIME ZONE - DEFAULT now()
  - **UNIQUE**: (advisor_id, earning_date)
- **RLS**: Enabled (advisors read own, admin reads all)
- **Trigger**: Auto-populated from subscriptions (`on_subscription_created`)
- **Helper Function**: `get_advisor_earnings(uuid, date)` → returns JSON with monthly/total breakdown

### Support Tables

#### `kyc_documents`
- **Primary Key**: `id` (UUID)
- **Columns**:
  - `advisor_id` UUID (FK → advisors.id) - NOT NULL
  - `document_type` TEXT - CHECK: ('aadhaar', 'pan', 'profile')
  - `file_url` TEXT - NOT NULL
  - `uploaded_at` TIMESTAMP WITH TIME ZONE - DEFAULT now()
- **RLS**: Enabled (advisors read own, admin reads all)

### Storage Buckets (S3/Supabase Storage)

1. **kyc-documents** (public) - Advisor KYC files (aadhaar, PAN photos)
2. **group-media** (public) - Group posts, images, media
3. **advisor-covers** (public) - Advisor cover images for showcase
4. **advisor-avatars** (public) - Advisor profile avatars

### Security Definer Functions (Bypass RLS)

- `is_admin(uuid)` - Check if user has admin role
- `get_advisor_subscriber_count(uuid)` - Get active sub count
- `get_advisor_signal_stats(uuid)` - Get signal performance stats
- `get_advisor_earnings(uuid, date)` - Get earnings breakdown
- `increment_referral_*` - Update referral metrics
- `get_referral_link_by_code(text)` - Safe public lookup

---

## 2. EXISTING PAGES (src/pages)

| File | Component | Route | Protection | Purpose |
|------|-----------|-------|-----------|---------|
| Landing.tsx | Landing | `/` | Public | Homepage - featured advisors, top groups, highlights |
| Home.tsx | Home | `/home` | Protected | User dashboard feed |
| Discover.tsx | Discover | `/discover` `/groups` | Public | Browse all groups with search/filter/sort |
| Explore.tsx | Explore | `/explore` | Public | Alternative explore/discover view |
| AdvisorProfile.tsx | AdvisorProfile | `/advisor/:id` | Public | Public advisor profile page |
| AdvisorRegister.tsx | AdvisorRegister | `/advisor-register` | Public | Advisor registration form |
| AdvisorDashboard.tsx | AdvisorDashboard | `/advisor/dashboard` `/advisor/dashboard/groups` `/advisor/dashboard/post` `/advisor/dashboard/signals` `/advisor/dashboard/earnings` `/advisor/dashboard/subscribers` | Protected | Advisor control panel - groups, signals, earnings, referrals |
| TraderDashboard.tsx | TraderDashboard | `/dashboard` | Protected | Trader/user dashboard - subscriptions, signals feed, telegram setup |
| AdminDashboard.tsx | AdminDashboard | `/admin` `/admin/approvals` `/admin/revenue` `/admin/complaints` | Protected | Admin panel - pending advisors, payments, legal records |
| Profile.tsx | Profile | `/profile` | Protected | User profile page |
| Notifications.tsx | Notifications | `/notifications` | Protected | User notification center |
| Subscriptions.tsx | Subscriptions | `/subscriptions` | Protected | User subscription management |
| Login.tsx | Login | `/login` | Public | Email/password login, OAuth login |
| Register.tsx | Register | `/register` | Public | User registration |
| ForgotPassword.tsx | ForgotPassword | `/forgot-password` | Public | Password reset request |
| ResetPassword.tsx | ResetPassword | `/reset-password` | Public | Password reset confirmation |
| ReferralLanding.tsx | ReferralLanding | `/join/:code` | Public | Referral signup landing - pre-fills group from code |
| PaymentSuccess.tsx | PaymentSuccess | `/payment-success` | Protected | Post-payment confirmation page |
| About.tsx | About | `/about` | Public | About page |
| Contact.tsx | Contact | `/contact` | Public | Contact/support form |
| Disclaimer.tsx | Disclaimer | `/disclaimer` | Public | Disclaimer/risk disclosure |
| Terms.tsx | Terms | `/terms` | Public | Terms of service |
| Privacy.tsx | Privacy | `/privacy` | Public | Privacy policy |
| Refund.tsx | Refund | `/refund` | Public | Refund policy |
| Index.tsx | Index | (not routed) | - | Likely deprecated/fallback |
| NotFound.tsx | NotFound | `/*` (catch-all) | Public | 404 error page |

**Key Insights**:
- **Auth**: Supabase with OAuth (Google/GitHub likely) + email/password
- **Protected Routes**: `/home`, `/profile`, `/notifications`, `/subscriptions`, `/dashboard`, `/advisor/dashboard/**`, `/admin/**`, `/payment-success`
- **Public Routes**: Landing page, Discover, Learn, auth pages, legal pages, advisor register, public profiles
- **Role-based Access**: Trader (default) → `/dashboard`, Advisor → `/advisor/dashboard`, Admin → `/admin`

---

## 3. EXISTING COMPONENTS

### Main Components (src/components/)

| File | Purpose |
|------|---------|
| Navbar.tsx | Top navigation bar with auth state, logo, menu |
| BottomNav.tsx | Mobile bottom tab navigation (signals, explore, profile, etc.) |
| Footer.tsx | Page footer with links, legal, social |
| NavLink.tsx | Reusable nav link component |
| GroupCard.tsx | Card displaying group info (name, advisor, price, subscribers) |
| GroupFeed.tsx | Feed of signals/messages for a group (subscribed content) |
| FollowFeed.tsx | Feed of public messages from followed groups |
| PublicMixedFeed.tsx | Mixed feed of paid + public signals (landing page preview) |
| SignalCard.tsx | Card displaying single signal with entry/target/SL |
| ReferralLinkCard.tsx | Card for referral link management |
| ReferralStatsTab.tsx | Tab showing referral analytics (clicks, conversions, revenue) |
| AdminReferralTab.tsx | Admin tab for referral monitoring |

### UI Components (src/components/ui/)

**45+ shadcn/ui components including**:
- Form controls: button, input, textarea, select, checkbox, radio-group, toggle, switch
- Data display: table, accordion, tabs, dropdown-menu, context-menu, breadcrumb, pagination
- Dialogs: dialog, alert-dialog, drawer, popover, tooltip, hover-card
- Specialized: chart (recharts integration), calendar, carousel, avatar, badge, alert, progress, slider
- Utilities: separator, skeleton, scroll-area, resizable, sheet, sidebar, command

---

## 4. UTILITIES & LIBRARY CODE

### src/lib/auth.tsx
**Purpose**: Supabase authentication provider & context

**Key Functions**:
- `AuthProvider` - React context wrapping app with auth state
- `useAuth()` - Hook to access current user, profile, loading state
- `fetchProfile(userId)` - Fetch user profile from DB
- `processReferralCookie(userId)` - Handle referral code from signup

**Features**:
- OAuth + email/password support
- Password recovery redirect to `/reset-password`
- Referral code tracking via cookies
- Auto-profile fetch on auth state change

### src/lib/utils.ts
**Purpose**: Utility helpers

**Key Function**:
- `cn(...inputs)` - Tailwind CSS class merger (clsx + twMerge)

### src/lib/accessControl.ts
**Purpose**: Business logic for access control & visibility

**Key Functions**:
1. `checkGroupAccess(userId, groupId)` → `{ hasAccess, expiresAt, isExpired }`
2. `getActiveGroupIds(userId)` → active subscription group IDs
3. `shouldShowFree(post)` → `{ isFree, reason: 'fno_expired' | 'public_delayed' | 'analysis' }`
   - **Rules**:
     - F&O signals → free after 24h (always)
     - Non-F&O → free after 24h if `is_public=true`
     - Message posts → always public to followers
4. `getPostVisibility(post, isSubscribed, isOwner, globalIndex)` → visibility rules

**Business Rules Encoded**:
- F&O detection: checks `timeframe` / `signal_type` for "f&o", "fno", "options", "futures"
- 24-hour rule for delayed public release
- Follower access to public messages (non-subscribers)

### src/lib/sanitize.ts
**Purpose**: Input sanitization (inferred from AdvisorDashboard imports)

**Functions** (imported in AdvisorDashboard):
- `sanitizeText(txt)` - Sanitize short text inputs
- `sanitizeTextarea(txt)` - Sanitize longer text
- `sanitizeNumeric(val)` - Sanitize number inputs
- `sanitizeAlphanumeric(val)` - Sanitize alpha-numeric

### src/lib/legalTexts.ts
**Purpose**: Legal text templates (referenced but not read)

Likely contains:
- Disclaimer text for advisors
- Terms & conditions
- Privacy policy content
- User acceptance checkboxes

### src/integrations/supabase/
**Purpose**: Supabase client setup & type definitions

Contains:
- Client initialization
- TypeScript types from database schema (`Tables<'profile'>`, etc.)

---

## 5. KEY CONFIG FILES

### package.json
**Key Dependencies**:
- **React 18.3.1** - UI framework
- **Vite** - Build tool
- **TypeScript** - Type safety
- **React Router** - Client-side routing
- **Supabase JS 2.98.0** - Backend/database
- **TanStack React Query 5.83.0** - Server state management
- **React Hook Form 7.61.1** - Form management
- **Shadcn/UI** - Component library (radix-ui primitives)
- **Date-fns 3.6.0** - Date utilities
- **Lucide React 0.462.0** - Icons
- **Sonner** - Toast notifications
- **QRCode React 4.2.0** - QR code generation
- **Next-themes 0.3.0** - Dark mode support
- **Tailwind CSS + Animate** - Styling
- **Vitest** - Unit testing

**Scripts**:
- `dev` - Start dev server (port 8080, HMR disabled for overlay)
- `build` - Production build
- `build:dev` - Dev build
- `lint` - ESLint
- `test` - Run vitest
- `test:watch` - Watch mode tests

### vite.config.ts
- **Server**: Port 8080, IPv6 host (::)
- **HMR**: Overlay disabled (lovable integration)
- **Plugins**: React SWC, lovable componentTagger (dev only)
- **Path Alias**: `@` → `./src`

### tailwind.config.ts
- **Dark Mode**: CSS class-based
- **Content Paths**: Recursive `src/**/*.{ts,tsx}`
- **Custom Colors**:
  - Primary/secondary/destructive/accent (CSS variables)
  - Sidebar colors for sidebar UI
  - Brand colors: light-green, light-blue, off-white, warning
  - Padding: 2rem container, max-width 1200px
- **Custom Animations**: accordion-down/up, fade-in
- **Plugins**: tailwindcss-animate

### tsconfig.json
- **Module**: ES modules
- **Target**: ES2020
- **Lib**: ES2020, DOM, DOM.Iterable
- **Path Aliases**: `@/*` → `./src/*`

### Other Configs
- **eslint.config.js** - Linting rules
- **vitest.config.ts** - Unit test configuration
- **postcss.config.js** - PostCSS (for Tailwind)
- **components.json** - Shadcn/ui config

---

## 6. ROUTING (src/App.tsx)

### Route Tree

```
/ ......................... Landing (public landing page)
├─ /home .................... Home (protected, logged-in feed)
├─ /discover ................ Discover (public, browse groups)
├─ /groups .................. Discover (alias)
├─ /explore ................. Explore (public, alternative view)
├─ /about ................... About (public)
├─ /contact ................. Contact (public)
├─ /login ................... Login (public)
├─ /register ................ Register (public)
├─ /forgot-password ......... ForgotPassword (public)
├─ /reset-password .......... ResetPassword (public)
├─ /advisor-register ........ AdvisorRegister (public)
├─ /advisor/:id ............. AdvisorProfile (public)
├─ /profile ................. Profile (protected)
├─ /notifications ........... Notifications (protected)
├─ /subscriptions ........... Subscriptions (protected)
├─ /dashboard ............... TraderDashboard (protected)
│  └─ Signal feeds, telegram setup, subscription mgmt
├─ /advisor/dashboard ....... AdvisorDashboard (protected)
│  ├─ /advisor/dashboard/groups
│  ├─ /advisor/dashboard/post
│  ├─ /advisor/dashboard/signals
│  ├─ /advisor/dashboard/earnings
│  ├─ /advisor/dashboard/subscribers
│  └─ /advisor/dashboard/referrals (implied)
├─ /admin ................... AdminDashboard (protected, admin only)
│  ├─ /admin/approvals (pending advisor approvals)
│  ├─ /admin/revenue (payment tracking)
│  └─ /admin/complaints (legal requests)
├─ /payment-success ......... PaymentSuccess (protected)
├─ /disclaimer .............. Disclaimer (public)
├─ /terms ................... Terms (public)
├─ /privacy ................. Privacy (public)
├─ /refund .................. Refund (public)
├─ /join/:code .............. ReferralLanding (public, referral signup)
└─ /* ....................... NotFound (404)
```

### Auth Pattern
```typescript
<ProtectedRoute>
  - Checks: user exists + !loading
  - Redirect: → /login if failed
  - Loading: Shows spinner while auth state loads
</ProtectedRoute>
```

### Global Features
- **ScrollToTop** on route change
- **BottomNav** on all routes (mobile tab bar)
- **Toast Provider** (Sonner) for notifications
- **Tooltip Provider** for component tooltips
- **React Query** for server state management
- **Theme Support** via next-themes

---

## 7. TECHNOLOGY STACK SUMMARY

| Layer | Technology |
|-------|-----------|
| **Frontend Framework** | React 18.3 + TypeScript |
| **Routing** | React Router DOM v6 |
| **Build** | Vite (esbuild) |
| **Styling** | Tailwind CSS v3 + Custom vars |
| **UI Components** | Shadcn/ui (Radix + Headless) |
| **Forms** | React Hook Form + Zod validation |
| **State** | TanStack React Query + Context |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth (OAuth + Email) |
| **Storage** | Supabase Storage (S3-compatible) |
| **Realtime** | Supabase Realtime (websockets) |
| **Icons** | Lucide React 462+ icons |
| **Toasts** | Sonner |
| **Testing** | Vitest |
| **Linting** | ESLint |
| **Analytics** | (QR codes for tracking) |

---

## 8. CURRENT IMPLEMENTATION STATE

### ✅ COMPLETE & FUNCTIONAL
- **Authentication**: Email + OAuth signup/login
- **User Profiles**: Basic profile with role assignment
- **Advisor Registration**: Full registration with KYC (SEBI, PAN, Aadhaar)
- **Groups**: Advisor can create/manage trading signal groups
- **Signals**: Posts with entry/target/SL, results tracking (WIN/LOSS/PENDING)
- **Subscriptions**: Razorpay payment integration, group-level access control
- **Telegram Bot**: Signal delivery via Telegram with settings per group
- **Referral System**: Code generation, click tracking, signup tracking, revenue attribution
- **RLS Security**: Row-level security on all tables
- **Admin Dashboard**: Approve/reject advisors, view payments, legal records
- **Advisor Dashboard**: Groups, signals, subscribers, earnings tracking, referrals
- **Trader Dashboard**: Subscriptions, signal feed, telegram management
- **Legal**: Disclaimer, Terms, Privacy, Refund policies, legal acceptances tracking
- **Public Pages**: Landing with featured advisors, Discover/Explore for group browsing

### 🚧 PARTIALLY COMPLETE
- **Earnings Tracking**: Daily earnings table auto-populates, but GST/platform fees calculated server-side
- **Advisor Public Showcase**: Fields exist (featured, tagline, description, years), UI may need work
- **Follow System**: Unfollowed followers can see public messages, but feed UI (`FollowFeed`) exists
- **Message Posts**: Can post analysis/messages to groups, display logic in place

### ❓ UNCLEAR / NEEDS VERIFICATION
- **Profile Cover Images**: Field added (cover_image_url), but upload UI unclear
- **Admin Referral Tab**: Component exists but functionality/UI needs review
- **Contact Requests**: `deletion_requests` table supports it, but form handling unclear
- **Payment Webhook**: Razorpay webhook handler exists, may need testing
- **Deletion Requests**: Table exists for account/group exit requests, UI/workflow unclear

### ❌ NOT IMPLEMENTED / MISSING
- **Group Chat**: No messaging tables (only signals/posts in groups)
- **User-to-User Messaging**: No DM system
- **Video/Live Streaming**: No video infrastructure
- **Signal Analytics Dashboard**: Advisor view of signal performance
- **Notifications Center**: UI exists but real-time notification logic unclear
- **Payment Subscriptions API**: Only Razorpay one-time links (not recurring billing)
- **Mobile App**: Web-only (responsive design in place)
- **Multi-language**: English only
- **Search**: Basic search on Discover page, no full-text search engine

---

## 9. KEY BUSINESS RULES ENCODED

### Signal Visibility
1. **Past Signals** (signal_date < TODAY): Visible to all authenticated users (social proof)
2. **Today's Signals** (signal_date >= TODAY): Only to active subscribers
3. **Public Messages** (post_type='message', is_public=true): Visible to followers after 24h
4. **F&O Signals**: Free to all after 24h (regardless of is_public setting)
5. **Non-F&O Signals**: Free after 24h ONLY if is_public=true

### Earnings Calculation
- **Gross Revenue** = subscription amount_paid
- **GST** = gross * 18%
- **Platform Fee** = (gross - GST) * platform_fee_percent (default 30% for new, 15% for referral)
- **Net Earning** = gross - GST - platform_fee
- Auto-aggregated daily per advisor

### Referral System
- **Code Generation**: One code per (advisor, group) pair
- **Tracking**: Clicks → visits → signups → conversions
- **Commission**: Referrer gets reduced platform_fee (15% vs 30%)
- **Cookie-based**: referral_code stored; processed on signup

### User Roles
- **trader** (default): Can subscribe, view signals, follow groups
- **advisor**: Can create groups, post signals, view earnings
- **admin**: Can approve advisors, view all data, manage users

### Access Control
- **Authenticated**: Users must be logged in for subscriber-only content
- **Admin Bypass**: Admins can view all content via is_admin() function
- **RLS Fallback**: Database enforces rules even if frontend fails

---

## 10. KNOWN SECURITY MEASURES

### Row-Level Security (RLS)
- All tables have RLS enabled
- Policies are PERMISSIVE by default (fail open, then restrict)
- Admin bypass via `is_admin()` security definer function
- Privilege escalation prevention: users can't change own role

### Sensitive Data Protection
- PII (Aadhaar, PAN) restricted to advisor + admin view
- Profile visibility: authenticated users only (not anonymous)
- Signals: temporal access control (past vs future)
- Referral metrics: hidden from public, advisors only

### Input Sanitization
- Text inputs sanitized via `sanitize.ts` utilities
- Email validated through auth
- Numeric inputs validated before insert

### API Restrictions
- Only service role can auto-insert deliveries (functions)
- Most DML (insert/update) restricted to authenticated users
- Anonymous users limited to read-only + minimal inserts (referral visits)

---

## MISSING ITEMS TO CLARIFY WITH STAKEHOLDERS

1. **Payment Workflow**: Does Razorpay webhook successfully record subscriptions? How are refunds handled?
2. **Earnings Payout**: How do advisors withdraw earnings? Bank transfer system?
3. **Complaint Handling**: What's the workflow for resolved complaints in admin dashboard?
4. **Advisor Approval**: Is email sent to pending advisors? Any automated approval criteria?
5. **Profile Image Upload**: Where is the upload UI for cover images / avatar images?
6. **Telegram Delivery**: Is the telegram-webhook function deployed? Does it work end-to-end?
7. **Notification Push**: Are push notifications implemented or just system-level messages?
8. **Feature Flags**: Any A/B testing or feature toggle infrastructure?
9. **Analytics**: Is any usage tracking (via QRCode) actually implemented?
10. **Data Export**: Can users/advisors export their data? GDPR compliance?

---

**Report Generated**: 2026-03-25  
**Next Steps**: Review this catalog, identify gaps, prioritize features for next sprint.
