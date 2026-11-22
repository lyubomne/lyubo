import type { WithElementRef } from '$lib/common/types';
import type { HTMLTextareaAttributes } from 'svelte/elements';

export type ITextAreaProps = WithElementRef<HTMLTextareaAttributes, HTMLTextAreaElement>;
