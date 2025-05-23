# Complete Post Schema Documentation

This document provides a comprehensive overview of the post schema that works with the current form implementation and database structure.

## Schema Overview

The post schema supports a modern, Substack-like publishing experience with rich content editing, SEO optimization, and flexible author attribution.

## Form Schema (Client-Side)

```typescript
// src/lib/schemas/postSchemas.ts
export const PostFormSchema = z.object({
  // Core content fields
  title: z.string().min(1, 'Title is required').max(200),
  subtitle: z.string().max(300).optional().nullable(),
  content: z.string().refine(hasMinimumText, {
    message: 'Content must have meaningful text (at least 10 characters).',
  }),

  // Publishing control
  status: z.enum(['draft', 'published', 'scheduled']),
  published_at: z.string().optional().nullable(),

  // Display customization
  author: z.string().max(100).optional().nullable(), // Custom byline

  // SEO optimization
  seo_title: z.string().max(60).optional().nullable(),
  meta_description: z.string().max(160).optional().nullable(),
});

export type PostFormValues = z.infer<typeof PostFormSchema>;
```

## Database Schema (Server-Side)

```sql
-- posts table structure
CREATE TABLE public.posts (
  -- Core identification
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),

  -- Content fields
  title text NOT NULL,
  subtitle text, -- NEW: Optional subtitle
  content text,

  -- Author and ownership
  author_id uuid NOT NULL REFERENCES users(id),
  collective_id uuid REFERENCES collectives(id),
  author text, -- NEW: Custom author byline

  -- Publishing control
  status post_status_type NOT NULL DEFAULT 'draft', -- 'draft' | 'active' | 'removed'
  is_public boolean NOT NULL DEFAULT false,
  published_at timestamp with time zone,

  -- SEO fields
  seo_title text, -- NEW: SEO optimized title
  meta_description text, -- NEW: Meta description

  -- Engagement metrics
  like_count integer DEFAULT 0,
  dislike_count integer,
  view_count integer,

  -- Search functionality
  tsv tsvector, -- Full-text search vector

  -- Constraints
  CONSTRAINT check_subtitle_length CHECK (char_length(subtitle) <= 300),
  CONSTRAINT check_author_length CHECK (char_length(author) <= 100),
  CONSTRAINT check_seo_title_length CHECK (char_length(seo_title) <= 60),
  CONSTRAINT check_meta_description_length CHECK (char_length(meta_description) <= 160)
);
```

## Field Definitions

### Core Content Fields

| Field      | Type   | Required | Max Length | Description                             |
| ---------- | ------ | -------- | ---------- | --------------------------------------- |
| `title`    | string | ✅       | 200        | Main post title                         |
| `subtitle` | string | ❌       | 300        | Optional subtitle displayed below title |
| `content`  | string | ✅       | -          | Rich content in Lexical JSON format     |

### Author & Ownership

| Field           | Type   | Required | Description                       |
| --------------- | ------ | -------- | --------------------------------- |
| `author_id`     | uuid   | ✅       | Database reference to actual user |
| `collective_id` | uuid   | ❌       | Optional collective ownership     |
| `author`        | string | ❌       | Custom display name for byline    |

### Publishing Control

| Field          | Type     | Required | Description                                                                         |
| -------------- | -------- | -------- | ----------------------------------------------------------------------------------- |
| `status`       | enum     | ✅       | Form: 'draft' \| 'published' \| 'scheduled'<br>DB: 'draft' \| 'active' \| 'removed' |
| `is_public`    | boolean  | ✅       | Whether post is publicly visible                                                    |
| `published_at` | datetime | ❌       | When post should be/was published                                                   |

### SEO Optimization

| Field              | Type   | Required | Max Length | Description                            |
| ------------------ | ------ | -------- | ---------- | -------------------------------------- |
| `seo_title`        | string | ❌       | 60         | SEO-optimized title for search engines |
| `meta_description` | string | ❌       | 160        | Meta description for search results    |

### Engagement Metrics

| Field           | Type    | Description                          |
| --------------- | ------- | ------------------------------------ |
| `like_count`    | integer | Number of likes (auto-calculated)    |
| `dislike_count` | integer | Number of dislikes (auto-calculated) |
| `view_count`    | integer | Number of views (auto-incremented)   |

## Form to Database Mapping

The form data is transformed when saving to the database:

