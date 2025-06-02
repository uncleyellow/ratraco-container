import { HttpClient } from '@angular/common/http';
import { Component, ViewChild, ViewEncapsulation } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { DataService } from 'app/shared/data.service';
import Swal from 'sweetalert2';

@Component({
    selector     : 'example',
    templateUrl  : './example.component.html',
    styleUrls    : ['./example.component.scss'],  // Thêm file SCSS ở đây
    encapsulation: ViewEncapsulation.None
})
export class ExampleComponent
{
    userEmail: string;
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
        "STT", "Mác tàu", "Ngày tàu đến ga", "Giờ tàu đến", "Bắt đầu dồn cắt", "Kết thúc cắt nối",
        "Số lượng xe cắt", "Số lượng xe nối", "Giờ tàu xuất phát", "Chênh lệch thời gian",
        "Đến", "Đi", "Xe có vận đơn", "Toa xe có vận đơn", "Rổ số lượng xe cắt", "Ghi chú"
    ]; // Định nghĩa tên cột
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
    }
    ngOnInit(): void {
        this.loadData();
        this.checkPermission();
    }
    
    loadData(): void {
        this.http.get<{ data: any[][] }>(`http://localhost:3000/${this.selectedTable}`).subscribe(response => {
            if (response.data.length > 0) {
                this.displayedColumns = this.columnNames.slice(0, response.data[0].length);
                
                // Chuyển đổi dữ liệu để Angular Table đọc được
                this.dataSource.data = response.data.slice(1).map(row => {
                    let rowData: any = {};
                    this.displayedColumns.forEach((col, index) => {
                        if (col === 'Bắt đầu dồn cắt' || col === 'Kết thúc cắt nối') {
                            const dateStr = row[index];
                            if (dateStr && dateStr.trim() !== '') {
                                // Parse và format date cho input datetime-local
                                const formattedDate = this.parseDateForInput(dateStr);
                                rowData[col] = formattedDate;
                            } else {
                                rowData[col] = '';
                            }
                        } else {
                            rowData[col] = row[index];
                        }
                    });
                    return rowData;
                });
            }
        });
    }


    
    applyFilter(event: Event) {
        const filterValue = (event.target as HTMLInputElement).value;
        this.dataSource.filter = filterValue.trim().toLowerCase();
    }

    updateGoogleSheet(element: any, rowIndex: number) {
        const payload = {
            rowIndex: rowIndex + 6,
            values: [
                element["Bắt đầu dồn cắt"], 
                element["Kết thúc cắt nối"]
            ]
        };
    
        console.log("Payload gửi lên:", payload); // Debug dữ liệu trước khi gửi
    
        this.http.post(`http://localhost:3000/${this.selectedTable}/write`, payload).subscribe(response => {
            console.log("Dữ liệu cập nhật lên Google Sheets:", response);
            this.loadData();
        }, error => {
            console.error("Lỗi khi cập nhật dữ liệu:", error);
        });
    }
    
    updateDate(element: any, column: string, value: string, index: number) {
        if (!this.canEdit) {
            Swal.fire({
                title: 'Không có quyền chỉnh sửa',
                text: 'Bạn chỉ có quyền chỉnh sửa bảng Trảng Bom',
                icon: 'warning'
            });
            return;
        }

        console.log("Giá trị ngày giờ mới từ input:", value);
        console.log("Hàng được cập nhật:", index);
        
        if (!value) {
            element[column] = '';
        } else {
            try {
                const date = new Date(value);
                if (!isNaN(date.getTime())) {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    const hours = String(date.getHours()).padStart(2, '0');
                    const minutes = String(date.getMinutes()).padStart(2, '0');
                    const seconds = '00';
                    
                    const formattedDate = `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
                    element[column] = formattedDate;
                } else {
                    console.error('Invalid date from input:', value);
                    element[column] = '';
                }
            } catch (error) {
                console.error('Error formatting date for server:', value, error);
                element[column] = '';
            }
        }
        
        this.updateGoogleSheet(element, index);
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
            // Thử parse với định dạng YYYY/MM/DD HH:mm:ss
            const parts = dateStr.split(' ');
            if (parts.length === 2) {
                const dateParts = parts[0].split('/');
                const timeParts = parts[1].split(':');

                if (dateParts.length === 3 && timeParts.length >= 2) {
                    const year = dateParts[0];
                    const month = dateParts[1];
                    const day = dateParts[2];
                    const hours = timeParts[0];
                    const minutes = timeParts[1];

                    // Kiểm tra tính hợp lệ cơ bản
                    if (year && month && day && hours && minutes) {
                        // Tạo chuỗi định dạng YYYY-MM-DDThh:mm
                        const formattedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
                        
                        // Kiểm tra xem chuỗi có tạo ra ngày hợp lệ không
                        const testDate = new Date(formattedDate);
                        if (!isNaN(testDate.getTime())) {
                            console.log('Successfully parsed and formatted as YYYY-MM-DDThh:mm:', formattedDate); // Log successful parse
                            return formattedDate;
                        }
                    }
                }
            }
            // Nếu không parse được với định dạng YYYY/MM/DD HH:mm:ss, thử tạo đối tượng Date trực tiếp
            // Date object có thể parse một số định dạng khác
            const directDate = new Date(dateStr);
            if (!isNaN(directDate.getTime())) {
                const year = directDate.getFullYear();
                const month = String(directDate.getMonth() + 1).padStart(2, '0');
                const day = String(directDate.getDate()).padStart(2, '0');
                const hours = String(directDate.getHours()).padStart(2, '0');
                const minutes = String(directDate.getMinutes()).padStart(2, '0');
                const formattedDate = `${year}-${month}-${day}T${hours}:${minutes}`;
                console.log('Parsed using new Date() and formatted as YYYY-MM-DDThh:mm:', formattedDate); // Log fallback parse
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
        
    }
}
