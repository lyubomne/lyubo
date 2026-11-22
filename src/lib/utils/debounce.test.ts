import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { debounce } from './debounce';

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

describe('debounce', () => {
	it('calls once with the last arguments after calls stop for the delay', () => {
		const fn = vi.fn();
		const debounced = debounce(fn, 100);

		debounced('a');
		vi.advanceTimersByTime(50);
		debounced('b');
		vi.advanceTimersByTime(100);

		expect(fn).toHaveBeenCalledExactlyOnceWith('b');
	});
});
