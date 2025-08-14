import { HttpClient } from '@angular/common/http';
import { Component, ViewChild, ViewEncapsulation, AfterViewInit } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { DataService } from 'app/shared/data.service';
import Swal from 'sweetalert2';
import { environment } from '../../../../environments/environment';
import { AddRecordDialogComponent } from '../add-record-dialog/add-record-dialog.component';
import * as XLSX from 'xlsx';
import { MatDialog } from '@angular/material/dialog';
import { RecordDetailDialogComponent } from './record-detail-dialog/record-detail-dialog.component';

@Component({
    selector     : 'example',
    templateUrl  : './example.component.html',
    styleUrls    : ['./example.component.scss'],  // Thêm file SCSS ở đây
    encapsulation: ViewEncapsulation.None
})
export class ExampleComponent implements AfterViewInit
{
    userEmail: string = ''; // Đảm bảo luôn có giá trị mặc định
    displayedColumns: string[] = [];
    dataSource = new MatTableDataSource<any>([]);
    searchValue: string = '';
    readonly pageSizeOptions: number[] = [10, 25, 50, 100];
    selectedTable: string = 'trangbom'; // Default table
    canEdit: boolean = false;
    availableTables = [
        { value: 'trangbom', label: 'Trảng Bom' },
        { value: 'donganh', label: 'Đông Anh' },
        { value: 'songthan', label: 'Sóng Thần' },
        { value: 'dieutri', label: 'Diêu Trì' },
        { value: 'danang', label: 'Đà Nẵng' },
        { value: 'kimlien', label: 'Kim Liên' },
        { value: 'giapbat', label: 'Giáp Bát' },
        { value: 'vinh', label: 'Vinh' },
        { value: 'quangngai', label: 'Quảng Ngãi' },
        { value: 'nhatrang', label: 'Nha Trang' },
        { value: 'binhthuan', label: 'Bình Thuận' },
    ];
    columnNames = [
        "STT", 
        "Mác tàu", 
        "Ngày giờ tàu đến ga", 
        "Giờ bắt đầu dồn cắt xe", 
        "Giờ kết thúc dồn cắt xe", 
        "Giờ bắt đầu nối xe", 
        "Giờ kết thúc nối xe", 
        "Số lượng xe cắt(ghi rõ số toa xe)", 
        "Số lượng xe nối(ghi rõ số toa xe)", 
        "Ngày giờ tàu chạy",
        "Số xe có vận đơn không phải của RAT",
        "Giờ dồn cắt xe", 
        "Giờ dồn nối xe",
        "Dừng tại Ga",
        "Thời gian theo biểu đồ", 
        "Chênh lệch theo biểu đồ",
        "Tổng số giờ tàu dừng",
        "Dừng đợi(nếu có)"
    ]; // Định nghĩa tên cột dựa trên dữ liệu API
    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;
    showAddDialog = false;
    readonly editableColumns: string[] = [
        "Mác tàu",
        "Ngày giờ tàu đến ga",
        "Giờ bắt đầu dồn cắt xe",
        "Giờ kết thúc dồn cắt xe",
        "Giờ bắt đầu nối xe",
        "Giờ kết thúc nối xe",
        "Số lượng xe cắt(ghi rõ số toa xe)",
        "Số lượng xe nối(ghi rõ số toa xe)",
        "Ngày giờ tàu chạy",
        "Số xe có vận đơn không phải của RAT",
    ];
    addDialogColumns: string[] = [
        "STT", 
        "Mác tàu", 
        "Ngày giờ tàu đến ga", 
        "Giờ bắt đầu dồn cắt xe", 
        "Giờ kết thúc dồn cắt xe", 
        "Giờ bắt đầu nối xe", 
        "Giờ kết thúc nối xe", 
        "Số lượng xe cắt(ghi rõ số toa xe)", 
        "Số lượng xe nối(ghi rõ số toa xe)", 
        "Ngày giờ tàu chạy",
        "Số xe có vận đơn không phải của RAT",
        "Giờ dồn cắt xe", 
        "Giờ dồn nối xe",
        "Dừng tại Ga",
        "Thời gian theo biểu đồ", 
        "Chênh lệch theo biểu đồ",
        "Tổng số giờ tàu dừng",
        "Dừng đợi(nếu có)"
    ];
    /**
     * Constructor
     */
    constructor(
        private dataService: DataService,
        private http: HttpClient,
        private dialog: MatDialog
    )
    {
        // Get email from localStorage
        this.userEmail = localStorage.getItem('userEmail') || '';
        console.log("Constructor: userEmail =", this.userEmail); // Log trong constructor
    }
    ngOnInit(): void {
        console.log("ngOnInit: userEmail before checkPermission =", this.userEmail); // Log trước khi gọi checkPermission
        this.loadData();
        this.checkPermission();
        console.log("ngOnInit: canEdit after checkPermission =", this.canEdit); // Log sau khi gọi checkPermission
    }
    
