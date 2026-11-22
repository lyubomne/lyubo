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
