// Text that LIKE / ILIKE match literally: `%`, `_` and the escape character `\` lose their meaning
export const escapeLikePattern = (text: string): string => text.replace(/[\\%_]/g, '\\$&');
