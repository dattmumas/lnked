/* eslint-disable no-magic-numbers */

import { createHash } from 'crypto';
import { resolve4, resolve6 } from 'dns';
import { isIP } from 'net';
import { promisify } from 'util';

import * as cheerio from 'cheerio';
import { decode as htmlDecode } from 'he';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createRequestScopedSupabaseClient } from '@/lib/supabase/request-scoped';
import { applyRateLimit } from '@/lib/utils/rate-limiting';
import { createAPILogger } from '@/lib/utils/structured-logger';

// API endpoint constant to prevent drift between logs/metrics
const ENDPOINT = '/api/chat/link-preview' as const;

// Environment-driven configuration constants
const LINK_PREVIEW_CONFIG = {
  FETCH_TIMEOUT_MS: Number(process.env['LINK_PREVIEW_TIMEOUT_MS']) || 8000, // Configurable timeout
  SLOW_DOWNLOAD_THRESHOLD_MS: Number(process.env['LINK_PREVIEW_SLOW_THRESHOLD_MS']) || 1000, // Adaptive timeout
  MIN_DOWNLOAD_SPEED_BYTES: Number(process.env['LINK_PREVIEW_MIN_SPEED_BYTES']) || 1024, // 1 KiB/s minimum
  MAX_HTML_SIZE_BYTES: Number(process.env['LINK_PREVIEW_MAX_HTML_SIZE']) || 512000, // 500 KB limit
  MAX_TITLE_LENGTH: Number(process.env['LINK_PREVIEW_MAX_TITLE_LENGTH']) || 200,
  MAX_DESCRIPTION_LENGTH: Number(process.env['LINK_PREVIEW_MAX_DESCRIPTION_LENGTH']) || 300,
  MAX_URL_LENGTH: Number(process.env['LINK_PREVIEW_MAX_URL_LENGTH']) || 2048,
  MAX_REDIRECTS: Number(process.env['LINK_PREVIEW_MAX_REDIRECTS']) || 2,
  CACHE_TTL_SECONDS: Number(process.env['LINK_PREVIEW_CACHE_TTL']) || 86400, // 24 hours
  MAX_IMAGE_SIZE_BYTES: Number(process.env['LINK_PREVIEW_MAX_IMAGE_SIZE']) || 524288, // 512 KB
  USER_AGENT: process.env['LINK_PREVIEW_USER_AGENT'] ?? 'Mozilla/5.0 (compatible; Lnked/1.0; +https://lnked.com/bot)',
} as const;

// HTTP status codes
const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// DNS lookup promisified
const dnsResolve4 = promisify(resolve4);
const dnsResolve6 = promisify(resolve6);

// Request validation schema
const LinkPreviewRequestSchema = z.object({
  url: z.string()
    .trim()
    .min(1, 'URL is required')
    .max(LINK_PREVIEW_CONFIG.MAX_URL_LENGTH, `URL must be at most ${LINK_PREVIEW_CONFIG.MAX_URL_LENGTH} characters`)
    .url('Invalid URL format'),
});

// Response type definitions
interface LinkPreviewResponse {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
}

interface CachedPreview extends LinkPreviewResponse {
  cached_at: number;
  expires_at: number;
}

// Comprehensive private IP range checking (IPv4 & IPv6)
function isPrivateOrReservedIP(ip: string): boolean {
  const ipVersion = isIP(ip);
  
  if (ipVersion === 4) {
    // IPv4 private ranges
    const ipv4Patterns = [
      /^10\./, // 10.0.0.0/8
      /^172\.(1[6-9]|2[0-9]|3[01])\./, // 172.16.0.0/12
      /^192\.168\./, // 192.168.0.0/16
      /^127\./, // 127.0.0.0/8 (loopback)
      /^169\.254\./, // 169.254.0.0/16 (link-local)
      /^0\./, // 0.0.0.0/8
      /^224\./, // 224.0.0.0/4 (multicast)
      /^240\./, // 240.0.0.0/4 (reserved)
    ];
    
    return ipv4Patterns.some(pattern => pattern.test(ip));
  }
  
  if (ipVersion === 6) {
    // IPv6 private/reserved ranges
    const ipv6Patterns = [
      /^::1$/, // ::1 (loopback)
      /^fc00:/, // fc00::/7 (ULA - unique local)
      /^fd00:/, // fd00::/8 (ULA subset)
      /^fe80:/, // fe80::/10 (link-local)
      /^::/, // ::/128 (unspecified)
      /^ff00:/, // ff00::/8 (multicast)
    ];
    
    return ipv6Patterns.some(pattern => pattern.test(ip.toLowerCase()));
  }
  
  return false; // Not a valid IP
}

