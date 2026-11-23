ALTER TABLE public.service_requests ALTER COLUMN phone SET DEFAULT '';
ALTER TABLE public.service_requests ADD COLUMN IF NOT EXISTS email text, ADD COLUMN IF NOT EXISTS dispatcher_note text, ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
COMMENT ON COLUMN public.service_requests.phone IS 'DEPRECATED: replaced by email';
ALTER TABLE public.craftsman_applications ALTER COLUMN phone SET DEFAULT '';
ALTER TABLE public.craftsman_applications ADD COLUMN IF NOT EXISTS email text;
COMMENT ON COLUMN public.craftsman_applications.phone IS 'DEPRECATED: replaced by email';
COMMENT ON TABLE public.callback_requests IS 'DEPRECATED: replaced by contact_messages';
CREATE INDEX IF NOT EXISTS service_requests_status_created_idx ON public.service_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS service_requests_region_trade_idx ON public.service_requests(region, trade);
CREATE INDEX IF NOT EXISTS service_requests_email_created_idx ON public.service_requests(lower(email), created_at DESC);
CREATE INDEX IF NOT EXISTS service_requests_customer_idx ON public.service_requests(customer_user_id, created_at DESC);

CREATE TABLE public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  trade text NOT NULL,
  message text NOT NULL,
  handled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.contact_messages TO service_role;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX contact_messages_email_idx ON public.contact_messages(lower(email), created_at DESC);

CREATE TABLE public.request_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  actor text NOT NULL DEFAULT 'system',
  event text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.request_events TO service_role;
ALTER TABLE public.request_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX request_events_request_idx ON public.request_events(request_id, created_at);

CREATE TABLE public.customer_profiles (
  user_id uuid PRIMARY KEY,
  name text,
  address text,
  city text,
  postal_code text,
  region text,
  email_updates boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.customer_profiles TO service_role;
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.log_request_event() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a text := coalesce(nullif(current_setting('app.actor', true), ''), 'system');
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.request_events(request_id, actor, event) VALUES (NEW.id, 'zakaznik', 'Objednávka vytvořena');
  ELSE
    IF NEW.status IS DISTINCT FROM OLD.status THEN INSERT INTO public.request_events(request_id, actor, event) VALUES (NEW.id, a, 'Stav: ' || NEW.status::text); END IF;
    IF NEW.assigned_craftsman_id IS DISTINCT FROM OLD.assigned_craftsman_id THEN INSERT INTO public.request_events(request_id, actor, event) VALUES (NEW.id, a, 'Přiřazen řemeslník'); END IF;
    IF NEW.cancelled_at IS NOT NULL AND OLD.cancelled_at IS NULL THEN INSERT INTO public.request_events(request_id, actor, event) VALUES (NEW.id, a, 'Zakázka zrušena'); END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.log_request_event() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER service_requests_log AFTER INSERT OR UPDATE ON public.service_requests FOR EACH ROW EXECUTE FUNCTION public.log_request_event();

CREATE OR REPLACE FUNCTION public.notify_order_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.tracking_token IS NOT NULL AND (NEW.status IS DISTINCT FROM OLD.status OR NEW.assigned_craftsman_id IS DISTINCT FROM OLD.assigned_craftsman_id OR NEW.arrival_minutes IS DISTINCT FROM OLD.arrival_minutes OR NEW.cancelled_at IS DISTINCT FROM OLD.cancelled_at) THEN
    BEGIN
      PERFORM realtime.send('{}'::jsonb, 'changed', 'order:' || NEW.tracking_token::text, false);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.accept_job_offer(p_token uuid,p_offer uuid,p_minutes integer) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.craftsman_applications; o public.job_offers; r public.service_requests;
BEGIN
IF p_minutes < 10 OR p_minutes > 600 THEN RAISE EXCEPTION 'Invalid arrival time'; END IF;
SELECT * INTO c FROM public.craftsman_applications WHERE portal_token=p_token FOR UPDATE;
IF NOT FOUND OR NOT c.approved OR NOT c.available THEN RAISE EXCEPTION 'Craftsman unavailable'; END IF;
SELECT * INTO o FROM public.job_offers WHERE id=p_offer AND craftsman_id=c.id FOR UPDATE;
IF NOT FOUND OR o.state <> 'pending' THEN RAISE EXCEPTION 'Offer unavailable'; END IF;
SELECT * INTO r FROM public.service_requests WHERE id=o.request_id FOR UPDATE;
IF NOT FOUND OR r.assigned_craftsman_id IS NOT NULL OR r.cancelled_at IS NOT NULL OR r.status NOT IN ('nova','oslovovani') THEN RAISE EXCEPTION 'Job already taken'; END IF;
PERFORM set_config('app.actor', 'remeslnik', true);
UPDATE public.service_requests SET assigned_craftsman_id=c.id,status='prijato',arrival_minutes=p_minutes,updated_at=now(),automation_note=NULL WHERE id=r.id;
UPDATE public.job_offers SET state=CASE WHEN id=o.id THEN 'accepted' ELSE 'closed' END WHERE request_id=r.id;
UPDATE public.craftsman_applications SET available=false WHERE id=c.id;
RETURN r.id;
END; $$;
REVOKE ALL ON FUNCTION public.accept_job_offer(uuid,uuid,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.accept_job_offer(uuid,uuid,integer) TO service_role;

CREATE OR REPLACE FUNCTION public.assign_request(p_request uuid, p_craftsman uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.craftsman_applications; r public.service_requests;
BEGIN
SELECT * INTO c FROM public.craftsman_applications WHERE id=p_craftsman FOR UPDATE;
IF NOT FOUND OR NOT c.approved THEN RAISE EXCEPTION 'Craftsman not approved'; END IF;
SELECT * INTO r FROM public.service_requests WHERE id=p_request FOR UPDATE;
IF NOT FOUND OR r.assigned_craftsman_id IS NOT NULL OR r.cancelled_at IS NOT NULL OR r.status NOT IN ('nova','oslovovani') THEN RAISE EXCEPTION 'Request not assignable'; END IF;
PERFORM set_config('app.actor', 'dispecink', true);
UPDATE public.service_requests SET assigned_craftsman_id=c.id,status='prijato',updated_at=now(),automation_note=NULL WHERE id=r.id;
UPDATE public.job_offers SET state='closed' WHERE request_id=r.id;
UPDATE public.craftsman_applications SET available=false WHERE id=c.id;
END; $$;
REVOKE ALL ON FUNCTION public.assign_request(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.assign_request(uuid,uuid) TO service_role;