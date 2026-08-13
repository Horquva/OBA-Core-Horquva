export const altairTheme = {
  mode: 'light',
  colors: {
    background: '#f5f7fb',
    surface: '#ffffff',
    surfaceAlt: '#eef3ff',
    foreground: '#14213d',
    muted: '#5c6782',
    border: '#d7deeb',
    primary: '#2457f5',
    primarySoft: '#e8efff',
    success: '#1f9d69',
    warning: '#d97706',
    danger: '#c62828',
    info: '#0f766e'
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem'
  },
  radius: {
    sm: '0.5rem',
    md: '0.75rem',
    lg: '1rem'
  },
  typography: {
    body: 'system-ui, sans-serif',
    heading: 'system-ui, sans-serif',
    label: 'system-ui, sans-serif',
    caption: 'system-ui, sans-serif'
  },
  focus: {
    ring: '#2457f5',
    offset: '2px'
  },
  motion: {
    transition: '150ms ease-in-out'
  }
};

export const darkAltairTheme = {
  ...altairTheme,
  mode: 'dark',
  colors: {
    background: '#0f172a',
    surface: '#111827',
    surfaceAlt: '#1f2937',
    foreground: '#e5e7eb',
    muted: '#cbd5e1',
    border: '#374151',
    primary: '#7aa2ff',
    primarySoft: '#1e293b',
    success: '#34d399',
    warning: '#fbbf24',
    danger: '#f87171',
    info: '#5eead4'
  }
};
