
INSERT INTO storage.buckets (id, name, public)
VALUES ('group-media', 'group-media', true)
ON CONFLICT (id) DO NOTHING;
