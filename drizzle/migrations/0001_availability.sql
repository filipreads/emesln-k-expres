CREATE TABLE public.availability (id int PRIMARY KEY DEFAULT 1 CHECK (id = 1), available_count int NOT NULL DEFAULT 0 CHECK (available_count >= 0), eta_minutes int NOT NULL DEFAULT 90 CHECK (eta_minutes BETWEEN 10 AND 600), updated_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.availability TO service_role;
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
INSERT INTO public.availability (id, available_count, eta_minutes) VALUES (1, 0, 90);