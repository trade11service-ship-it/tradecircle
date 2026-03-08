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

    // Setup webhook endpoint
    if (body?.setup_webhook) {
      const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
      const webhookUrl = `${SUPABASE_URL}/functions/v1/telegram-webhook`;
      const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook?url=${encodeURIComponent(webhookUrl)}`);
      const result = await res.json();
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const message = body?.message;
    if (!message) {
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    const chatId = message.chat?.id;
    const text = message.text || '';
    const tgUsername = message.from?.username || '';

    if (!chatId) {
      return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
    }

    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    if (text.startsWith('/start')) {
      // Extract user_id from deep link if present: /start USER_ID
      const parts = text.split(' ');
      const deepLinkUserId = parts.length > 1 ? parts[1].trim() : null;
      const cleanTgUsername = tgUsername.toLowerCase().replace(/^@/, '');

      let userId: string | null = null;

      if (deepLinkUserId) {
        // Verify that the saved telegram_username in profile matches the Telegram user who pressed START
        const { data: prof } = await supabase
          .from('profiles')
          .select('id, telegram_username')
          .eq('id', deepLinkUserId)
          .single();

        if (prof) {
          const savedUsername = (prof.telegram_username || '').toLowerCase().replace(/^@/, '');
          
          if (!savedUsername) {
            // No username saved yet — reject, user must save username first
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: `⚠️ <b>Setup Incomplete</b>\n\nPlease go to your TradeCircle dashboard first, enter your Telegram username, and then click the bot link again.\n\nYour Telegram: @${tgUsername || 'unknown'}`,
                parse_mode: 'HTML',
              }),
            });
            return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
          }

          if (savedUsername !== cleanTgUsername) {
            // Username mismatch — reject
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: `❌ <b>Username Mismatch</b>\n\nYou saved <b>@${savedUsername}</b> on TradeCircle but opened this bot as <b>@${tgUsername}</b>.\n\nPlease go back to the dashboard, update your username to <b>@${tgUsername}</b>, then click the bot link again.`,
                parse_mode: 'HTML',
              }),
            });
            return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
          }

          // Check that no OTHER user already has this chat_id (one user = one telegram)
          const { data: existingChat } = await supabase
            .from('telegram_settings')
            .select('user_id')
            .eq('telegram_chat_id', String(chatId))
            .neq('user_id', prof.id)
            .limit(1);

          if (existingChat && existingChat.length > 0) {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                text: `⚠️ <b>Already Linked</b>\n\nThis Telegram account is already linked to another TradeCircle user. Each Telegram account can only be linked to one TradeCircle account.\n\nIf this is a mistake, contact support.`,
                parse_mode: 'HTML',
              }),
            });
            return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
          }

          userId = prof.id;
        }
      }

      if (!userId) {
        // Fallback: try matching by telegram_username in profiles
        const { data: profileMatch } = await supabase
          .from('profiles')
          .select('id')
          .or(`telegram_username.ilike.${cleanTgUsername},telegram_username.ilike.@${cleanTgUsername}`)
          .limit(1);

        if (profileMatch && profileMatch.length > 0) {
          userId = profileMatch[0].id;
        }
      }

      if (userId) {
        // Update all telegram_settings for this user
        const { data: settings } = await supabase
          .from('telegram_settings')
          .select('id')
          .eq('user_id', userId);

        if (settings && settings.length > 0) {
          for (const setting of settings) {
            await supabase
              .from('telegram_settings')
              .update({ telegram_chat_id: String(chatId), bot_started: true, telegram_username: tgUsername })
              .eq('id', setting.id);
          }
        }

        // Also update profile
        await supabase.from('profiles').update({ telegram_username: tgUsername }).eq('id', userId);

        // Send welcome
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
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `⚠️ <b>Account not found</b>\n\nPlease go to your TradeCircle dashboard first, enter your Telegram username, save it, and then click the bot link from the dashboard.\n\nYour Telegram: @${tgUsername || 'unknown'}`,
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