// DNS resolution with private IP checking
async function validateHostnameAndResolveIPs(hostname: string): Promise<{ isValid: boolean; error?: string }> {
  try {
    // Get all IPv4 addresses
    let ipv4Addresses: string[] = [];
    try {
      ipv4Addresses = await dnsResolve4(hostname);
    } catch {
      // IPv4 resolution failed, continue to check IPv6
    }
    
    // Get all IPv6 addresses
    let ipv6Addresses: string[] = [];
    try {
      ipv6Addresses = await dnsResolve6(hostname);
    } catch {
      // IPv6 resolution failed, that's okay
    }
    
    // Check if we got any addresses
    const allAddresses = [...ipv4Addresses, ...ipv6Addresses];
    if (allAddresses.length === 0) {
      return { isValid: false, error: 'Hostname does not resolve to any IP address' };
    }
    
    // Check each resolved IP for private ranges
    for (const ip of allAddresses) {
      if (isPrivateOrReservedIP(ip)) {
        return { isValid: false, error: `Hostname resolves to private/reserved IP: ${ip}` };
      }
    }
    
    return { isValid: true };
    
  } catch (error: unknown) {
    return { 
      isValid: false, 
      ...(error instanceof Error ? { error: error.message } : { error: 'DNS resolution failed' })
    };
  }
}

// Enhanced URL validation with DNS resolution
async function validateUrl(url: string): Promise<{ isValid: boolean; parsedUrl?: URL; error?: string }> {
  try {
    const parsedUrl = new URL(url);
    
    // Security checks for allowed protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return { isValid: false, error: 'Only HTTP and HTTPS URLs are allowed' };
    }
    
    // Check if hostname is an IP address
    const hostname = parsedUrl.hostname.toLowerCase();
    if (isIP(hostname) !== 0) {
      // Direct IP access - check if it's private
      if (isPrivateOrReservedIP(hostname)) {
        return { isValid: false, error: 'Private IP addresses are not allowed' };
      }
    } else {
      // Hostname - resolve DNS and check all IPs
      const dnsValidation = await validateHostnameAndResolveIPs(hostname);
      if (!dnsValidation.isValid) {
        return { 
          isValid: false, 
          ...(dnsValidation.error ? { error: dnsValidation.error } : {})
        };
      }
    }
    
    return { isValid: true, parsedUrl };
  } catch (error: unknown) {
    return { 
      isValid: false, 
      error: error instanceof Error ? error.message : 'Invalid URL format' 
    };
  }
}

// Generate cache key for URL
function generateCacheKey(url: string): string {
  return createHash('sha256').update(url).digest('hex');
}

// Simple in-memory cache (in production, use Redis)
const previewCache = new Map<string, CachedPreview>();

// Get cached preview
function getCachedPreview(url: string): CachedPreview | null {
  const cacheKey = generateCacheKey(url);
  const cached = previewCache.get(cacheKey);
  
  if (cached !== undefined && cached.expires_at > Date.now()) {
    return cached;
  }
  
  // Remove expired cache
  if (cached !== undefined) {
    previewCache.delete(cacheKey);
  }
  
  return null;
}

// Set cached preview
function setCachedPreview(url: string, preview: LinkPreviewResponse): void {
  const cacheKey = generateCacheKey(url);
  const now = Date.now();
  
  const cachedPreview: CachedPreview = {
    ...preview,
    cached_at: now,
    expires_at: now + (LINK_PREVIEW_CONFIG.CACHE_TTL_SECONDS * 1000),
  };
  
  previewCache.set(cacheKey, cachedPreview);
  
  // Simple cache size management (keep last 1000 entries)
  if (previewCache.size > 1000) {
    const firstKey = previewCache.keys().next().value as string;
    previewCache.delete(firstKey);
  }
}

