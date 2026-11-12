ALTER TABLE public.service_requests ADD COLUMN region text, ADD COLUMN city text, ADD COLUMN tracking_token uuid NOT NULL DEFAULT gen_random_uuid(), ADD COLUMN ai_reason text, ADD COLUMN automation_note text, ADD COLUMN assigned_craftsman_id uuid, ADD COLUMN arrival_minutes integer;
CREATE UNIQUE INDEX service_requests_tracking_token_key ON public.service_requests(tracking_token);
ALTER TABLE public.craftsman_applications ADD COLUMN region text, ADD COLUMN approved boolean NOT NULL DEFAULT false, ADD COLUMN available boolean NOT NULL DEFAULT false, ADD COLUMN portal_token uuid NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX craftsman_portal_token_key ON public.craftsman_applications(portal_token);
CREATE TABLE public.job_offers (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), request_id uuid NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE, craftsman_id uuid NOT NULL REFERENCES public.craftsman_applications(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now(), state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','accepted','closed')), UNIQUE(request_id,craftsman_id));
GRANT ALL ON public.job_offers TO service_role;
ALTER TABLE public.job_offers ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.accept_job_offer(p_token uuid,p_offer uuid,p_minutes integer) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.craftsman_applications; o public.job_offers; r public.service_requests;
BEGIN
IF p_minutes < 10 OR p_minutes > 600 THEN RAISE EXCEPTION 'Invalid arrival time'; END IF;
SELECT * INTO c FROM public.craftsman_applications WHERE portal_token=p_token FOR UPDATE;
IF NOT FOUND OR NOT c.approved OR NOT c.available THEN RAISE EXCEPTION 'Craftsman unavailable'; END IF;
SELECT * INTO o FROM public.job_offers WHERE id=p_offer AND craftsman_id=c.id FOR UPDATE;
IF NOT FOUND OR o.state <> 'pending' THEN RAISE EXCEPTION 'Offer unavailable'; END IF;
SELECT * INTO r FROM public.service_requests WHERE id=o.request_id FOR UPDATE;
IF NOT FOUND OR r.assigned_craftsman_id IS NOT NULL OR r.status NOT IN ('nova','oslovovani') THEN RAISE EXCEPTION 'Job already taken'; END IF;
UPDATE public.service_requests SET assigned_craftsman_id=c.id,status='prijato',arrival_minutes=p_minutes,updated_at=now(),automation_note=NULL WHERE id=r.id;
UPDATE public.job_offers SET state=CASE WHEN id=o.id THEN 'accepted' ELSE 'closed' END WHERE request_id=r.id;
UPDATE public.craftsman_applications SET available=false WHERE id=c.id;
RETURN r.id;
END; $$;
REVOKE ALL ON FUNCTION public.accept_job_offer(uuid,uuid,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.accept_job_offer(uuid,uuid,integer) TO service_role;