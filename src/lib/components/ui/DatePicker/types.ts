export interface IDatePickerProps {
	// 'YYYY-MM-DD'
	value: string;
	// Every change while editing: digits typed, a day picked
	onValueChange: (value: string) => void;
	// The edit ends: a day picked, Enter, or focus leaving the field and the calendar
	onCommit: () => void;
}
