import tokensData from '../styles/tokens.json';

// ============================================
// TYPES
// ============================================
interface TokenValue {
  value: string | number;
}

interface TokenColorShades {
  50?: TokenValue;
  100?: TokenValue;
  200?: TokenValue;
  300?: TokenValue;
  400?: TokenValue;
  500?: TokenValue;
  600?: TokenValue;
  700?: TokenValue;
  800?: TokenValue;
  900?: TokenValue;
}

interface TokenColors {
  primary: TokenColorShades;
  neutral: TokenColorShades;
  semantic: {
    success: TokenValue;
    warning: TokenValue;
    error: TokenValue;
    errorSubtle: TokenValue;
  };
  surface: {
    background: TokenValue;
    default: TokenValue;
  };
  text: {
    default: TokenValue;
    secondary: TokenValue;
    onPrimary: TokenValue;
  };
  border: {
    default: TokenValue;
  };
}

interface TokenSpacing {
  xs: TokenValue;
  sm: TokenValue;
  md: TokenValue;
  lg: TokenValue;
  xl: TokenValue;
  '2xl': TokenValue;
  '3xl': TokenValue;
  '4xl': TokenValue;
}

interface TokenRadius {
  none: TokenValue;
  sm: TokenValue;
  md: TokenValue;
  lg: TokenValue;
  full: TokenValue;
}

interface TokenTypography {
  fontFamily: TokenValue;
  h1: { size: TokenValue; weight: TokenValue; lineHeight: TokenValue };
  h2: { size: TokenValue; weight: TokenValue; lineHeight: TokenValue };
  h3: { size: TokenValue; weight: TokenValue; lineHeight: TokenValue };
  h4: { size: TokenValue; weight: TokenValue; lineHeight: TokenValue };
  body: { size: TokenValue; weight: TokenValue; lineHeight: TokenValue };
  bodySmall: { size: TokenValue; weight: TokenValue; lineHeight: TokenValue };
  caption: { size: TokenValue; weight: TokenValue; lineHeight: TokenValue };
}

interface TokenElevation {
  level1: { y: TokenValue; blur: TokenValue; opacity: TokenValue; shadow: TokenValue };
  level2: { y: TokenValue; blur: TokenValue; opacity: TokenValue; shadow: TokenValue };
  level3: { y: TokenValue; blur: TokenValue; opacity: TokenValue; shadow: TokenValue };
  level4: { y: TokenValue; blur: TokenValue; opacity: TokenValue; shadow: TokenValue };
}

interface TokenMotion {
  duration: {
    fast: TokenValue;
    default: TokenValue;
    slow: TokenValue;
  };
  easing: {
    standard: TokenValue;
    decelerate: TokenValue;
    accelerate: TokenValue;
  };
}

interface TokenBreakpoints {
  mobile: TokenValue;
  tablet: TokenValue;
  desktop: TokenValue;
}

interface TokenComponentButton {
  background: {
    default: TokenValue;
    hover: TokenValue;
    active: TokenValue;
    disabled: TokenValue;
    loadingOpacity: TokenValue;
  };
  border: {
    focusRing: TokenValue;
    focusRingWidth: TokenValue;
    error: TokenValue;
  };
  text: {
    default: TokenValue;
    disabled: TokenValue;
    error: TokenValue;
  };
}

interface TokenComponentInput {
  background: {
    default: TokenValue;
    loading: TokenValue;
  };
  border: {
    default: TokenValue;
    hover: TokenValue;
    focus: TokenValue;
    active: TokenValue;
    loading: TokenValue;
    error: TokenValue;
  };
  text: {
    placeholder: TokenValue;
    active: TokenValue;
    errorHelper: TokenValue;
  };
}

interface TokenComponentCard {
  background: TokenValue;
  elevation: {
    default: TokenValue;
    hover: TokenValue;
  };
  border: {
    error: TokenValue;
  };
  skeleton: TokenValue;
}

interface TokenComponentTable {
  row: {
    default: TokenValue;
    hover: TokenValue;
    error: TokenValue;
  };
  skeleton: TokenValue;
}

interface TokenComponentBadge {
  background: {
    info: TokenValue;
    success: TokenValue;
    warning: TokenValue;
    error: TokenValue;
    disabled: TokenValue;
  };
  text: {
    disabled: TokenValue;
  };
}

interface TokenComponentChip {
  background: {
    default: TokenValue;
    selected: TokenValue;
    disabled: TokenValue;
  };
  text: {
    default: TokenValue;
    selected: TokenValue;
    disabled: TokenValue;
  };
}

