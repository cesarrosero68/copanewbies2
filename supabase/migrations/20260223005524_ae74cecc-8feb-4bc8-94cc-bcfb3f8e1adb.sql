
-- Create penalty types enum or just use text for flexibility
CREATE TABLE public.penalty_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id),
  player_id UUID NOT NULL REFERENCES public.players(id),
  period TEXT NOT NULL CHECK (period IN ('1', '2', '3', 'OT')),
  time_mmss TEXT NOT NULL,
  penalty_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.penalty_events ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Public read penalty_events"
ON public.penalty_events FOR SELECT
USING (true);

-- Admin insert
CREATE POLICY "Admin insert penalty_events"
ON public.penalty_events FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admin update
CREATE POLICY "Admin update penalty_events"
ON public.penalty_events FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admin delete
CREATE POLICY "Admin delete penalty_events"
ON public.penalty_events FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
