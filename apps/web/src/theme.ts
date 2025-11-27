import { createTheme } from '@mui/material/styles';

const basicConfig = {
  colors: {
    transparent: 'transparent',
    black: '#000000',
    bastille: '#1C1825',
    white: '#FFFFFF',
    red: '#FF0000',
    alto: '#D4D4D4',
    fernGreen: '#417741',
  },
  fonts: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '26px',
    '4xl': '34px',
    '5xl': '40px',
    '6xl': '60px',
    '7xl': '70px',
    '8xl': '90px',
    '9xl': '100px',
  },
  'custom-shadows': {
    smallest: '0px 10px 50px #00000029',
    small: '0px 3px 20px #00000040',
  },
  screens: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
};

export const materialConfig = {
  ...basicConfig,
  palette: {
    primary: {
      main: '#1C1825',
    },
    secondary: {
      main: '#FFFFFF',
    },
  },
  typography: {
    fontFamily: 'Fustat',
  },
};

export const materialTheme = createTheme(materialConfig);
