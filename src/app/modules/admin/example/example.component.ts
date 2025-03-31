import { HttpClient } from '@angular/common/http';
import { Component, ViewChild, ViewEncapsulation } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { DataService } from 'app/shared/data.service';

@Component({
    selector     : 'example',
    templateUrl  : './example.component.html',
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
    debugger
    const start = new Date(element["Bắt đầu dồn cắt"]);
    const end = new Date(element["Kết thúc cắt nối"]);

    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      const diffMs = end.getTime() - start.getTime();
      const diffMins = Math.floor(diffMs / 60000); // Chuyển mili-giây thành phút
      element["Chênh lệch thời gian"] = diffMins + " phút";
    } else {
      element["Chênh lệch thời gian"] = "";
    }
  }
}
