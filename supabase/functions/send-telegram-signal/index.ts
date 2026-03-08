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

    // Get all active telegram settings for this group
    const { data: telegramUsers } = await supabase
      .from('telegram_settings')
      .select('user_id, telegram_username')
      .eq('group_id', signal.group_id)
      .eq('is_active', true);

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
    const eligibleUsers = telegramUsers.filter(t => activeUserIds.has(t.user_id) && t.telegram_username);

    // Build the message
    const emoji = signal.signal_type === 'BUY' ? '🟢' : '🔴';
    const message = `${emoji} *${signal.signal_type} Signal*\n\n` +
      `📊 *${signal.instrument}*\n` +
      `👤 Advisor: ${(signal as any).advisors?.full_name || 'Unknown'}\n` +
      `📁 Group: ${(signal as any).groups?.name || 'Unknown'}\n\n` +
      `▶️ Entry: ₹${signal.entry_price}\n` +
      `🎯 Target: ₹${signal.target_price}\n` +
      `🛑 Stop Loss: ₹${signal.stop_loss}\n` +
      `⏱ Timeframe: ${signal.timeframe}\n` +
      (signal.notes ? `\n📝 Notes: ${signal.notes}` : '') +
      `\n\n_via TradeCircle_`;

    let sentCount = 0;
    const deliveries: any[] = [];

    for (const tUser of eligibleUsers) {
      try {
        // Try to get chat ID by username - send message
        // Note: Telegram bot API requires chat_id, not username for sendMessage
        // Users need to start the bot first. For now we use username as chat_id placeholder
        // In production, you'd store chat_id when user starts the bot
        const chatId = tUser.telegram_username.replace('@', '');
        
        const telegramRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: `@${chatId}`,
            text: message,
            parse_mode: 'Markdown',
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

        if (result.ok) sentCount++;
      } catch (err) {
        console.error(`Failed to send to ${tUser.telegram_username}:`, err);
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

    // Record deliveries using service role
    if (deliveries.length > 0) {
      await supabase.from('signal_deliveries').insert(deliveries);
    }

    return new Response(JSON.stringify({ sent: sentCount, total: eligibleUsers.length }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
