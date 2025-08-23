import { Component, EventEmitter, Input, Output, OnInit, Inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { environment } from '../../../../environments/environment';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-add-record-dialog',
  templateUrl: './add-record-dialog.component.html',
  styleUrls: ['./add-record-dialog.component.scss']
})
export class AddRecordDialogComponent implements OnInit {
  @Input() columns: string[] = [];
  @Input() selectedTable: string = '';
  @Input() visible: boolean = false;
  @Output() close = new EventEmitter<void>();
  @Output() success = new EventEmitter<void>();

  form: FormGroup = this.fb.group({});
  displayedColumns: string[] = [];
  editableColumns: string[] = [];
  selectedTableName: string = '';
  isLoading: boolean = false;
  formSubmitted: boolean = false;

  constructor(
    private fb: FormBuilder, 
    private http: HttpClient,
    private dialogRef: MatDialogRef<AddRecordDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    // Nhận dữ liệu từ parent component
    if (data) {
      this.displayedColumns = data.displayedColumns || [];
      this.editableColumns = data.editableColumns || [];
      this.selectedTableName = data.selectedTable || '';
    }
  }

  ngOnInit() {
    this.initializeForm();
    this.setupFormValidation();
  }

  private initializeForm(): void {
    const group: any = {};
    
    // Tạo form cho tất cả các cột có thể chỉnh sửa - KHÔNG có validation bắt buộc
    this.editableColumns.forEach(col => {
      if (col === 'STT') {
        // STT sẽ được tự động tạo
        group[col] = [''];
      } else {
        // Tất cả các cột khác đều không bắt buộc
        group[col] = [''];
      }
    });
    
    this.form = this.fb.group(group);
  }

  private setupFormValidation(): void {
    // Bỏ validation real-time để đơn giản hóa
    // this.form.valueChanges.subscribe(() => {
    //   if (this.formSubmitted) {
    //     this.validateForm();
    //   }
    // });
  }

  private validateForm(): void {
    // Bỏ validation để đơn giản hóa
    // Object.keys(this.form.controls).forEach(key => {
    //   const control = this.form.get(key);
    //   if (control) {
    //     control.markAsTouched();
    //   }
    // });
  }

  private futureDateValidator() {
    // Bỏ validation date để đơn giản hóa
    return (control: any) => {
      return null; // Không có validation
    };
  }

  private isDateTimeColumn(column: string): boolean {
    return [
      'Ngày giờ tàu đến ga', 'Giờ bắt đầu dỡn cắt xe', 'Giờ kết thúc dỡn cắt xe',
      'Giờ bắt đầu nối xe', 'Giờ kết thúc nối xe', 'Ngày giờ tàu chạy'
    ].includes(column);
  }

  async onSubmit() {
    this.formSubmitted = true;
    
    // Bỏ kiểm tra form.invalid để cho phép submit với form trống
    // if (this.form.invalid) {
    //   await this.showValidationError();
    //   return;
    // }

    // Bỏ kiểm tra dữ liệu bắt buộc
    // const requiredFields = this.getRequiredFields();
    // const missingFields = this.checkMissingFields(requiredFields);
    
    // if (missingFields.length > 0) {
    //   await this.showMissingFieldsError(missingFields);
    //   return;
    // }

    try {
      this.isLoading = true;
      
      // Chuẩn bị dữ liệu để gửi lên API
      const formValues = this.form.value;
      const values: any[] = [];
      
      // Tạo mảng values theo thứ tự của displayedColumns
      this.displayedColumns.forEach(col => {
        if (this.editableColumns.includes(col)) {
          // Lấy giá trị từ form
          let value = formValues[col] || '';
          
          // Xử lý đặc biệt cho cột STT
          if (col === 'STT') {
            value = this.generateNextSTT();
          }
          
          // Xử lý đặc biệt cho các cột thời gian
          if (this.isDateTimeColumn(col) && value) {
            value = this.formatDateTimeForApi(value);
          }
          
          values.push(value);
        } else {
          // Các cột không thể chỉnh sửa
          values.push('');
        }
      });

      // Hiển thị xác nhận trước khi gửi
      const confirmed = await this.showConfirmationDialog(values);
      if (!confirmed) {
        return;
      }

      // Gửi dữ liệu lên API
      const apiUrl = `${environment.apiUrl}/${this.selectedTableName}/add`;
      const response = await this.http.post(apiUrl, { values }).toPromise();
      
      await this.showSuccessMessage();
      this.dialogRef.close({ success: true, data: response });
      
    } catch (error) {
      console.error('Error adding record:', error);
      await this.showErrorMessage('Lỗi khi thêm bản ghi', 'Vui lòng thử lại sau');
    } finally {
      this.isLoading = false;
    }
  }

  private getRequiredFields(): string[] {
    // Bỏ tất cả validation bắt buộc
    return [];
  }

