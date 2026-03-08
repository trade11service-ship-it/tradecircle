
ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS post_type text NOT NULL DEFAULT 'signal';
ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.signals ADD COLUMN IF NOT EXISTS message_text text;

-- Make signal-specific columns nullable for message posts
ALTER TABLE public.signals ALTER COLUMN instrument DROP NOT NULL;
ALTER TABLE public.signals ALTER COLUMN signal_type DROP NOT NULL;
ALTER TABLE public.signals ALTER COLUMN entry_price DROP NOT NULL;
ALTER TABLE public.signals ALTER COLUMN target_price DROP NOT NULL;
ALTER TABLE public.signals ALTER COLUMN stop_loss DROP NOT NULL;
ALTER TABLE public.signals ALTER COLUMN timeframe DROP NOT NULL;