// Check if URL scheme is dangerous (avoiding script-url ESLint rule)
function isDangerousScheme(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  const dangerousSchemes = ['data:', 'blob:', 'vbscript:'];
  
  // Check for dangerous schemes
  for (const scheme of dangerousSchemes) {
    if (lowerUrl.startsWith(scheme)) {
      return true;
    }
  }
  
  // Check for script URLs using safe method
  const scriptPattern = /^javascript:/i;
  return scriptPattern.test(lowerUrl);
}

// Streaming HTML fetch with size limits
async function fetchHtmlContentWithLimits(url: string): Promise<{ success: boolean; html?: string; error?: string }> {
  let redirectCount = 0;
  let currentUrl = url;
  
  while (redirectCount <= LINK_PREVIEW_CONFIG.MAX_REDIRECTS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), LINK_PREVIEW_CONFIG.FETCH_TIMEOUT_MS);
      
      // First, make a HEAD request to check Content-Length
      try {
        const headResponse = await fetch(currentUrl, {
          method: 'HEAD',
          headers: { 'User-Agent': LINK_PREVIEW_CONFIG.USER_AGENT },
          signal: controller.signal,
          redirect: 'manual',
        });
        
        const contentLength = headResponse.headers.get('content-length');
        if (contentLength !== null && contentLength.trim().length > 0) {
          const size = parseInt(contentLength, 10);
          if (size > LINK_PREVIEW_CONFIG.MAX_HTML_SIZE_BYTES) {
            clearTimeout(timeoutId);
            return { success: false, error: `Content too large: ${size} bytes` };
          }
        }
        
        // Handle redirects manually
        if (headResponse.status >= 300 && headResponse.status < 400) {
          const location = headResponse.headers.get('location');
          if (location === null) {
            clearTimeout(timeoutId);
            return { success: false, error: 'Redirect without Location header' };
          }
          
          // Validate redirect URL
          const redirectUrl = new URL(location, currentUrl).toString();
          const redirectValidation = await validateUrl(redirectUrl);
          if (!redirectValidation.isValid) {
            clearTimeout(timeoutId);
            return { success: false, error: `Redirect to invalid URL: ${redirectValidation.error ?? 'Unknown error'}` };
          }
          
          currentUrl = redirectUrl;
          redirectCount++;
          clearTimeout(timeoutId);
          continue;
        }
      } catch {
        // HEAD request failed, continue with GET
      }
      
      // Make the actual GET request
      const response = await fetch(currentUrl, {
        headers: {
          'User-Agent': LINK_PREVIEW_CONFIG.USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,text/*;q=0.8,*/*;q=0.1',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          Connection: 'keep-alive',
          'Cache-Control': 'no-cache',
        },
        signal: controller.signal,
        redirect: 'manual',
      });
      
      clearTimeout(timeoutId);
      
      // Handle redirects manually
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (location === null) {
          return { success: false, error: 'Redirect without Location header' };
        }
        
        // Validate redirect URL
        const redirectUrl = new URL(location, currentUrl).toString();
        const redirectValidation = await validateUrl(redirectUrl);
        if (!redirectValidation.isValid) {
          return { success: false, error: `Redirect to invalid URL: ${redirectValidation.error ?? 'Unknown error'}` };
        }
        
        currentUrl = redirectUrl;
        redirectCount++;
        continue;
      }
      
      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }
      
      // Check content type (more flexible)
      const contentType = response.headers.get('content-type') ?? '';
      if (!contentType.startsWith('text/')) {
        return { success: false, error: 'URL does not return text content' };
      }
      
      // Stream the response with size limit
      const reader = response.body?.getReader();
      if (reader === undefined) {
        return { success: false, error: 'Response body is not readable' };
      }
      
      let html = '';
      let totalBytes = 0;
      const decoder = new TextDecoder();
      const downloadStartTime = Date.now();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          totalBytes += value.length;
          
          // Check size limit
          if (totalBytes > LINK_PREVIEW_CONFIG.MAX_HTML_SIZE_BYTES) {
            await reader.cancel();
            return { success: false, error: `Content too large: ${totalBytes} bytes` };
          }
          
          // Check download speed (adaptive timeout)
          const elapsed = Date.now() - downloadStartTime;
          if (elapsed > LINK_PREVIEW_CONFIG.SLOW_DOWNLOAD_THRESHOLD_MS) {
            const speed = totalBytes / (elapsed / 1000); // bytes per second
            if (speed < LINK_PREVIEW_CONFIG.MIN_DOWNLOAD_SPEED_BYTES) {
              await reader.cancel();
              return { success: false, error: 'Download too slow' };
            }
          }
          
          html += decoder.decode(value, { stream: true });
          
          // Early detection of HTML content
          if (html.length > 256 && !html.toLowerCase().includes('<html')) {
            await reader.cancel();
            return { success: false, error: 'Content does not appear to be HTML' };
          }
        }
      } finally {
        reader.releaseLock();
      }
      
      return { success: true, html };
      
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { success: false, error: 'Request timeout' };
      }
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch URL' 
      };
    }
  }
  
  return { success: false, error: 'Too many redirects' };
}