  private checkMissingFields(requiredFields: string[]): string[] {
    // Bỏ kiểm tra missing fields
    return [];
  }

  private async showMissingFieldsError(missingFields: string[]): Promise<void> {
    await Swal.fire({
      title: '<span class="text-red-600">⚠️ Thiếu thông tin bắt buộc</span>',
      html: `
        <div class="text-left">
          <p class="text-gray-700 mb-4 font-medium">Vui lòng điền đầy đủ các trường sau:</p>
          <div class="bg-red-50 border border-red-200 rounded-lg p-4">
            <ul class="space-y-2">
              ${missingFields.map(field => `
                <li class="flex items-center gap-2 text-red-700">
                  <i class="fas fa-exclamation-circle text-red-500"></i>
                  <span class="font-medium">${field}</span>
                </li>
              `).join('')}
            </ul>
          </div>
        </div>
      `,
      icon: 'warning',
      confirmButtonText: '<i class="fas fa-check mr-2"></i>Đã hiểu',
      confirmButtonColor: '#ea580c',
      customClass: {
        popup: 'rounded-2xl',
        confirmButton: 'rounded-xl px-6 py-3 font-semibold'
      }
    });
  }

  private async showConfirmationDialog(values: any[]): Promise<boolean> {
    const result = await Swal.fire({
      title: '<span class="text-orange-600">📝 Xác nhận thêm bản ghi</span>',
      html: `
        <div class="text-left">
          <p class="text-gray-700 mb-4 font-medium">Bạn có chắc chắn muốn thêm bản ghi mới với thông tin:</p>
          <div class="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-xl p-4 space-y-3">
            ${this.editableColumns.map((col, index) => {
              const value = values[index] || 'N/A';
              return `
                <div class="flex items-center justify-between p-2 bg-white rounded-lg border border-orange-100">
                  <span class="font-semibold text-gray-700">${col}:</span>
                  <span class="text-orange-600 font-medium">${value}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: '<i class="fas fa-plus mr-2"></i>Thêm bản ghi',
      cancelButtonText: '<i class="fas fa-times mr-2"></i>Hủy',
      confirmButtonColor: '#ea580c',
      cancelButtonColor: '#6b7280',
      customClass: {
        popup: 'rounded-2xl',
        confirmButton: 'rounded-xl px-6 py-3 font-semibold',
        cancelButton: 'rounded-xl px-6 py-3 font-semibold'
      },
      width: 600
    });
    
    return result.isConfirmed;
  }

  private generateNextSTT(): string {
    // Tạo STT mới dựa trên STT hiện tại
    // Logic này có thể được cải thiện tùy theo yêu cầu cụ thể
    
    // Nếu có dữ liệu từ parent component, có thể sử dụng để tạo STT
    if (this.data && this.data.currentData) {
      const currentData = this.data.currentData;
      if (currentData.length > 0) {
        // Tìm STT lớn nhất hiện tại
        let maxSTT = 0;
        currentData.forEach((row: any) => {
          const stt = parseInt(row['STT']) || 0;
          if (stt > maxSTT) {
            maxSTT = stt;
          }
        });
        return (maxSTT + 1).toString();
      }
    }
    
    // Fallback: tạo STT dựa trên timestamp
    return new Date().getTime().toString().slice(-6);
  }

