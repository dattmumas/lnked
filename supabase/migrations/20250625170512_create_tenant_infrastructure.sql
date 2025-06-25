-- Migration: Create comprehensive tenant infrastructure
-- Date: December 25, 2025
-- Description: Implements the core tenant system with tenants, tenant_members tables and RPC functions

-- Create tenant type enum
CREATE TYPE tenant_type AS ENUM ('personal', 'collective');

-- Create member role enum for tenant members
CREATE TYPE member_role AS ENUM ('owner', 'admin', 'editor', 'member');

-- Create tenants table
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    type tenant_type DEFAULT 'collective',
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    logo_url TEXT,
    cover_image_url TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_slug CHECK (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' AND char_length(slug) >= 3),
    CONSTRAINT valid_name CHECK (char_length(name) >= 1 AND char_length(name) <= 100)
);

-- Create tenant members table
CREATE TABLE tenant_members (
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role member_role DEFAULT 'member',
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    PRIMARY KEY (tenant_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_type ON tenants(type);
CREATE INDEX idx_tenants_is_public ON tenants(is_public);
CREATE INDEX idx_tenant_members_user ON tenant_members(user_id, role);
CREATE INDEX idx_tenant_members_tenant ON tenant_members(tenant_id, role);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_tenant_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tenant_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION update_tenant_updated_at();

CREATE TRIGGER trigger_update_tenant_members_updated_at
    BEFORE UPDATE ON tenant_members
    FOR EACH ROW
    EXECUTE FUNCTION update_tenant_updated_at();

-- RPC function: Get user's tenants
CREATE OR REPLACE FUNCTION get_user_tenants(target_user_id UUID DEFAULT NULL)
RETURNS TABLE (
    tenant_id UUID,
    tenant_type tenant_type,
    tenant_name TEXT,
    tenant_slug TEXT,
    user_role member_role,
    is_personal BOOLEAN,
    member_count BIGINT,
    is_public BOOLEAN
) AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Use provided user_id or authenticated user
    v_user_id := COALESCE(target_user_id, auth.uid());
    
    RETURN QUERY
    SELECT 
        t.id,
        t.type,
        t.name,
        t.slug,
        tm.role,
        (t.type = 'personal') as is_personal,
        COALESCE(member_counts.count, 0) as member_count,
        t.is_public
    FROM tenants t
    JOIN tenant_members tm ON t.id = tm.tenant_id
    LEFT JOIN (
        SELECT tenant_id, COUNT(*) as count
        FROM tenant_members
        GROUP BY tenant_id
    ) member_counts ON t.id = member_counts.tenant_id
    WHERE tm.user_id = v_user_id
    ORDER BY 
        CASE WHEN t.type = 'personal' THEN 0 ELSE 1 END,
        tm.role,
        t.name;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- RPC function: Get tenant context
CREATE OR REPLACE FUNCTION get_tenant_context(target_tenant_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_tenant_info JSONB;
    v_user_role member_role;
    v_member_count INT;
BEGIN
    -- Get tenant info
    SELECT jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'slug', t.slug,
        'type', t.type,
        'description', t.description,
        'is_public', t.is_public,
        'logo_url', t.logo_url,
        'cover_image_url', t.cover_image_url,
        'settings', t.settings,
        'created_at', t.created_at,
        'updated_at', t.updated_at
    ) INTO v_tenant_info
    FROM tenants t
    WHERE t.id = target_tenant_id;
    
    -- Get user's role in this tenant (if authenticated)
    IF auth.uid() IS NOT NULL THEN
        SELECT tm.role INTO v_user_role
        FROM tenant_members tm
        WHERE tm.tenant_id = target_tenant_id 
          AND tm.user_id = auth.uid();
    END IF;
    
    -- Get member count
    SELECT COUNT(*)::INT INTO v_member_count
    FROM tenant_members tm
    WHERE tm.tenant_id = target_tenant_id;
    
    -- Return combined context
    RETURN v_tenant_info || jsonb_build_object(
        'user_role', v_user_role,
        'member_count', v_member_count
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- RPC function: Get user's personal tenant (create if doesn't exist)
CREATE OR REPLACE FUNCTION get_user_personal_tenant(target_user_id UUID DEFAULT NULL)
RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
    v_tenant_id UUID;
    v_user_info RECORD;
BEGIN
    -- Use provided user_id or authenticated user
    v_user_id := COALESCE(target_user_id, auth.uid());
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Check if personal tenant already exists
    SELECT t.id INTO v_tenant_id
    FROM tenants t
    JOIN tenant_members tm ON t.id = tm.tenant_id
    WHERE tm.user_id = v_user_id 
      AND t.type = 'personal'
      AND tm.role = 'owner';
    
    -- If not found, create personal tenant
    IF v_tenant_id IS NULL THEN
        -- Get user info
        SELECT username, full_name INTO v_user_info
        FROM users
        WHERE id = v_user_id;
        
        -- Create personal tenant
        INSERT INTO tenants (name, slug, type, description, is_public)
        VALUES (
            COALESCE(v_user_info.full_name, v_user_info.username, 'Personal'),
            v_user_info.username || '-personal',
            'personal',
            'Personal workspace for ' || COALESCE(v_user_info.full_name, v_user_info.username),
            false
        )
        RETURNING id INTO v_tenant_id;
        
        -- Add user as owner
        INSERT INTO tenant_members (tenant_id, user_id, role)
        VALUES (v_tenant_id, v_user_id, 'owner');
    END IF;
    
    RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC function: Get user's role in a tenant
CREATE OR REPLACE FUNCTION get_user_tenant_role(
    target_tenant_id UUID, 
    target_user_id UUID DEFAULT NULL
)
RETURNS member_role AS $$
DECLARE
    v_user_id UUID;
    v_role member_role;
BEGIN
    v_user_id := COALESCE(target_user_id, auth.uid());
    
    SELECT tm.role INTO v_role
    FROM tenant_members tm
    WHERE tm.tenant_id = target_tenant_id 
      AND tm.user_id = v_user_id;
    
    RETURN v_role;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- RPC function: Check if user has tenant access
CREATE OR REPLACE FUNCTION user_has_tenant_access(
    target_tenant_id UUID,
    required_role member_role DEFAULT 'member'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_role member_role;
    v_tenant_public BOOLEAN;
BEGIN
    -- Check if tenant is public
    SELECT is_public INTO v_tenant_public
    FROM tenants
    WHERE id = target_tenant_id;
    
    -- If tenant is public, allow read access
    IF v_tenant_public AND required_role = 'member' THEN
        RETURN true;
    END IF;
    
    -- Check user's role
    v_user_role := get_user_tenant_role(target_tenant_id);
    
    IF v_user_role IS NULL THEN
        RETURN false;
    END IF;
    
    -- Role hierarchy check
    RETURN CASE 
        WHEN required_role = 'member' THEN true
        WHEN required_role = 'editor' THEN v_user_role IN ('editor', 'admin', 'owner')
        WHEN required_role = 'admin' THEN v_user_role IN ('admin', 'owner')
        WHEN required_role = 'owner' THEN v_user_role = 'owner'
        ELSE false
    END;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- RPC function: Create collective tenant (when a collective is created)
CREATE OR REPLACE FUNCTION create_collective_tenant(
    tenant_name TEXT,
    tenant_slug TEXT,
    tenant_description TEXT DEFAULT NULL,
    is_public BOOLEAN DEFAULT false
)
RETURNS UUID AS $$
DECLARE
    v_tenant_id UUID;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Create tenant
    INSERT INTO tenants (name, slug, type, description, is_public)
    VALUES (tenant_name, tenant_slug, 'collective', tenant_description, is_public)
    RETURNING id INTO v_tenant_id;
    
    -- Add creator as owner
    INSERT INTO tenant_members (tenant_id, user_id, role)
    VALUES (v_tenant_id, v_user_id, 'owner');
    
    RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on tenant tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenants table
CREATE POLICY "Users can view public tenants" ON tenants
    FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view their tenants" ON tenants
    FOR SELECT USING (
        id IN (
            SELECT tenant_id FROM tenant_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Owners can update their tenants" ON tenants
    FOR UPDATE USING (
        id IN (
            SELECT tenant_id FROM tenant_members 
            WHERE user_id = auth.uid() AND role = 'owner'
        )
    );

-- RLS Policies for tenant_members table
CREATE POLICY "Users can view tenant members of their tenants" ON tenant_members
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage tenant members" ON tenant_members
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_members 
            WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

-- Create default personal tenant for existing users
DO $$
DECLARE
    user_record RECORD;
    v_tenant_id UUID;
BEGIN
    FOR user_record IN SELECT id, username, full_name FROM users LOOP
        -- Check if user already has a personal tenant
        IF NOT EXISTS (
            SELECT 1 FROM tenants t
            JOIN tenant_members tm ON t.id = tm.tenant_id
            WHERE tm.user_id = user_record.id AND t.type = 'personal'
        ) THEN
            -- Create personal tenant
            INSERT INTO tenants (name, slug, type, description, is_public)
            VALUES (
                COALESCE(user_record.full_name, user_record.username, 'Personal'),
                user_record.username || '-personal',
                'personal',
                'Personal workspace for ' || COALESCE(user_record.full_name, user_record.username),
                false
            )
            RETURNING id INTO v_tenant_id;
            
            -- Add user as owner
            INSERT INTO tenant_members (tenant_id, user_id, role)
            VALUES (v_tenant_id, user_record.id, 'owner');
        END IF;
    END LOOP;
END $$;

-- Comments
COMMENT ON TABLE tenants IS 'Core tenant table for multi-tenancy support';
COMMENT ON TABLE tenant_members IS 'Junction table linking users to tenants with roles';
COMMENT ON COLUMN tenants.type IS 'Type of tenant: personal (user workspace) or collective (community)';
COMMENT ON COLUMN tenants.is_public IS 'Whether the tenant is publicly accessible';
COMMENT ON COLUMN tenant_members.role IS 'User role within the tenant (owner, admin, editor, member)';
