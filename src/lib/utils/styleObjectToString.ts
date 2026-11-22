export const styleObjectToString = (style?: Partial<CSSStyleDeclaration>): string => {
	if (!style) {
		return '';
	}
	return Object.entries(style)
		.filter(([_, value]) => typeof value === 'string' && value.length > 0)
		.map(([key, value]) => `${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}:${value}`)
		.join(';');
};
