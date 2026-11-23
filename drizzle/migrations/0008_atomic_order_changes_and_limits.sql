CREATE OR REPLACE FUNCTION public.change_request(p_id uuid, p_actor text, p_status text DEFAULT NULL, p_cancel boolean DEFAULT false, p_note text DEFAULT NULL, p_customer uuid DEFAULT NULL, p_craftsman uuid DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.service_requests;
BEGIN
SELECT * INTO r FROM public.service_requests WHERE id=p_id FOR UPDATE;
IF NOT FOUND OR r.cancelled_at IS NOT NULL THEN RAISE EXCEPTION 'Request unavailable'; END IF;
IF p_actor='zakaznik' THEN
 IF p_customer IS NULL OR r.customer_user_id IS DISTINCT FROM p_customer OR NOT p_cancel OR r.assigned_craftsman_id IS NOT NULL OR r.status NOT IN ('nova','oslovovani') THEN RAISE EXCEPTION 'Not cancellable'; END IF;
ELSIF p_actor='remeslnik' THEN
 IF p_craftsman IS NULL OR r.assigned_craftsman_id IS DISTINCT FROM p_craftsman OR p_cancel OR NOT ((r.status='prijato' AND p_status='na_ceste') OR (r.status='na_ceste' AND p_status='dokonceno')) THEN RAISE EXCEPTION 'Invalid transition'; END IF;
ELSIF p_actor='dispecink' THEN
 IF p_status IS NOT NULL AND NOT ((r.status='nova' AND p_status='oslovovani') OR (r.status='prijato' AND p_status='na_ceste') OR (r.status='na_ceste' AND p_status='dokonceno')) THEN RAISE EXCEPTION 'Invalid transition'; END IF;
 IF p_cancel AND r.status='dokonceno' THEN RAISE EXCEPTION 'Already completed'; END IF;
ELSE RAISE EXCEPTION 'Invalid actor'; END IF;
PERFORM set_config('app.actor',p_actor,true);
UPDATE public.service_requests SET status=CASE WHEN p_status IS NOT NULL THEN p_status::public.request_status ELSE status END, cancelled_at=CASE WHEN p_cancel THEN now() ELSE cancelled_at END, dispatcher_note=CASE WHEN p_actor='dispecink' AND p_note IS NOT NULL THEN p_note ELSE dispatcher_note END, updated_at=now() WHERE id=p_id;
IF p_cancel THEN UPDATE public.job_offers SET state='closed' WHERE request_id=p_id; END IF;
END $$;
REVOKE ALL ON FUNCTION public.change_request(uuid,text,text,boolean,text,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.change_request(uuid,text,text,boolean,text,uuid,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.set_craftsman_state(p_id uuid,p_approved boolean,p_available boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.craftsman_applications;
BEGIN
SELECT * INTO c FROM public.craftsman_applications WHERE id=p_id FOR UPDATE;
IF NOT FOUND THEN RAISE EXCEPTION 'Craftsman missing'; END IF;
IF p_available AND EXISTS(SELECT 1 FROM public.service_requests WHERE assigned_craftsman_id=p_id AND status IN ('prijato','na_ceste') AND cancelled_at IS NULL) THEN RAISE EXCEPTION 'Active job'; END IF;
UPDATE public.craftsman_applications SET approved=p_approved,available=p_approved AND p_available WHERE id=p_id;
END $$;
REVOKE ALL ON FUNCTION public.set_craftsman_state(uuid,boolean,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.set_craftsman_state(uuid,boolean,boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.limit_email_submissions() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE n integer; lim integer;
BEGIN
IF NEW.email IS NULL THEN RETURN NEW; END IF;
NEW.email := lower(trim(NEW.email));
PERFORM pg_advisory_xact_lock(hashtextextended(TG_TABLE_NAME || ':' || NEW.email,0));
IF TG_TABLE_NAME='service_requests' THEN SELECT count(*) INTO n FROM public.service_requests WHERE lower(email)=NEW.email AND created_at>now()-interval '1 hour'; lim:=5;
ELSIF TG_TABLE_NAME='contact_messages' THEN SELECT count(*) INTO n FROM public.contact_messages WHERE lower(email)=NEW.email AND created_at>now()-interval '1 hour'; lim:=10;
ELSE SELECT count(*) INTO n FROM public.craftsman_applications WHERE lower(email)=NEW.email AND created_at>now()-interval '1 hour'; lim:=3; END IF;
IF n>=lim THEN RAISE EXCEPTION 'submission_rate_limit' USING ERRCODE='P0001'; END IF;
RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.limit_email_submissions() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER service_requests_limit BEFORE INSERT ON public.service_requests FOR EACH ROW EXECUTE FUNCTION public.limit_email_submissions();
CREATE TRIGGER contact_messages_limit BEFORE INSERT ON public.contact_messages FOR EACH ROW EXECUTE FUNCTION public.limit_email_submissions();
CREATE TRIGGER applications_limit BEFORE INSERT ON public.craftsman_applications FOR EACH ROW EXECUTE FUNCTION public.limit_email_submissions();

CREATE OR REPLACE FUNCTION public.assign_request(p_request uuid,p_craftsman uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE c public.craftsman_applications; r public.service_requests;
BEGIN
SELECT * INTO c FROM public.craftsman_applications WHERE id=p_craftsman FOR UPDATE;
IF NOT FOUND OR NOT c.approved OR NOT c.available THEN RAISE EXCEPTION 'Craftsman unavailable'; END IF;
IF EXISTS(SELECT 1 FROM public.service_requests WHERE assigned_craftsman_id=c.id AND status IN ('prijato','na_ceste') AND cancelled_at IS NULL) THEN RAISE EXCEPTION 'Active job'; END IF;
SELECT * INTO r FROM public.service_requests WHERE id=p_request FOR UPDATE;
IF NOT FOUND OR r.assigned_craftsman_id IS NOT NULL OR r.cancelled_at IS NOT NULL OR r.status NOT IN ('nova','oslovovani') OR r.region IS DISTINCT FROM c.region OR r.trade IS DISTINCT FROM c.trade THEN RAISE EXCEPTION 'Request not assignable'; END IF;
PERFORM set_config('app.actor','dispecink',true);
UPDATE public.service_requests SET assigned_craftsman_id=c.id,status='prijato',updated_at=now(),automation_note=NULL WHERE id=r.id;
UPDATE public.job_offers SET state='closed' WHERE request_id=r.id;
UPDATE public.craftsman_applications SET available=false WHERE id=c.id;
END $$;