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
    const { signal_id } = await req.json();
    if (!signal_id) {
      return new Response(JSON.stringify({ error: 'signal_id required' }), { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    if (!TELEGRAM_BOT_TOKEN) {
      return new Response(JSON.stringify({ error: 'Telegram bot not configured' }), { status: 500, headers: corsHeaders });
    }

    // Get signal details
    const { data: signal, error: sigError } = await supabase
      .from('signals')
      .select('*, groups!inner(name), advisors!inner(full_name)')
      .eq('id', signal_id)
      .single();

    if (sigError || !signal) {
      return new Response(JSON.stringify({ error: 'Signal not found' }), { status: 404, headers: corsHeaders });
    }

    // Only send Telegram for signal posts, not message posts
    if (signal.post_type === 'message') {
      return new Response(JSON.stringify({ sent: 0, message: 'Message posts do not trigger Telegram alerts' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get all active telegram settings with chat_id for this group
    const { data: telegramUsers } = await supabase
      .from('telegram_settings')
      .select('user_id, telegram_chat_id, telegram_username')
      .eq('group_id', signal.group_id)
      .eq('is_active', true)
      .eq('bot_started', true)
      .not('telegram_chat_id', 'is', null);

    if (!telegramUsers || telegramUsers.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No active telegram users' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Filter users who have valid subscriptions
    const { data: activeSubscriptions } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('group_id', signal.group_id)
      .eq('status', 'active');

    const activeUserIds = new Set((activeSubscriptions || []).map(s => s.user_id));
    const eligibleUsers = telegramUsers.filter(t => activeUserIds.has(t.user_id) && t.telegram_chat_id);

    // Build HTML message
    const emoji = signal.signal_type === 'BUY' ? '🟢' : '🔴';
    const advisorName = (signal as any).advisors?.full_name || 'Unknown';
    const groupName = (signal as any).groups?.name || 'Unknown';

    const message = `🔔 <b>New Signal Alert</b>\n` +
      `━━━━━━━━━━━━━━━\n` +
      `📊 <b>${signal.instrument}</b> — ${signal.signal_type} ${emoji}\n\n` +
      `💰 Entry:     ₹${signal.entry_price}\n` +
      `🎯 Target:    ₹${signal.target_price}\n` +
      `🛑 Stop Loss: ₹${signal.stop_loss}\n` +
      `⏱ Timeframe: ${signal.timeframe}\n` +
      (signal.notes ? `\n📝 ${signal.notes}\n` : '') +
      `━━━━━━━━━━━━━━━\n` +
      `👤 <i>${advisorName}</i>\n` +
      `🔗 View on TradeCircle`;

    let sentCount = 0;
    const deliveries: any[] = [];

    for (const tUser of eligibleUsers) {
      try {
        const telegramRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: tUser.telegram_chat_id,
            text: message,
            parse_mode: 'HTML',
          }),
        });

        const result = await telegramRes.json();

        deliveries.push({
          signal_id: signal.id,
          user_id: tUser.user_id,
          advisor_id: signal.advisor_id,
          group_id: signal.group_id,
          delivery_method: 'telegram',
          status: result.ok ? 'sent' : 'failed',
        });

        if (result.ok) {
          sentCount++;
        } else if (result.error_code === 403 || result.error_code === 400) {
          // User blocked bot or chat_id invalid - mark as not started
          await supabase
            .from('telegram_settings')
            .update({ bot_started: false, telegram_chat_id: null })
            .eq('user_id', tUser.user_id)
            .eq('group_id', signal.group_id);
        }
      } catch (err) {
        console.error(`Failed to send to user ${tUser.user_id}:`, err);
        deliveries.push({
          signal_id: signal.id,
          user_id: tUser.user_id,
          advisor_id: signal.advisor_id,
          group_id: signal.group_id,
          delivery_method: 'telegram',
          status: 'failed',
        });
      }
    }

    if (deliveries.length > 0) {
      await supabase.from('signal_deliveries').insert(deliveries);
    }

    return new Response(JSON.stringify({ sent: sentCount, total: eligibleUsers.length }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: corsHeaders });
  }
});
