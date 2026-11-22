import { Breakpoints, FullWidthBreakpoint } from '$lib/constants';
import type { Breakpoint } from '$lib/types';

export const isLessThanCurrentBreakpoint = ({
	newBreakpoint,
	currentBreakpoint
}: {
	newBreakpoint: Breakpoint;
	currentBreakpoint?: Breakpoint;
}): boolean => {
	if (!currentBreakpoint) {
		return true;
	}

	if (currentBreakpoint === FullWidthBreakpoint) {
		return true;
	}

	if (newBreakpoint === FullWidthBreakpoint) {
		return false;
	}

	return Breakpoints[newBreakpoint] <= Breakpoints[currentBreakpoint];
};
