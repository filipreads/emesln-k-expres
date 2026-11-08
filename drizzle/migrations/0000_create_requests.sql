CREATE TYPE public.request_status AS ENUM ('nova','oslovovani','prijato','na_ceste','dokonceno');
CREATE TABLE public.service_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  urgency text NOT NULL,
  trade text NOT NULL,
  address text NOT NULL,
  district text NOT NULL,
  description text NOT NULL,
  phone text NOT NULL,
  photo_path text,
  status public.request_status NOT NULL DEFAULT 'nova',
  broadcast_count int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.service_requests TO service_role;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.craftsman_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,
  trade text NOT NULL,
  area text NOT NULL,
  phone text NOT NULL
);
GRANT ALL ON public.craftsman_applications TO service_role;
ALTER TABLE public.craftsman_applications ENABLE ROW LEVEL SECURITY;