  private formatDateTimeForApi(value: string): string {
    if (!value) return '';
    
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}/${month}/${day} ${hours}:${minutes}:00`;
      }
    } catch (error) {
      console.error('Error formatting datetime:', error);
    }
    
    return value;
  }

  private async showValidationError(): Promise<void> {
    const errors = this.getFormErrors();
    await Swal.fire({
      title: '<span class="text-red-600">❌ Lỗi xác thực</span>',
      html: `
        <div class="text-left">
          <p class="text-gray-700 mb-4 font-medium">Vui lòng kiểm tra các trường sau:</p>
          <div class="bg-red-50 border border-red-200 rounded-lg p-4">
            <ul class="space-y-2">
              ${errors.map(error => `
                <li class="flex items-center gap-2 text-red-700">
                  <i class="fas fa-exclamation-triangle text-red-500"></i>
                  <span>${error}</span>
                </li>
              `).join('')}
            </ul>
          </div>
        </div>
      `,
      icon: 'error',
      confirmButtonText: '<i class="fas fa-check mr-2"></i>Đóng',
      confirmButtonColor: '#dc2626',
      customClass: {
        popup: 'rounded-2xl',
        confirmButton: 'rounded-xl px-6 py-3 font-semibold'
      }
    });
  }

  private getFormErrors(): string[] {
    const errors: string[] = [];
    
    Object.keys(this.form.controls).forEach(key => {
      const control = this.form.get(key);
      if (control?.errors) {
        if (control.errors['required']) {
          errors.push(`${key} là bắt buộc`);
        } else if (control.errors['minlength']) {
          errors.push(`${key} phải có ít nhất ${control.errors['minlength'].requiredLength} ký tự`);
        } else if (control.errors['pattern']) {
          if (key === 'Mác tàu') {
            errors.push(`${key} chỉ được chứa chữ hoa và số`);
          } else if (key.includes('Số lượng xe')) {
            errors.push(`${key} phải có định dạng: "X xe (T01, T02, ...)"`);
          }
        } else if (control.errors['pastDate']) {
          errors.push(`${key} không được là thời gian trong quá khứ`);
        }
      }
    });
    
    return errors;
  }

  private async showSuccessMessage(): Promise<void> {
    await Swal.fire({
      title: '<span class="text-green-600">🎉 Thành công!</span>',
      text: 'Đã thêm bản ghi mới vào bảng',
      icon: 'success',
      timer: 3000,
      timerProgressBar: true,
      showConfirmButton: false,
      customClass: {
        popup: 'rounded-2xl',
        timerProgressBar: 'bg-green-500'
      }
    });
  }

  private async showErrorMessage(title: string, message: string): Promise<void> {
    await Swal.fire({
      title: `<span class="text-red-600">❌ ${title}</span>`,
      text: message,
      icon: 'error',
      confirmButtonText: '<i class="fas fa-check mr-2"></i>Đóng',
      confirmButtonColor: '#dc2626',
      customClass: {
        popup: 'rounded-2xl',
        confirmButton: 'rounded-xl px-6 py-3 font-semibold'
      }
    });
  }

  onClose() {
    this.dialogRef.close();
  }

  // Helper method để lấy placeholder cho input
  getPlaceholder(column: string): string {
    const placeholders: Record<string, string> = {
      'Mác tàu': 'Nhập mác tàu (VD: SE1, SE2)',
      'Ngày giờ tàu đến ga': 'Chọn ngày giờ tàu đến ga',
      'Giờ bắt đầu dỡn cắt xe': 'Chọn giờ bắt đầu dỡn cắt xe',
      'Giờ kết thúc dỡn cắt xe': 'Chọn giờ kết thúc dỡn cắt xe',
      'Giờ bắt đầu nối xe': 'Chọn giờ bắt đầu nối xe',
      'Giờ kết thúc nối xe': 'Chọn giờ kết thúc nối xe',
      'Số lượng xe cắt(ghi rõ số toa xe)': 'VD: 5 xe (T01, T02, T03, T04, T05)',
      'Số lượng xe nối(ghi rõ số toa xe)': 'VD: 3 xe (T06, T07, T08)',
      'Ngày giờ tàu chạy': 'Chọn ngày giờ tàu chạy',
      'Số xe có vận đơn không phải của RAT': 'Nhập thông tin xe không phải RAT'
    };
    return placeholders[column] || `Nhập ${column.toLowerCase()}`;
  }

  // Helper method để xác định loại input
  getInputType(column: string): string {
    if (this.isDateTimeColumn(column)) {
      return 'datetime-local';
    } else if (column.includes('Số lượng xe')) {
      return 'text';
    } else if (column === 'Mác tàu') {
      return 'text';
    } else {
      return 'text';
    }
  }

  // Method để kiểm tra xem field có lỗi không - Bỏ validation
  hasFieldError(fieldName: string): boolean {
    return false; // Không có lỗi nào
  }

  // Method để lấy error message cho field - Bỏ error messages
  getFieldErrorMessage(fieldName: string): string {
    return ''; // Không có error message
  }

  // Method để lấy hint cho field
  getFieldHint(fieldName: string): string {
    const hints: Record<string, string> = {
      'Mác tàu': 'Chỉ nhập chữ hoa và số (VD: SE1, SE2, TN1)',
      'Ngày giờ tàu đến ga': 'Chọn thời gian trong tương lai',
      'Giờ bắt đầu dỡn cắt xe': 'Chọn thời gian trong tương lai',
      'Giờ kết thúc dỡn cắt xe': 'Phải sau giờ bắt đầu dỡn cắt xe',
      'Giờ bắt đầu nối xe': 'Chọn thời gian trong tương lai',
      'Giờ kết thúc nối xe': 'Phải sau giờ bắt đầu nối xe',
      'Số lượng xe cắt(ghi rõ số toa xe)': 'Định dạng: "5 xe (T01, T02, T03, T04, T05)"',
      'Số lượng xe nối(ghi rõ số toa xe)': 'Định dạng: "3 xe (T06, T07, T08)"',
      'Ngày giờ tàu chạy': 'Phải sau giờ kết thúc nối xe',
      'Số xe có vận đơn không phải của RAT': 'Ghi rõ số toa xe nếu có'
    };
    
    return hints[fieldName] || '';
  }
} 