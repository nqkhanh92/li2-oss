-- Drop old notifications table and related objects
DROP TRIGGER IF EXISTS trigger_update_notifications_updated_at ON public.notifications;
DROP FUNCTION IF EXISTS public.update_notifications_updated_at();
DROP TABLE IF EXISTS public.notifications CASCADE;

-- Create new notifications table with updated structure
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  
  -- Notification type (enum values from NotificationType)
  type TEXT NOT NULL,
  
  -- Notification scope
  scope TEXT NOT NULL,
  
  -- Notification category
  category TEXT NOT NULL,
  
  -- Notification priority
  priority TEXT NOT NULL DEFAULT 'low',
  
  -- Content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Additional data and metadata
  data JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Action (for redirects, etc.)
  action JSONB,
  
  -- Channels (array of delivery channels)
  channels TEXT[] DEFAULT ARRAY['in_app']::TEXT[],
  
  -- Read status
  read_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_organization_id ON public.notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_scope ON public.notifications(scope);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON public.notifications(category);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON public.notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON public.notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id) WHERE read_at IS NULL;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_notifications_updated_at();

-- Add comments to table and columns
COMMENT ON TABLE public.notifications IS 'Stores user notifications for real-time and historical display with type-safe structure';
COMMENT ON COLUMN public.notifications.type IS 'Notification type from NotificationType enum (e.g., collection.user_added, quota.exceeded.ai_credit)';
COMMENT ON COLUMN public.notifications.scope IS 'Notification scope: user (individual), organization (org-wide), or system (system-wide)';
COMMENT ON COLUMN public.notifications.category IS 'Notification category: touchpoint, billing, system, or security';
COMMENT ON COLUMN public.notifications.priority IS 'Notification priority level: low, medium, high, or urgent';
COMMENT ON COLUMN public.notifications.data IS 'Type-specific data payload based on NotificationDataMap';
COMMENT ON COLUMN public.notifications.metadata IS 'Additional metadata for the notification';
COMMENT ON COLUMN public.notifications.action IS 'Action object for redirects (e.g., {"type": "redirect", "url": "/path"})';
COMMENT ON COLUMN public.notifications.channels IS 'Delivery channels array: in_app, email, push, sms';
COMMENT ON COLUMN public.notifications.read_at IS 'Timestamp when notification was read (NULL = unread)';