    ngAfterViewInit(): void {
        // Gắn paginator và sort sau khi view khởi tạo để đảm bảo ViewChild sẵn sàng
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
    }
    
    loadData(): void {
        this.http.get<{ data: any[][] }>(`${environment.apiUrl}/${this.selectedTable}`).subscribe(response => {
            console.log("Dữ liệu gốc từ API:", response.data); // Log dữ liệu gốc

            if (response.data.length > 0) {
                this.displayedColumns = this.addDialogColumns.slice(0, 18);
                console.log("displayedColumns after assignment:", this.displayedColumns); // Thêm log này
                
                // Chuyển đổi dữ liệu để Angular Table đọc được
                this.dataSource.data = response.data.slice(0).map(row => {
                    let rowData: any = {};
                    this.displayedColumns.forEach((col, index) => {
                        // Debugging logs for specific columns
                        if (col === 'Mác tàu' || col === 'Số lượng xe cắt(ghi rõ số toa xe)' || col === 'Số lượng xe nối(ghi rõ số toa xe)') {
                            console.log(`Column: ${col}, Original Value: ${row[index]}, Index: ${index}`);
                        }

                        // Áp dụng parseDateForInput cho các cột ngày giờ cụ thể
                        if (col === 'Ngày giờ tàu đến ga' || col === 'Giờ bắt đầu dồn cắt xe' || col === 'Giờ kết thúc dồn cắt xe' || col === 'Giờ bắt đầu nối xe' || col === 'Giờ kết thúc nối xe' || col === 'Ngày giờ tàu chạy') {
                            const dateStr = row[index];
                            if (dateStr && dateStr.trim() !== '') {
                                const formattedDate = this.parseDateForInput(dateStr);
                                rowData[col] = formattedDate;
                            } else {
                                rowData[col] = '';
                            }
                        } 
                        else if (col === 'STT' || col === 'Số lượng xe cắt' || col === 'Số lượng xe nối') {
                            // Chuyển đổi sang kiểu số cho các cột số lượng
                            rowData[col] = Number(row[index]);
                        } 
                        else if (col === 'Số xe có vận đơn của Rat chạy trong tàu Cty khác') {
                            // Chuyển đổi sang kiểu số cho cột số xe Rat
                            rowData[col] = Number(row[index]) || 0;
                        } 
                        else {
                            // Gán giá trị gốc cho các cột khác (ví dụ: Mác tàu, Đến, Đi, Ghi chú, etc.)
                            rowData[col] = String(row[index] || '');
                        }
                        if (col === 'Mác tàu' || col === 'Số lượng xe cắt' || col === 'Số lượng xe nối') {
                            console.log(`Column: ${col}, Processed Value: ${rowData[col]}`);
                        }
                    });
                    return rowData;
                });

                // Log the final data assigned to the table
                console.log("Final dataSource.data:", this.dataSource.data);
                
                // Tùy biến filter để tìm trong các cột đang hiển thị
                this.dataSource.filterPredicate = (data: any, filter: string) => {
                    const normalizedFilter = (filter || '').trim().toLowerCase();
                    if (!normalizedFilter) return true;
                    return this.displayedColumns.some((col) => {
                        const cellValue = String(data[col] ?? '').toLowerCase();
                        return cellValue.includes(normalizedFilter);
                    });
                };

                // Gắn paginator và sort mỗi khi dữ liệu thay đổi
                if (this.paginator) {
                    this.dataSource.paginator = this.paginator;
                    this.paginator.firstPage();
                }
                if (this.sort) {
                    this.dataSource.sort = this.sort;
                }
            }
        });
    }


    
    applyFilter(event?: Event) {
        let filterValue = this.searchValue || '';
        const target = event?.target as HTMLInputElement | undefined;
        if (target && typeof target.value === 'string') {
            filterValue = target.value;
        }
        this.searchValue = filterValue;
        this.dataSource.filter = (filterValue || '').trim().toLowerCase();
        if (this.paginator) {
            this.paginator.firstPage();
        }
    }

