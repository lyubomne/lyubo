<script lang="ts">
	import { parseDate, type DateValue } from '@internationalized/date';
	import type { ITableDatePickerProps } from './types';
	import { DatePicker } from 'bits-ui';
	import { getDB, updateFieldById } from '$lib/db';

	const { value, name, rowId }: ITableDatePickerProps = $props();

	const dbStore = getDB();

	const commit = (date: DateValue | undefined) => {
		if (!date) {
			return;
		}

		void updateFieldById({ db: dbStore.db, name, value: date.toString(), rowId });
	};
</script>

<DatePicker.Root
	weekdayFormat="short"
	fixedWeeks={true}
	onValueChange={commit}
	value={parseDate(value)}
>
	<div class="datepicker">
		<DatePicker.Input class="datepicker-input">
			{#snippet children({ segments })}
				{#each segments as { part, value }, i (part + i)}
					<div>
						{#if part === 'literal'}
							<DatePicker.Segment {part}>
								{value}
							</DatePicker.Segment>
						{:else}
							<DatePicker.Segment {part}>
								{value}
							</DatePicker.Segment>
						{/if}
					</div>
				{/each}
				<DatePicker.Trigger>
					<!-- TODO: Add icon? -->
				</DatePicker.Trigger>
			{/snippet}
		</DatePicker.Input>
		<DatePicker.Content sideOffset={6}>
			<DatePicker.Calendar>
				{#snippet children({ months, weekdays })}
					<DatePicker.Header>
						<DatePicker.PrevButton>
							<!-- TODO: Add icon -->
						</DatePicker.PrevButton>
						<DatePicker.Heading />
						<DatePicker.NextButton>
							<!-- TODO: Add icon -->
						</DatePicker.NextButton>
					</DatePicker.Header>
					<div>
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
														<div></div>
														{date.day}
													</DatePicker.Day>
												</DatePicker.Cell>
											{/each}
										</DatePicker.GridRow>
									{/each}
								</DatePicker.GridBody>
							</DatePicker.Grid>
						{/each}
					</div>
				{/snippet}
			</DatePicker.Calendar>
		</DatePicker.Content>
	</div>
</DatePicker.Root>

<style>
	.datepicker {
		:global {
			.datepicker-input {
				display: flex;
			}
		}
	}
</style>
