import jwt from 'jsonwebtoken';

// Constants
const DEFAULT_EXPIRY_HOURS = 1;
const SECONDS_PER_HOUR = 3600;
const MILLISECONDS_PER_SECOND = 1000;

interface MuxSigningConfig {
  keyId: string;
  keySecret: string;
  playbackId: string;
  expiryHours?: number;
}

interface TokenPayload {
  aud: string;
  sub: string;
  exp?: number;
}

/**
 * Generate a signed URL for Mux video playback
 * @param config - Mux signing configuration
 * @returns Signed playback URL or undefined if configuration is invalid
 */
export function generateMuxSignedUrl(config: MuxSigningConfig): string | undefined {
  // Validate required environment variables
  if (!config.keyId || config.keyId.trim() === '' || !config.keySecret || config.keySecret.trim() === '') {
    console.error('Mux signing key ID and secret are required');
    return undefined;
  }

  // Validate playback ID
  if (!config.playbackId || config.playbackId.trim() === '') {
    console.error('Mux playback ID is required');
    return undefined;
  }

  try {
    // Calculate expiry time
    const expiryHours = config.expiryHours ?? DEFAULT_EXPIRY_HOURS;
    const expiryTime = Math.floor(Date.now() / MILLISECONDS_PER_SECOND) + (expiryHours * SECONDS_PER_HOUR);

    // Create JWT payload
    const payload: TokenPayload = {
      aud: 'MuxVideo', // Fixed audience for Mux
      sub: config.playbackId, // Subject is the playback ID
      exp: expiryTime, // Expiry time
    };

    // Sign the token
    const token = jwt.sign(payload, config.keySecret, {
      algorithm: 'RS256',
      keyid: config.keyId,
    });

    // Return signed URL
    return `https://stream.mux.com/${config.playbackId}.m3u8?token=${token}`;
  } catch (error) {
    console.error('Failed to generate Mux signed URL:', error);
    return undefined;
  }
}

/**
 * Validate if a user can access a private video
 * @param userId - User ID requesting access
 * @param videoOwnerId - Video owner's user ID
 * @param collectiveId - Optional collective ID for shared access
 * @param userCollectiveIds - User's collective memberships
 * @returns Whether access is allowed
 */
export function validateVideoAccess(
  userId: string,
  videoOwnerId: string,
  collectiveId?: string | null,
  userCollectiveIds?: string[]
): boolean {
  // Owner always has access
  if (userId === videoOwnerId) {
    return true;
  }

  // Check collective membership if video belongs to a collective
  if (collectiveId !== null && collectiveId !== undefined && userCollectiveIds !== undefined) {
    return userCollectiveIds.includes(collectiveId);
  }

  // No access by default for private videos
  return false;
}

/**
 * Get Mux signing configuration from environment
 * @returns Mux signing configuration or undefined if not available
 */
export function getMuxSigningConfig(): { keyId: string; keySecret: string } | undefined {
  const keyId = process.env['MUX_SIGNING_KEY_ID'];
  const keySecret = process.env['MUX_SIGNING_SECRET'];

  if (!keyId || keyId.trim() === '' || !keySecret || keySecret.trim() === '') {
    return undefined;
  }

  return { keyId, keySecret };
}

/**
 * Checks if Mux signing is properly configured
 * @returns boolean indicating if signing is available
 */
export function isMuxSigningConfigured(): boolean {
  const config = getMuxSigningConfig();
  return config !== undefined;
}

/**
 * Validates a playback ID format
 * @param playbackId - The playback ID to validate
 * @returns boolean indicating if the format is valid
 */
export function isValidPlaybackId(playbackId: string): boolean {
  // Mux playback IDs are typically alphanumeric with specific patterns
  const playbackIdRegex = /^[a-zA-Z0-9]{16,32}$/;
  return playbackIdRegex.test(playbackId);
} 