<script lang="ts">
	import { ZodError } from 'zod';
	import type { IDataInputSnippetProps } from './types';
	import { Input } from '$lib/components/ui';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { getDB, updateFieldById } from '$lib/db';

	const {
		tableName,
		validationSchema,
		name,
		value,
		rowId,
		type = 'text',
		...restProps
	}: Omit<HTMLInputAttributes, 'value'> & IDataInputSnippetProps = $props();

	const dbStore = getDB();

	let localValue = $derived(String(value ?? ''));
	let error = $state('');
	let inputComponent = $state<HTMLInputElement | null>(null);

	const validateValue = (e: Event & { currentTarget: EventTarget & HTMLInputElement }) => {
		try {
			validationSchema?.shape[name].parse(
				type === 'number' ? Number(e.currentTarget.value) : e.currentTarget.value
			);
			error = '';
		} catch (err) {
			if (err instanceof ZodError) {
				error = err.issues[0]?.message || 'Invalid value';
			}
		}
	};

	const commit = () => {
		if (error || value === localValue) {
			return;
		}

		void updateFieldById({ db: dbStore.db, name, value: localValue, rowId, tableName });
	};

	const handleKeyDown = (e: KeyboardEvent) => {
		if (e.key === 'Enter') {
			commit();

			// TODO: Move to utility
			const isDisableable = (
				el: Element
			): el is HTMLInputElement | HTMLButtonElement | HTMLSelectElement | HTMLTextAreaElement => {
				return (
					el instanceof HTMLInputElement ||
					el instanceof HTMLButtonElement ||
					el instanceof HTMLSelectElement ||
					el instanceof HTMLTextAreaElement
				);
			};

			if (e.key === 'Enter') {
				e.preventDefault();

				const focusable = Array.from(
					document.querySelectorAll<HTMLElement>(
						'input, button, select, textarea, [tabindex]:not([tabindex="-1"])'
					)
				)
					.filter((el) => !isDisableable(el) || !el.disabled)
					.filter((el) => el.offsetParent !== null);

				const index = inputComponent ? focusable.indexOf(inputComponent) : -1;

				if (index > -1 && index + 1 < focusable.length) {
					focusable[index + 1].focus();
				}
			}
		}

		if (e.key === 'Esc') {
			inputComponent?.blur();
		}
	};
</script>

<!-- TODO: Add aria-labelledby -->
<div class="data-input">
	<Input
		bind:value={localValue}
		bind:ref={inputComponent}
		aria-invalid={error ? 'true' : 'false'}
		oninput={validateValue}
		onblur={commit}
		inputmode={type === 'number' ? 'decimal' : undefined}
		autocomplete="off"
		{handleKeyDown}
		{type}
		{...restProps}
	/>
	{#if error}
		<div class="error" role="alert">{error}</div>
	{/if}
</div>
