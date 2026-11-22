<script lang="ts">
	import { DropdownMenu } from 'bits-ui';
	import { browser } from '$app/environment';
	import { applyTheme } from '$lib/browser';
	import { DEFAULT_THEME, Themes } from '$lib/constants';
	import { Button, CircleHalfIcon, DotSmallIcon, Menu } from '$lib/components/ui';
	import type { TThemeName } from './types';

	const isThemeName = (value: string | undefined): value is TThemeName =>
		value !== undefined && Object.hasOwn(Themes, value);

	// app.html sets the stored theme on <html> before the first paint
	const storedTheme = browser ? document.documentElement.dataset.theme : undefined;

	let current = $state<TThemeName>(isThemeName(storedTheme) ? storedTheme : DEFAULT_THEME);

	const handleValueChange = (value: string) => {
		if (!isThemeName(value)) {
			return;
		}

		current = value;
		applyTheme(value);
	};
</script>

<Menu>
	{#snippet trigger(props)}
		<Button icon={CircleHalfIcon} aria-label="Theme" title="Theme" {...props} />
	{/snippet}

	<DropdownMenu.RadioGroup value={current} onValueChange={handleValueChange}>
		{#each Object.entries(Themes) as [name, label] (name)}
			<!-- Stays open, so the themes can be tried one after another -->
			<DropdownMenu.RadioItem value={name} closeOnSelect={false}>
				{#snippet children({ checked })}
					<span class="theme-menu-swatch" data-theme={name}>
						<span class="theme-menu-swatch-body"></span>
					</span>
					<span class="theme-menu-label">{label}</span>
					{#if checked}
						<span class="theme-menu-checked"><DotSmallIcon /></span>
					{/if}
				{/snippet}
			</DropdownMenu.RadioItem>
		{/each}
	</DropdownMenu.RadioGroup>
</Menu>

<style>
	.theme-menu-swatch {
		display: inline-flex;
		flex: none;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
		width: var(--size-20);
		height: var(--size-20);
		background: var(--color-bg);
		border: var(--border-1) solid var(--color-shadow-1);
		border-radius: var(--radius-4);
	}

	.theme-menu-swatch-body {
		box-sizing: border-box;
		width: var(--size-10);
		height: var(--size-10);
		background: var(--color-body);
		border: var(--border-1) solid var(--color-white);
		border-radius: var(--radius-4);
	}

	.theme-menu-label {
		flex: 1;
	}

	.theme-menu-checked {
		display: contents;

		:global(svg) {
			flex: none;
			width: var(--size-20);
			height: var(--size-20);
			fill: var(--color-dark);
		}
	}
</style>
