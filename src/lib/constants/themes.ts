// Theme names and labels. The names match the `[data-theme]` blocks in app.css
export const Themes = {
	grey: 'Grey',
	warm: 'Warm',
	white: 'White',
	stone: 'Stone',
	steel: 'Steel'
} as const;

export const DEFAULT_THEME = 'grey';

// The inline script in app.html reads the same key before the first paint
export const THEME_STORAGE_KEY = 'lyubo-theme';
