# Video Architecture Audit

This document outlines the current state of the video feature in **Lnked**. It compares the legacy implementation with the new architecture and highlights areas for consolidation.

## 1. Current vs Legacy Architecture Overview

The legacy system centers on a simple `VideoUploader` component that immediately uploads a file and creates an "Untitled Video" record. In contrast, the new system introduces a multi-step `VideoUploadWizard` at `/videos/upload`, gathering metadata across Upload, Details, Settings, Preview and Publish steps.

Video management also changed. Originally `/videos` listed all videos by fetching directly from Supabase. The new dashboard route `/dashboard/video-management` exposes a library view with search, pagination and delete actions backed by an API (`/api/videos`).

Video playback remains at `/videos/[id]`, using a server-rendered page and a client-side `VideoPlayerPageClient` component with Mux playback.

## 2. Outdated or Redundant Components

- **VideoUploader** (`src/components/app/uploads/VideoUploader.tsx`)
  - Legacy single-step uploader still mounted in the dashboard `Upload` tab.
- **VideosPageClient** (`/videos` page)
  - Legacy list fetching videos client-side from Supabase.
- **MuxService** (`src/services/MuxService.ts`)
  - Wrapper around the Mux SDK that is no longer imported by API routes.

These components remain in the repository but are not required with the new wizard and API-driven approach.

## 3. Schema & Backend Integration Gaps

The `video_assets` table stores extensive metadata (privacy, collective, encoding tier, etc.) but the APIs only use a subset (title, description). Fields like `is_public` and `collective_id` are collected in the wizard yet ignored when creating or updating records. The update API whitelists `title` and `description` only, leaving other data unused.

## 4. Recommendations

1. **Unify the upload flow** – Remove `VideoUploader` and use `VideoUploadWizard` everywhere. Update dashboard navigation to link to `/videos/upload`.
2. **Merge video listings** – Choose a single management page (dashboard library or `/videos`) and remove the duplicate implementation.
3. **Wire unused schema fields** – Capture `is_public`, `collective_id` and encoding options in the API. Update validation schemas accordingly.
4. **Replace title-based post linking** – Use `post_id` in `video_assets` instead of matching post titles.
5. **Clean dead code** – Remove `MuxService` and any example files not referenced by the application.

## 5. Next Steps

Consolidating to the new architecture will streamline the codebase and prevent inconsistent behaviour between legacy and new components. Aligning API fields with the Supabase schema will unlock features like privacy controls and collective uploads.
