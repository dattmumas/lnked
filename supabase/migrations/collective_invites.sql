-- Migration: Add collective_invites table for pending invites
CREATE TABLE IF NOT EXISTS public.collective_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collective_id uuid NOT NULL REFERENCES public.collectives(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  invite_code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  invited_by_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_collective_invites_email ON public.collective_invites(email);
CREATE INDEX IF NOT EXISTS idx_collective_invites_collective_id ON public.collective_invites(collective_id); 