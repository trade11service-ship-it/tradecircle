## Root cause

1. **Subscriber-only updates are invisible to non-subscribers because the database policy only allows public posts or subscribed rows to be read.** The frontend blur overlay cannot render a subscriber-only post if the row never reaches the browser.
2. **Realtime is already wired in the component and `signals` is already enabled for realtime**, but the same row-level read policy blocks non-subscribers from receiving subscriber-only realtime events. Public posts can arrive, premium rows cannot.
3. The current frontend visibility logic only locks **signals**, while subscriber-only **message/update** posts fall through as fully visible if they are fetched. That needs to become a blurred lock preview too.

## Plan

### 1. Add a safe feed preview database path
- Create a database RPC for group feed reads, e.g. `get_group_feed_posts(_group_id uuid)`.
- It will return rows for the requested group when the group is active/visible, including both public and subscriber-only posts.
- This RPC is intentionally for **preview rendering**: non-subscribers can receive the row needed to render the frosted preview, while the UI still masks locked content.
- Keep existing direct `signals` policies strict so private rows are not generally exposed through arbitrary client queries.

### 2. Add a realtime-safe preview event source
- Add a lightweight public table for feed change notifications, e.g. `group_feed_events`, containing only non-sensitive event metadata: `signal_id`, `group_id`, `event_type`, `created_at`.
- Add database triggers on `public.signals` for insert/update/delete to write event rows.
- Enable realtime for `group_feed_events` instead of relying only on private `signals` realtime for guest/non-subscriber views.
- Add RLS so viewers can subscribe to events for active groups, without exposing locked post content through the event itself.

### 3. Update `GroupFeed.tsx` fetch and realtime flow
- Replace the current direct `.from('signals').select('*')` feed fetch with the new `get_group_feed_posts` RPC.
- Keep posts ordered oldest-to-newest for chat display.
- Subscribe to `group_feed_events` filtered by the current `group_id`.
- On an insert/update/delete event, re-fetch only the affected post or refresh the feed via the RPC, then merge/update/remove it locally.
- Keep deduplication so the advisor’s own quick composer and realtime event do not duplicate messages.
- Add a small reconnect/fallback path: when the realtime channel status reconnects or errors, refresh the feed once.

### 4. Fix lock overlay for subscriber-only updates/messages
- Update `getPostVisibility` so any `is_public = false` post shown to a non-subscriber/non-owner returns `showLockOverlay: true`, whether it is a signal or a message/update.
- Keep public posts fully visible.
- Preserve the existing delayed public/F&O logic for signals where applicable.
- Update the overlay copy to say “Premium update” for message posts and “Premium signal” for signal posts.

### 5. Verify behavior
- Confirm the RPC returns subscriber-only posts for preview rendering.
- Confirm a non-subscriber sees subscriber-only “hii” messages blurred with the subscribe CTA.
- Confirm new group updates appear without leaving/re-entering the group.
- Confirm subscribers/owners still see full content and advisors can still post normally.