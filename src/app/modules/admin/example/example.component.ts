import { HttpClient } from '@angular/common/http';
import { Component, ViewChild, ViewEncapsulation } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { DataService } from 'app/shared/data.service';
import Swal from 'sweetalert2';
import { environment } from '../../../../environments/environment';

@Component({
    selector     : 'example',
    templateUrl  : './example.component.html',
    styleUrls    : ['./example.component.scss'],  // Thêm file SCSS ở đây
    encapsulation: ViewEncapsulation.None
})
export class ExampleComponent
{
    userEmail: string = ''; // Đảm bảo luôn có giá trị mặc định
    displayedColumns: string[] = [];
    dataSource = new MatTableDataSource<any>([]);
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
    ];
    columnNames = [
        "STT", 
        "Mác tàu", 
        "Ngày giờ tàu đến ga", 
        "Giờ bắt đầu dồn cắt nối xe", 
        "Giờ kết thúc cắt nối xe", 
        "Số lượng xe cắt", 
        "Số lượng xe nối", 
        "Ngày giờ tàu chạy", 
        "Dừng tại Ga", 
        "Thời gian theo biểu đồ", 
        "Chênh lệch theo biểu đồ"
    ]; // Định nghĩa tên cột dựa trên dữ liệu API
    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;
    /**
     * Constructor
     */
    constructor(
        private dataService: DataService,
        private http: HttpClient
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
    
    loadData(): void {
        this.http.get<{ data: any[][] }>(`${environment.apiUrl}/${this.selectedTable}`).subscribe(response => {
            console.log("Dữ liệu gốc từ API:", response.data); // Log dữ liệu gốc

            if (response.data.length > 0) {
                this.displayedColumns = this.columnNames.slice(0, 11);
                console.log("displayedColumns after assignment:", this.displayedColumns); // Thêm log này
                
                // Chuyển đổi dữ liệu để Angular Table đọc được
                this.dataSource.data = response.data.slice(1).map(row => {
                    let rowData: any = {};
                    this.displayedColumns.forEach((col, index) => {
                        // Debugging logs for specific columns
                        if (col === 'Mác tàu' || col === 'Số lượng xe cắt' || col === 'Số lượng xe nối') {
                            console.log(`Column: ${col}, Original Value: ${row[index]}, Index: ${index}`);
                        }

                        // Áp dụng parseDateForInput cho các cột ngày giờ cụ thể
                        if (col === 'Ngày giờ tàu đến ga' || col === 'Giờ bắt đầu dồn cắt nối xe' || col === 'Giờ kết thúc cắt nối xe' || col === 'Kết thúc cắt nối' || col === 'Ngày giờ tàu chạy') {
                            const dateStr = row[index];
                            if (dateStr && dateStr.trim() !== '') {
                                const formattedDate = this.parseDateForInput(dateStr);
                                rowData[col] = formattedDate;
                            } else {
                                rowData[col] = '';
                            }
                        } else if (col === 'STT' || col === 'Số lượng xe cắt' || col === 'Số lượng xe nối') {
                            // Chuyển đổi sang kiểu số cho các cột số lượng
                            rowData[col] = Number(row[index]);
                        } else {
                            // Gán giá trị gốc cho các cột khác (ví dụ: Mác tàu)
                            rowData[col] = String(row[index]);
                        }
                        if (col === 'Mác tàu' || col === 'Số lượng xe cắt' || col === 'Số lượng xe nối') {
                            console.log(`Column: ${col}, Processed Value: ${rowData[col]}`);
                        }
                    });
                    return rowData;
                });

                // Log the final data assigned to the table
                console.log("Final dataSource.data:", this.dataSource.data);
            }
        });
    }


    
    applyFilter(event: Event) {
        const filterValue = (event.target as HTMLInputElement).value;
        this.dataSource.filter = filterValue.trim().toLowerCase();
    }

    updateGoogleSheet(element: any, rowIndex: number) {
        // Các cột cần gửi lên (Mác tàu, Ngày giờ tàu đến ga, Giờ bắt đầu dồn cắt nối xe, Giờ kết thúc cắt nối xe, Số lượng xe cắt, Số lượng xe nối)
        // Dựa trên thứ tự cột mới
        const editableColumns = [
            "Mác tàu", 
            "Ngày giờ tàu đến ga", 
            "Giờ bắt đầu dồn cắt nối xe", 
            "Giờ kết thúc cắt nối xe", 
            "Số lượng xe cắt", 
            "Số lượng xe nối",
            "Ngày giờ tàu chạy"
        ];

        const valuesToSend = editableColumns.map(col => {
            // Đối với các cột ngày giờ, sử dụng giá trị đã định dạng nếu có
            if (col === 'Ngày giờ tàu đến ga' || col === 'Giờ bắt đầu dồn cắt nối xe' || col === 'Giờ kết thúc cắt nối xe' || col === 'Kết thúc cắt nối' || col === 'Ngày giờ tàu chạy') {
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
            rowIndex: rowIndex + 6, // Điều chỉnh rowIndex để khớp với Google Sheet (ví dụ: +6 vì dữ liệu bắt đầu từ hàng 7)
            values: valuesToSend
        };
    
        console.log("Payload gửi lên:", payload); // Debug dữ liệu trước khi gửi
    
        this.http.post(`${environment.apiUrl}/${this.selectedTable}/write`, payload).subscribe(response => {
            console.log("Dữ liệu cập nhật lên Google Sheets:", response);
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
        
        if (column === 'Ngày giờ tàu đến ga' || column === 'Giờ bắt đầu dồn cắt nối xe' || column === 'Giờ kết thúc cắt nối xe' || column === 'Kết thúc cắt nối' || column === 'Ngày giờ tàu chạy') {
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
        } else {
            element[column] = value; // Gán trực tiếp cho các cột khác
        }
        
        this.updateGoogleSheet(element, index); // Gọi hàm update sau khi thay đổi giá trị
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

        const newRow: any = {};
        // Khởi tạo các cột với giá trị trống
        this.columnNames.forEach(col => {
            newRow[col] = '';
        });

        // Gán STT cho hàng mới (STT = số hàng hiện có + 1)
        newRow["STT"] = this.dataSource.data.length + 1;

        // Thêm hàng mới vào dataSource
        const currentData = this.dataSource.data;
        this.dataSource.data = [...currentData, newRow];
        
        // Tùy chọn: Scroll đến hàng mới nếu có paginator
        if (this.paginator) {
            this.paginator.lastPage();
        }

        // Gợi ý: Nếu bạn muốn tự động gửi hàng mới này lên sheets ngay lập tức,
        // bạn cần một API endpoint khác để 'append' hàng mới vào cuối sheets,
        // thay vì 'update' một rowIndex cụ thể. Hoặc nếu bạn muốn 'update'
        // hàng này, bạn cần biết rowIndex tiếp theo trên Google Sheets.
        // Hiện tại, việc update sẽ được kích hoạt khi người dùng chỉnh sửa hàng này.
    }
}
