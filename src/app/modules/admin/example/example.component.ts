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
displayedColumns: string[] = [];
  dataSource = new MatTableDataSource<any>([]);
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

    }
    ngOnInit(): void {
        this.loadData();
      }
    
      loadData(): void {
        this.http.get<{ data: any[][] }>('http://localhost:3000/data').subscribe(response => {
            if (response.data.length > 0) {
              this.displayedColumns = this.columnNames.slice(0, response.data[0].length);
      
              // Chuyển đổi dữ liệu để Angular Table đọc được
              this.dataSource.data = response.data.slice(1).map(row => {
                let rowData: any = {};
                this.displayedColumns.forEach((col, index) => {
                  rowData[col] = row[index];
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

       // Hàm tính chênh lệch thời gian
       calculateTimeDifference(element: any) {
        if (element["Bắt đầu dồn cắt"] && element["Kết thúc cắt nối"]) {
          const startTime = new Date(element["Bắt đầu dồn cắt"]);
          const endTime = new Date(element["Kết thúc cắt nối"]);
          const diff = (endTime.getTime() - startTime.getTime()) / (1000 * 60); // Chênh lệch phút
          element["Chênh lệch thời gian"] = diff.toFixed(2) + " phút";
        }
        this.updateGoogleSheet(element);
      }

      updateGoogleSheet(element: any) {
        const payload = {
          values: [
            [element["Bắt đầu dồn cắt"], element["Kết thúc cắt nối"], element["Chênh lệch thời gian"]]
          ]
        };
    
        this.http.post("http://localhost:3000/write", payload).subscribe(response => {
          console.log("Dữ liệu cập nhật lên Google Sheets:", response);
        }, error => {
          console.error("Lỗi khi cập nhật dữ liệu:", error);
        });
      }

      updateDate(element: any, column: string, value: string) {
        console.log("Giá trị ngày giờ mới:", value); // Debug giá trị ngày giờ
        element[column] = value; // Gán giá trị mới vào object
        this.updateGoogleSheet(element); // Gửi dữ liệu lên Google Sheets nếu cần
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
            // Tạo đối tượng âm thanh
            let audio = new Audio('./assets/let-me-do-it-for-you.mp3');

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
}
