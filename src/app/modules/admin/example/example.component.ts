import { HttpClient } from '@angular/common/http';
import { Component, ViewChild, ViewEncapsulation, AfterViewInit, HostListener } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { DataService } from 'app/shared/data.service';
import { ExcelExportService, ExcelExportOptions } from './example.services';
import Swal from 'sweetalert2';
import { environment } from '../../../../environments/environment';
import { AddRecordDialogComponent } from '../add-record-dialog/add-record-dialog.component';
import { RecordDetailDialogComponent } from './record-detail-dialog/record-detail-dialog.component';

@Component({
    selector: 'example',
    templateUrl: './example.component.html',
    styleUrls: ['./example.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class ExampleComponent implements AfterViewInit {
    userEmail: string = '';
    displayedColumns: string[] = [];
    dataSource = new MatTableDataSource<any>([]);
    searchValue: string = '';
    readonly pageSizeOptions: number[] = [10, 25, 50, 100];
    selectedTable: string = 'trangbom';
    canEdit: boolean = false;
    
    // Loading states
    isLoadingData: boolean = false;
    isExporting: boolean = false;
    isImporting: boolean = false;

    // UI State
    showQuickActionsMenu: boolean = false;
    isTableView: boolean = true;
    isFullscreen: boolean = false;

    // Math reference for template
    Math = Math;

    // Available tables configuration
    readonly availableTables = [
        { value: 'trangbom', label: 'Trảng Bom', icon: 'location_on' },
        { value: 'donganh', label: 'Đông Anh', icon: 'location_on' },
        { value: 'songthan', label: 'Sóng Thần', icon: 'location_on' },
        { value: 'dieutri', label: 'Diệu Trì', icon: 'location_on' },
        { value: 'danang', label: 'Đà Nẵng', icon: 'location_on' },
        { value: 'kimlien', label: 'Kim Liên', icon: 'location_on' },
        { value: 'giapbat', label: 'Giáp Bát', icon: 'location_on' },
        { value: 'vinh', label: 'Vinh', icon: 'location_on' },
        { value: 'quangngai', label: 'Quảng Ngãi', icon: 'location_on' },
        { value: 'nhatrang', label: 'Nha Trang', icon: 'location_on' },
        { value: 'binhthuan', label: 'Bình Thuận', icon: 'location_on' },
    ];

    // Column definitions
    readonly columnNames = [
        "STT", "Mác tàu", "Ngày giờ tàu đến ga", 
        "Giờ bắt đầu dỡn cắt xe", "Giờ kết thúc dỡn cắt xe", 
        "Giờ bắt đầu nối xe", "Giờ kết thúc nối xe", 
        "Số lượng xe cắt(ghi rõ số toa xe)", "Số lượng xe nối(ghi rõ số toa xe)", 
        "Ngày giờ tàu chạy", "Số xe có vận đơn không phải của RAT",
        "Giờ dỡn cắt xe", "Giờ dỡn nối xe", "Dừng tại Ga",
        "Thời gian theo biểu đồ", "Chênh lệch theo biểu đồ",
        "Tổng số giờ tàu dừng", "Dừng đợi(nếu có)"
    ];

    readonly editableColumns: string[] = [
        "Mác tàu", "Ngày giờ tàu đến ga", "Giờ bắt đầu dỡn cắt xe",
        "Giờ kết thúc dỡn cắt xe", "Giờ bắt đầu nối xe", "Giờ kết thúc nối xe",
        "Số lượng xe cắt(ghi rõ số toa xe)", "Số lượng xe nối(ghi rõ số toa xe)",
        "Ngày giờ tàu chạy", "Số xe có vận đơn không phải của RAT"
    ];

    @ViewChild(MatPaginator) paginator!: MatPaginator;
    @ViewChild(MatSort) sort!: MatSort;

    constructor(
        private dataService: DataService,
        private http: HttpClient,
        private dialog: MatDialog,
        private excelService: ExcelExportService
    ) {
        this.userEmail = localStorage.getItem('userEmail') || '';
    }

    ngOnInit(): void {
        this.loadData();
        this.checkPermission();
    }

    ngAfterViewInit(): void {
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
    }

    // ==================== UI STATE MANAGEMENT ====================

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: Event): void {
        // Close quick actions menu when clicking outside
        if (!(event.target as Element).closest('.quick-actions-container')) {
            this.showQuickActionsMenu = false;
        }
    }

    toggleQuickActionsMenu(): void {
        this.showQuickActionsMenu = !this.showQuickActionsMenu;
    }

    toggleTableView(): void {
        this.isTableView = !this.isTableView;
        // Add logic to switch between table and grid view
        this.applyTableViewMode();
    }

    toggleFullscreen(): void {
        this.isFullscreen = !this.isFullscreen;
        if (this.isFullscreen) {
            this.enterFullscreen();
        } else {
            this.exitFullscreen();
        }
    }

    private applyTableViewMode(): void {
        // Implementation for switching between table and grid view
        if (this.isTableView) {
            // Apply table view styles
            document.body.classList.add('table-view-mode');
        } else {
            // Apply grid view styles
            document.body.classList.remove('table-view-mode');
        }
    }

    private enterFullscreen(): void {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        }
    }

    private exitFullscreen(): void {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }

    // ==================== DATA MANAGEMENT ====================

    async loadData(): Promise<void> {
        try {
            this.isLoadingData = true;
            const response = await this.http.get<{ data: any[][] }>(`${environment.apiUrl}/${this.selectedTable}`).toPromise();
            
            if (response?.data?.length > 0) {
                this.setupTableColumns();
                this.processTableData(response.data);
                this.setupTableFeatures();
            }
        } catch (error) {
            console.error('Error loading data:', error);
            await this.showErrorMessage('Lỗi tải dữ liệu', 'Không thể tải dữ liệu từ server');
        } finally {
            this.isLoadingData = false;
        }
    }

    private setupTableColumns(): void {
        this.displayedColumns = this.columnNames.slice(0, 18);
    }

    private processTableData(rawData: any[][]): void {
        this.dataSource.data = rawData.map(row => {
            const rowData: any = {};
            this.displayedColumns.forEach((col, index) => {
                if (this.isDateTimeColumn(col)) {
                    rowData[col] = this.parseDateForInput(row[index]) || '';
                } else if (this.isNumericColumn(col)) {
                    rowData[col] = Number(row[index]) || 0;
                } else {
                    rowData[col] = String(row[index] || '');
                }
            });
            return rowData;
        });
    }

    private setupTableFeatures(): void {
        // Setup custom filter
        this.dataSource.filterPredicate = (data: any, filter: string) => {
            const normalizedFilter = filter.trim().toLowerCase();
            if (!normalizedFilter) return true;
            
            return this.displayedColumns.some(col => {
                const cellValue = String(data[col] ?? '').toLowerCase();
                return cellValue.includes(normalizedFilter);
            });
        };

        // Re-assign paginator and sort
        if (this.paginator) {
            this.dataSource.paginator = this.paginator;
            this.paginator.firstPage();
        }
        if (this.sort) {
            this.dataSource.sort = this.sort;
        }
    }

    // ==================== SEARCH & FILTER ====================

    applyFilter(event?: Event): void {
        let filterValue = this.searchValue || '';
        const target = event?.target as HTMLInputElement | undefined;
        if (target && typeof target.value === 'string') {
            filterValue = target.value;
        }
        
        this.searchValue = filterValue;
        this.dataSource.filter = filterValue.trim().toLowerCase();
        
        if (this.paginator) {
            this.paginator.firstPage();
        }
    }

    clearSearch(): void {
        this.searchValue = '';
        this.dataSource.filter = '';
        if (this.paginator) {
            this.paginator.firstPage();
        }
    }

    // ==================== DATA UPDATE ====================

    async updateCellValue(element: any, column: string, value: any, index: number): Promise<void> {
        if (!this.canEdit) {
            await this.showPermissionDeniedMessage();
            return;
        }

        try {
            console.log(`Updating column '${column}' with value: '${value}' at row: ${index}`);
            
            // Process value based on column type
            if (this.isDateTimeColumn(column)) {
                element[column] = this.processDateTimeValue(value);
            } else {
                element[column] = value || '';
            }
            
            await this.updateGoogleSheet(element, index);
        } catch (error) {
            console.error('Error updating cell:', error);
            await this.showErrorMessage('Lỗi cập nhật', 'Không thể cập nhật dữ liệu');
        }
    }

    private async updateGoogleSheet(element: any, rowIndex: number, suppressReload: boolean = false): Promise<void> {
        const valuesToSend = this.editableColumns.map(col => {
            if (this.isDateTimeColumn(col)) {
                return this.formatDateTimeForApi(element[col]);
            }
            return element[col];
        });

        const payload = {
            rowIndex: rowIndex + 5,
            values: valuesToSend
        };

        try {
            await this.http.post(`${environment.apiUrl}/${this.selectedTable}/write`, payload).toPromise();
            console.log("Data updated successfully:", payload);
            
            if (!suppressReload) {
                await this.loadData();
            }
        } catch (error) {
            console.error("Error updating data:", error);
            // Don't throw error, just log it and show user message
            await this.showErrorMessage('Lỗi cập nhật', 'Không thể cập nhật dữ liệu. Vui lòng thử lại.');
        }
    }

    // ==================== EXCEL EXPORT ====================

    async exportToExcel(): Promise<void> {
        try {
            this.isExporting = true;
            
            // Get available train codes from current data
            const availableTrainCodes = this.getAvailableTrainCodes();
            
            if (availableTrainCodes.length === 0) {
                await this.showInfoMessage('Không có dữ liệu', 'Không có mác tàu nào để xuất');
                return;
            }

            // Show export options dialog
            const exportOptions = await this.excelService.showExportOptionsDialog(
                availableTrainCodes, 
                this.selectedTable
            );

            if (!exportOptions) return; // User cancelled

            // Perform export
            const success = await this.excelService.exportToExcel(
                this.dataSource.data,
                this.displayedColumns,
                exportOptions
            );

            if (success) {
                console.log('Export completed successfully');
            }

        } catch (error) {
            console.error('Export error:', error);
            await this.showErrorMessage('Lỗi xuất Excel', 'Không thể xuất file Excel');
        } finally {
            this.isExporting = false;
        }
    }

    private getAvailableTrainCodes(): string[] {
        const trainCodes = new Set<string>();
        this.dataSource.data.forEach(row => {
            const trainCode = row['Mác tàu'];
            if (trainCode && trainCode.trim()) {
                trainCodes.add(trainCode.trim());
            }
        });
        return Array.from(trainCodes).sort();
    }

    // ==================== EXCEL IMPORT ====================

    async onImportExcel(event: Event): Promise<void> {
        if (!this.canEdit) {
            await this.showPermissionDeniedMessage();
            this.clearFileInput(event.target as HTMLInputElement);
            return;
        }

        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        
        if (!file) return;

        // Hiển thị hướng dẫn trước khi import
        const showGuide = await this.showImportGuide();
        if (!showGuide) {
            this.clearFileInput(input);
            return;
        }

        try {
            this.isImporting = true;
            await this.processExcelImport(file);
        } catch (error) {
            console.error('Import error:', error);
            await this.showErrorMessage('Lỗi nhập Excel', 'Không thể đọc file Excel');
        } finally {
            this.isImporting = false;
            this.clearFileInput(input);
        }
    }

    // Thêm phương thức hiển thị hướng dẫn import
    private async showImportGuide(): Promise<boolean> {
        const result = await Swal.fire({
            title: '<i class="fas fa-info-circle text-blue-600"></i> Hướng dẫn Import Excel',
            html: `
                <div class="import-guide">
                    <div class="guide-section">
                        <h4 class="text-lg font-semibold text-gray-800 mb-3">
                            <i class="fas fa-clock text-orange-500 mr-2"></i>Định dạng thời gian
                        </h4>
                        <div class="format-examples space-y-2">
                            <div class="format-item">
                                <span class="format-label">DD/MM/YYYY HH:MM:</span>
                                <span class="format-example">15/08/2024 14:30</span>
                                <span class="format-note">(2:30 PM)</span>
                            </div>
                            <div class="format-item">
                                <span class="format-label">DD-MM-YYYY HH:MM:</span>
                                <span class="format-example">15-08-2024 23:45</span>
                                <span class="format-note">(11:45 PM)</span>
                            </div>
                            <div class="format-item">
                                <span class="format-label">Chỉ thời gian:</span>
                                <span class="format-example">14:30</span>
                                <span class="format-note">(sẽ dùng ngày hôm nay)</span>
                            </div>
                        </div>
                        <div class="important-note mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                            <p class="text-sm text-orange-800 font-medium">
                                <i class="fas fa-exclamation-triangle mr-2"></i>
                                <strong>QUAN TRỌNG:</strong> Sử dụng định dạng giờ 24h (00:00 - 23:59)
                            </p>
                        </div>
                    </div>
                    
                    <div class="guide-section mt-4">
                        <h4 class="text-lg font-semibold text-gray-800 mb-3">
                            <i class="fas fa-search text-green-500 mr-2"></i>Cách tìm kiếm bản ghi
                        </h4>
                        <ul class="text-sm text-gray-700 space-y-1">
                            <li>• Hệ thống ưu tiên tìm theo <strong>STT</strong> trước</li>
                            <li>• Nếu không tìm thấy STT, sẽ tìm theo <strong>Mác tàu</strong></li>
                            <li>• Chỉ cập nhật những ô có dữ liệu mới</li>
                        </ul>
                    </div>
                </div>
                
                <style>
                    .import-guide {
                        text-align: left;
                        max-width: 500px;
                    }
                    .guide-section {
                        background: #f8fafc;
                        padding: 16px;
                        border-radius: 8px;
                        border: 1px solid #e2e8f0;
                    }
                    .format-examples {
                        margin-left: 16px;
                    }
                    .format-item {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        font-size: 13px;
                    }
                    .format-label {
                        font-weight: 600;
                        color: #374151;
                        min-width: 120px;
                    }
                    .format-example {
                        background: #1f2937;
                        color: white;
                        padding: 2px 8px;
                        border-radius: 4px;
                        font-family: monospace;
                        font-size: 12px;
                    }
                    .format-note {
                        color: #6b7280;
                        font-style: italic;
                        font-size: 11px;
                    }
                    .important-note {
                        border-left: 4px solid #f59e0b;
                    }
                </style>
            `,
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-upload mr-2"></i>Tiếp tục Import',
            cancelButtonText: '<i class="fas fa-times mr-2"></i>Hủy',
            width: 600,
            focusConfirm: false
        });

        return result.isConfirmed;
    }

    private async processExcelImport(file: File): Promise<void> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async () => {
                try {
                    const data = reader.result as ArrayBuffer;
                    const XLSX = await import('xlsx');
                    
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const importedRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

                    if (!importedRows.length) {
                        await this.showInfoMessage('Thông báo', 'File Excel trống');
                        resolve();
                        return;
                    }

                    await this.processImportedData(importedRows);
                    resolve();
                } catch (error) {
                    reject(error);
                }
            };

            reader.readAsArrayBuffer(file);
        });
    }

    private async processImportedData(importedRows: any[]): Promise<void> {
        let updatedCount = 0;
        let skippedCount = 0;
        const errors: string[] = [];

        // Show progress dialog
        const progressSwal = Swal.fire({
            title: 'Đang xử lý...',
            html: `
                <div class="import-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" id="progressFill"></div>
                    </div>
                    <p id="progressText">Đang xử lý 0/${importedRows.length} bản ghi...</p>
                </div>
            `,
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            for (let i = 0; i < importedRows.length; i++) {
                const importedRow = importedRows[i];
                
                // Update progress
                this.updateImportProgress(i + 1, importedRows.length);
                
                const result = await this.processImportedRow(importedRow);
                if (result.success) {
                    updatedCount++;
                } else {
                    skippedCount++;
                    if (result.error) {
                        errors.push(`Dòng ${i + 1}: ${result.error}`);
                    }
                }
            }

            await Swal.close();
            await this.loadData(); // Reload data once
            await this.showImportResults(updatedCount, skippedCount, errors);

        } catch (error) {
            await Swal.close();
            console.error('Import processing error:', error);
            await this.showErrorMessage('Lỗi xử lý', 'Có lỗi xảy ra trong quá trình xử lý file Excel. Vui lòng thử lại.');
        }
    }



    private async processImportedRow(importedRow: any): Promise<{success: boolean, error?: string}> {
        const importedStt = String(importedRow['STT'] ?? '').trim();
        const importedTrainCode = String(importedRow['Mác tàu'] ?? '').trim();

        if (!importedStt && !importedTrainCode) {
            return { success: false, error: 'Thiếu STT và Mác tàu' };
        }

        // Find matching row by STT first (ưu tiên STT), then by train code
        let indexInTable = -1;
        let matchType = '';
        
        // Tìm theo STT trước (chính xác nhất)
        if (importedStt) {
            indexInTable = this.dataSource.data.findIndex(r => {
                const currentStt = String(r['STT'] ?? '').trim();
                return currentStt === importedStt;
            });
            if (indexInTable !== -1) {
                matchType = 'STT';
            }
        }
        
        // Nếu không tìm thấy theo STT, tìm theo Mác tàu
        if (indexInTable === -1 && importedTrainCode) {
            indexInTable = this.dataSource.data.findIndex(r => {
                const currentTrainCode = String(r['Mác tàu'] ?? '').trim();
                return currentTrainCode === importedTrainCode;
            });
            if (indexInTable !== -1) {
                matchType = 'Mác tàu';
            }
        }

        if (indexInTable === -1) {
            return { 
                success: false, 
                error: `Không tìm thấy bản ghi với STT "${importedStt}" hoặc Mác tàu "${importedTrainCode}". Vui lòng kiểm tra lại dữ liệu.` 
            };
        }

        try {
            // Merge data với validation
            const mergedElement = { ...this.dataSource.data[indexInTable] };
            let hasChanges = false;
            const validationErrors: string[] = [];
            
            this.displayedColumns.forEach(col => {
                if (Object.prototype.hasOwnProperty.call(importedRow, col)) {
                    const newVal = importedRow[col];
                    const currentVal = mergedElement[col];
                    
                    // Chỉ cập nhật nếu có giá trị mới và khác với giá trị hiện tại
                    if (newVal !== undefined && newVal !== null && String(newVal).trim() !== '') {
                        let processedValue = newVal;
                        
                        if (this.isDateTimeColumn(col)) {
                            // Validation định dạng giờ 24h
                            const timeValidation = this.validateTimeFormat(newVal, col);
                            if (!timeValidation.isValid) {
                                validationErrors.push(`${col}: ${timeValidation.error}`);
                                return; // Bỏ qua cột này nếu có lỗi
                            }
                            
                            processedValue = this.processDateTimeValue(newVal);
                            if (processedValue && processedValue !== currentVal) {
                                mergedElement[col] = processedValue;
                                hasChanges = true;
                            }
                        } else if (String(newVal).trim() !== String(currentVal || '').trim()) {
                            mergedElement[col] = newVal;
                            hasChanges = true;
                        }
                    }
                }
            });

            // Nếu có lỗi validation, trả về lỗi
            if (validationErrors.length > 0) {
                return { 
                    success: false, 
                    error: `Lỗi định dạng thời gian:\n${validationErrors.join('\n')}` 
                };
            }

            if (!hasChanges) {
                return { success: false, error: `Không có thay đổi nào cho bản ghi ${matchType}: "${matchType === 'STT' ? importedStt : importedTrainCode}"` };
            }

            // Log thông tin cập nhật
            console.log(`Cập nhật bản ghi ${matchType}: "${matchType === 'STT' ? importedStt : importedTrainCode}"`, {
                original: this.dataSource.data[indexInTable],
                updated: mergedElement,
                changes: this.getChangedFields(this.dataSource.data[indexInTable], mergedElement)
            });

            await this.updateGoogleSheet(mergedElement, indexInTable, true);
            return { success: true };
        } catch (error) {
            return { success: false, error: `Lỗi cập nhật: ${error}` };
        }
    }

    // Thêm phương thức validation định dạng thời gian
    private validateTimeFormat(value: any, columnName: string): {isValid: boolean, error?: string} {
        if (!value) return { isValid: true };
        
        const strValue = String(value).trim();
        
        // Kiểm tra các định dạng được hỗ trợ
        const supportedFormats = [
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, // YYYY-MM-DDTHH:MM
            /^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}$/, // DD/MM/YYYY HH:MM
            /^\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2}$/, // DD-MM-YYYY HH:MM
            /^\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}$/, // DD.MM.YYYY HH:MM
            /^\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}$/, // YYYY/MM/DD HH:MM
            /^\d{2}:\d{2}$/, // HH:MM
            /^\d{2}:\d{2}:\d{2}$/ // HH:MM:SS
        ];
        
        // Kiểm tra xem có khớp với định dạng nào không
        const isSupportedFormat = supportedFormats.some(format => format.test(strValue));
        
        if (!isSupportedFormat) {
            return { 
                isValid: false, 
                error: `Định dạng không được hỗ trợ. Sử dụng: DD/MM/YYYY HH:MM (VD: 15/08/2024 14:30)` 
            };
        }
        
        // Kiểm tra định dạng giờ 24h
        if (strValue.includes(':')) {
            const timePart = strValue.includes(' ') ? strValue.split(' ')[1] : strValue;
            const [hours, minutes] = timePart.split(':');
            
            const hourNum = parseInt(hours);
            const minuteNum = parseInt(minutes);
            
            if (hourNum < 0 || hourNum > 23) {
                return { 
                    isValid: false, 
                    error: `Giờ phải từ 00-23. Giá trị hiện tại: ${hourNum}` 
                };
            }
            
            if (minuteNum < 0 || minuteNum > 59) {
                return { 
                    isValid: false, 
                    error: `Phút phải từ 00-59. Giá trị hiện tại: ${minuteNum}` 
                };
            }
        }
        
        return { isValid: true };
    }

    private updateImportProgress(current: number, total: number): void {
        const percentage = Math.round((current / total) * 100);
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
        if (progressText) {
            progressText.textContent = `Đang xử lý ${current}/${total} bản ghi... (${percentage}%)`;
        }
    }

    private async showImportResults(updated: number, skipped: number, errors: string[]): Promise<void> {
        let html = `
            <div class="import-results">
                <div class="result-stats">
                    <div class="stat-success">
                        <i class="fas fa-check-circle text-green-500"></i>
                        <span>Cập nhật thành công: <strong class="text-green-600">${updated}</strong></span>
                    </div>
                    <div class="stat-skipped">
                        <i class="fas fa-exclamation-triangle text-yellow-500"></i>
                        <span>Bỏ qua: <strong class="text-yellow-600">${skipped}</strong></span>
                    </div>
                </div>
                <div class="import-tips mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 class="text-sm font-semibold text-blue-800 mb-2">
                        <i class="fas fa-info-circle mr-2"></i>Lưu ý khi import Excel:
                    </h4>
                    <ul class="text-xs text-blue-700 space-y-1">
                        <li>• Hệ thống ưu tiên tìm kiếm theo STT trước, sau đó mới tìm theo Mác tàu</li>
                        <li>• Chỉ cập nhật những ô có dữ liệu mới và khác với dữ liệu hiện tại</li>
                        <li><strong>Định dạng ngày giờ được hỗ trợ:</strong></li>
                        <li>&nbsp;&nbsp;• DD/MM/YYYY HH:MM (VD: 15/08/2024 14:30)</li>
                        <li>&nbsp;&nbsp;• DD-MM-YYYY HH:MM (VD: 15-08-2024 14:30)</li>
                        <li>&nbsp;&nbsp;• DD.MM.YYYY HH:MM (VD: 15.08.2024 14:30)</li>
                        <li>&nbsp;&nbsp;• YYYY/MM/DD HH:MM (VD: 2024/08/15 14:30)</li>
                        <li>&nbsp;&nbsp;• YYYY-MM-DDTHH:MM (VD: 2024-08-15T14:30)</li>
                        <li>&nbsp;&nbsp;• Chỉ thời gian: HH:MM (VD: 14:30) - sẽ dùng ngày hôm nay</li>
                        <li>• <strong>Lưu ý:</strong> Sử dụng định dạng 24h (00:00 - 23:59)</li>
                        <li>• Các ô trống sẽ không được cập nhật</li>
                    </ul>
                </div>
        `;

        if (errors.length > 0) {
            html += `
                <div class="import-errors">
                    <h4>Chi tiết lỗi:</h4>
                    <div class="error-list">
                        ${errors.slice(0, 10).map(error => `<div class="error-item">${error}</div>`).join('')}
                        ${errors.length > 10 ? `<div class="error-more">... và ${errors.length - 10} lỗi khác</div>` : ''}
                    </div>
                </div>
            `;
        }

        html += '</div>';

        await Swal.fire({
            title: 'Kết quả nhập Excel',
            html,
            icon: updated > 0 ? 'success' : 'warning',
            confirmButtonText: 'Đóng'
        });
    }

    private clearFileInput(input: HTMLInputElement): void {
        input.value = '';
    }

    // ==================== UTILITY METHODS ====================

    private getChangedFields(original: any, updated: any): string[] {
        const changedFields: string[] = [];
        this.displayedColumns.forEach(col => {
            const originalVal = String(original[col] || '').trim();
            const updatedVal = String(updated[col] || '').trim();
            if (originalVal !== updatedVal) {
                changedFields.push(`${col}: "${originalVal}" → "${updatedVal}"`);
            }
        });
        return changedFields;
    }

    private isDateTimeColumn(column: string): boolean {
        return [
            'Ngày giờ tàu đến ga', 'Giờ bắt đầu dỡn cắt xe', 'Giờ kết thúc dỡn cắt xe',
            'Giờ bắt đầu nối xe', 'Giờ kết thúc nối xe', 'Ngày giờ tàu chạy'
        ].includes(column);
    }

    private isNumericColumn(column: string): boolean {
        return ['STT', 'Số lượng xe cắt', 'Số lượng xe nối'].includes(column);
    }

    private processDateTimeValue(value: any): string {
        if (!value) return '';
        
        try {
            // Xử lý các định dạng ngày giờ khác nhau
            let date: Date;
            
            // Kiểm tra nếu là string Excel date number
            if (typeof value === 'number' && value > 1000) {
                // Excel date number - chuyển đổi sang Date
                date = new Date((value - 25569) * 86400 * 1000);
            } else if (typeof value === 'string') {
                // Xử lý các định dạng string
                const trimmedValue = value.trim();
                
                // Kiểm tra định dạng YYYY-MM-DDTHH:MM (ISO format)
                if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(trimmedValue)) {
                    date = new Date(trimmedValue);
                }
                // Kiểm tra định dạng DD/MM/YYYY HH:MM (24h format)
                else if (/^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}/.test(trimmedValue)) {
                    const [datePart, timePart] = trimmedValue.split(' ');
                    const [day, month, year] = datePart.split('/');
                    const [hours, minutes] = timePart.split(':');
                    date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
                }
                // Kiểm tra định dạng MM/DD/YYYY HH:MM (24h format)
                else if (/^\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}/.test(trimmedValue)) {
                    const [datePart, timePart] = trimmedValue.split(' ');
                    const [month, day, year] = datePart.split('/');
                    const [hours, minutes] = timePart.split(':');
                    date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
                }
                // Kiểm tra định dạng DD-MM-YYYY HH:MM (24h format với dấu gạch ngang)
                else if (/^\d{2}-\d{2}-\d{4}\s+\d{2}:\d{2}/.test(trimmedValue)) {
                    const [datePart, timePart] = trimmedValue.split(' ');
                    const [day, month, year] = datePart.split('-');
                    const [hours, minutes] = timePart.split(':');
                    date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
                }
                // Kiểm tra định dạng YYYY/MM/DD HH:MM (24h format)
                else if (/^\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}/.test(trimmedValue)) {
                    const [datePart, timePart] = trimmedValue.split(' ');
                    const [year, month, day] = datePart.split('/');
                    const [hours, minutes] = timePart.split(':');
                    date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
                }
                // Kiểm tra định dạng DD.MM.YYYY HH:MM (24h format với dấu chấm)
                else if (/^\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}/.test(trimmedValue)) {
                    const [datePart, timePart] = trimmedValue.split(' ');
                    const [day, month, year] = datePart.split('.');
                    const [hours, minutes] = timePart.split(':');
                    date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
                }
                // Kiểm tra định dạng chỉ có thời gian (giả sử ngày hôm nay)
                else if (/^\d{2}:\d{2}$/.test(trimmedValue)) {
                    const [hours, minutes] = trimmedValue.split(':');
                    const today = new Date();
                    date = new Date(today.getFullYear(), today.getMonth(), today.getDate(), parseInt(hours), parseInt(minutes));
                }
                // Kiểm tra định dạng HH:MM:SS (24h format với giây)
                else if (/^\d{2}:\d{2}:\d{2}$/.test(trimmedValue)) {
                    const [hours, minutes, seconds] = trimmedValue.split(':');
                    const today = new Date();
                    date = new Date(today.getFullYear(), today.getMonth(), today.getDate(), parseInt(hours), parseInt(minutes), parseInt(seconds));
                }
                // Thử parse trực tiếp
                else {
                    date = new Date(trimmedValue);
                }
            } else {
                date = new Date(value);
            }
            
            if (!isNaN(date.getTime())) {
                // Format về định dạng chuẩn cho input datetime-local
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                return `${year}-${month}-${day}T${hours}:${minutes}`;
            }
        } catch (error) {
            console.error('Error processing datetime:', error);
        }
        
        return '';
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
        
        return '';
    }

    private parseDateForInput(dateStr: string): string {
        if (!dateStr || dateStr.trim() === '') return '';

        try {
            // Try multiple date formats
            const ymd_hms_regex = /^(\d{4})[\/\-](\d{2})[\/\-](\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/;
            const dmy_hms_regex = /^(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/;
            const mdy_hms_regex = /^(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/;

            let match = dateStr.match(ymd_hms_regex);
            let date: Date;

            if (match) {
                // Format: YYYY-MM-DD HH:MM hoặc YYYY/MM/DD HH:MM
                const [_, year, month, day, hours, minutes, seconds = '00'] = match;
                date = new Date(`${year}-${month}-${day}T${hours}:${minutes}:${seconds}`);
            } else {
                match = dateStr.match(dmy_hms_regex);
                if (match) {
                    // Format: DD/MM/YYYY HH:MM hoặc DD-MM-YYYY HH:MM hoặc DD.MM.YYYY HH:MM
                    const [_, day, month, year, hours = '00', minutes = '00', seconds = '00'] = match;
                    date = new Date(`${year}-${month}-${day}T${hours}:${minutes}:${seconds}`);
                } else {
                    match = dateStr.match(mdy_hms_regex);
                    if (match) {
                        // Format: MM/DD/YYYY HH:MM hoặc MM-DD-YYYY HH:MM hoặc MM.DD.YYYY HH:MM
                        const [_, month, day, year, hours = '00', minutes = '00', seconds = '00'] = match;
                        date = new Date(`${year}-${month}-${day}T${hours}:${minutes}:${seconds}`);
                    } else {
                        // Kiểm tra định dạng chỉ có thời gian
                        const timeOnlyRegex = /^(\d{2}):(\d{2})(?::(\d{2}))?$/;
                        const timeMatch = dateStr.match(timeOnlyRegex);
                        if (timeMatch) {
                            const [_, hours, minutes, seconds = '00'] = timeMatch;
                            const today = new Date();
                            date = new Date(today.getFullYear(), today.getMonth(), today.getDate(), parseInt(hours), parseInt(minutes), parseInt(seconds));
                        } else {
                            // Fallback: thử parse trực tiếp
                            date = new Date(dateStr);
                        }
                    }
                }
            }

            if (!isNaN(date.getTime())) {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                return `${year}-${month}-${day}T${hours}:${minutes}`;
            }
        } catch (error) {
            console.error('Error parsing date:', error);
        }

        return '';
    }

    // ==================== PERMISSION & TABLE MANAGEMENT ====================

    onTableChange(event: any): void {
        this.selectedTable = event.value;
        this.checkPermission();
        this.loadData();
    }

    private checkPermission(): void {
        if (this.userEmail === 'kiniemboquenjerry@gmail.com') {
            this.canEdit = true;
        } else {
            const tablePermissions: Record<string, string> = {
                'trangbom@gmail.com': 'trangbom',
                'songthan@gmail.com': 'songthan',
                'dieutri@gmail.com': 'dieutri',
                'danang@gmail.com': 'danang',
                'kimlien@gmail.com': 'kimlien',
                'donganh@gmail.com': 'donganh',
                'giapbat@gmail.com': 'giapbat',
                'vinh@gmail.com': 'vinh',
                'nhatrang@gmail.com': 'nhatrang',
                'quangngai@gmail.com': 'quangngai',
                'binhthuan@gmail.com': 'binhthuan'
            };
            
            this.canEdit = tablePermissions[this.userEmail] === this.selectedTable;
        }
    }

    // ==================== DIALOG MANAGEMENT ====================

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

        dialogRef.afterClosed().subscribe(async (result) => {
            if (!result) return;

            if (result.action === 'save' && result.row) {
                await this.updateGoogleSheet(result.row, rowIndex);
            } else if (result.action === 'delete') {
                await this.handleRecordDeletion(rowIndex);
            }
        });
    }

    private async handleRecordDeletion(rowIndex: number): Promise<void> {
        try {
            const apiUrl = `${environment.apiUrl}/${this.selectedTable}/delete`;
            await this.http.post(apiUrl, { rowIndex: rowIndex + 5 }).toPromise();
            await this.showSuccessMessage('Thành công', 'Đã xóa bản ghi!');
            await this.loadData();
        } catch (error) {
            console.error('Delete failed:', error);
            await this.showErrorMessage('Lỗi', 'Không thể xóa bản ghi. Kiểm tra lại API /delete.');
        }
    }

    // ==================== UI FEEDBACK ====================

    private async showSuccessMessage(title: string, text: string): Promise<void> {
        await Swal.fire({ title, text, icon: 'success', timer: 3000 });
    }

    private async showErrorMessage(title: string, text: string): Promise<void> {
        await Swal.fire({ title, text, icon: 'error' });
    }

    private async showInfoMessage(title: string, text: string): Promise<void> {
        await Swal.fire({ title, text, icon: 'info' });
    }

    private async showPermissionDeniedMessage(): Promise<void> {
        await Swal.fire({
            title: 'Không có quyền chỉnh sửa',
            text: `Bạn chỉ có quyền chỉnh sửa bảng ${this.getTableLabel()}`,
            icon: 'warning'
        });
    }

    private getTableLabel(): string {
        const table = this.availableTables.find(t => t.value === this.selectedTable);
        return table?.label || this.selectedTable;
    }

    // ==================== UI HELPER METHODS ====================

    getColumnClasses(column: string): string {
        const classes = [];
        
        // Tối ưu hóa kích thước cột dựa trên nội dung và UX
        if (column === 'STT') {
            classes.push('min-w-60 max-w-80 w-70'); // Cột nhỏ nhất, chỉ hiển thị số
        } else if (column === 'Mác tàu') {
            classes.push('min-w-100 max-w-140 w-120'); // Mã tàu ngắn
        } else if (column === 'Ngày giờ tàu đến ga') {
            classes.push('min-w-140 max-w-180 w-160'); // Ngày giờ
        } else if (column.includes('Giờ bắt đầu') || column.includes('Giờ kết thúc')) {
            classes.push('min-w-140 max-w-180 w-160'); // Thời gian
        } else if (column.includes('Số lượng xe')) {
            classes.push('min-w-180 max-w-220 w-200'); // Cần không gian cho mô tả chi tiết
        } else if (column === 'Ngày giờ tàu chạy') {
            classes.push('min-w-140 max-w-180 w-160'); // Ngày giờ
        } else if (column === 'Số xe có vận đơn không phải của RAT') {
            classes.push('min-w-200 max-w-250 w-220'); // Cột dài nhất, cần nhiều không gian
        } else if (column === 'Dừng tại Ga') {
            classes.push('min-w-100 max-w-130 w-115'); // Tên ga ngắn
        } else if (column === 'Dừng đợi(nếu có)') {
            classes.push('min-w-120 max-w-150 w-135'); // Mô tả ngắn
        } else if (column.includes('Thời gian') || column.includes('Chênh lệch') || column.includes('Tổng số giờ')) {
            classes.push('min-w-120 max-w-160 w-140'); // Thời gian
        } else {
            classes.push('min-w-120 max-w-160 w-140'); // Mặc định cho các cột khác
        }
        
        return classes.join(' ');
    }

    getColumnType(column: string): string {
        if (this.isDateTimeColumn(column)) return 'datetime';
        if (column === 'Mác tàu' || column === 'Số xe có vận đơn không phải của RAT') return 'text';
        if (column.includes('Số lượng xe')) return 'number-text';
        return 'readonly';
    }

    getPlaceholder(column: string): string {
        const placeholders: Record<string, string> = {
            'Mác tàu': 'Nhập mác tàu',
            'Số lượng xe cắt(ghi rõ số toa xe)': 'VD: 5 xe (T01, T02, T03, T04, T05)',
            'Số lượng xe nối(ghi rõ số toa xe)': 'VD: 3 xe (T06, T07, T08)',
            'Số xe có vận đơn không phải của RAT': 'Nhập thông tin xe không phải RAT'
        };
        return placeholders[column] || `Nhập ${column.toLowerCase()}`;
    }

    getInputId(column: string, index: number): string {
        const columnMap: Record<string, string> = {
            'Mác tàu': 'mac-tau',
            'Ngày giờ tàu đến ga': 'ngay-den-ga',
            'Giờ bắt đầu dỡn cắt xe': 'gio-bat-dau-don-cat',
            'Giờ kết thúc dỡn cắt xe': 'gio-ket-thuc-don-cat',
            'Giờ bắt đầu nối xe': 'gio-bat-dau-noi-xe',
            'Giờ kết thúc nối xe': 'gio-ket-thuc-noi-xe',
            'Ngày giờ tàu chạy': 'ngay-gio-tau-chay',
            'Số lượng xe cắt(ghi rõ số toa xe)': 'so-luong-xe-cat',
            'Số lượng xe nối(ghi rõ số toa xe)': 'so-luong-xe-noi',
            'Số xe có vận đơn không phải của RAT': 'so-xe-rat'
        };
        const baseId = columnMap[column] || column.toLowerCase().replace(/\s+/g, '-');
        return `${baseId}-${index}`;
    }

    getDateTimeIconClass(column: string): string {
        const iconClasses: Record<string, string> = {
            'Ngày giờ tàu đến ga': 'text-blue-600',
            'Giờ bắt đầu dỡn cắt xe': 'text-green-600',
            'Giờ kết thúc dỡn cắt xe': 'text-red-600',
            'Giờ bắt đầu nối xe': 'text-blue-600',
            'Giờ kết thúc nối xe': 'text-orange-600',
            'Ngày giờ tàu chạy': 'text-purple-600'
        };
        return iconClasses[column] || 'text-gray-600';
    }

    // ==================== EVENT HANDLERS ====================

    onInputFocus(event: any): void {
        event.target.classList.add('focused');
        // Add subtle animation to parent cell
        const cell = event.target.closest('.cell-content');
        if (cell) {
            cell.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-20');
        }
    }

    onInputBlur(event: any): void {
        event.target.classList.remove('focused');
        // Remove animation from parent cell
        const cell = event.target.closest('.cell-content');
        if (cell) {
            cell.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-20');
        }
    }

    onRowHover(index: number, isHover: boolean): void {
        // Add visual feedback for row hover without interfering with click events
        const rows = document.querySelectorAll('.mat-row');
        const row = rows[index];
        if (row) {
            if (isHover) {
                row.classList.add('hover-highlight');
            } else {
                row.classList.remove('hover-highlight');
            }
        }
    }

    // ==================== KEYBOARD NAVIGATION ====================

    onKeyDown(event: KeyboardEvent, column: string, index: number): void {
        // Handle Enter key to move to next row, same column
        if (event.key === 'Enter') {
            event.preventDefault();
            const nextRowIndex = index + 1;
            const nextInputId = this.getInputId(column, nextRowIndex);
            const nextInput = document.getElementById(nextInputId);
            if (nextInput) {
                nextInput.focus();
            }
        }
        
        // Handle Tab to move to next editable cell
        if (event.key === 'Tab' && !event.shiftKey) {
            event.preventDefault();
            this.moveToNextEditableCell(column, index, 'forward');
        }
        
        // Handle Shift+Tab to move to previous editable cell
        if (event.key === 'Tab' && event.shiftKey) {
            event.preventDefault();
            this.moveToNextEditableCell(column, index, 'backward');
        }
    }

    private moveToNextEditableCell(currentColumn: string, currentIndex: number, direction: 'forward' | 'backward'): void {
        const currentColumnIndex = this.editableColumns.indexOf(currentColumn);
        
        let nextColumn: string;
        let nextIndex: number = currentIndex;
        
        if (direction === 'forward') {
            if (currentColumnIndex < this.editableColumns.length - 1) {
                nextColumn = this.editableColumns[currentColumnIndex + 1];
            } else {
                nextColumn = this.editableColumns[0];
                nextIndex = currentIndex + 1;
            }
        } else {
            if (currentColumnIndex > 0) {
                nextColumn = this.editableColumns[currentColumnIndex - 1];
            } else {
                nextColumn = this.editableColumns[this.editableColumns.length - 1];
                nextIndex = currentIndex - 1;
            }
        }
        
        // Check if next row exists
        if (nextIndex >= 0 && nextIndex < this.dataSource.data.length) {
            const nextInputId = this.getInputId(nextColumn, nextIndex);
            const nextInput = document.getElementById(nextInputId);
            if (nextInput) {
                nextInput.focus();
            }
        }
    }

    // ==================== BULK OPERATIONS ====================

    async bulkUpdateByTrainCode(trainCode: string, updates: Partial<any>): Promise<void> {
        if (!this.canEdit) {
            await this.showPermissionDeniedMessage();
            return;
        }

        const confirmation = await Swal.fire({
            title: 'Xác nhận cập nhật hàng loạt',
            text: `Bạn có muốn cập nhật tất cả các bản ghi của mác tàu "${trainCode}"?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Cập nhật',
            cancelButtonText: 'Hủy'
        });

        if (!confirmation.isConfirmed) return;

        try {
            let updatedCount = 0;
            const promises: Promise<void>[] = [];

            this.dataSource.data.forEach((row, index) => {
                if (row['Mác tàu'] === trainCode) {
                    Object.keys(updates).forEach(key => {
                        row[key] = updates[key];
                    });
                    promises.push(this.updateGoogleSheet(row, index, true));
                    updatedCount++;
                }
            });

            await Promise.all(promises);
            await this.loadData();
            await this.showSuccessMessage('Cập nhật thành công', `Đã cập nhật ${updatedCount} bản ghi cho mác tàu "${trainCode}"`);
        } catch (error) {
            console.error('Bulk update error:', error);
            await this.showErrorMessage('Lỗi cập nhật hàng loạt', 'Không thể cập nhật dữ liệu');
        }
    }

    async duplicateRecord(sourceIndex: number): Promise<void> {
        if (!this.canEdit) {
            await this.showPermissionDeniedMessage();
            return;
        }

        const sourceRecord = this.dataSource.data[sourceIndex];
        const newRecord = { ...sourceRecord };
        
        // Clear unique fields
        newRecord['STT'] = '';
        newRecord['Mác tàu'] = '';
        
        try {
            const apiUrl = `${environment.apiUrl}/${this.selectedTable}/add`;
            const values = this.columnNames.map(col => newRecord[col] || '');
            
            await this.http.post(apiUrl, { values }).toPromise();
            await this.showSuccessMessage('Thành công', 'Đã tạo bản sao!');
            await this.loadData();
        } catch (error) {
            console.error('Duplicate error:', error);
            await this.showErrorMessage('Lỗi', 'Không thể tạo bản sao!');
        }
    }

    // ==================== DATA VALIDATION ====================

    validateRowData(rowData: any): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];
        
        // Required field validation
        if (!rowData['Mác tàu'] || !rowData['Mác tàu'].toString().trim()) {
            errors.push('Mác tàu là bắt buộc');
        }
        
        // Date validation
        this.displayedColumns.forEach(column => {
            if (this.isDateTimeColumn(column) && rowData[column]) {
                const date = new Date(rowData[column]);
                if (isNaN(date.getTime())) {
                    errors.push(`${column} không hợp lệ`);
                }
            }
        });
        
        // Business logic validation
        if (rowData['Giờ bắt đầu dỡn cắt xe'] && rowData['Giờ kết thúc dỡn cắt xe']) {
            const start = new Date(rowData['Giờ bắt đầu dỡn cắt xe']);
            const end = new Date(rowData['Giờ kết thúc dỡn cắt xe']);
            if (start >= end) {
                errors.push('Giờ bắt đầu dỡn cắt phải nhỏ hơn giờ kết thúc');
            }
        }
        
        if (rowData['Giờ bắt đầu nối xe'] && rowData['Giờ kết thúc nối xe']) {
            const start = new Date(rowData['Giờ bắt đầu nối xe']);
            const end = new Date(rowData['Giờ kết thúc nối xe']);
            if (start >= end) {
                errors.push('Giờ bắt đầu nối xe phải nhỏ hơn giờ kết thúc');
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // ==================== ADVANCED EXPORT FEATURES ====================

    async showAdvancedExportDialog(): Promise<void> {
        const { value: exportType } = await Swal.fire({
            title: 'Chọn loại xuất dữ liệu',
            html: `
                <div class="export-type-selection">
                    <div class="export-option" data-type="basic">
                        <i class="fas fa-table text-blue-500"></i>
                        <h3>Xuất cơ bản</h3>
                        <p>Xuất toàn bộ dữ liệu hiện tại</p>
                    </div>
                    <div class="export-option" data-type="filtered">
                        <i class="fas fa-filter text-green-500"></i>
                        <h3>Xuất có lọc</h3>
                        <p>Chọn mác tàu và khoảng thời gian</p>
                    </div>
                    <div class="export-option" data-type="template">
                        <i class="fas fa-file-alt text-purple-500"></i>
                        <h3>Tạo mẫu nhập</h3>
                        <p>Tạo file Excel mẫu để nhập dữ liệu</p>
                    </div>
                </div>
                <style>
                    .export-type-selection {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                        gap: 15px;
                        margin: 20px 0;
                    }
                    .export-option {
                        padding: 20px;
                        border: 2px solid #e5e7eb;
                        border-radius: 8px;
                        text-align: center;
                        cursor: pointer;
                        transition: all 0.2s;
                    }
                    .export-option:hover {
                        border-color: #3b82f6;
                        background: #f0f9ff;
                    }
                    .export-option.selected {
                        border-color: #3b82f6;
                        background: #dbeafe;
                    }
                    .export-option i {
                        font-size: 2rem;
                        margin-bottom: 10px;
                    }
                    .export-option h3 {
                        margin: 10px 0 5px 0;
                        font-size: 1.1rem;
                        font-weight: 600;
                    }
                    .export-option p {
                        margin: 0;
                        font-size: 0.9rem;
                        color: #6b7280;
                    }
                </style>
            `,
            showCancelButton: true,
            confirmButtonText: 'Tiếp tục',
            cancelButtonText: 'Hủy',
            didOpen: () => {
                const options = document.querySelectorAll('.export-option');
                options.forEach(option => {
                    option.addEventListener('click', () => {
                        options.forEach(opt => opt.classList.remove('selected'));
                        option.classList.add('selected');
                    });
                });
            },
            preConfirm: () => {
                const selected = document.querySelector('.export-option.selected');
                if (!selected) {
                    Swal.showValidationMessage('Vui lòng chọn loại xuất dữ liệu');
                    return false;
                }
                return selected.getAttribute('data-type');
            }
        });

        if (exportType === 'basic') {
            await this.exportBasicExcel();
        } else if (exportType === 'filtered') {
            await this.exportToExcel();
        } else if (exportType === 'template') {
            await this.generateImportTemplate();
        }
    }

    private async exportBasicExcel(): Promise<void> {
        try {
            this.isExporting = true;
            const XLSX = await import('xlsx');
            
            const worksheet = XLSX.utils.json_to_sheet(this.dataSource.data, { skipHeader: false });
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Dữ liệu');
            
            const fileName = `thongke_tau_${this.selectedTable}_${new Date().toISOString().slice(0, 10)}.xlsx`;
            XLSX.writeFile(workbook, fileName);
            
            await this.showSuccessMessage('Xuất thành công', 'File Excel đã được tải xuống');
        } catch (error) {
            console.error('Export error:', error);
            await this.showErrorMessage('Lỗi xuất Excel', 'Không thể xuất file Excel');
        } finally {
            this.isExporting = false;
        }
    }

    private async generateImportTemplate(): Promise<void> {
        try {
            this.isExporting = true;
            const XLSX = await import('xlsx');
            
            // Create template with headers and sample data
            const templateData = [
                // Headers
                this.editableColumns,
                // Sample row with examples
                [
                    'VD: SE1',
                    '15/08/2024 14:30', // DD/MM/YYYY HH:MM (24h format)
                    '15/08/2024 15:00', // DD/MM/YYYY HH:MM (24h format)
                    '15/08/2024 16:30', // DD/MM/YYYY HH:MM (24h format)
                    '15/08/2024 17:00', // DD/MM/YYYY HH:MM (24h format)
                    '15/08/2024 17:30', // DD/MM/YYYY HH:MM (24h format)
                    '5 xe (T01, T02, T03, T04, T05)',
                    '3 xe (T06, T07, T08)',
                    '15/08/2024 18:00', // DD/MM/YYYY HH:MM (24h format)
                    'Thông tin xe khác'
                ]
            ];
            
            const worksheet = XLSX.utils.aoa_to_sheet(templateData);
            
            // Add instructions sheet
            const instructions = [
                ['HƯỚNG DẪN SỬ DỤNG MẪU NHẬP DỮ LIỆU'],
                [''],
                ['1. Chỉ chỉnh sửa các ô dữ liệu, không thay đổi tiêu đề'],
                ['2. Định dạng ngày giờ được hỗ trợ:'],
                ['   • DD/MM/YYYY HH:MM (VD: 15/08/2024 14:30)'],
                ['   • DD-MM-YYYY HH:MM (VD: 15-08-2024 14:30)'],
                ['   • DD.MM.YYYY HH:MM (VD: 15.08.2024 14:30)'],
                ['   • YYYY/MM/DD HH:MM (VD: 2024/08/15 14:30)'],
                ['   • YYYY-MM-DDTHH:MM (VD: 2024-08-15T14:30)'],
                ['   • Chỉ thời gian: HH:MM (VD: 14:30) - sẽ dùng ngày hôm nay'],
                [''],
                ['3. <strong>QUAN TRỌNG:</strong> Sử dụng định dạng giờ 24h (00:00 - 23:59)'],
                ['   • 14:30 = 2:30 PM'],
                ['   • 23:45 = 11:45 PM'],
                ['   • 00:15 = 12:15 AM'],
                [''],
                ['4. Số lượng xe: ghi rõ số toa xe (VD: 5 xe (T01, T02, T03, T04, T05))'],
                ['5. Lưu file và sử dụng chức năng "Nhập Excel" để cập nhật dữ liệu'],
                [''],
                ['CHÚ Ý:'],
                ['- Mác tàu phải khớp với dữ liệu đã có trong hệ thống'],
                ['- Hệ thống sẽ cập nhật theo STT hoặc Mác tàu'],
                ['- Các ô trống sẽ không được cập nhật'],
                ['- Đảm bảo định dạng giờ 24h để tránh lỗi import']
            ];
            
            const instructionSheet = XLSX.utils.aoa_to_sheet(instructions);
            
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, instructionSheet, 'Hướng dẫn');
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Mẫu dữ liệu');
            
            const fileName = `mau_nhap_du_lieu_${this.selectedTable}_${new Date().toISOString().slice(0, 10)}.xlsx`;
            XLSX.writeFile(workbook, fileName);
            
            await this.showSuccessMessage('Tạo mẫu thành công', 'File mẫu Excel đã được tải xuống');
        } catch (error) {
            console.error('Template generation error:', error);
            await this.showErrorMessage('Lỗi tạo mẫu', 'Không thể tạo file mẫu Excel');
        } finally {
            this.isExporting = false;
        }
    }

    // ==================== DATA STATISTICS ====================

    getDataStatistics(): any {
        const stats = {
            totalRecords: this.dataSource.data.length,
            trainCodes: new Set<string>(),
            dateRange: { min: null as Date | null, max: null as Date | null },
            averageProcessingTime: 0,
            mostActiveStation: '',
            emptyFields: 0
        };

        this.dataSource.data.forEach(row => {
            // Count unique train codes
            if (row['Mác tàu']) {
                stats.trainCodes.add(row['Mác tàu']);
            }
            
            // Find date range
            const arrivalDate = row['Ngày giờ tàu đến ga'];
            if (arrivalDate) {
                const date = new Date(arrivalDate);
                if (!isNaN(date.getTime())) {
                    if (!stats.dateRange.min || date < stats.dateRange.min) {
                        stats.dateRange.min = date;
                    }
                    if (!stats.dateRange.max || date > stats.dateRange.max) {
                        stats.dateRange.max = date;
                    }
                }
            }
            
            // Count empty fields
            this.displayedColumns.forEach(col => {
                if (!row[col] || row[col].toString().trim() === '') {
                    stats.emptyFields++;
                }
            });
        });

        return {
            ...stats,
            uniqueTrainCodes: stats.trainCodes.size,
            completeness: ((stats.totalRecords * this.displayedColumns.length - stats.emptyFields) / (stats.totalRecords * this.displayedColumns.length) * 100).toFixed(1)
        };
    }

    async showDataStatistics(): Promise<void> {
        const stats = this.getDataStatistics();
        
        await Swal.fire({
            title: 'Thống kê dữ liệu',
            html: `
                <div class="stats-container">
                    <div class="stat-card">
                        <i class="fas fa-database text-blue-500"></i>
                        <div class="stat-info">
                            <h3>${stats.totalRecords}</h3>
                            <p>Tổng bản ghi</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <i class="fas fa-train text-green-500"></i>
                        <div class="stat-info">
                            <h3>${stats.uniqueTrainCodes}</h3>
                            <p>Mác tàu duy nhất</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <i class="fas fa-percentage text-purple-500"></i>
                        <div class="stat-info">
                            <h3>${stats.completeness}%</h3>
                            <p>Độ đầy đủ</p>
                        </div>
                    </div>
                    <div class="stat-card full-width">
                        <i class="fas fa-calendar-alt text-orange-500"></i>
                        <div class="stat-info">
                            <h3>Khoảng thời gian</h3>
                            <p>${stats.dateRange.min ? stats.dateRange.min.toLocaleDateString('vi-VN') : 'N/A'} - ${stats.dateRange.max ? stats.dateRange.max.toLocaleDateString('vi-VN') : 'N/A'}</p>
                        </div>
                    </div>
                </div>
                <style>
                    .stats-container {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                        gap: 15px;
                        margin: 20px 0;
                    }
                    .stat-card {
                        display: flex;
                        align-items: center;
                        gap: 15px;
                        padding: 20px;
                        background: #f8fafc;
                        border-radius: 8px;
                        border: 1px solid #e2e8f0;
                    }
                    .stat-card.full-width {
                        grid-column: 1 / -1;
                    }
                    .stat-card i {
                        font-size: 2rem;
                    }
                    .stat-info h3 {
                        margin: 0 0 5px 0;
                        font-size: 1.5rem;
                        font-weight: 700;
                        color: #1f2937;
                    }
                    .stat-info p {
                        margin: 0;
                        font-size: 0.9rem;
                        color: #6b7280;
                    }
                </style>
            `,
            confirmButtonText: 'Đóng',
            width: 600
        });
    }

    getColumnTypeLabel(column: string): string {
        const typeLabels: Record<string, string> = {
            'STT': 'Số thứ tự',
            'Mác tàu': 'Mã tàu',
            'Ngày giờ tàu đến ga': 'Ngày giờ',
            'Giờ bắt đầu dỡn cắt xe': 'Thời gian',
            'Giờ kết thúc dỡn cắt xe': 'Thời gian',
            'Giờ bắt đầu nối xe': 'Thời gian',
            'Giờ kết thúc nối xe': 'Thời gian',
            'Số lượng xe cắt(ghi rõ số toa xe)': 'Số lượng',
            'Số lượng xe nối(ghi rõ số toa xe)': 'Số lượng',
            'Ngày giờ tàu chạy': 'Ngày giờ',
            'Số xe có vận đơn không phải của RAT': 'Thông tin',
            'Giờ dỡn cắt xe': 'Thời gian',
            'Giờ dỡn nối xe': 'Thời gian',
            'Dừng tại Ga': 'Địa điểm',
            'Thời gian theo biểu đồ': 'Thời gian',
            'Chênh lệch theo biểu đồ': 'Thời gian',
            'Tổng số giờ tàu dừng': 'Thời gian',
            'Dừng đợi(nếu có)': 'Thông tin'
        };
        return typeLabels[column] || 'Dữ liệu';
    }

    // Thêm phương thức tooltip thông minh
    getCellTooltip(value: any, column: string): string {
        if (!value || value === '') return '';
        
        const strValue = String(value);
        
        // Tooltip đặc biệt cho các cột quan trọng
        if (column === 'STT') {
            return `Số thứ tự: ${strValue}`;
        } else if (column === 'Mác tàu') {
            return `Mác tàu: ${strValue}`;
        } else if (column.includes('Số lượng xe')) {
            return `Chi tiết: ${strValue}`;
        } else if (this.isDateTimeColumn(column)) {
            try {
                const date = new Date(value);
                if (!isNaN(date.getTime())) {
                    return `${column}: ${date.toLocaleString('vi-VN')}`;
                }
            } catch (error) {
                // Ignore date parsing errors
            }
        }
        
        // Tooltip mặc định
        return `${column}: ${strValue}`;
    }

    refreshData(): void {
        this.loadData();
    }

    showSearchTips(): void {
        Swal.fire({
            title: 'Mẹo tìm kiếm hiệu quả',
            html: `
                <div class="search-tips">
                    <div class="tip-item">
                        <i class="fas fa-lightbulb text-yellow-500"></i>
                        <div>
                            <strong>Tìm kiếm theo mác tàu:</strong> Nhập chính xác mã tàu (VD: SE1, SE2)
                        </div>
                    </div>
                    <div class="tip-item">
                        <i class="fas fa-lightbulb text-yellow-500"></i>
                        <div>
                            <strong>Tìm kiếm theo ngày:</strong> Sử dụng định dạng YYYY-MM-DD
                        </div>
                    </div>
                    <div class="tip-item">
                        <i class="fas fa-lightbulb text-yellow-500"></i>
                        <div>
                            <strong>Tìm kiếm theo giờ:</strong> Sử dụng định dạng HH:MM
                        </div>
                    </div>
                    <div class="tip-item">
                        <i class="fas fa-lightbulb text-yellow-500"></i>
                        <div>
                            <strong>Tìm kiếm kết hợp:</strong> Có thể kết hợp nhiều từ khóa
                        </div>
                    </div>
                </div>
                <style>
                    .search-tips {
                        text-align: left;
                        margin: 20px 0;
                    }
                    .tip-item {
                        display: flex;
                        align-items: flex-start;
                        gap: 12px;
                        margin-bottom: 15px;
                        padding: 12px;
                        background: #f8fafc;
                        border-radius: 8px;
                        border-left: 4px solid #fbbf24;
                    }
                    .tip-item i {
                        margin-top: 2px;
                        flex-shrink: 0;
                    }
                    .tip-item div {
                        line-height: 1.5;
                    }
                </style>
            `,
            confirmButtonText: 'Đã hiểu',
            width: 600
        });
    }

    // ==================== DIALOG MANAGEMENT ====================

    openAddRecordDialog(): void {
        const dialogRef = this.dialog.open(AddRecordDialogComponent, {
            width: '800px',
            maxWidth: '95vw',
            data: {
                displayedColumns: this.displayedColumns,
                editableColumns: this.editableColumns,
                selectedTable: this.selectedTable
            }
        });

        dialogRef.afterClosed().subscribe(async (result) => {
            if (result && result.success) {
                await this.showSuccessMessage('Thành công', 'Đã thêm bản ghi mới!');
                await this.loadData();
            }
        });
    }
}