interface TokenComponentAvatar {
  background: {
    default: TokenValue;
    loading: TokenValue;
    error: TokenValue;
  };
}

interface TokenComponentDialog {
  background: TokenValue;
  elevation: TokenValue;
  text: {
    error: TokenValue;
  };
}

interface TokenComponentNavigation {
  background: TokenValue;
  border: TokenValue;
  loadingBar: TokenValue;
}

interface TokenComponents {
  button: TokenComponentButton;
  input: TokenComponentInput;
  card: TokenComponentCard;
  table: TokenComponentTable;
  badge: TokenComponentBadge;
  chip: TokenComponentChip;
  avatar: TokenComponentAvatar;
  dialog: TokenComponentDialog;
  navigation: TokenComponentNavigation;
}

interface TokenData {
  color: TokenColors;
  spacing: TokenSpacing;
  radius: TokenRadius;
  typography: TokenTypography;
  elevation: TokenElevation;
  motion: TokenMotion;
  breakpoint: TokenBreakpoints;
  component: TokenComponents;
}

// ============================================
// TYPED TOKENS
// ============================================
const typedTokens = tokensData as unknown as TokenData;

export const tokens = {
  color: typedTokens.color,
  spacing: typedTokens.spacing,
  radius: typedTokens.radius,
  typography: typedTokens.typography,
  elevation: typedTokens.elevation,
  motion: typedTokens.motion,
  breakpoints: typedTokens.breakpoint,
  component: typedTokens.component,
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/** Get a color value by path (e.g., "primary.600") */
export function getColor(path: string): string {
  const parts = path.split('.');
  let result: any = typedTokens.color;
  for (const part of parts) {
    result = result[part];
  }
  return result?.value?.toString() || path;
}

/** Get a spacing value (e.g., "md" → "16px") */
export function getSpacing(key: keyof TokenSpacing): string {
  return `${typedTokens.spacing[key].value}px`;
}

/** Get a radius value (e.g., "md" → "8px") */
export function getRadius(key: keyof TokenRadius): string {
  const val = typedTokens.radius[key].value;
  return val === '999' ? '9999px' : `${val}px`;
}

/** Get a component value by path (e.g., "button.background.default") */
export function getComponent(path: string): string {
  const parts = path.split('.');
  let result: any = typedTokens.component;
  for (const part of parts) {
    result = result[part];
  }
  return result?.value?.toString() || path;
}

/** Get a typography value by path (e.g., "h1.size") */
export function getTypography(path: string): string {
  const parts = path.split('.');
  let result: any = typedTokens.typography;
  for (const part of parts) {
    result = result[part];
  }
  const value = result?.value;
  return typeof value === 'number' ? `${value}px` : value?.toString() || path;
}

// ============================================
// CSS VARIABLES GENERATOR (For globals.css)
// ============================================
export function generateCSSVariables(): string {
  let css = ':root {\n';
  
  // Colors
  const colors = typedTokens.color;
  for (const [category, shades] of Object.entries(colors)) {
    if (typeof shades === 'object' && shades !== null) {
      for (const [shade, value] of Object.entries(shades)) {
        if (value && typeof value === 'object' && 'value' in value) {
          css += `  --color-${category}-${shade}: ${value.value};\n`;
        }
      }
    }
  }
  
  // Spacing
  const spacing = typedTokens.spacing;
  for (const [key, value] of Object.entries(spacing)) {
    if (value && typeof value === 'object' && 'value' in value) {
      css += `  --spacing-${key}: ${value.value}px;\n`;
    }
  }
  
  // Radius
  const radius = typedTokens.radius;
  for (const [key, value] of Object.entries(radius)) {
    if (value && typeof value === 'object' && 'value' in value) {
      css += `  --radius-${key}: ${value.value === '999' ? '9999' : value.value}px;\n`;
    }
  }
  
  // Typography
  const typography = typedTokens.typography;
  for (const [key, value] of Object.entries(typography)) {
    if (key === 'fontFamily') {
      css += `  --font-family: ${value.value};\n`;
    } else if (value && typeof value === 'object') {
      const sizes = value as Record<string, { value: string | number }>;
      for (const [prop, propValue] of Object.entries(sizes)) {
        if (propValue && typeof propValue === 'object' && 'value' in propValue) {
          css += `  --typography-${key}-${prop}: ${propValue.value}${typeof propValue.value === 'number' ? 'px' : ''};\n`;
        }
      }
    }
  }
  
  css += '}\n';
  return css;
}