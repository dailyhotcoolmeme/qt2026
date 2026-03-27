-- 동역자 관계 테이블 (같은 모임 내 1:1 파트너십)
CREATE TABLE IF NOT EXISTS public.group_partners (
  id bigserial PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, requester_id, target_id)
);

CREATE INDEX IF NOT EXISTS group_partners_target_idx
  ON public.group_partners(group_id, target_id);
CREATE INDEX IF NOT EXISTS group_partners_requester_idx
  ON public.group_partners(group_id, requester_id);

ALTER TABLE public.group_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "group_partners_select" ON public.group_partners
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = target_id);
CREATE POLICY "group_partners_insert" ON public.group_partners
  FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "group_partners_update" ON public.group_partners
  FOR UPDATE USING (auth.uid() = target_id);
CREATE POLICY "group_partners_delete" ON public.group_partners
  FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = target_id);
