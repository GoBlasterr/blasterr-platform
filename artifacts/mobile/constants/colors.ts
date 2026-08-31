/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#0a0a0a',
    tint: '#2f95dc',

    // Core surfaces
    background: '#11130f',
    foreground: '#f7f8f2',

    // Cards / elevated surfaces
    card: '#1a1d16',
    cardForeground: '#f7f8f2',

    // Primary action color (buttons, links, active states)
    primary: '#e5f403',
    primaryForeground: '#11130f',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#252a20',
    secondaryForeground: '#f7f8f2',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#20241c',
    mutedForeground: '#9da38f',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#30371d',
    accentForeground: '#e5f403',

    // Destructive actions (delete, error states)
    destructive: '#ff4d67',
    destructiveForeground: '#ffffff',

    // Borders and input outlines
    border: '#343a2b',
    input: '#2b3025',
  },
  dark: {
    text: '#f7f8f2',
    tint: '#e5f403',
    background: '#11130f',
    foreground: '#f7f8f2',
    card: '#1a1d16',
    cardForeground: '#f7f8f2',
    primary: '#e5f403',
    primaryForeground: '#11130f',
    secondary: '#252a20',
    secondaryForeground: '#f7f8f2',
    muted: '#20241c',
    mutedForeground: '#9da38f',
    accent: '#30371d',
    accentForeground: '#e5f403',
    destructive: '#ff4d67',
    destructiveForeground: '#ffffff',
    border: '#343a2b',
    input: '#2b3025',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 16,
};

export default colors;