    updateGoogleSheet(element: any, rowIndex: number, suppressReload: boolean = false) {
        // Các cột cần gửi lên (Mác tàu, Ngày giờ tàu đến ga, Giờ bắt đầu dồn cắt nối xe, Giờ kết thúc cắt nối xe, Số lượng xe cắt, Số lượng xe nối)
        // Dựa trên thứ tự cột mới
        const valuesToSend = this.editableColumns.map(col => {
            // Đối với các cột ngày giờ, sử dụng giá trị đã định dạng nếu có
            if (col === 'Ngày giờ tàu đến ga' 
                || col === 'Giờ bắt đầu dồn cắt xe' || col === 'Giờ kết thúc dồn cắt xe' 
                || col === 'Giờ bắt đầu nối xe' || col === 'Giờ kết thúc nối xe' || col === 'Ngày giờ tàu chạy' ) {
                // Đảm bảo gửi định dạng YYYY/MM/DD HH:mm:ss
                const date = new Date(element[col]);
                if (!isNaN(date.getTime())) {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    const hours = String(date.getHours()).padStart(2, '0');
                    const minutes = String(date.getMinutes()).padStart(2, '0');
                    const seconds = '00';
                    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
                } else {
                    return ''; // Trả về chuỗi rỗng nếu không hợp lệ
                }
            } else {
                return element[col];
            }
        });

        const payload = {
            rowIndex: rowIndex + 5, // Điều chỉnh rowIndex để khớp với Google Sheet (ví dụ: +6 vì dữ liệu bắt đầu từ hàng 7)
            values: valuesToSend
        };
    
        console.log("Payload gửi lên:", payload); // Debug dữ liệu trước khi gửi
    
        this.http.post(`${environment.apiUrl}/${this.selectedTable}/write`, payload).subscribe(response => {
            console.log("Dữ liệu cập nhật lên Google Sheets:", response);
            if (!suppressReload) {
                this.loadData();
            }
            // Không cần loadData ở đây, vì việc này có thể gây gián đoạn nhập liệu.
            // Dữ liệu sẽ được cập nhật khi người dùng hoàn thành chỉnh sửa hoặc làm mới trang.
        }, error => {
            console.error("Lỗi khi cập nhật dữ liệu:", error);
            Swal.fire({
                title: 'Lỗi',
                text: 'Lỗi khi cập nhật dữ liệu: ' + error.message,
                icon: 'error'
            });
        });
    }
    
