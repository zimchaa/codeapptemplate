// Tailwind CSS 3.4 preset for the workspace UI kit.
//
// Every colour is a CSS variable defined per theme in src/theme/themes.css
// (as "R G B" channels so Tailwind's opacity modifiers work: bg-primary/10).
// Components only use these semantic names, so changing the theme, or
// replacing the kit with another component library, never means hunting for
// hard-coded colours.

const token = (name) => `rgb(var(--ws-${name}) / <alpha-value>)`

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['variant', '&:is([data-mode="dark"] *)'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: token('primary'),
          hover: token('primary-hover'),
          foreground: token('primary-foreground'),
          subtle: token('primary-subtle'),
        },
        background: token('background'),
        surface: {
          DEFAULT: token('surface'),
          muted: token('surface-muted'),
        },
        foreground: token('foreground'),
        muted: token('muted'),
        border: token('border'),
        ring: token('ring'),
        success: token('success'),
        warning: token('warning'),
        danger: token('danger'),
        info: token('info'),
        sidebar: {
          DEFAULT: token('sidebar'),
          foreground: token('sidebar-foreground'),
          muted: token('sidebar-muted'),
          active: token('sidebar-active'),
        },
      },
      borderRadius: {
        sm: 'calc(var(--ws-radius) - 2px)',
        DEFAULT: 'var(--ws-radius)',
        md: 'var(--ws-radius)',
        lg: 'calc(var(--ws-radius) + 4px)',
        xl: 'calc(var(--ws-radius) + 8px)',
      },
      fontFamily: {
        sans: 'var(--ws-font-sans)',
        heading: 'var(--ws-font-heading)',
      },
      boxShadow: {
        card: 'var(--ws-shadow-card)',
      },
    },
  },
}
