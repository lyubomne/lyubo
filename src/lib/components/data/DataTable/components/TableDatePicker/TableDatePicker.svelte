<script lang="ts">
	import { type DateValue } from '@internationalized/date';
	import type { ITableDatePickerProps } from './types';
	import { getDB, updateFieldById } from '$lib/db';
	import { DatePicker } from '$lib/components/ui';
	import { debounce } from '$lib/common/utils';

	const { value, name, rowId }: ITableDatePickerProps = $props();

	const dbStore = getDB();

	const commit = debounce((date: DateValue | undefined) => {
		if (!date) {
			return;
		}

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
