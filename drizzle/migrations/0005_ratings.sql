CREATE TABLE public.ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  direction text NOT NULL CHECK (direction IN ('customer_to_craftsman','craftsman_to_customer')),
  stars int NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment text CHECK (char_length(comment) <= 500),
  public_ok boolean NOT NULL DEFAULT false,
  author_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, direction)
);
GRANT ALL ON public.ratings TO service_role;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;