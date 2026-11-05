ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS yearly_amount text DEFAULT '0';
