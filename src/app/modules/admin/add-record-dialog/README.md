# Add Record Dialog Component

## Tổng quan
Component này cho phép người dùng có quyền thêm bản ghi mới vào bảng dữ liệu. Component được thiết kế với giao diện đẹp, validation đầy đủ và xử lý lỗi tốt.

## Tính năng chính

### 1. Kiểm tra quyền
- Chỉ người dùng có quyền mới có thể mở dialog
- Kiểm tra quyền theo email và bảng được chọn
- Admin có quyền với tất cả bảng

### 2. Form thông minh
- Tự động tạo STT mới dựa trên dữ liệu hiện có
- Validation đầy đủ cho các trường bắt buộc
- Hỗ trợ nhiều loại input (text, datetime-local, number)
- Placeholder và tooltip hữu ích

### 3. Xử lý dữ liệu
- Tự động format thời gian theo định dạng API
- Xử lý các cột đặc biệt (STT, thời gian, số lượng xe)
- Gửi dữ liệu lên API endpoint `/add`

### 4. Giao diện người dùng
- Design hiện đại với gradient và animation
- Responsive design cho mobile và desktop
- Loading states và thông báo lỗi rõ ràng
- Dialog xác nhận trước khi thêm

## Cách sử dụng

### 1. Mở dialog
```typescript
openAddRecordDialog(): void {
    if (!this.canEdit) {
        this.showPermissionDeniedMessage();
        return;
    }

    const dialogRef = this.dialog.open(AddRecordDialogComponent, {
        width: '900px',
        maxWidth: '95vw',
        data: {
            displayedColumns: this.displayedColumns,
            editableColumns: this.editableColumns,
            selectedTable: this.selectedTable,
            currentData: this.dataSource.data
        },
        disableClose: true
    });
}
```

### 2. Xử lý kết quả
```typescript
dialogRef.afterClosed().subscribe(async (result) => {
    if (result && result.success) {
        await this.showSuccessMessage('Thành công', 'Đã thêm bản ghi mới!');
        await this.loadData(); // Tự động cập nhật dữ liệu
        await this.showDataUpdateNotification();
    }
});
```

## Cấu trúc dữ liệu

### Input data
```typescript
interface DialogData {
    displayedColumns: string[];    // Tất cả các cột hiển thị
    editableColumns: string[];     // Các cột có thể chỉnh sửa
    selectedTable: string;         // Tên bảng được chọn
    currentData: any[];           // Dữ liệu hiện tại để tạo STT
}
```

### Output data
```typescript
interface DialogResult {
    success: boolean;              // Thành công hay thất bại
    data?: any;                   // Dữ liệu phản hồi từ API
}
```

## Validation rules

### Trường bắt buộc
- **Mác tàu**: Bắt buộc, tối thiểu 2 ký tự
- **Ngày giờ tàu đến ga**: Bắt buộc
- **Giờ bắt đầu dỡn cắt xe**: Bắt buộc
- **Giờ kết thúc dỡn cắt xe**: Bắt buộc
- **Giờ bắt đầu nối xe**: Bắt buộc
- **Giờ kết thúc nối xe**: Bắt buộc
- **Số lượng xe cắt**: Bắt buộc
- **Số lượng xe nối**: Bắt buộc
- **Ngày giờ tàu chạy**: Bắt buộc

### Trường tự động
- **STT**: Được tự động tạo dựa trên STT lớn nhất hiện có

## API Endpoint

### Thêm bản ghi
```
POST /api/{tableName}/add
```

### Request body
```json
{
    "values": ["STT", "Mác tàu", "Ngày giờ tàu đến ga", ...]
}
```

### Response
```json
{
    "success": true,
    "message": "Đã thêm bản ghi thành công",
    "data": { ... }
}
```

## Quyền người dùng

### Admin
- Email: `kiniemboquenjerry@gmail.com`
- Quyền: Tất cả bảng

### Người dùng thường
- **trangbom@gmail.com** → Bảng `trangbom`
- **songthan@gmail.com** → Bảng `songthan`
- **dieutri@gmail.com** → Bảng `dieutri`
- **danang@gmail.com** → Bảng `danang`
- **kimlien@gmail.com** → Bảng `kimlien`
- **donganh@gmail.com** → Bảng `donganh`
- **giapbat@gmail.com** → Bảng `giapbat`
- **vinh@gmail.com** → Bảng `vinh`
- **nhatrang@gmail.com** → Bảng `nhatrang`
- **quangngai@gmail.com** → Bảng `quangngai`
- **binhthuan@gmail.com** → Bảng `binhthuan`

## Xử lý lỗi

### 1. Lỗi validation
- Hiển thị danh sách các trường bị lỗi
- Giải thích rõ ràng yêu cầu cho từng trường

### 2. Lỗi API
- Hiển thị thông báo lỗi từ server
- Gợi ý cách khắc phục

### 3. Lỗi quyền
- Thông báo không có quyền với bảng hiện tại
- Hiển thị email và bảng được phép

## Tính năng nâng cao

### 1. Tự động cập nhật
- Sau khi thêm thành công, tự động reload dữ liệu
- Hiển thị thông báo cập nhật hoàn tất

### 2. Xác nhận trước khi thêm
- Hiển thị preview dữ liệu sẽ được thêm
- Cho phép người dùng xác nhận hoặc hủy

### 3. Loading states
- Hiển thị spinner khi đang xử lý
- Disable form khi đang gửi dữ liệu

## Styling

### CSS Classes chính
- `.add-record-dialog`: Container chính
- `.dialog-header`: Header với gradient
- `.form-field`: Container cho mỗi trường
- `.input-container`: Container cho input
- `.animate-spin`: Animation loading

### Responsive
- Mobile: 1 cột, padding nhỏ hơn
- Desktop: 2 cột, padding đầy đủ
- Tablet: Tự động điều chỉnh

## Troubleshooting

### 1. Dialog không mở
- Kiểm tra quyền người dùng
- Kiểm tra console errors
- Đảm bảo đã import đúng component

### 2. Validation không hoạt động
- Kiểm tra form controls
- Đảm bảo đã khai báo Validators
- Kiểm tra template binding

### 3. API call thất bại
- Kiểm tra network tab
- Kiểm tra endpoint URL
- Kiểm tra request payload

## Tương lai

### Tính năng có thể thêm
- Auto-save draft
- Import từ Excel
- Duplicate record
- Bulk add records
- Advanced validation rules
- Custom field types
