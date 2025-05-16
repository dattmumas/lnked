--------------------------------------------------------------------------------
-- RULESET SECTION 7.1: RLS POLICIES
--------------------------------------------------------------------------------

-- First, ensure RLS is enabled on the tables
ALTER TABLE collective_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

--------------------------------------------------------------------------------
-- RLS for 'collective_members' table
--------------------------------------------------------------------------------

-- Allow public read access to members of a collective (adjust if not desired)
DROP POLICY IF EXISTS "Allow public read access to collective members" ON collective_members;
CREATE POLICY "Allow public read access to collective members"
ON collective_members FOR SELECT
USING (true);

-- Allow members to see their own membership
DROP POLICY IF EXISTS "Allow individual members to view their own membership" ON collective_members;
CREATE POLICY "Allow individual members to view their own membership"
ON collective_members FOR SELECT
USING (auth.uid() = user_id);

-- Allow owners to insert new members into their collectives
DROP POLICY IF EXISTS "Allow collective owners to insert new members" ON collective_members;
CREATE POLICY "Allow collective owners to insert new members"
ON collective_members FOR INSERT
WITH CHECK (
    (SELECT role FROM collective_members cm WHERE cm.collective_id = collective_members.collective_id AND cm.user_id = auth.uid()) = 'owner'::collective_member_role
);

-- Allow owners to update member roles (promote/demote), but not their own role directly via this policy.
DROP POLICY IF EXISTS "Allow collective owners to update member roles" ON collective_members;
CREATE POLICY "Allow collective owners to update member roles"
ON collective_members FOR UPDATE
USING (
    (SELECT role FROM collective_members cm WHERE cm.collective_id = collective_members.collective_id AND cm.user_id = auth.uid()) = 'owner'::collective_member_role
)
WITH CHECK (
    (SELECT role FROM collective_members cm WHERE cm.collective_id = collective_members.collective_id AND cm.user_id = auth.uid()) = 'owner'::collective_member_role
    AND
    auth.uid() != user_id -- Owner cannot change their own role with this policy
);


-- Allow members to remove themselves
DROP POLICY IF EXISTS "Allow members to remove themselves" ON collective_members;
CREATE POLICY "Allow members to remove themselves"
ON collective_members FOR DELETE
USING (auth.uid() = user_id);

-- Allow owners to remove other non-owner members
DROP POLICY IF EXISTS "Allow collective owners to remove other non-owner members" ON collective_members;
CREATE POLICY "Allow collective owners to remove other non-owner members"
ON collective_members FOR DELETE
USING (
    (SELECT role FROM collective_members cm WHERE cm.collective_id = collective_members.collective_id AND cm.user_id = auth.uid()) = 'owner'::collective_member_role
    AND collective_members.role != 'owner'::collective_member_role
    AND auth.uid() != user_id
);


--------------------------------------------------------------------------------
-- RLS for 'posts' table
--------------------------------------------------------------------------------

-- Allow public read access for active and public posts
DROP POLICY IF EXISTS "Allow public read access for active and public posts" ON posts;
CREATE POLICY "Allow public read access for active and public posts"
ON posts FOR SELECT
USING (is_public = TRUE AND status = 'active'::post_status_type);

-- Allow authors to read their own posts, regardless of status/is_public
DROP POLICY IF EXISTS "Allow authors to read their own posts" ON posts;
CREATE POLICY "Allow authors to read their own posts"
ON posts FOR SELECT
USING (auth.uid() = author_id);

-- Allow members of a collective (owner/editor) to read all posts in that collective
DROP POLICY IF EXISTS "Allow collective owners/editors to read collective posts" ON posts;
CREATE POLICY "Allow collective owners/editors to read collective posts"
ON posts FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM collective_members cm
        WHERE cm.collective_id = posts.collective_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('owner'::collective_member_role, 'editor'::collective_member_role)
    )
);

-- Allow authenticated users to insert posts (as authors)
DROP POLICY IF EXISTS "Allow authenticated users to insert posts" ON posts;
CREATE POLICY "Allow authenticated users to insert posts"
ON posts FOR INSERT
WITH CHECK (auth.uid() = author_id);


-- Allow authors to update their own posts
DROP POLICY IF EXISTS "Allow authors to update their own posts" ON posts;
CREATE POLICY "Allow authors to update their own posts"
ON posts FOR UPDATE
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);


-- Allow collective owners/editors to update any post in their collective
DROP POLICY IF EXISTS "Allow collective owners/editors to update collective posts" ON posts;
CREATE POLICY "Allow collective owners/editors to update collective posts"
ON posts FOR UPDATE
USING (
    EXISTS (
        SELECT 1
        FROM collective_members cm
        WHERE cm.collective_id = posts.collective_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('owner'::collective_member_role, 'editor'::collective_member_role)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM collective_members cm
        WHERE cm.collective_id = posts.collective_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('owner'::collective_member_role, 'editor'::collective_member_role)
    )
);

-- Allow authors to 'remove' (soft-delete) their own posts by setting status to 'removed'
DROP POLICY IF EXISTS "Allow authors to soft-delete their own posts" ON posts;
CREATE POLICY "Allow authors to soft-delete their own posts"
ON posts FOR UPDATE
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id AND status = 'removed'::post_status_type);


-- Allow collective owners/editors to 'remove' (soft-delete) any post in their collective
DROP POLICY IF EXISTS "Allow collective owners/editors to soft-delete collective posts" ON posts;
CREATE POLICY "Allow collective owners/editors to soft-delete collective posts"
ON posts FOR UPDATE
USING (
    EXISTS (
        SELECT 1
        FROM collective_members cm
        WHERE cm.collective_id = posts.collective_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('owner'::collective_member_role, 'editor'::collective_member_role)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM collective_members cm
        WHERE cm.collective_id = posts.collective_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('owner'::collective_member_role, 'editor'::collective_member_role)
    )
    AND status = 'removed'::post_status_type
);

-- Optional Hard Delete Policies (Generally prefer soft-delete via status update)
-- DROP POLICY IF EXISTS "Allow authors to hard-delete their own posts" ON posts;
-- CREATE POLICY "Allow authors to hard-delete their own posts"
-- ON posts FOR DELETE
-- USING (auth.uid() = author_id);

-- DROP POLICY IF EXISTS "Allow collective owners/editors to hard-delete collective posts" ON posts;
-- CREATE POLICY "Allow collective owners/editors to hard-delete collective posts"
-- ON posts FOR DELETE
-- USING (
--     EXISTS (
--         SELECT 1
--         FROM collective_members cm
--         WHERE cm.collective_id = posts.collective_id
--         AND cm.user_id = auth.uid()
--         AND cm.role IN ('owner'::collective_member_role, 'editor'::collective_member_role)
--     )
-- ); 