    updateCellValue(element: any, column: string, value: any, index: number) {
        if (!this.canEdit) {
            Swal.fire({
                title: 'Không có quyền chỉnh sửa',
                text: 'Bạn chỉ có quyền chỉnh sửa bảng Trảng Bom',
                icon: 'warning'
            });
            return;
        }

        console.log(`Cập nhật cột '${column}' với giá trị: '${value}' tại hàng: ${index}`);
        
        if (column === 'Ngày giờ tàu đến ga' || column === 'Giờ bắt đầu dồn cắt xe' || column === 'Giờ kết thúc dồn cắt xe' || column === 'Giờ bắt đầu nối xe' || column === 'Giờ kết thúc nối xe' || column === 'Ngày giờ tàu chạy') {
            if (!value) {
                element[column] = '';
            } else {
                try {
                    const date = new Date(value); // Input value from datetime-local is YYYY-MM-DDThh:mm
                    if (!isNaN(date.getTime())) {
                        // Gán trực tiếp giá trị định dạng ISO cho input datetime-local
                        element[column] = value; 
                    } else {
                        console.error('Invalid date from input:', value);
                        element[column] = '';
                    }
                } catch (error) {
                    console.error('Error processing date for column:', column, value, error);
                    element[column] = '';
                }
            }
        } 
        // else if (column === 'Số lượng xe cắt' || column === 'Số lượng xe nối' || column === 'Số xe có vận đơn của Rat chạy trong tàu Cty khác') {
        //     // Xử lý các cột số
        //     element[column] = value ? Number(value) : 0;
        // } 
        else {
            // Xử lý các cột text (bao gồm cả textarea)
            element[column] = value || '';
        }
        
        this.updateGoogleSheet(element, index); // Gọi hàm update sau khi thay đổi giá trị
        // this.loadData()
    }

    showDialog(){
        Swal.fire({
            title: "Let me do it for you?",
            text: "Let me do it for you!",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#3085d6",
            cancelButtonColor: "#d33",
            confirmButtonText: "Let me do it for you!"
        }).then((result) => {
            if (result.isConfirmed) {
                let audio = new Audio('./assets/let-me-do-it-for-you.mp3');
                
                // Cho phép lặp lại nhạc
                audio.loop = true;
                
                // Phát nhạc
                audio.play();
                
                Swal.fire({
                    title: "Let me do it for you",
                    width: 600,
                    padding: "3em",
                    color: "#716add",
                    background: "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExdGlnMzh3ZzVqaHd0YmwxZ3VtM2l6dXMxM2tpcDV6enBtMmpsdm93NiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/XFIuke9XqFjk4Y1CaG/giphy.gif",
                    backdrop: `
                        rgba(0,0,123,0.4)
                        url("https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExdGlnMzh3ZzVqaHd0YmwxZ3VtM2l6dXMxM2tpcDV6enBtMmpsdm93NiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/XFIuke9XqFjk4Y1CaG/giphy.gif")
                        left top
                        no-repeat
                    `
                });
            }
        });
    }

    openDetailDialog(row: any, rowIndex: number): void {
        const dialogRef = this.dialog.open(RecordDetailDialogComponent, {
            width: '900px',
            maxWidth: '95vw',
            data: {
                row: { ...row },
                displayedColumns: this.displayedColumns,
                editableColumns: this.editableColumns,
                canEdit: this.canEdit,
                selectedTable: this.selectedTable,
                rowIndex
            }
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (!result) return;

            if (result.action === 'save' && result.row) {
                // Cập nhật một lần dựa trên dữ liệu đã chỉnh sửa
                this.updateGoogleSheet(result.row, rowIndex);
            } else if (result.action === 'delete') {
                // Gọi xoá nếu backend có endpoint xoá. Nếu chưa, hiện cảnh báo.
                const apiUrl = `${environment.apiUrl}/${this.selectedTable}/delete`;
                this.http.post(apiUrl, { rowIndex: rowIndex + 5 }).subscribe(
                    () => {
                        Swal.fire('Thành công', 'Đã xoá bản ghi!', 'success');
                        this.loadData();
                    },
                    (err) => {
                        console.error('Xoá thất bại:', err);
                        Swal.fire('Lỗi', 'Không thể xoá bản ghi. Kiểm tra lại API /delete.', 'error');
                    }
                );
            }
        });
    }

    // Xuất Excel theo các cột đang hiển thị
    exportToExcel(): void {
        try {
            const rowsForExport = this.dataSource.data.map((row: any) => {
                const exportRow: any = {};
                this.displayedColumns.forEach((col) => {
                    exportRow[col] = row[col] ?? '';
                });
                return exportRow;
            });

            const worksheet = XLSX.utils.json_to_sheet(rowsForExport, { skipHeader: false });
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
            const fileName = `bang_${this.selectedTable}_${new Date().toISOString().slice(0,10)}.xlsx`;
            XLSX.writeFile(workbook, fileName);
        } catch (error: any) {
            console.error('Lỗi khi xuất Excel:', error);
            Swal.fire('Lỗi', 'Không thể xuất Excel', 'error');
        }
    }

