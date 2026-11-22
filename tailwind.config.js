/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Distinctive Road system identity: deep plum with warm rose highlights.
      // Existing page utilities keep working while sharing one product palette.
      colors: {
        slate: { 50: '#fdf9fb', 100: '#f7f0f4', 200: '#eadfe5', 300: '#d3c3cc', 400: '#a996a2', 500: '#786773', 600: '#5d4a57', 700: '#493641', 800: '#33242d', 900: '#24151e', 950: '#140a10' },
        gray: { 50: '#fdf9fb', 100: '#f7f0f4', 200: '#eadfe5', 300: '#d3c3cc', 400: '#a996a2', 500: '#786773', 600: '#5d4a57', 700: '#493641', 800: '#33242d', 900: '#24151e', 950: '#140a10' },
        neutral: { 50: '#fdf9fb', 100: '#f7f0f4', 200: '#eadfe5', 300: '#d3c3cc', 400: '#a996a2', 500: '#786773', 600: '#5d4a57', 700: '#493641', 800: '#33242d', 900: '#24151e', 950: '#140a10' },
        blue: { 50: '#fbf4f7', 100: '#f5e7ed', 200: '#ebceda', 300: '#dca9be', 400: '#c77c9b', 500: '#ac5279', 600: '#91385f', 700: '#762a4d', 800: '#60243f', 900: '#501f36', 950: '#2d101e' },
        emerald: { 50: '#fbf4f7', 100: '#f5e7ed', 200: '#ebceda', 300: '#dca9be', 400: '#c77c9b', 500: '#ac5279', 600: '#91385f', 700: '#762a4d', 800: '#60243f', 900: '#501f36', 950: '#2d101e' },
        green: { 50: '#fbf4f7', 100: '#f5e7ed', 200: '#ebceda', 300: '#dca9be', 400: '#c77c9b', 500: '#ac5279', 600: '#91385f', 700: '#762a4d', 800: '#60243f', 900: '#501f36', 950: '#2d101e' },
        indigo: { 50: '#fbf4f7', 100: '#f5e7ed', 200: '#ebceda', 300: '#dca9be', 400: '#c77c9b', 500: '#ac5279', 600: '#91385f', 700: '#762a4d', 800: '#60243f', 900: '#501f36', 950: '#2d101e' },
        violet: { 50: '#fbf4f7', 100: '#f5e7ed', 200: '#ebceda', 300: '#dca9be', 400: '#c77c9b', 500: '#ac5279', 600: '#91385f', 700: '#762a4d', 800: '#60243f', 900: '#501f36', 950: '#2d101e' },
        purple: { 50: '#fbf4f7', 100: '#f5e7ed', 200: '#ebceda', 300: '#dca9be', 400: '#c77c9b', 500: '#ac5279', 600: '#91385f', 700: '#762a4d', 800: '#60243f', 900: '#501f36', 950: '#2d101e' },
        teal: { 50: '#fbf4f7', 100: '#f5e7ed', 200: '#ebceda', 300: '#dca9be', 400: '#c77c9b', 500: '#ac5279', 600: '#91385f', 700: '#762a4d', 800: '#60243f', 900: '#501f36', 950: '#2d101e' },
      },
      fontFamily: {
        sans: ['CustomFont','Vazirmatn', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
