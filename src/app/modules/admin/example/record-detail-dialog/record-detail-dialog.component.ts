import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface RecordDetailData {
	row: any;
	displayedColumns: string[];
	editableColumns: string[];
	canEdit: boolean;
	selectedTable: string;
	rowIndex: number;
}

@Component({
	selector: 'app-record-detail-dialog',
	templateUrl: './record-detail-dialog.component.html',
	styleUrls: ['./record-detail-dialog.component.scss']
})
export class RecordDetailDialogComponent {
	readonlyDateColumns: Set<string>;

	constructor(
		private dialogRef: MatDialogRef<RecordDetailDialogComponent>,
		@Inject(MAT_DIALOG_DATA) public data: RecordDetailData
	) {
		this.readonlyDateColumns = new Set<string>([
			// columns that use datetime-local in table should be editable if canEdit
		]);
	}

	isEditable(column: string): boolean {
		return this.data.canEdit && this.data.editableColumns.includes(column);
	}

	onCancel(): void {
		this.dialogRef.close();
	}

	onSave(): void {
		this.dialogRef.close({ action: 'save', row: this.data.row });
	}

	onDelete(): void {
		this.dialogRef.close({ action: 'delete' });
	}
}


