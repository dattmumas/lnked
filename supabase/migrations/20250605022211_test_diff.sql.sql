drop policy "Collective videos are viewable by collective members" on "public"."video_assets";

drop policy "Private videos are viewable by owner only" on "public"."video_assets";

drop policy "Public videos are viewable by everyone" on "public"."video_assets";

alter table "public"."video_assets" drop constraint "video_assets_collective_id_fkey";

alter table "public"."video_assets" drop constraint "video_assets_encoding_tier_check";

alter table "public"."video_assets" drop constraint "video_assets_playback_policy_check";

alter table "public"."video_assets" drop constraint "video_assets_post_id_fkey";

drop index if exists "public"."idx_video_assets_collective_id";

drop index if exists "public"."idx_video_assets_post_id";

alter table "public"."video_assets" drop column "collective_id";

alter table "public"."video_assets" drop column "encoding_tier";

alter table "public"."video_assets" drop column "is_public";

alter table "public"."video_assets" drop column "playback_policy";

alter table "public"."video_assets" drop column "post_id";


