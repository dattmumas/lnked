// Type declarations for @mux/mux-player web component
declare namespace JSX {
  interface IntrinsicElements {
    'mux-player': React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        'playback-id'?: string;
        'stream-type'?: 'on-demand' | 'live' | 'll-live';
        'metadata-video-title'?: string;
        'metadata-viewer-user-id'?: string;
        'metadata-video-id'?: string;
        'env-key'?: string;
        
        // Player controls
        'autoplay'?: string | boolean;
        'muted'?: string | boolean;
        'loop'?: string | boolean;
        'preload'?: 'none' | 'metadata' | 'auto';
        'crossorigin'?: 'anonymous' | 'use-credentials';
        
        // Thumbnails
        'thumbnail-time'?: string | number;
        'thumbnail-width'?: string | number;
        'thumbnail-height'?: string | number;
        
        // Timeline hover previews
        'timeline-hover-preview-time'?: string | boolean;
        
        // Quality
        'max-resolution'?: string;
        'min-resolution'?: string;
        
        // Captions
        'default-show-captions'?: string | boolean;
        
        // Playback
        'start-time'?: string | number;
        'playback-rate'?: string | number;
        
        // Other attributes
        style?: React.CSSProperties;
        className?: string;
      },
      HTMLElement
    >;
  }
}

declare module '@mux/mux-player' {
  export default class MuxPlayerElement extends HTMLElement {
    playbackId?: string;
    streamType?: 'on-demand' | 'live' | 'll-live' | 'live:dvr' | 'll-live:dvr';
    title?: string;
    poster?: string;
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    autoplay?: boolean | 'muted';
    muted?: boolean;
    loop?: boolean;
    controls?: boolean;
    width?: number | string;
    height?: number | string;
    aspectRatio?: string;
    responsive?: boolean;
    startTime?: number;
    playbackRates?: string;
    thumbnailTime?: number;
    customDomain?: string;
    envKey?: string;
    debug?: boolean;
    metadataVideoTitle?: string;
    metadataViewerUserId?: string;
    metadataVideoId?: string;
    preferMse?: boolean;
    preferCmcd?: 'none' | 'query' | 'header';
    beaconCollectionDomain?: string;
    disableCookies?: boolean;
    disableTracking?: boolean;
    defaultShowRemainingTime?: boolean;
    defaultHiddenCaptions?: boolean;
    forwardSeekOffset?: number;
    backwardSeekOffset?: number;
    defaultDuration?: number;
    tokens?: string;
    signingKeyId?: string;
    signingKeySecret?: string;
    drmToken?: string;
    castSrc?: string;
    castStreamType?: string;
    castReceiver?: string;
  }
} 