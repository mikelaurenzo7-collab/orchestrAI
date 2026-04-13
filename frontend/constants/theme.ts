// THEONE Design System — Jewel & Luxury Dark Theme
export const Colors = {
  // Backgrounds
  bg: '#030712',
  surface: '#0B101F',
  surfaceElevated: '#141A29',
  surfaceGlass: 'rgba(3,7,18,0.7)',

  // Brand
  emerald: '#34D399',
  emeraldDark: '#059669',
  emeraldGlow: 'rgba(52,211,153,0.15)',
  amber: '#FBBF24',
  amberDark: '#D97706',
  amberGlow: 'rgba(251,191,36,0.15)',
  rose: '#FB7185',
  roseGlow: 'rgba(251,113,133,0.15)',
  cyan: '#22D3EE',
  cyanGlow: 'rgba(34,211,238,0.15)',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',

  // Borders
  border: '#1E293B',
  borderHighlight: 'rgba(52,211,153,0.3)',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 999,
};

export const FontSizes = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  hero: 40,
};

export const Shadows = {
  card: {
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.3)',
  },
  glow: (color: string) => ({
    boxShadow: `0px 0px 16px ${color}66`,
  }),
};

// Agent type colors
export const AgentColors: Record<string, { primary: string; glow: string; icon: string }> = {
  store_manager: { primary: Colors.emerald, glow: Colors.emeraldGlow, icon: 'package' },
  marketing: { primary: Colors.amber, glow: Colors.amberGlow, icon: 'megaphone' },
  analytics: { primary: Colors.cyan, glow: Colors.cyanGlow, icon: 'bar-chart-3' },
  customer_service: { primary: Colors.rose, glow: Colors.roseGlow, icon: 'headphones' },
  general: { primary: Colors.emerald, glow: Colors.emeraldGlow, icon: 'bot' },
};

// Platform colors
export const PlatformColors: Record<string, string> = {
  shopify: '#96BF48',
  woocommerce: '#7B51AD',
  etsy: '#F1641E',
  amazon: '#FF9900',
  ebay: '#E53238',
  bigcommerce: '#34313F',
  square: '#006AFF',
  wix: '#0C6EFC',
  custom: Colors.emerald,
  instagram: '#E1306C',
  twitter: '#1DA1F2',
  facebook: '#1877F2',
  tiktok: '#FE2C55',
};
