/**
 * Video-related constants
 */

// Time constants
export const SECONDS_PER_MINUTE = 60;
export const SECONDS_PER_HOUR = 3600;
export const MINUTES_PER_HOUR = 60;

// Video pagination
export const VIDEOS_PER_PAGE = 20;

// Video quality/size constants
export const THUMBNAIL_WIDTH = 640;
export const THUMBNAIL_HEIGHT = 360;
export const POSTER_WIDTH = 1920;
export const POSTER_HEIGHT = 1080;
export const POSTER_TIME_SECONDS = 5;

// Playback rate constants
export const PLAYBACK_RATE_HALF = 0.5;
export const PLAYBACK_RATE_THREE_QUARTERS = 0.75;
export const PLAYBACK_RATE_NORMAL = 1;
export const PLAYBACK_RATE_ONE_QUARTER = 1.25;
export const PLAYBACK_RATE_ONE_HALF = 1.5;
export const PLAYBACK_RATE_DOUBLE = 2;

// Video player constants
export const PLAYBACK_RATES = [
  PLAYBACK_RATE_HALF,
  PLAYBACK_RATE_THREE_QUARTERS,
  PLAYBACK_RATE_NORMAL,
  PLAYBACK_RATE_ONE_QUARTER,
  PLAYBACK_RATE_ONE_HALF,
  PLAYBACK_RATE_DOUBLE,
] as const;
export const DEFAULT_PLAYBACK_RATE = PLAYBACK_RATE_NORMAL;

// Upload constants
export const MAX_TITLE_LENGTH = 255;
export const MAX_DESCRIPTION_LENGTH = 2000;

// Time formatting
export const PAD_LENGTH = 2;
export const PAD_CHARACTER = '0';

// MUX Player analytics
export const PLAYER_INIT_TIME = 2000; // milliseconds for player initialization

// Video status check intervals
export const STATUS_CHECK_INTERVAL = 5000; // 5 seconds in milliseconds 