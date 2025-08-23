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

export const debounce = <T extends (...args: unknown[]) => void>(
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
