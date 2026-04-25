import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0a0f1e',
        'bg-secondary': '#111827',
        'bg-tertiary': '#1f2937',
        'accent-primary': '#f59e0b',
        'accent-secondary': '#3b82f6',
        'text-primary': '#f9fafb',
        'text-secondary': '#9ca3af',
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
