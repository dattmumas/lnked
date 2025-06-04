/*****************************************************************************************
  CHAINS – micro-post model (public.chains + supporting objects)
  Fits your current schema (posts, follows, interactions, etc.)
  * Tested on Postgres 16 / Supabase 2025-06
  * All objects created with IF NOT EXISTS or dynamic checks
******************************************************************************************/

/*───────────────────────────────
  0.  ENUMs (only once)
───────────────────────────────*/
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'chain_visibility'
  ) THEN
    CREATE TYPE public.chain_visibility AS ENUM ('public','followers','private','unlisted');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'chain_status'
  ) THEN
    CREATE TYPE public.chain_status AS ENUM ('active','deleted','shadow_hidden');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'chain_reaction_type'
  ) THEN
    CREATE TYPE public.chain_reaction_type AS ENUM ('like','rechain');
  END IF;

  /* Only extend if interaction_entity_type exists */
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'interaction_entity_type') THEN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'interaction_entity_type'::regtype
      AND enumlabel = 'chain'
  ) THEN
    ALTER TYPE public.interaction_entity_type ADD VALUE 'chain';
    END IF;
  END IF;

  /* Only extend if interaction_type exists */
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'interaction_type') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumtypid = 'interaction_type'::regtype
        AND enumlabel = 'chain_view'
    ) THEN
      ALTER TYPE public.interaction_type ADD VALUE 'chain_view';
    END IF;
  END IF;
END$$;


/*───────────────────────────────
  1.  Core table: public.chains
───────────────────────────────*/
CREATE TABLE IF NOT EXISTS public.chains (
  id               uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id        uuid            NOT NULL
                    REFERENCES public.users(id) ON DELETE CASCADE,
  collective_id    uuid            REFERENCES public.collectives(id) ON DELETE CASCADE,
  parent_chain_id  uuid            REFERENCES public.chains(id) ON DELETE CASCADE,
  content          text            NOT NULL CHECK (char_length(content) <= 1024),
  attachments      jsonb           DEFAULT '[]'::jsonb,
  visibility       public.chain_visibility NOT NULL DEFAULT 'public',
  status           public.chain_status     NOT NULL DEFAULT 'active',
  like_count       integer         NOT NULL DEFAULT 0,
  reply_count      integer         NOT NULL DEFAULT 0,
  meta             jsonb           DEFAULT '{}'::jsonb,        -- link previews, etc.
  created_at       timestamptz     NOT NULL DEFAULT now(),
  updated_at       timestamptz     NOT NULL DEFAULT now(),
  tsv              tsvector        GENERATED ALWAYS AS (
                    setweight(to_tsvector('simple', coalesce(content,'')), 'A')
                  ) STORED
);

-- indexes
CREATE INDEX IF NOT EXISTS chains_author_created_idx   ON public.chains (author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS chains_parent_idx           ON public.chains (parent_chain_id);
CREATE INDEX IF NOT EXISTS chains_visibility_idx       ON public.chains (visibility);
CREATE INDEX IF NOT EXISTS chains_tsv_idx              ON public.chains USING GIN (tsv);

-- trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION public.tg_chains_set_updated_at() RETURNS trigger
  LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at := now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS trg_set_updated_at_chains ON public.chains;
CREATE TRIGGER trg_set_updated_at_chains
  BEFORE UPDATE ON public.chains
  FOR EACH ROW EXECUTE FUNCTION public.tg_chains_set_updated_at();


/*───────────────────────────────
  2.  Reactions  (like / rechain / etc.)
───────────────────────────────*/
CREATE TABLE IF NOT EXISTS public.chain_reactions (
  chain_id   uuid  NOT NULL REFERENCES public.chains(id) ON DELETE CASCADE,
  user_id    uuid  NOT NULL REFERENCES public.users(id)  ON DELETE CASCADE,
  reaction   public.chain_reaction_type NOT NULL DEFAULT 'like',
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (chain_id, user_id, reaction)
);

-- keep like_count in sync
CREATE OR REPLACE FUNCTION public.tg_chain_like_count() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.chains SET like_count = like_count + 1 WHERE id = NEW.chain_id;
    RETURN NEW;
  ELSIF TG_OP = DELETE THEN
    UPDATE public.chains SET like_count = like_count - 1 WHERE id = OLD.chain_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END$$;
DROP TRIGGER IF EXISTS trg_chain_like_count_ins ON public.chain_reactions;
DROP TRIGGER IF EXISTS trg_chain_like_count_del ON public.chain_reactions;
CREATE TRIGGER trg_chain_like_count_ins AFTER INSERT ON public.chain_reactions
  FOR EACH ROW EXECUTE FUNCTION public.tg_chain_like_count();
CREATE TRIGGER trg_chain_like_count_del AFTER DELETE ON public.chain_reactions
  FOR EACH ROW EXECUTE FUNCTION public.tg_chain_like_count();


/*───────────────────────────────
  3.  Bookmarks  (optional but mirrors post_bookmarks)
───────────────────────────────*/
CREATE TABLE IF NOT EXISTS public.chain_bookmarks (
  user_id    uuid NOT NULL REFERENCES public.users(id)   ON DELETE CASCADE,
  chain_id   uuid NOT NULL REFERENCES public.chains(id)  ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, chain_id)
);