```typescript
// Form status → Database status mapping
const mapFormStatusToDbStatus = (formStatus: string, isPublic: boolean) => {
  if (!isPublic) return 'draft';
  if (formStatus === 'published' || formStatus === 'scheduled') return 'active';
  return 'draft';
};

// Complete transformation example
const transformFormToDb = (formData: PostFormValues, userId: string) => ({
  // Core fields
  title: formData.title,
  subtitle: formData.subtitle || null,
  content: formData.content,

  // Author fields
  author_id: userId,
  author: formData.author || null,

  // Publishing fields
  status: mapFormStatusToDbStatus(formData.status, isPublic),
  is_public: formData.status !== 'draft',
  published_at: getPublishedDate(formData),

  // SEO fields
  seo_title: formData.seo_title || null,
  meta_description: formData.meta_description || null,

  // Default values
  like_count: 0,
  view_count: 0,
});
```

## Editor Component Integration

The `PostEditor` component handles these fields:

```typescript
interface PostEditorProps {
  // Content
  initialContentJSON?: string;
  onContentChange?: (json: string) => void;

  // Title
  title?: string;
  onTitleChange?: (title: string) => void;
  titlePlaceholder?: string;

  // Subtitle
  subtitle?: string;
  onSubtitleChange?: (subtitle: string) => void;

  // Author byline
  author?: string;
  onAuthorChange?: (author: string) => void;

  // Editor config
  placeholder?: string;
}
```

## API Endpoints

### Create Post

```typescript
POST /api/posts
{
  title: string;
  subtitle?: string;
  content: string;
  status: 'draft' | 'published' | 'scheduled';
  published_at?: string;
  author?: string;
  seo_title?: string;
  meta_description?: string;
  collectiveId?: string;
}
```

### Update Post

```typescript
PATCH /api/posts/[id]
{
  title?: string;
  subtitle?: string;
  content?: string;
  status?: 'draft' | 'published' | 'scheduled';
  published_at?: string;
  author?: string;
  seo_title?: string;
  meta_description?: string;
}
```

## Validation Rules

### Client-Side (Zod)

- Title: 1-200 characters, required
- Subtitle: 0-300 characters, optional
- Content: Must have meaningful text (10+ characters)
- Author: 0-100 characters, optional
- SEO title: 0-60 characters, optional
- Meta description: 0-160 characters, optional
- Published date: Required if status is 'scheduled'

### Database-Side (PostgreSQL)

- All length constraints enforced via CHECK constraints
- Foreign key constraints for author_id and collective_id
- Default values for engagement metrics

## Usage Examples

### Creating a Basic Post

```typescript
const basicPost: PostFormValues = {
  title: 'My First Post',
  content: lexicalJsonContent,
  status: 'draft',
  published_at: null,
  subtitle: null,
  author: null,
  seo_title: null,
  meta_description: null,
};
```

### Creating a Fully Featured Post

```typescript
const featuredPost: PostFormValues = {
  title: 'The Future of Web Development',
  subtitle: 'Exploring the latest trends and technologies',
  content: lexicalJsonContent,
  status: 'published',
  published_at: new Date().toISOString(),
  author: 'Tech Insider',
  seo_title: 'Future of Web Development 2024 - Latest Trends',
  meta_description:
    "Discover the cutting-edge web development trends shaping 2024. From AI integration to new frameworks, explore what's next.",
};
```

### Scheduling a Post

```typescript
const scheduledPost: PostFormValues = {
  title: 'Weekly Newsletter #5',
  subtitle: 'This week in technology',
  content: lexicalJsonContent,
  status: 'scheduled',
  published_at: '2024-01-15T09:00:00Z',
  author: 'Newsletter Team',
  seo_title: 'Tech Newsletter Week 5 - Latest Updates',
  meta_description:
    "Stay updated with this week's most important technology news and insights.",
};
```

## Migration Requirements

To implement this schema:

1. **Apply Database Migration**: Run the SQL migration to add new columns
2. **Update TypeScript Types**: Regenerate types from updated database
3. **Update API Handlers**: Ensure all endpoints handle new fields
4. **Test Form Submission**: Verify all fields save and load correctly

## Benefits

This schema provides:

✅ **Modern Publishing Experience**: Like Substack/Medium
✅ **SEO Optimization**: Built-in meta fields
✅ **Flexible Author Attribution**: Custom bylines
✅ **Rich Content Support**: Lexical editor integration
✅ **Publishing Control**: Draft, publish, schedule workflow
✅ **Type Safety**: Full TypeScript support
✅ **Data Validation**: Client and server-side validation
✅ **Scalable Design**: Supports future enhancements
