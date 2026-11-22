import { THEME_STORAGE_KEY } from '$lib/constants';

export const applyTheme = (name: string): void => {
	document.documentElement.dataset.theme = name;

	try {
		localStorage.setItem(THEME_STORAGE_KEY, name);
	} catch (_err) {
		// Storage can be blocked (private mode): the theme then lasts until the page reloads
	}
};
