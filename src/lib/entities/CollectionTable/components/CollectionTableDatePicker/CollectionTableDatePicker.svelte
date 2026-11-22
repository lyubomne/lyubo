<script lang="ts">
	import type { ICollectionTableDatePickerProps } from './types';
	import { getDB, updateFieldById } from '$lib/db';
	import { DatePicker } from '$lib/components/ui';
	import { OptimisticValue } from '$lib/state';

	const { value, name, rowId }: ICollectionTableDatePickerProps = $props();

	const dbStore = getDB();

	// The draft holds the digits while they are typed: a live query result does not reset them
	const date = new OptimisticValue(() => value);

	const commit = async () => {
		try {
			await date.save((newValue) =>
				// TODO: Do not hardcode tableName, take it from context
				updateFieldById({ db: dbStore.db, name, value: newValue, rowId, tableName: 'lyubo' })
			);
		} catch (err) {
			console.error(err);
		}
	};
</script>

<DatePicker
	value={date.value}
	onValueChange={(newValue) => (date.value = newValue)}
	onCommit={commit}
/>
