// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getNestedValues = (object: Record<string, any>, path: string): any => {
	if (typeof path !== 'string') {
		return undefined;
	}
	const keys = path.split('.');
	let result = object;

	for (const key of keys) {
		if (result === null || result === undefined || typeof result !== 'object' || !(key in result)) {
			return undefined;
		}

		result = result[key];
	}

	return result;
};

export const styleObjectToString = (style?: Partial<CSSStyleDeclaration>): string => {
	if (!style) {
		return '';
	}
	return Object.entries(style)
		.filter(([_, value]) => typeof value === 'string' && value.length > 0)
		.map(([key, value]) => `${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}:${value}`)
		.join(';');
};

export const pxToRem = (() => {
	let cachedBase: number | null = null;

	return (px: number): string => {
		if (cachedBase === null) {
			cachedBase = parseFloat(getComputedStyle(document.documentElement).fontSize);
		}

		return `${px / cachedBase}rem`;
	};
})();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const debounce = <T extends (...args: any[]) => void>(
	fn: T,
	delay: number = 500
): ((...args: Parameters<T>) => void) => {
	let timeout: ReturnType<typeof setTimeout> | null = null;

	return (...args: Parameters<T>) => {
		if (timeout) {
			clearTimeout(timeout);
		}

		timeout = setTimeout(() => {
			fn(...args);
			timeout = null;
		}, delay);
	};
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const throttle = <T extends (...args: any[]) => void>(
	fn: T,
	wait: number
): ((...args: Parameters<T>) => void) => {
	let lastCall = 0;
	let timeout: ReturnType<typeof setTimeout> | null = null;
	let lastArgs: Parameters<T> | null = null;

	return function throttled(...args: Parameters<T>) {
		const now = Date.now();

		const invoke = () => {
			lastCall = now;
			timeout = null;

			fn(...(lastArgs || args));

			lastArgs = null;
		};

		if (now - lastCall >= wait) {
			invoke();
		} else {
			lastArgs = args;

			if (!timeout) {
				const remaining = wait - (now - lastCall);
				timeout = setTimeout(invoke, remaining);
			}
		}
	};
};
