import { createTheme, MantineThemeOverride } from '@mantine/core';

const baseTheme: MantineThemeOverride = {
  primaryColor: 'blue',
  fontFamily: 'Inter, sans-serif',
  components: {
    Button: {
      defaultProps: {
        radius: 'md',
      },
    },
    Card: {
      defaultProps: {
        radius: 'md',
        withBorder: true,
      },
    },
    Paper: {
      defaultProps: {
        radius: 'md',
        withBorder: true,
      },
    },
  },
};

export const lightTheme = createTheme({
  ...baseTheme,
  colorScheme: 'light',
  colors: {
    brand: [
      '#E3F2FD', // 0
      '#BBDEFB', // 1
      '#90CAF9', // 2
      '#64B5F6', // 3
      '#42A5F5', // 4
      '#2196F3', // 5 - primary
      '#1E88E5', // 6
      '#1976D2', // 7
      '#1565C0', // 8
      '#0D47A1', // 9
    ],
  },
  defaultRadius: 'md',
  shadows: {
    sm: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
    md: '0 3px 6px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.12)',
    lg: '0 10px 20px rgba(0,0,0,0.15), 0 3px 6px rgba(0,0,0,0.10)',
  },
});

export const darkTheme = createTheme({
  ...baseTheme,
  colorScheme: 'dark',
  colors: {
    brand: [
      '#0D47A1', // 0
      '#1565C0', // 1
      '#1976D2', // 2
      '#1E88E5', // 3
      '#2196F3', // 4
      '#42A5F5', // 5 - primary
      '#64B5F6', // 6
      '#90CAF9', // 7
      '#BBDEFB', // 8
      '#E3F2FD', // 9
    ],
  },
  defaultRadius: 'md',
  shadows: {
    sm: '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.4)',
    md: '0 3px 6px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.3)',
    lg: '0 10px 20px rgba(0,0,0,0.4), 0 3px 6px rgba(0,0,0,0.3)',
  },
}); 