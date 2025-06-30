// Plugin configuration for smart lazy loading
export interface PluginConfig {
  // Core plugins (always loaded)
  core: {
    richText: boolean;
    history: boolean;
    autoFocus: boolean;
    links: boolean;
    lists: boolean;
    markdown: boolean;
    codeHighlight: boolean;
    hashtags: boolean;
    autoLink: boolean;
    toolbar: boolean;
    floatingTextFormat: boolean;
    floatingLinkEditor: boolean;
    contextMenu: boolean;
  };

  // Advanced plugins (lazy loaded)
  advanced: {
    equations: boolean;
    excalidraw: boolean;
    poll: boolean;
    sticky: boolean;
    youtube: boolean;
    twitter: boolean;
    figma: boolean;
    emojiPicker: boolean;
    speechToText: boolean;
    tableActionMenu: boolean;
  };
}

// Default configuration - core plugins enabled, advanced plugins lazy loaded
export const defaultPluginConfig: PluginConfig = {
  core: {
    richText: true,
    history: true,
    autoFocus: true,
    links: true,
    lists: true,
    markdown: true,
    codeHighlight: true,
    hashtags: true,
    autoLink: true,
    toolbar: true,
    floatingTextFormat: true,
    floatingLinkEditor: true,
    contextMenu: true,
  },
  advanced: {
    equations: false, // Load on demand when user adds equation
    excalidraw: false, // Load on demand when user adds drawing
    poll: false, // Load on demand when user adds poll
    sticky: false, // Load on demand when user adds sticky note
    youtube: false, // Load on demand when user embeds YouTube
    twitter: false, // Load on demand when user embeds Tweet
    figma: false, // Load on demand when user embeds Figma
    emojiPicker: true, // Enable by default - lightweight and commonly used
    speechToText: false, // Load on demand when user enables speech
    tableActionMenu: false, // Load on demand when user uses tables
  },
};

// Content-based plugin activation
export function analyzeContentForPlugins(
  content: string,
): Partial<PluginConfig['advanced']> {
  const pluginsNeeded: Partial<PluginConfig['advanced']> = {};

  // Analyze content to determine which plugins are needed
  if (content.includes('equation') || content.includes('katex')) {
    pluginsNeeded.equations = true;
  }

  if (content.includes('excalidraw') || content.includes('drawing')) {
    pluginsNeeded.excalidraw = true;
  }

  if (content.includes('poll') || content.includes('vote')) {
    pluginsNeeded.poll = true;
  }

  if (content.includes('sticky') || content.includes('note')) {
    pluginsNeeded.sticky = true;
  }

  if (content.includes('youtube.com') || content.includes('youtu.be')) {
    pluginsNeeded.youtube = true;
  }

  if (content.includes('twitter.com') || content.includes('x.com')) {
    pluginsNeeded.twitter = true;
  }

  if (content.includes('figma.com')) {
    pluginsNeeded.figma = true;
  }

  return pluginsNeeded;
}
