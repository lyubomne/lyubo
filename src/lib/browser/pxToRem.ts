export const pxToRem = (() => {
	let cachedBase: number | null = null;

	return (px: number): string => {
		if (cachedBase === null) {
			cachedBase = parseFloat(getComputedStyle(document.documentElement).fontSize);
		}

		return `${px / cachedBase}rem`;
	};
})();
