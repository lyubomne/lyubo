<script lang="ts">
	import { parseDate, type DateValue } from '@internationalized/date';
	import { DatePicker } from 'bits-ui';
	import { MediaQuery } from 'svelte/reactivity';
	import {
		IconButton,
		ArrowLeftSmallIcon,
		ArrowRightSmallIcon,
		DotSmallIcon
	} from '$lib/components/ui';
	import { focusNextField } from '$lib/browser';
	import type { IDatePickerProps } from './types';

	const { value, onValueChange, onCommit }: IDatePickerProps = $props();

	const dateValue = $derived(parseDate(value));
	let isOpen = $state(false);
	let inputRef: HTMLElement | null = $state(null);
	let contentRef: HTMLElement | null = $state(null);

	// Below `sm` a floating calendar cannot be pinned to the bottom: use the static part as a sheet
	const isNarrow = new MediaQuery('width < 40rem');

	/*
	 * A click on the digits leaves focus in them: the calendar is a helper next to them. Alt+↓ and
	 * the sheet move focus into the calendar, and it goes back to the digits when it closes, if it
	 * came from them (a tap does not focus them, so no on-screen keyboard covers the sheet).
	 */
	let shouldFocusCalendar = $state(false);
	let returnFocusTo: HTMLElement | null = null;

	const open = (isFromKeyboard: boolean) => {
		const focused = document.activeElement;
		returnFocusTo = focused instanceof HTMLElement && inputRef?.contains(focused) ? focused : null;
		shouldFocusCalendar = isFromKeyboard || isNarrow.current;
		isOpen = true;
	};

	const handleValueChange = (date: DateValue | undefined) => {
		if (date) {
			onValueChange(date.toString());
		}
	};

	/*
	 * Picking a day closes the calendar: that is the end of the edit. bits-ui closes it then without
	 * `onOpenChange`; `onOpenChangeComplete` follows every close. A second save is a no-op.
	 */
	const handleOpenChangeComplete = (isNowOpen: boolean) => {
		if (!isNowOpen) {
			onCommit();
		}
	};

	// Before the digit gets it: an arrow key on a digit steps its value
	const handleKeyDownCapture = (event: KeyboardEvent) => {
		if (event.altKey && event.key === 'ArrowDown') {
			event.preventDefault();
			event.stopPropagation();
			open(true);
		}
	};

	const handleKeyDown = (event: KeyboardEvent) => {
		if (event.key === 'Enter' && inputRef) {
			event.preventDefault();
			isOpen = false;
			onCommit();

			const digits = inputRef.querySelectorAll<HTMLElement>(
				'[data-segment]:not([data-segment="literal"])'
			);
			// The closing calendar is still in the DOM, at the end of the page
			focusNextField(
				digits[digits.length - 1] ?? inputRef,
				(element) => !contentRef?.contains(element)
			);
		}
	};

	// Moving between the digits, or into the calendar, is still the same edit
	const handleFocusOut = (event: FocusEvent) => {
		const next = event.relatedTarget as Node | null;

		if (!inputRef?.contains(next) && !contentRef?.contains(next)) {
			isOpen = false;
			onCommit();
		}
	};

	/*
	 * bits-ui looks for the chosen day before the calendar has rendered it, finds none and focuses
	 * the previous-month key instead: focus the day after the calendar renders
	 */
	const handleOpenAutoFocus = (event: Event) => {
		event.preventDefault();

		if (shouldFocusCalendar) {
			requestAnimationFrame(() =>
				contentRef?.querySelector<HTMLElement>('[data-bits-day][data-focused]')?.focus()
			);
		}
	};

	const handleCloseAutoFocus = (event: Event) => {
		event.preventDefault();

		if (shouldFocusCalendar) {
			returnFocusTo?.focus();
		}
	};

	const handleMouseDown = (event: MouseEvent) => {
		if (isNarrow.current) {
			event.preventDefault();
		}
	};

	const handleInteractOutside = (event: PointerEvent) => {
		if (inputRef?.contains(event.target as Node)) {
			event.preventDefault();
		}
	};
</script>