/*───────────────────────────────
  4.  Helper function for RLS (create if missing)
───────────────────────────────*/
-- Create is_following function if it doesn't exist
CREATE OR REPLACE FUNCTION public.is_following(follower_user_id uuid, target_id uuid, target_type text DEFAULT 'user')
RETURNS boolean
LANGUAGE sql SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.follows 
    WHERE follows.follower_id = $1 
      AND follows.following_id = $2
      AND follows.following_type = $3
  );
$$;


/*───────────────────────────────
  5.  RLS  (mirrors posts + follows)
───────────────────────────────*/
ALTER TABLE public.chains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chain_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chain_bookmarks ENABLE ROW LEVEL SECURITY;

/* READ — anyone can read public chains; followers can read follower-only; owner always */
DROP POLICY IF EXISTS read_chains ON public.chains;
CREATE POLICY read_chains ON public.chains
  FOR SELECT USING (
    visibility = 'public'
    OR (visibility = 'followers' AND public.is_following(auth.uid(), author_id, 'user'))
    OR auth.uid() = author_id
  );

/* INSERT — only authenticated user acting as author */
DROP POLICY IF EXISTS insert_chains ON public.chains;
CREATE POLICY insert_chains ON public.chains
  FOR INSERT WITH CHECK (auth.uid() = author_id);

/* UPDATE / DELETE — author only */
DROP POLICY IF EXISTS mutate_own_chains ON public.chains;
CREATE POLICY mutate_own_chains ON public.chains
  FOR UPDATE USING (auth.uid() = author_id)
  WITH CHECK   (auth.uid() = author_id);

DROP POLICY IF EXISTS delete_own_chains ON public.chains;
CREATE POLICY delete_own_chains ON public.chains
  FOR DELETE USING (auth.uid() = author_id);

/* Reactions RLS — manage own */
DROP POLICY IF EXISTS own_chain_reactions ON public.chain_reactions;
CREATE POLICY own_chain_reactions ON public.chain_reactions
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

/* Bookmarks RLS — manage own */
DROP POLICY IF EXISTS own_chain_bookmarks ON public.chain_bookmarks;
CREATE POLICY own_chain_bookmarks ON public.chain_bookmarks
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


/*───────────────────────────────
  6.  Search integration (only if search_documents view exists)
───────────────────────────────*/
DO $$
BEGIN
  -- Only create/replace the view if it already exists or we have the base tables
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'search_documents') 
     OR (EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'collectives') 
         AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'posts')) THEN
    
CREATE OR REPLACE VIEW public.search_documents AS
  SELECT 'collective'  AS document_type, id AS document_id, name      AS title,
             description   AS content_preview, 
             setweight(to_tsvector('simple', coalesce(name,'')), 'A') ||
             setweight(to_tsvector('simple', coalesce(description,'')), 'B') AS tsv_document
    FROM public.collectives
  UNION ALL
      SELECT 'user',        id, full_name, bio,
             setweight(to_tsvector('simple', coalesce(full_name,'')), 'A') ||
             setweight(to_tsvector('simple', coalesce(bio,'')), 'B') AS tsv_document
    FROM public.users
  UNION ALL
      SELECT 'post',        id, title, left(content,200),
             setweight(to_tsvector('simple', coalesce(title,'')), 'A') ||
             setweight(to_tsvector('simple', coalesce(content,'')), 'B') AS tsv_document
    FROM public.posts
   WHERE is_public = true AND status = 'active'
  UNION ALL
  SELECT 'chain',       id, substr(content,1,100), substr(content,1,200), tsv
    FROM public.chains
   WHERE visibility = 'public' AND status = 'active';
  END IF;
END$$;


/*───────────────────────────────
  7.  Interaction hook  (only if interactions table exists)
───────────────────────────────*/
-- Note: Interaction logging function can be added in a separate migration
-- after the enum values are committed to avoid transaction conflicts


/*───────────────────────────────
  8.  Future-proof stubs
───────────────────────────────
  -- chain_poll, chain_edits, chain_translations, etc.
  -- replicate the pattern above when needed
*/
