<script lang="ts">
	import { type DateValue } from '@internationalized/date';
	import type { ICollectionTableDatePickerProps } from './types';
	import { getDB, updateFieldById } from '$lib/db';
	import { DatePicker } from '$lib/components/ui';
	import { debounce } from '$lib/common/utils';

	const { value, name, rowId }: ICollectionTableDatePickerProps = $props();

	const dbStore = getDB();

	const commit = debounce((date: DateValue | undefined) => {
		if (!date) {
			return;
		}

		// TODO: Do not hardcode tableName, take it from context
		void updateFieldById({
			db: dbStore.db,
			name,
			value: date.toString(),
			rowId,
			tableName: 'lyubo'
		});
	});
</script>

<DatePicker {value} onValueChange={commit} />
