import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-add-record-dialog',
  templateUrl: './add-record-dialog.component.html',
  styleUrls: ['./add-record-dialog.component.scss']
})
export class AddRecordDialogComponent implements OnInit {
  @Input() columns: string[] = [];
  @Input() selectedTable: string = ''; // Nhận tên bảng từ cha
  @Input() visible: boolean = false;
  @Output() close = new EventEmitter<void>();
  @Output() success = new EventEmitter<void>();

  form: FormGroup = this.fb.group({});

  constructor(private fb: FormBuilder, private http: HttpClient) {}

  ngOnInit() {
    const group: any = {};
    this.columns.forEach(col => {
      group[col] = ['', Validators.required];
    });
    this.form = this.fb.group(group);
  }

  onSubmit() {
    if (this.form.invalid) return;
    const values = this.columns.map(col => this.form.value[col]);
    // Gửi trực tiếp lên API
    const apiUrl = `${environment.apiUrl}/${this.selectedTable}/add`;
    this.http.post(apiUrl, { values }).subscribe(
      (res) => {
        this.success.emit();
        this.onClose();
      },
      (err) => {
        alert('Lỗi khi thêm bản ghi!');
      }
    );
  }

  onClose() {
    this.close.emit();
  }
} 