ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS preferred_time timestamptz;

CREATE OR REPLACE FUNCTION public.notify_order_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.tracking_token IS NOT NULL AND (NEW.status IS DISTINCT FROM OLD.status OR NEW.assigned_craftsman_id IS DISTINCT FROM OLD.assigned_craftsman_id OR NEW.arrival_minutes IS DISTINCT FROM OLD.arrival_minutes) THEN
    BEGIN
      PERFORM realtime.send('{}'::jsonb, 'changed', 'order:' || NEW.tracking_token::text, false);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.notify_order_change() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS service_requests_notify ON public.service_requests;
CREATE TRIGGER service_requests_notify AFTER UPDATE ON public.service_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_order_change();