{#snippet Calendar()}
	<DatePicker.Calendar>
		{#snippet children({ months, weekdays })}
			<DatePicker.Header>
				<DatePicker.PrevButton>
					{#snippet child({ props })}
						<IconButton
							{...props}
							icon={ArrowLeftSmallIcon}
							aria-label="Previous month"
							title="Previous month"
						/>
					{/snippet}
				</DatePicker.PrevButton>
				<DatePicker.Heading />
				<DatePicker.NextButton>
					{#snippet child({ props })}
						<IconButton
							{...props}
							icon={ArrowRightSmallIcon}
							aria-label="Next month"
							title="Next month"
						/>
					{/snippet}
				</DatePicker.NextButton>
			</DatePicker.Header>
			{#each months as month (month.value)}
				<DatePicker.Grid>
					<DatePicker.GridHead>
						<DatePicker.GridRow>
							{#each weekdays as day (day)}
								<DatePicker.HeadCell>
									<div>{day.slice(0, 2)}</div>
								</DatePicker.HeadCell>
							{/each}
						</DatePicker.GridRow>
					</DatePicker.GridHead>
					<DatePicker.GridBody>
						{#each month.weeks as weekDates (weekDates)}
							<DatePicker.GridRow>
								{#each weekDates as date (date)}
									<DatePicker.Cell {date} month={month.value}>
										<DatePicker.Day>
											<span class="today-indicator"><DotSmallIcon /></span>
											{date.day}
										</DatePicker.Day>
									</DatePicker.Cell>
								{/each}
							</DatePicker.GridRow>
						{/each}
					</DatePicker.GridBody>
				</DatePicker.Grid>
			{/each}
		{/snippet}
	</DatePicker.Calendar>
{/snippet}

<div class="datepicker">
	<DatePicker.Root
		weekdayFormat="short"
		fixedWeeks={true}
		value={dateValue}
		onValueChange={handleValueChange}
		onOpenChangeComplete={handleOpenChangeComplete}
		locale="en-GB"
		bind:open={isOpen}
	>
		<DatePicker.Input
			bind:ref={inputRef}
			onpointerdown={() => open(false)}
			onmousedown={handleMouseDown}
			onkeydowncapture={handleKeyDownCapture}
			onkeydown={handleKeyDown}
			onfocusout={handleFocusOut}
		>
			{#snippet children({ segments })}
				{#each segments as { part, value }, i (part + i)}
					{#if part === 'literal'}
						<DatePicker.Segment {part}>.</DatePicker.Segment>
					{:else}
						<DatePicker.Segment {part}>
							{value}
						</DatePicker.Segment>
					{/if}
				{/each}
			{/snippet}
		</DatePicker.Input>
		<DatePicker.Portal>
			<div class="datepicker-content">
				{#if isNarrow.current}
					<DatePicker.ContentStatic
						bind:ref={contentRef}
						class="datepicker-sheet"
						onOpenAutoFocus={handleOpenAutoFocus}
						onCloseAutoFocus={handleCloseAutoFocus}
						onInteractOutside={handleInteractOutside}
					>
						{@render Calendar()}
					</DatePicker.ContentStatic>
				{:else}
					<!-- bits-ui reads trapFocus only on mount: mount again when a click or Alt+↓ switches it -->
					{#key shouldFocusCalendar}
						<DatePicker.Content
							bind:ref={contentRef}
							sideOffset={6}
							customAnchor={inputRef}
							trapFocus={shouldFocusCalendar}
							onOpenAutoFocus={handleOpenAutoFocus}
							onCloseAutoFocus={handleCloseAutoFocus}
							onInteractOutside={handleInteractOutside}
						>
							{@render Calendar()}
						</DatePicker.Content>
					{/key}
				{/if}
			</div>
		</DatePicker.Portal>
	</DatePicker.Root>
</div>

<style>
	.datepicker {
		display: contents;

		:global {
			/* Inter's digits differ in width: tabular ones keep every date and its icon in line */
			[data-date-field-input] {
				display: flex;
				align-items: center;
				padding-inline: var(--space-4);
				border-radius: var(--radius-4);
				font-variant-numeric: tabular-nums;
			}

			[data-date-field-segment] {
				border-radius: var(--radius-4);
			}
		}
	}

	.datepicker-content {
		display: contents;

		:global {
			th {
				text-align: center;
			}

			td {
				height: var(--size-32);
			}

			[data-bits-floating-content-wrapper] {
				z-index: 30 !important;
			}

			[data-calendar-root] {
				background: var(--color-surface);
				border: var(--border-2) solid var(--color-white);
				border-radius: var(--radius-8);
				padding: var(--space-4);
				box-shadow: var(--shadow-panel);
				cursor: default;
			}

			[data-calendar-header] {
				display: flex;
				justify-content: space-between;
				align-items: center;
				margin-bottom: var(--space-8);
			}

			[data-calendar-head-cell] {
				width: var(--size-32);
				font-size: var(--font-14);
				font-weight: normal;
				color: var(--color-unaccent-1);
			}

			[data-calendar-cell] {
				border-radius: var(--radius-4);
				position: relative;
			}

			td[data-selected] {
				outline: var(--border-1) solid var(--color-dark);
			}

			[data-calendar-cell]:not([data-disabled]):hover {
				outline: var(--border-1) solid var(--color-accent-1);
			}

			[data-calendar-day] {
				font-variant-numeric: tabular-nums;
				width: 100%;
				display: inline-flex;
				align-items: center;
				justify-content: center;
			}

			[data-disabled] {
				color: var(--color-unaccent-1);
			}

			.today-indicator {
				display: none;
			}

			[data-today] {
				.today-indicator {
					display: inline;
					position: absolute;
					top: calc(-1 * var(--space-4));
				}

				svg {
					fill: var(--color-dark);
				}
			}

			/* The sheet is the body; the calendar in it is only its content */
			.datepicker-sheet {
				position: fixed;
				inset: auto 0 0;
				z-index: 30;
				padding: var(--space-8) calc(var(--space-8) + var(--space-safe-right))
					calc(var(--space-8) + var(--space-safe-bottom))
					calc(var(--space-8) + var(--space-safe-left));
				background: var(--color-surface);
				border: var(--border-2) solid var(--color-white);
				border-radius: var(--radius-16) var(--radius-16) 0 0;
				box-shadow: var(--shadow-panel);
				font-size: var(--font-16);

				[data-calendar-root] {
					max-width: var(--size-448);
					margin-inline: auto;
					padding: 0;
					background: none;
					border: none;
					box-shadow: none;
				}

				[data-calendar-grid] {
					width: 100%;
				}

				[data-calendar-head-cell] {
					width: auto;
				}

				td {
					height: var(--size-44);
				}

				:is([data-calendar-prev-button], [data-calendar-next-button]) {
					min-width: var(--size-44);
					height: var(--size-44);
				}
			}
		}
	}
</style>
