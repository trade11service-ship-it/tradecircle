import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const message = body?.message;
    if (!message) {
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    const chatId = message.chat?.id;
    const text = message.text || '';
    const username = message.from?.username || '';

    if (!chatId) {
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    if (text.startsWith('/start')) {
      // Find user by telegram_username (with or without @)
      const cleanUsername = username.toLowerCase();

      // Search telegram_settings for matching username
      const { data: settings } = await supabase
        .from('telegram_settings')
        .select('id, user_id, group_id, telegram_username')
        .or(`telegram_username.ilike.${cleanUsername},telegram_username.ilike.@${cleanUsername}`);

      if (settings && settings.length > 0) {
        // Update all matching rows with chat_id and bot_started
        for (const setting of settings) {
          await supabase
            .from('telegram_settings')
            .update({ telegram_chat_id: String(chatId), bot_started: true })
            .eq('id', setting.id);
        }

        // Also update any future settings for this user
        // by updating the profile telegram_username for consistency
        const userId = settings[0].user_id;
        await supabase
          .from('profiles')
          .update({ telegram_username: username })
          .eq('id', userId);

        // Send welcome message
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `👋 <b>Welcome to TradeCircle Alerts!</b>\n\nYou're all set! You'll now receive trading signals directly here when your subscribed advisors post.\n\n🛡️ <i>TradeCircle — SEBI Verified Advisors</i>`,
            parse_mode: 'HTML',
          }),
        });
      } else {
        // Username not found - tell user to set it up on the website first
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `⚠️ <b>Username not found</b>\n\nPlease make sure you've entered your Telegram username on the TradeCircle dashboard first, then come back and press /start again.\n\nYour Telegram username: @${username || 'unknown'}`,
            parse_mode: 'HTML',
          }),
        });
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
  }
});
