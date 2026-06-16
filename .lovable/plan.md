## Plan: rebuild the group page for stable mobile scrolling

### Goal
Make `/group/:id` behave like a real chat/channel screen:
- The whole page must not move up/down on pull gestures.
- Only the message/feed area should scroll.
- No blank white screen or gap below the Subscribe bar.
- First load must be stable without needing refresh, pull, or resize.

### What I will change

1. **Lock the group route shell in `AppLayout`**
   - For `/group/*`, use a dedicated fixed-height app shell with `h-dvh`, `overflow-hidden`, `min-h-0`.
   - Remove the normal page scroll behavior for group pages.
   - Keep normal scrolling untouched for all other routes.

2. **Rebuild `GroupDetails` as a three-part fixed layout**
   ```text
   App mobile header
   └─ Group page viewport
      ├─ Group/channel header        fixed height
      ├─ GroupFeed messages          only scrollable area
      └─ Subscribe/composer bar      fixed bottom inside layout
   ```
   - Remove fragile viewport resize hacks and sticky/relative combinations that are causing jumpy first-load behavior.
   - Use `flex flex-col min-h-0 overflow-hidden` throughout so height is inherited precisely.
   - Make the mobile Subscribe bar `shrink-0` inside the page, not browser-sticky/fixed, so it cannot create extra document height or white space.

3. **Fix `GroupFeed` scroll ownership**
   - Ensure the feed wrapper owns the only `overflow-y-auto` scroll area.
   - Add mobile-friendly scroll containment (`overscroll-contain`, touch scrolling) so pull-down/up gestures do not move the whole page.
   - Adjust auto-scroll behavior so it scrolls the feed container directly instead of relying on document-level `scrollIntoView` where possible.

4. **Preserve current UI and functionality**
   - Keep the existing group header, advisor profile link, Subscribe CTA, real-time feed, lock overlay, and advisor composer behavior.
   - Only change layout mechanics and scroll stability.
   - Desktop two-column group page stays visually the same, but with stricter height containment.

5. **Verify in mobile viewport**
   - Open a group page in mobile dimensions.
   - Confirm the outer page does not scroll or reveal blank space.
   - Confirm only messages scroll smoothly.
   - Confirm Subscribe/composer stays visible without white gaps.