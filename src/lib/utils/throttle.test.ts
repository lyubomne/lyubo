import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { throttle } from './throttle';

beforeEach(() => {
	// A real-looking clock: throttle compares Date.now() with its last call, which starts at 0
	vi.useFakeTimers({ now: new Date('2026-01-01T00:00:00Z') });
});

afterEach(() => {
	vi.useRealTimers();
});

describe('throttle', () => {
	it('calls at once, then once more with the last arguments when the wait ends', () => {
		const fn = vi.fn();
		const throttled = throttle(fn, 100);

		throttled('a');
		throttled('b');
		throttled('c');
		vi.advanceTimersByTime(100);

		expect(fn.mock.calls).toEqual([['a'], ['c']]);
	});

	it('never calls more often than once per wait', () => {
		const fn = vi.fn();
		const callTimes: number[] = [];
		fn.mockImplementation(() => callTimes.push(Date.now()));
		const throttled = throttle(fn, 100);

		// A call every 10 ms for half a second, like a resize stream
		for (let i = 0; i < 50; i++) {
			throttled(i);
			vi.advanceTimersByTime(10);
		}

		const gaps = callTimes.slice(1).map((time, i) => time - callTimes[i]);

		expect(Math.min(...gaps)).toBeGreaterThanOrEqual(100);
	});
});
