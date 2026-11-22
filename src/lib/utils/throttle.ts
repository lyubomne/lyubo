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
			// The time it runs, not the time it was scheduled: a trailing call runs later
			lastCall = Date.now();
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