    // Import Excel và tự động cập nhật các hàng theo STT vào bảng đang mở
    onImportExcel(event: Event): void {
        if (!this.canEdit) {
            Swal.fire('Không có quyền', 'Bạn không có quyền cập nhật bảng này', 'warning');
            (event.target as HTMLInputElement).value = '';
            return;
        }

        const input = event.target as HTMLInputElement;
        const file = input.files && input.files[0];
        if (!file) {
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            try {
                const data = reader.result as ArrayBuffer | string;
                // Đọc workbook
                const workbook = XLSX.read(data, { type: typeof data === 'string' ? 'binary' : 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                // Chuyển thành mảng object, key là tiêu đề cột (header)
                const importedRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

                if (!importedRows.length) {
                    Swal.fire('Thông báo', 'File Excel trống', 'info');
                    input.value = '';
                    return;
                }

                let updatedCount = 0;
                let skippedCount = 0;

                // Cập nhật theo STT
                importedRows.forEach((importedRow) => {
                    const importedStt = String(importedRow['STT'] ?? '').trim();
                    if (!importedStt) {
                        skippedCount++;
                        return;
                    }

                    const indexInTable = this.dataSource.data.findIndex((r: any) => String(r['STT'] ?? '').trim() === importedStt);
                    if (indexInTable === -1) {
                        // Không tìm thấy hàng có STT tương ứng -> bỏ qua (tránh append sai vị trí)
                        skippedCount++;
                        return;
                    }

                    // Gộp dữ liệu: ưu tiên giá trị từ file import (nếu khác rỗng)
                    const mergedElement: any = { ...this.dataSource.data[indexInTable] };
                    this.displayedColumns.forEach((col) => {
                        if (Object.prototype.hasOwnProperty.call(importedRow, col)) {
                            const newVal = importedRow[col];
                            if (newVal !== undefined && newVal !== null && String(newVal).trim() !== '') {
                                mergedElement[col] = newVal;
                            }
                        }
                    });

                    // Gửi cập nhật từng hàng lên server (không reload mỗi lần)
                    this.updateGoogleSheet(mergedElement, indexInTable, true);
                    updatedCount++;
                });

                // Làm sạch input file để cho phép chọn lại cùng 1 file nếu cần
                input.value = '';

                // Tải lại dữ liệu một lần để phản ánh tất cả thay đổi
                this.loadData();

                Swal.fire('Hoàn tất', `Đã cập nhật ${updatedCount} hàng. Bỏ qua ${skippedCount} hàng.`, 'success');
            } catch (err: any) {
                console.error('Lỗi khi import Excel:', err);
                Swal.fire('Lỗi', 'Không thể đọc file Excel', 'error');
                input.value = '';
            }
        };

        // Đọc file dưới dạng binary string để tương thích rộng
        reader.readAsBinaryString(file);
    }

    // Hàm parse date cho input datetime-local (YYYY-MM-DDThh:mm)
    parseDateForInput(dateStr: string): string {
        console.log('Attempting to parse date string:', dateStr); // Log input string
        if (!dateStr || dateStr.trim() === '') {
            console.log('Input date string is empty or null.');
            return '';
        }

        try {
            let date: Date;

            // Try YYYY-MM-DD HH:mm or YYYY/MM/DD HH:mm (from backend or input)
            // This pattern handles both hyphens and slashes for dates, and optional seconds
            const ymd_hms_regex = /^(\d{4})[\/\-](\d{2})[\/\-](\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/;
            let match = dateStr.match(ymd_hms_regex);

            if (match) {
                const [_, year, month, day, hours, minutes, seconds = '00'] = match;
                // Construct ISO 8601 string for Date object
                date = new Date(`${year}-${month}-${day}T${hours}:${minutes}:${seconds}`);
            } else {
                // Try DD/MM/YYYY HH:mm:ss or DD/MM/YYYY (from Google Sheet)
                const dmy_hms_regex = /^(\d{2})[\/\-](\d{2})[\/\-](\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/;
                match = dateStr.match(dmy_hms_regex);
                if (match) {
                    const [_, day, month, year, hours = '00', minutes = '00', seconds = '00'] = match;
                    // Construct ISO 8601 string for Date object
                    date = new Date(`${year}-${month}-${day}T${hours}:${minutes}:${seconds}`);
                } else {
                    // Fallback to direct Date object creation (may handle other formats)
                    date = new Date(dateStr);
                }
            }
            
            if (!isNaN(date.getTime())) {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;
                console.log('Successfully parsed and formatted as YYYY-MM-DDThh:mm:', formattedDate);
                return formattedDate;
            }

            console.error('Could not parse date string with any method:', dateStr);
            return ''; // Trả về chuỗi rỗng nếu không parse được

        } catch (error) {
            console.error('Error parsing date string:', dateStr, error); // Log errors
            return ''; // Trả về chuỗi rỗng nếu có lỗi
        }
    }

    onTableChange(event: any) {
        this.selectedTable = event.value;
        this.checkPermission(); // Check permissions when table changes
        this.loadData(); // Reload data when table changes
    }

    checkPermission() {
        debugger
        if (this.userEmail === 'kiniemboquenjerry@gmail.com') {
            this.canEdit = true;
        }
        else if (this.userEmail === 'trangbom@gmail.com') {
            this.canEdit = this.selectedTable === 'trangbom';
        }
        else if (this.userEmail === 'songthan@gmail.com') {
            this.canEdit = this.selectedTable === 'songthan';
        }
        else if (this.userEmail === 'dieutri@gmail.com') {
            this.canEdit = this.selectedTable === 'dieutri';
        }
        else if (this.userEmail === 'danang@gmail.com') {
            this.canEdit = this.selectedTable === 'danang';
        }
        else if (this.userEmail === 'kimlien@gmail.com') {
            this.canEdit = this.selectedTable === 'kimlien';
        }
        else if (this.userEmail === 'donganh@gmail.com') {
            this.canEdit = this.selectedTable === 'donganh';
        }
        else if (this.userEmail === 'giapbat@gmail.com') {
            this.canEdit = this.selectedTable === 'giapbat';
        }
        else if (this.userEmail === 'vinh@gmail.com') {
            this.canEdit = this.selectedTable === 'vinh';
        }
        else if (this.userEmail === 'nhatrang@gmail.com') {
            this.canEdit = this.selectedTable === 'nhatrang';
        }
        else if (this.userEmail === 'quangngai@gmail.com') {
            this.canEdit = this.selectedTable === 'quangngai';
        }
        else if (this.userEmail === 'binhthuan@gmail.com') {
            this.canEdit = this.selectedTable === 'binhthuan';
        }
        else {
            this.canEdit = false;
        }
    }

    addNewRecord(){
        if (!this.canEdit) {
            Swal.fire({
                title: 'Không có quyền chỉnh sửa',
                text: 'Bạn chỉ có quyền chỉnh sửa bảng Trảng Bom',
                icon: 'warning'
            });
            return;
        }
        if(this.canEdit){
            
        }
    }

    openAddDialog() {
        this.showAddDialog = true;
    }
    closeAddDialog() {
        this.showAddDialog = false;
    }
    submitAddDialog(values: any[]) {
        console.log('values:', values); // Phải là mảng, không phải SubmitEvent
        // Gọi API add record
        const apiUrl = `${environment.apiUrl}/${this.selectedTable}/add`;
        debugger
        this.http.post(apiUrl, { values }).subscribe(
            (res) => {
                Swal.fire('Thành công', 'Đã thêm bản ghi mới!', 'success');
                this.closeAddDialog();
                this.loadData();
            },
            (err) => {
                Swal.fire('Lỗi', 'Không thể thêm bản ghi mới!', 'error');
            }
        );
    }
}
