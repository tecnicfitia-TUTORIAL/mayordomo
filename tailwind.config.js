/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ai: {
          50: '#fbf7e3',
          100: '#f5ecbe',
          200: '#ede092',
          300: '#e4d062',
          400: '#dbb934',
          500: '#d4af37', 
          600: '#b68e29',
          700: '#926d23',
          800: '#785824',
          900: '#664a24'
        },
        user: {
          50: '#fdf4f4',
          100: '#fce7e7',
          200: '#f9d3d3',
          300: '#f4b0b0',
          400: '#eb8282',
          500: '#cd5c5c', 
          600: '#c53e3e',
          700: '#a52e2e',
          800: '#892929',
          900: '#722626'
        },
        dark: {
          800: 'rgb(var(--color-dark-800) / <alpha-value>)',
          900: 'rgb(var(--color-dark-900) / <alpha-value>)',
          950: 'rgb(var(--color-dark-950) / <alpha-value>)'
        },
        stone: {
          200: 'rgb(var(--color-stone-200) / <alpha-value>)',
          300: 'rgb(var(--color-stone-300) / <alpha-value>)',
          400: 'rgb(var(--color-stone-400) / <alpha-value>)',
          500: 'rgb(var(--color-stone-500) / <alpha-value>)',
          700: 'rgb(var(--color-stone-700) / <alpha-value>)',
          800: 'rgb(var(--color-stone-800) / <alpha-value>)'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['"Playfair Display"', 'serif']
      },
      animation: {
        'fadeIn': 'fadeIn 0.5s ease-out',
        'scaleIn': 'scaleIn 0.3s ease-out',
        'slideInRight': 'slideInRight 0.5s ease-out',
        'slideInUp': 'slideInUp 0.5s ease-out',
        'scanline': 'scanline 2s linear infinite'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' }
        },
        slideInUp: {
          '0%': { opacity: '0', transform: 'translateY(100%)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        scanline: {
          '0%': { top: '0%' },
          '100%': { top: '100%' }
        }
      },
      backgroundImage: {
        'noise': "url('https://grainy-gradients.vercel.app/noise.svg')"
      }
    }
  }
}
