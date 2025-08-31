/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      // Design System Typography
      fontFamily: {
        'display': ['Cinzel', 'Georgia', 'Times New Roman', 'serif'], 
        'body': ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      
      // 1930s Crime Noir Color Palette - WCAG AA Compliant
      colors: {
        // Mafia - Crimson Red
        mafia: {
          50: '#fef2f2',   // Very light crimson
          100: '#fee2e2',  // Light crimson
          200: '#fecaca',  // Lighter crimson
          300: '#fca5a5',  // Light-medium crimson
          400: '#f87171',  // Medium crimson
          500: '#DC143C',  // Primary crimson (brand)
          600: '#B91C1C',  // Medium-dark crimson
          700: '#991B1B',  // Dark crimson
          800: '#7F1D1D',  // Darker crimson
          900: '#8B0000',  // Darkest crimson (secondary)
          950: '#1A0000',  // Background crimson
        },
        
        // Detective - Gold & Deep Blue
        detective: {
          50: '#fffdf7',   // Very light gold
          100: '#fffbeb',  // Light gold
          200: '#fef3c7',  // Lighter gold
          300: '#fde68a',  // Light-medium gold
          400: '#fcd34d',  // Medium gold
          500: '#FFD700',  // Primary gold (brand)
          600: '#f59e0b',  // Medium-dark gold
          700: '#d97706',  // Dark gold
          800: '#b45309',  // Darker gold
          900: '#92400e',  // Darkest gold
          950: '#0F1419',  // Background blue-black
          blue: '#1E3A8A', // Secondary deep blue
        },
        
        // Doctor - Pale Blue & Silver
        doctor: {
          50: '#f0f9ff',   // Very light blue
          100: '#e0f2fe',  // Light blue
          200: '#bae6fd',  // Lighter blue
          300: '#7dd3fc',  // Light-medium blue
          400: '#38bdf8',  // Medium blue
          500: '#87CEEB',  // Primary sky blue (brand)
          600: '#0284c7',  // Medium-dark blue
          700: '#0369a1',  // Dark blue
          800: '#075985',  // Darker blue
          900: '#0c4a6e',  // Darkest blue
          950: '#0A1628',  // Background blue
          silver: '#C0C0C0', // Secondary silver
        },
        
        // Town - Warm Neutrals
        town: {
          50: '#fefdf8',   // Very light burlywood
          100: '#fefce8',  // Light burlywood
          200: '#fef7cd',  // Lighter burlywood
          300: '#fef08a',  // Light-medium burlywood
          400: '#fde047',  // Medium burlywood
          500: '#DEB887',  // Primary burlywood (brand)
          600: '#ca8a04',  // Medium-dark burlywood
          700: '#a16207',  // Dark burlywood
          800: '#854d0e',  // Darker burlywood
          900: '#8B7355',  // Secondary dark brown
          950: '#2C1810',  // Background brown
        },
        
        // UI System Colors
        ui: {
          50: '#fefdf8',   // Very light gold
          100: '#fefce8',  // Light gold
          200: '#fef7cd',  // Lighter gold
          300: '#fef08a',  // Light-medium gold
          400: '#fde047',  // Medium gold
          500: '#DAA520',  // Primary goldenrod (brand)
          600: '#B8860B',  // Secondary dark goldenrod
          700: '#a16207',  // Dark goldenrod
          800: '#854d0e',  // Darker goldenrod
          900: '#713f12',  // Darkest goldenrod
          950: '#1C1611',  // Background dark gold
          
          // Additional system colors
          dark: '#0A0A0A',     // Almost black
          light: '#F5F5F5',    // Off-white
          muted: '#6B7280',    // Muted gray
          border: '#374151',   // Border gray
        },
      },
      
      // Spacing scale optimized for touch targets and layouts
      spacing: {
        '18': '4.5rem',   // 72px
        '88': '22rem',    // 352px
        '128': '32rem',   // 512px
      },
      
      // Responsive aspect ratios for game assets
      aspectRatio: {
        'portrait': '2 / 3',      // Character portraits
        'landscape': '16 / 9',    // Background scenes
        'card': '5 / 7',         // Playing card ratio
      },
      
      // Animation system
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      
      // Box shadows for depth and hierarchy
      boxShadow: {
        'game': '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'portrait': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'elevated': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      },
      
      // Typography scale
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],     // 12px
        'sm': ['0.875rem', { lineHeight: '1.25rem' }], // 14px
        'base': ['1rem', { lineHeight: '1.5rem' }],    // 16px
        'lg': ['1.125rem', { lineHeight: '1.75rem' }], // 18px
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],  // 20px
        '2xl': ['1.5rem', { lineHeight: '2rem' }],     // 24px
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],  // 36px
        '5xl': ['3rem', { lineHeight: '1' }],          // 48px
        '6xl': ['3.75rem', { lineHeight: '1' }],       // 60px
        '7xl': ['4.5rem', { lineHeight: '1' }],        // 72px
      },
      
      // Z-index scale for proper layering
      zIndex: {
        'dropdown': 1000,
        'sticky': 1020,
        'fixed': 1030,
        'modal-backdrop': 1040,
        'modal': 1050,
        'popover': 1060,
        'tooltip': 1070,
      },
      
      // Screen breakpoints optimized for responsive design
      screens: {
        'xs': '375px',   // Small phone
        'sm': '640px',   // Large phone
        'md': '768px',   // Tablet
        'lg': '1024px',  // Small desktop
        'xl': '1280px',  // Desktop
        '2xl': '1536px', // Large desktop
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}