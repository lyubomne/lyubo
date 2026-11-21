import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { debounce, getNestedValues, styleObjectToString, throttle } from './utils';

describe('getNestedValues', () => {
	const object = { a: { b: { c: 1 } }, empty: null };

	it.each([
		{ path: 'a.b.c', expected: 1 },
		{ path: 'a.b', expected: { c: 1 } },
		{ path: 'a.x.c', expected: undefined },
		{ path: 'empty.b', expected: undefined },
		{ path: 'a.b.c.d', expected: undefined }
	])('reads $path as $expected', ({ path, expected }) => {
		expect(getNestedValues(object, path)).toEqual(expected);
	});
});

describe('styleObjectToString', () => {
	it('turns camelCase properties into CSS declarations and skips empty values', () => {
		const result = styleObjectToString({ minWidth: '1rem', color: '', textAlign: 'right' });

		expect(result).toBe('min-width:1rem;text-align:right');
	});

	it('returns an empty string without a style', () => {
		expect(styleObjectToString()).toBe('');
	});
});

describe('timing helpers', () => {
	beforeEach(() => {
		// A real-looking clock: throttle compares Date.now() with its last call, which starts at 0
		vi.useFakeTimers({ now: new Date('2026-01-01T00:00:00Z') });
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
});
