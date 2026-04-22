// orchestrAI Design System — Glassmorphic Dark Theme (Dribbble/visionOS inspired)
export const Colors = {
  // Backgrounds
  bg: '#030712',
  surface: '#0B101F',
  surfaceElevated: '#141A29',
  surfaceGlass: 'rgba(11, 16, 31, 0.65)',
  surfaceGlassLight: 'rgba(20, 26, 41, 0.5)',

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
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#475569',

  // Aliases for backward compatibility
  blue: '#3B82F6',
  accent: '#FBBF24',
  error: '#EF4444',
  text: '#F1F5F9',
  textDisabled: '#334155',

  // Borders
  border: 'rgba(30, 41, 59, 0.6)',
  borderHighlight: 'rgba(52,211,153,0.3)',
  borderGlass: 'rgba(148, 163, 184, 0.08)',
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

export const Fonts = {
  regular: 'Outfit_400Regular',
  medium: 'Outfit_500Medium',
  semibold: 'Outfit_600SemiBold',
  bold: 'Outfit_700Bold',
  bodyRegular: 'Manrope_400Regular',
  bodyMedium: 'Manrope_500Medium',
  bodySemibold: 'Manrope_600SemiBold',
  bodyBold: 'Manrope_700Bold',
};

// Typography alias (backward compat with screens using Typography.fonts)
export const Typography = {
  fonts: {
    outfitL: 'Outfit_400Regular',
    outfitR: 'Outfit_400Regular',
    outfitM: 'Outfit_500Medium',
    outfitSB: 'Outfit_600SemiBold',
    outfitB: 'Outfit_700Bold',
    manropeR: 'Manrope_400Regular',
    manropeM: 'Manrope_500Medium',
    manropeSB: 'Manrope_600SemiBold',
    manropeB: 'Manrope_700Bold',
  },
};

export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  }),
  glass: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  depth: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
  },
};

// Glass card utility
export const GlassCard = {
  backgroundColor: Colors.surfaceGlass,
  borderWidth: 1,
  borderColor: Colors.borderGlass,
  borderRadius: BorderRadius.xxl,
};

// Agent type colors (platform-specific)
export const AgentColors: Record<string, { primary: string; glow: string; icon: string }> = {
  shopify: { primary: '#96BF48', glow: 'rgba(150,191,72,0.15)', icon: 'package' },
  etsy: { primary: '#F1641E', glow: 'rgba(241,100,30,0.15)', icon: 'package' },
  ebay: { primary: '#E53238', glow: 'rgba(229,50,56,0.15)', icon: 'package' },
  twitter: { primary: '#1DA1F2', glow: 'rgba(29,161,242,0.15)', icon: 'megaphone' },
  pinterest: { primary: '#E60023', glow: 'rgba(230,0,35,0.15)', icon: 'megaphone' },
  tiktok: { primary: '#FE2C55', glow: 'rgba(254,44,85,0.15)', icon: 'megaphone' },
  meta: { primary: '#0866FF', glow: 'rgba(8,102,255,0.15)', icon: 'megaphone' },
  analytics: { primary: Colors.cyan, glow: Colors.cyanGlow, icon: 'bar-chart-3' },
  store_manager: { primary: Colors.emerald, glow: Colors.emeraldGlow, icon: 'package' },
  marketing_suite: { primary: Colors.amber, glow: Colors.amberGlow, icon: 'megaphone' },
  marketing: { primary: Colors.amber, glow: Colors.amberGlow, icon: 'megaphone' },
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
  pinterest: '#E60023',
  meta: '#0866FF',
};
