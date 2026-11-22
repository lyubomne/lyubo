<script lang="ts">
	import { ZodError } from 'zod';
	import type { IDataInputSnippetProps } from './types';
	import { Input, getTableFocus } from '$lib/components/ui';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { getDB, getUniqueViolationMessage, updateFieldById } from '$lib/db';
	import { focusNextField } from '$lib/browser';
	import { OptimisticValue } from '$lib/state';

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
	const tableFocus = getTableFocus();

	const text = new OptimisticValue(() => String(value ?? ''));
	// `bind:value` on a number input sets a number
	const setText = (newValue: string | number) => (text.value = String(newValue));
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

	const commit = async () => {
		if (error) {
			return;
		}

		try {
			await text.save((newValue) =>
				updateFieldById({ db: dbStore.db, name, value: newValue, rowId, tableName })
			);
		} catch (err) {
			// The local schema rejects a duplicate value before it reaches the change log
			const message = getUniqueViolationMessage(err);

			if (!message) {
				throw err;
			}

			error = message;
		}
	};

	const handleKeyDown = (e: KeyboardEvent) => {
		if (e.key === 'Enter') {
			commit();
			e.preventDefault();

			if (inputComponent) {
				focusNextField(inputComponent);
			}
		}

		if (e.key === 'Escape') {
			inputComponent?.blur();
		}
	};
</script>

<!-- TODO: Add aria-labelledby -->
<div class="data-input">
	<Input
		bind:value={() => text.value, setText}
		bind:ref={inputComponent}
		{@attach (input) => {
			if (tableFocus?.take(rowId, name)) input.focus();
		}}
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
