ALTER TABLE public.user_email_preference
  ADD COLUMN IF NOT EXISTS unsubscribe_reason TEXT;
