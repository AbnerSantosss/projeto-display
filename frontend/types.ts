
export enum WidgetType {
  IMAGE = 'IMAGE',
  TEXT = 'TEXT',
  IFRAME = 'IFRAME',
  WEATHER = 'WEATHER',
  CLOCK = 'CLOCK',
  VIDEO = 'VIDEO',
  RSS = 'RSS',
  CALENDAR = 'CALENDAR',
  GIF = 'GIF',
  FULL_INFO = 'FULL_INFO'
}

export interface RssFeedConfig {
  url: string;
  category?: string;
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'none';
  borderWidth?: string;
  borderRadius?: string;
  borderColor?: string;
}

export interface WidgetData {
  url?: string;
  videoUrl?: string;
  rssUrl?: string; // URL do Feed RSS (mantido para compatibilidade)
  rssFeeds?: RssFeedConfig[]; // Novo campo para múltiplos feeds
  calendarId?: string; // ID do Google Calendar
  content?: string;
  color?: string;
  fontSize?: string;
  city?: string;
  width?: string; // Image width in px
  height?: string; // Image height in px
  model?: string; // 'simple', 'detailed', 'minimal', etc.
  videoConfig?: {
    autoplay?: boolean;
    mute?: boolean;
    loop?: boolean;
    controls?: boolean;
    youtubeQuality?: string;
  };
  calendarConfig?: {
    transparent?: boolean;
    backgroundColor?: string;
    theme?: 'light' | 'dark' | 'glass' | 'minimal' | 'neon' | 'card';
    customTitle?: string;
    showTitle?: boolean;
    titleColor?: string;
    titleSize?: string;
  };
  iframeConfig?: {
    interactive?: boolean;
    scale?: number;
    offsetX?: number;
    offsetY?: number;
    viewportWidth?: number;
    viewportHeight?: number;
  };
  rssConfig?: {
    layout?: 'full-image' | 'split' | 'ticker';
    feedMode?: 'default' | 'require-image' | 'text-only'; // Novo modo de feed
    showImage?: boolean; // Mantido para retrocompatibilidade
    fontSize?: string;
    showFullContent?: boolean;
    enableMarquee?: boolean;
    marqueeSpeed?: number;
    fontFamily?: string;
    textColor?: string;
    titleColor?: string;
    titleSize?: string;
    descriptionSize?: string;
  };
  scale?: number; // General scale factor for the widget content
  backgroundImage?: string; // Background image for the widget
  weatherConfig?: {
    baseFontSize?: string; // e.g., '1cqw' or '16px' - controls the scale of the whole widget
    showCityImage?: boolean;
  };
  textConfig?: {
    fontSize?: string;
    fontFamily?: string;
    fontWeight?: string; // 'normal', 'bold', '100'-'900'
    fontStyle?: string; // 'normal', 'italic'
    textAlign?: 'left' | 'center' | 'right';
    animation?: 'none' | 'fade' | 'slide' | 'typewriter' | 'pulse' | 'bounce';
  };
  backgroundAnimation?: 'none' | 'auto-weather' | 'gradient-flow' | 'clouds' | 'rain' | 'snow' | 'fire' | 'tech-grid' | 'pulse-red' | 'pulse-blue' | 'pulse-green' | 'aurora';
  transparentBackground?: boolean;
  backgroundColor?: string;
  textSize?: number;
  numberSize?: number;
  zIndex?: number; // Added to handle layering/overlapping
}

export interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type: WidgetType;
  data: WidgetData;
}

export interface Page {
  id: string;
  order: number;
  duration: number; // in seconds
  layout: LayoutItem[];
  backgroundImage?: string;
  backgroundVideoUrl?: string; // New property for full-screen video background
  backgroundVideoMuted?: boolean;
  backgroundVideoQuality?: string; // e.g., 'highres', 'hd1080', 'hd720', 'large', 'medium', 'small'
  backgroundAnimation?: 'none' | 'auto-weather' | 'gradient-flow' | 'clouds' | 'rain' | 'snow' | 'fire' | 'tech-grid' | 'pulse-red' | 'pulse-blue' | 'pulse-green' | 'aurora';
  backgroundFit?: 'cover' | 'contain' | 'fill';
  transitionType?: 'none' | 'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down';
  transitionDuration?: number; // in ms
  broadcast_id?: string;
  start_time?: string;
  end_time?: string;
  is_permanent?: boolean;
}

export interface Device {
  id: string;
  pairing_code: string;
  display_id: string | null;
  status: 'pending' | 'linked';
  last_seen: number;
  name?: string;
}

export interface Display {
  id: string;
  name: string;
  slug: string;
  pages: Page[];
  updatedAt: number;
}

export interface User {
  id: string;
  username: string;
  email?: string; // Novo campo para login robusto
  role: 'admin' | 'user';
  lastLogin?: string | null; // null = nunca acessou
  // Senha removida da interface frontend por segurança
}

export interface Broadcast {
  id: string;
  name: string;
  page: Page;
  start_time: string; // ISO string
  end_time: string; // ISO string
  is_permanent?: boolean;
  display_ids: string[]; // Targeted displays
  active: boolean;
  created_at: number;
  created_by?: string;
}
