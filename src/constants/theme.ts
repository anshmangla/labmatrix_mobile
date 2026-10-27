/**
 * LabMatrix Mobile Design Tokens & Theme
 * Based on Google Stitch 'Clinical Marketplace' specification.
 */

import '@/global.css';

import { Platform } from 'react-native';

/**
 * Exact brand tokens extracted from Stitch Clinical Marketplace
 */
export const LabMatrixTokens = {
  colors: {
    // Brand Navy & Blues
    primary: '#002555',
    primaryContainer: '#033a7d',
    onPrimaryContainer: '#81a6f0',
    brandBlue50: '#eff5fb',
    brandBlue100: '#dbeaf7',
    brandBlue900: '#011936',
    brandBlue950: '#010f22',

    // Brand Gold / Secondary Accent
    secondary: '#775a00',
    secondaryContainer: '#fdc836',
    onSecondaryContainer: '#6f5400',
    goldAccent: '#fbc634',

    // Surfaces & Canvas
    canvas: '#f8fafc',
    surface: '#ffffff',
    surfaceContainerLow: '#f2f3ff',
    surfaceContainerHigh: '#e2e7ff',
    surfaceDim: '#d2d9f4',
    border: '#e2e8f0',
    borderStrong: '#cbd5e1',

    // Typography & Ink
    textPrimary: '#0f172a',
    textSecondary: '#475569',
    textMuted: '#64748b',

    // Semantic Statuses
    statusAvailableBg: '#dcfce7',
    statusAvailableText: '#15803d',
    statusSoldOutBg: '#0f172a',
    statusSoldOutText: '#ffffff',
    statusSoldOutDot: '#f43f5e',
    conditionBadgeBg: '#eff5fb',
    conditionBadgeText: '#033a7d',

    // Alert & Error
    error: '#ba1a1a',
    errorContainer: '#fee2e2',
    errorText: '#991b1b',
  },

  radius: {
    sm: 4,
    badge: 6,
    button: 10,
    card: 14,
    xl: 20,
    pill: 9999,
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
} as const;

export const Colors = {
  light: {
    text: LabMatrixTokens.colors.textPrimary,
    background: LabMatrixTokens.colors.canvas,
    card: LabMatrixTokens.colors.surface,
    primary: LabMatrixTokens.colors.primaryContainer,
    accent: LabMatrixTokens.colors.goldAccent,
    border: LabMatrixTokens.colors.border,
    backgroundElement: LabMatrixTokens.colors.brandBlue50,
    backgroundSelected: LabMatrixTokens.colors.brandBlue100,
    textSecondary: LabMatrixTokens.colors.textMuted,
  },
  dark: {
    text: '#f8fafc',
    background: LabMatrixTokens.colors.brandBlue950,
    card: '#0b1329',
    primary: LabMatrixTokens.colors.onPrimaryContainer,
    accent: LabMatrixTokens.colors.goldAccent,
    border: '#1e293b',
    backgroundElement: '#16203a',
    backgroundSelected: LabMatrixTokens.colors.primaryContainer,
    textSecondary: '#94a3b8',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
