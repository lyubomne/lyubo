import { Breakpoints, FullWidthBreakpoint } from '$lib/constants';
import type { Breakpoint } from '$lib/types';

export const isBelowBreakpoint = (currentWidth: number, breakpoint: Breakpoint): boolean => {
	if (breakpoint === FullWidthBreakpoint) {
		return true;
	}

	return currentWidth <= Breakpoints[breakpoint];
};