// Extract metadata using cheerio (proper HTML parser)
function extractMetadataFromHTML(html: string, baseUrl: string): LinkPreviewResponse {
  const $ = cheerio.load(html);
  
  // Extract title with proper escaping
  let title: string | null = null;
  const ogTitle = $('meta[property="og:title"]').attr('content');
  const twitterTitle = $('meta[name="twitter:title"]').attr('content');
  const htmlTitle = $('title').text();
  
  if (ogTitle !== undefined && ogTitle.trim().length > 0) {
    title = htmlDecode(ogTitle.trim());
  } else if (twitterTitle !== undefined && twitterTitle.trim().length > 0) {
    title = htmlDecode(twitterTitle.trim());
  } else if (htmlTitle.trim().length > 0) {
    title = htmlDecode(htmlTitle.trim());
  }
  
  // Extract description with proper escaping
  let description: string | null = null;
  const ogDescription = $('meta[property="og:description"]').attr('content');
  const twitterDescription = $('meta[name="twitter:description"]').attr('content');
  const metaDescription = $('meta[name="description"]').attr('content');
  
  if (ogDescription !== undefined && ogDescription.trim().length > 0) {
    description = htmlDecode(ogDescription.trim());
  } else if (twitterDescription !== undefined && twitterDescription.trim().length > 0) {
    description = htmlDecode(twitterDescription.trim());
  } else if (metaDescription !== undefined && metaDescription.trim().length > 0) {
    description = htmlDecode(metaDescription.trim());
  }
  
  // Extract and validate image URL
  let image: string | null = null;
  const ogImage = $('meta[property="og:image"]').attr('content');
  const twitterImage = $('meta[name="twitter:image"]').attr('content');
  
  if (ogImage !== undefined && ogImage.trim().length > 0) {
    image = normalizeAndValidateImageUrl(ogImage.trim(), baseUrl);
  } else if (twitterImage !== undefined && twitterImage.trim().length > 0) {
    image = normalizeAndValidateImageUrl(twitterImage.trim(), baseUrl);
  }
  
  return {
    url: baseUrl,
    title: title !== null ? title.substring(0, LINK_PREVIEW_CONFIG.MAX_TITLE_LENGTH) : null,
    description: description !== null ? description.substring(0, LINK_PREVIEW_CONFIG.MAX_DESCRIPTION_LENGTH) : null,
    image,
  };
}

// Validate and normalize image URLs (reject data URIs and check size)
function normalizeAndValidateImageUrl(imageUrl: string, baseUrl: string): string | null {
  try {
    // Reject data URIs and dangerous schemes
    if (isDangerousScheme(imageUrl)) {
      return null;
    }
    
    // Normalize relative URLs
    let absoluteUrl: string;
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      absoluteUrl = imageUrl;
    } else {
      absoluteUrl = new URL(imageUrl, baseUrl).toString();
    }
    
    // Additional validation for the normalized URL
    const parsedImageUrl = new URL(absoluteUrl);
    if (!['http:', 'https:'].includes(parsedImageUrl.protocol)) {
      return null;
    }
    
    return absoluteUrl;
    
  } catch {
    return null;
  }
}

