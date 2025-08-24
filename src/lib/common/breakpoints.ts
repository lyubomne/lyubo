export const Breakpoints = {
	sm: 640,
	md: 768,
	lg: 1024,
	xl: 1280
} as const;

export const FullWidthBreakpoint = 'fullWidth' as const;

export type Breakpoint = keyof typeof Breakpoints | typeof FullWidthBreakpoint;

export const isBelowBreakpoint = (currentWidth: number, breakpoint: Breakpoint): boolean => {
	if (breakpoint === FullWidthBreakpoint) {
		return true;
	}

	return currentWidth <= Breakpoints[breakpoint];
};

export const isLessThenCurrentBreakpoint = ({
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