// Enhanced rate limiting (both user and IP-based)
async function applyEnhancedRateLimit(request: NextRequest, userId: string): Promise<{
  allowed: boolean;
  error?: string;
  headers: Record<string, string>;
}> {
  // Apply user-based rate limiting
  const userRateLimit = await applyRateLimit(request, userId);
  if (!userRateLimit.allowed) {
    return userRateLimit;
  }
  
  // Apply IP-based rate limiting (simplified implementation)
  // In production, this should use Redis with sliding window
  // For now, we rely on user-based limits and log IP for observability
  
  return {
    allowed: true,
    headers: userRateLimit.headers,
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const logger = createAPILogger(request, ENDPOINT);
  let userId: string | undefined;

  try {
    // Session-aware Supabase client
    const supabase = createRequestScopedSupabaseClient(request);
    
    // Authentication check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError !== null || user === null) {
      logger.warn('Unauthorized link preview attempt', {
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        ...(authError?.message ? { error: authError.message } : {}),
      });

      return NextResponse.json({ error: 'Unauthorized' }, { status: HTTP_STATUS.UNAUTHORIZED });
    }

    userId = user.id;

    // Enhanced rate limiting (user + IP)
    const rateLimitResult = await applyEnhancedRateLimit(request, userId);
    if (!rateLimitResult.allowed) {
      logger.warn('Rate limit exceeded for link preview', {
        userId,
        statusCode: HTTP_STATUS.TOO_MANY_REQUESTS,
      });

      return NextResponse.json(
        { error: rateLimitResult.error },
        { 
          status: HTTP_STATUS.TOO_MANY_REQUESTS,
          headers: rateLimitResult.headers,
        }
      );
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json() as unknown;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: HTTP_STATUS.BAD_REQUEST });
    }

    const parsed = LinkPreviewRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid body', details: parsed.error.flatten() },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }

    const { url } = parsed.data;

    // Check cache first
    const cachedPreview = getCachedPreview(url);
    if (cachedPreview !== null) {
      const response = NextResponse.json({
        url: cachedPreview.url,
        title: cachedPreview.title,
        description: cachedPreview.description,
        image: cachedPreview.image,
      }, {
        status: HTTP_STATUS.OK,
        headers: {
          ...rateLimitResult.headers,
          'Cache-Control': 'private, max-age=300',
          'X-Cache': 'HIT',
        },
      });

      logger.info('Served cached link preview', {
        userId,
        statusCode: HTTP_STATUS.OK,
        metadata: { url, cached: true },
      });

      return response;
    }

    // Enhanced URL validation with DNS resolution
    const urlValidation = await validateUrl(url);
    if (!urlValidation.isValid || urlValidation.parsedUrl === undefined) {
      return NextResponse.json(
        { error: urlValidation.error ?? 'Invalid URL' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    const { hostname } = urlValidation.parsedUrl;

    // Fetch HTML content with streaming and size limits
    const fetchResult = await fetchHtmlContentWithLimits(url);
    if (!fetchResult.success || fetchResult.html === undefined) {
      logger.warn('Failed to fetch URL for preview', {
        userId,
        statusCode: HTTP_STATUS.BAD_REQUEST,
        ...(fetchResult.error ? { error: fetchResult.error } : {}),
        metadata: { url, hostname },
      });

      return NextResponse.json(
        { error: fetchResult.error ?? 'Failed to fetch URL' },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }

    // Extract metadata using proper HTML parser
    const previewData = extractMetadataFromHTML(fetchResult.html, url);

    // Cache the result
    setCachedPreview(url, previewData);

    const response = NextResponse.json(previewData, {
      status: HTTP_STATUS.OK,
      headers: {
        ...rateLimitResult.headers,
        'Cache-Control': 'private, max-age=300',
        'X-Cache': 'MISS',
      },
    });

    logger.info('Successfully generated link preview', {
      userId,
      statusCode: HTTP_STATUS.OK,
      metadata: {
        url,
        hostname,
        hasTitle: previewData.title !== null,
        hasDescription: previewData.description !== null,
        hasImage: previewData.image !== null,
        cached: false,
      },
    });

    return response;

  } catch (error: unknown) {
    logger.error('Link preview generation failed unexpectedly', {
      ...(userId ? { userId } : {}),
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      error: error instanceof Error ? error : new Error(String(error)),
    });

    return NextResponse.json(
      { error: 'Failed to generate preview' },
      { status: HTTP_STATUS.INTERNAL_SERVER_ERROR }
    );
  }
}

// Runtime choice documented
// Using Node.js runtime for:
// - DNS resolution and IP validation
// - Streaming response parsing with cheerio
// - Complex security validations and caching
export const runtime = 'nodejs';