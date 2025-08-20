import { Injectable } from '@angular/core';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';

export interface ExcelExportOptions {
    trainCodes: string[];
    dateRange?: {
        start: Date;
        end: Date;
    };
    includeAllColumns: boolean;
    selectedTable: string;
    fileName?: string;
}

export interface ExcelExportData {
    data: any[];
    columns: string[];
    totalRecords: number;
    filteredRecords: number;
}

@Injectable({
    providedIn: 'root'
})
export class ExcelExportService {

    /**
     * Main export method that handles the entire export process
     */
    async exportToExcel(
        sourceData: any[], 
        availableColumns: string[], 
        options: ExcelExportOptions
    ): Promise<boolean> {
        try {
            // Filter and prepare data
            const exportData = this.prepareExportData(sourceData, availableColumns, options);
            
            if (exportData.filteredRecords === 0) {
                await Swal.fire({
                    title: 'Không có dữ liệu',
                    text: 'Không có dữ liệu phù hợp với bộ lọc đã chọn',
                    icon: 'info',
                    confirmButtonText: 'Đóng'
                });
                return false;
            }

            // Create and download Excel file
            this.createAndDownloadExcel(exportData, options);
            
            // Show success message
            await this.showSuccessMessage(exportData, options);
            
            return true;
        } catch (error: any) {
            console.error('Excel export error:', error);
            await Swal.fire({
                title: 'Lỗi xuất Excel',
                text: `Không thể xuất file Excel: ${error.message}`,
                icon: 'error',
                confirmButtonText: 'Đóng'
            });
            return false;
        }
    }

    /**
     * Show export options dialog and return user selections
     */
    async showExportOptionsDialog(availableTrainCodes: string[], selectedTable: string): Promise<ExcelExportOptions | null> {
        const { value: formValues } = await Swal.fire({
            title: '<i class="fas fa-file-excel text-green-600"></i> Xuất Excel theo Mác tàu',
            html: this.buildExportDialogHtml(availableTrainCodes),
            width: '600px',
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: '<i class="fas fa-download"></i> Xuất Excel',
            cancelButtonText: '<i class="fas fa-times"></i> Hủy',
            customClass: {
                popup: 'export-dialog-popup',
                title: 'export-dialog-title',
                htmlContainer: 'export-dialog-content',
                confirmButton: 'export-confirm-btn',
                cancelButton: 'export-cancel-btn'
            },
            didOpen: () => {
                this.setupExportDialogEvents();
            },
            preConfirm: () => {
                return this.validateAndCollectFormData();
            }
        });

        if (!formValues) return null;

        return {
            ...formValues,
            selectedTable
        };
    }

    /**
     * Prepare data for export based on filters and options
     */
    private prepareExportData(
        sourceData: any[], 
        availableColumns: string[], 
        options: ExcelExportOptions
    ): ExcelExportData {
        let filteredData = [...sourceData];

        // Filter by train codes
        if (options.trainCodes.length > 0) {
            filteredData = filteredData.filter(row => 
                options.trainCodes.includes(row['Mác tàu'])
            );
        }

        // Filter by date range
        if (options.dateRange) {
            filteredData = filteredData.filter(row => {
                const arrivalDate = this.parseDate(row['Ngày giờ tàu đến ga']);
                if (!arrivalDate) return false;
                
                return arrivalDate >= options.dateRange!.start && 
                       arrivalDate <= options.dateRange!.end;
            });
        }

        // Select columns to export
        const columnsToExport = options.includeAllColumns 
            ? availableColumns 
            : this.getEditableColumns();

        // Format data for export
        const exportData = filteredData.map(row => {
            const exportRow: any = {};
            columnsToExport.forEach(col => {
                exportRow[col] = this.formatCellForExport(row[col], col);
            });
            return exportRow;
        });

        return {
            data: exportData,
            columns: columnsToExport,
            totalRecords: sourceData.length,
            filteredRecords: filteredData.length
        };
    }

    /**
     * Create Excel file and trigger download
     */
    private createAndDownloadExcel(exportData: ExcelExportData, options: ExcelExportOptions): void {
        // Create worksheet
        const worksheet = XLSX.utils.json_to_sheet(exportData.data, { skipHeader: false });
        
        // Auto-size columns and apply formatting
        this.formatWorksheet(worksheet, exportData.columns);

        // Create workbook
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Thống kê tàu');

        // Add metadata sheet
        this.addMetadataSheet(workbook, exportData, options);

        // Generate and download file
        const fileName = this.generateFileName(options);
        XLSX.writeFile(workbook, fileName);
    }

    /**
     * Format worksheet with styling and column sizing
     */
    private formatWorksheet(worksheet: XLSX.WorkSheet, columns: string[]): void {
        // Auto-size columns
        const colWidths = columns.map(col => {
            const maxLength = Math.max(col.length, 15);
            return { wch: Math.min(maxLength, 30) };
        });
        worksheet['!cols'] = colWidths;

        // Add header styling (if supported by the XLSX version)
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
            if (worksheet[cellAddress]) {
                worksheet[cellAddress].s = {
                    font: { bold: true, color: { rgb: "FFFFFF" } },
                    fill: { fgColor: { rgb: "4472C4" } },
                    alignment: { horizontal: "center", vertical: "center" }
                };
            }
        }
    }

    /**
     * Add metadata sheet with export information
     */
    private addMetadataSheet(workbook: XLSX.WorkBook, exportData: ExcelExportData, options: ExcelExportOptions): void {
        const metadata = [
            ['Thông tin xuất dữ liệu', ''],
            ['Thời gian xuất', new Date().toLocaleString('vi-VN')],
            ['Bảng dữ liệu', options.selectedTable],
            ['Số lượng mác tàu', options.trainCodes.length.toString()],
            ['Mác tàu được chọn', options.trainCodes.join(', ')],
            ['Khoảng thời gian', options.dateRange 
                ? `${options.dateRange.start.toLocaleDateString('vi-VN')} - ${options.dateRange.end.toLocaleDateString('vi-VN')}` 
                : 'Tất cả'],
            ['Tổng số bản ghi', exportData.totalRecords.toString()],
            ['Bản ghi được xuất', exportData.filteredRecords.toString()],
            ['Số cột được xuất', exportData.columns.length.toString()],
            ['Bao gồm tất cả cột', options.includeAllColumns ? 'Có' : 'Không']
        ];

        const metadataSheet = XLSX.utils.aoa_to_sheet(metadata);
        XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Thông tin');
    }

    /**
     * Build HTML for export options dialog
     */
    private buildExportDialogHtml(availableTrainCodes: string[]): string {
        return `
            <div class="export-form-container">
                <!-- Train Code Selection -->
                <div class="form-section">
                    <div class="section-header">
                        <i class="fas fa-train text-blue-600"></i>
                        <h3>Chọn Mác tàu</h3>
                    </div>
                    
                    <div class="train-selection-controls">
                        <button type="button" id="selectAllTrains" class="control-btn select-all">
                            <i class="fas fa-check-double"></i> Chọn tất cả
                        </button>
                        <button type="button" id="clearAllTrains" class="control-btn clear-all">
                            <i class="fas fa-times"></i> Bỏ chọn
                        </button>
                        <span class="selection-counter" id="selectionCounter">0 được chọn</span>
                    </div>
                    
                    <div class="train-codes-grid" id="trainCodesContainer">
                        ${availableTrainCodes.map(code => `
                            <label class="train-code-item">
                                <input type="checkbox" class="train-code-checkbox" value="${code}">
                                <span class="checkbox-custom"></span>
                                <span class="train-code-text">${code}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
                
                <!-- Date Range Selection -->
                <div class="form-section">
                    <div class="section-header">
                        <i class="fas fa-calendar-alt text-green-600"></i>
                        <h3>Khoảng thời gian (tùy chọn)</h3>
                    </div>
                    
                    <div class="date-range-container">
                        <div class="date-input-group">
                            <label>Từ ngày</label>
                            <input type="date" id="exportDateStart" class="date-input">
                        </div>
                        <div class="date-separator">
                            <i class="fas fa-arrow-right"></i>
                        </div>
                        <div class="date-input-group">
                            <label>Đến ngày</label>
                            <input type="date" id="exportDateEnd" class="date-input">
                        </div>
                    </div>
                </div>
                
                <!-- Export Options -->
                <div class="form-section">
                    <div class="section-header">
                        <i class="fas fa-cog text-purple-600"></i>
                        <h3>Tùy chọn xuất</h3>
                    </div>
                    
                    <div class="export-options">
                        <label class="option-item">
                            <input type="checkbox" id="includeAllColumns" checked>
                            <span class="checkbox-custom"></span>
                            <div class="option-content">
                                <span class="option-title">Bao gồm tất cả các cột</span>
                                <span class="option-description">Xuất tất cả cột dữ liệu (bao gồm cả cột chỉ đọc)</span>
                            </div>
                        </label>
                        
                        <label class="option-item">
                            <input type="checkbox" id="includeMetadata" checked>
                            <span class="checkbox-custom"></span>
                            <div class="option-content">
                                <span class="option-title">Bao gồm thông tin metadata</span>
                                <span class="option-description">Thêm sheet chứa thông tin về quá trình xuất</span>
                            </div>
                        </label>
                    </div>
                </div>
            </div>
            
            ${this.getDialogStyles()}
        `;
    }

    /**
     * Get CSS styles for the dialog
     */
    private getDialogStyles(): string {
        return `
            <style>
                .export-form-container {
                    padding: 20px 0;
                    max-height: 60vh;
                    overflow-y: auto;
                }
                
                .form-section {
                    margin-bottom: 24px;
                    background: #f8fafc;
                    border-radius: 8px;
                    padding: 16px;
                    border: 1px solid #e2e8f0;
                }
                
                .section-header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 12px;
                    padding-bottom: 8px;
                    border-bottom: 2px solid #e2e8f0;
                }
                
                .section-header h3 {
                    margin: 0;
                    font-size: 16px;
                    font-weight: 600;
                    color: #1f2937;
                }
                
                .train-selection-controls {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 12px;
                    flex-wrap: wrap;
                }
                
                .control-btn {
                    padding: 6px 12px;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 12px;
                    font-weight: 500;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 4px;
                }
                
                .select-all {
                    background: #10b981;
                    color: white;
                }
                .select-all:hover { background: #059669; }
                
                .clear-all {
                    background: #ef4444;
                    color: white;
                }
                .clear-all:hover { background: #dc2626; }
                
                .selection-counter {
                    padding: 4px 8px;
                    background: #e0e7ff;
                    color: #3730a3;
                    border-radius: 4px;
                    font-size: 11px;
                    font-weight: 600;
                    margin-left: auto;
                }
                
                .train-codes-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
                    gap: 8px;
                    max-height: 200px;
                    overflow-y: auto;
                    padding: 12px;
                    background: white;
                    border-radius: 6px;
                    border: 1px solid #d1d5db;
                }
                
                .train-code-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 8px 12px;
                    background: #ffffff;
                    border: 1px solid #e5e7eb;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-size: 13px;
                }
                
                .train-code-item:hover {
                    border-color: #3b82f6;
                    background: #f0f9ff;
                }
                
                .train-code-item:has(input:checked) {
                    border-color: #3b82f6;
                    background: #dbeafe;
                }
                
                .checkbox-custom {
                    width: 16px;
                    height: 16px;
                    border: 2px solid #d1d5db;
                    border-radius: 3px;
                    position: relative;
                    flex-shrink: 0;
                }
                
                .train-code-item:has(input:checked) .checkbox-custom {
                    background: #3b82f6;
                    border-color: #3b82f6;
                }
                
                .train-code-item:has(input:checked) .checkbox-custom::after {
                    content: '✓';
                    position: absolute;
                    top: -2px;
                    left: 2px;
                    color: white;
                    font-size: 11px;
                    font-weight: bold;
                }
                
                .train-code-item input[type="checkbox"] {
                    display: none;
                }
                
                .train-code-text {
                    font-weight: 500;
                    color: #374151;
                }
                
                .date-range-container {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    flex-wrap: wrap;
                }
                
                .date-input-group {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    flex: 1;
                    min-width: 140px;
                }
                
                .date-input-group label {
                    font-size: 12px;
                    font-weight: 500;
                    color: #6b7280;
                }
                
                .date-input {
                    padding: 8px 12px;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    font-size: 14px;
                    background: white;
                }
                
                .date-input:focus {
                    outline: none;
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }
                
                .date-separator {
                    color: #6b7280;
                    margin-top: 20px;
                }
                
                .export-options {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                
                .option-item {
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    padding: 12px;
                    background: white;
                    border: 1px solid #e5e7eb;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .option-item:hover {
                    border-color: #3b82f6;
                    background: #f8fafc;
                }
                
                .option-item:has(input:checked) {
                    border-color: #3b82f6;
                    background: #eff6ff;
                }
                
                .option-item input[type="checkbox"] {
                    display: none;
                }
                
                .option-content {
                    flex: 1;
                }
                
                .option-title {
                    display: block;
                    font-weight: 500;
                    color: #1f2937;
                    margin-bottom: 2px;
                }
                
                .option-description {
                    display: block;
                    font-size: 12px;
                    color: #6b7280;
                    line-height: 1.4;
                }
                
                /* Scrollbar styles */
                .train-codes-grid::-webkit-scrollbar,
                .export-form-container::-webkit-scrollbar {
                    width: 6px;
                }
                
                .train-codes-grid::-webkit-scrollbar-track,
                .export-form-container::-webkit-scrollbar-track {
                    background: #f1f5f9;
                    border-radius: 3px;
                }
                
                .train-codes-grid::-webkit-scrollbar-thumb,
                .export-form-container::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 3px;
                }
                
                .train-codes-grid::-webkit-scrollbar-thumb:hover,
                .export-form-container::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
                
                /* Custom SweetAlert2 styling */
                .export-dialog-title {
                    font-size: 18px !important;
                    color: #1f2937 !important;
                }
                
                .export-confirm-btn {
                    background: linear-gradient(135deg, #10b981, #059669) !important;
                    border: none !important;
                    padding: 10px 20px !important;
                    font-weight: 600 !important;
                }
                
                .export-cancel-btn {
                    background: #6b7280 !important;
                    border: none !important;
                    padding: 10px 20px !important;
                }
            </style>
        `;
    }

    /**
     * Setup event handlers for the dialog
     */
    private setupExportDialogEvents(): void {
        // Select all trains
        document.getElementById('selectAllTrains')?.addEventListener('click', () => {
            const checkboxes = document.querySelectorAll('.train-code-checkbox') as NodeListOf<HTMLInputElement>;
            checkboxes.forEach(cb => cb.checked = true);
            this.updateSelectionCounter();
        });

        // Clear all trains
        document.getElementById('clearAllTrains')?.addEventListener('click', () => {
            const checkboxes = document.querySelectorAll('.train-code-checkbox') as NodeListOf<HTMLInputElement>;
            checkboxes.forEach(cb => cb.checked = false);
            this.updateSelectionCounter();
        });

        // Update counter when individual checkboxes change
        document.querySelectorAll('.train-code-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateSelectionCounter();
            });
        });

        // Initialize counter
        this.updateSelectionCounter();
    }

    /**
     * Update the selection counter display
     */
    private updateSelectionCounter(): void {
        const counter = document.getElementById('selectionCounter');
        if (!counter) return;

        const checkedBoxes = document.querySelectorAll('.train-code-checkbox:checked');
        const count = checkedBoxes.length;
        counter.textContent = `${count} được chọn`;
        
        // Update counter styling based on selection
        counter.className = 'selection-counter';
        if (count > 0) {
            counter.style.background = '#dbeafe';
            counter.style.color = '#1d4ed8';
        } else {
            counter.style.background = '#fee2e2';
            counter.style.color = '#dc2626';
        }
    }

    /**
     * Validate form and collect data
     */
    private validateAndCollectFormData(): ExcelExportOptions | false {
        // Collect selected train codes
        const selectedCodes: string[] = [];
        const checkboxes = document.querySelectorAll('.train-code-checkbox:checked') as NodeListOf<HTMLInputElement>;
        checkboxes.forEach(cb => selectedCodes.push(cb.value));

        if (selectedCodes.length === 0) {
            Swal.showValidationMessage('Vui lòng chọn ít nhất một mác tàu để xuất dữ liệu');
            return false;
        }

        // Collect date range
        const startDate = (document.getElementById('exportDateStart') as HTMLInputElement)?.value;
        const endDate = (document.getElementById('exportDateEnd') as HTMLInputElement)?.value;

        // Validate date range
        if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
            Swal.showValidationMessage('Ngày bắt đầu không thể lớn hơn ngày kết thúc');
            return false;
        }

        // Collect other options
        const includeAllColumns = (document.getElementById('includeAllColumns') as HTMLInputElement)?.checked;
        const includeMetadata = (document.getElementById('includeMetadata') as HTMLInputElement)?.checked;

        return {
            trainCodes: selectedCodes,
            dateRange: startDate && endDate ? {
                start: new Date(startDate),
                end: new Date(endDate)
            } : undefined,
            includeAllColumns: includeAllColumns || false,
            selectedTable: '', // Will be set by caller
            fileName: '', // Will be generated
            metadata: includeMetadata
        } as any;
    }

    /**
     * Show success message after export
     */
    private async showSuccessMessage(exportData: ExcelExportData, options: ExcelExportOptions): Promise<void> {
        await Swal.fire({
            title: '<i class="fas fa-check-circle text-green-600"></i> Xuất thành công!',
            html: `
                <div class="success-message">
                    <div class="success-stats">
                        <div class="stat-item">
                            <i class="fas fa-train text-blue-500"></i>
                            <span><strong>${options.trainCodes.length}</strong> mác tàu</span>
                        </div>
                        <div class="stat-item">
                            <i class="fas fa-table text-green-500"></i>
                            <span><strong>${exportData.filteredRecords}</strong> bản ghi</span>
                        </div>
                        <div class="stat-item">
                            <i class="fas fa-columns text-purple-500"></i>
                            <span><strong>${exportData.columns.length}</strong> cột dữ liệu</span>
                        </div>
                    </div>
                    <p class="success-note">File Excel đã được tải xuống thành công</p>
                </div>
                
                <style>
                    .success-message {
                        text-align: center;
                        padding: 10px 0;
                    }
                    .success-stats {
                        display: flex;
                        justify-content: center;
                        gap: 20px;
                        margin: 15px 0;
                        flex-wrap: wrap;
                    }
                    .stat-item {
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        padding: 8px 12px;
                        background: #f8fafc;
                        border-radius: 8px;
                        border: 1px solid #e2e8f0;
                    }
                    .success-note {
                        color: #6b7280;
                        margin: 10px 0 0 0;
                        font-size: 14px;
                    }
                </style>
            `,
            icon: 'success',
            timer: 4000,
            timerProgressBar: true,
            confirmButtonText: 'Đóng'
        });
    }

    /**
     * Generate filename for the exported file
     */
    private generateFileName(options: ExcelExportOptions): string {
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
        const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
        
        const trainCodesStr = options.trainCodes.length <= 3 
            ? options.trainCodes.join('_').replace(/\s+/g, '')
            : `${options.trainCodes.length}tau`;
        
        const dateRangeStr = options.dateRange 
            ? `_${options.dateRange.start.toISOString().slice(0, 10).replace(/-/g, '')}_${options.dateRange.end.toISOString().slice(0, 10).replace(/-/g, '')}`
            : '';

        const columnsStr = options.includeAllColumns ? '_full' : '_basic';

        return `thongke_tau_${options.selectedTable}_${trainCodesStr}${dateRangeStr}${columnsStr}_${dateStr}_${timeStr}.xlsx`;
    }

    /**
     * Format cell value for Excel export
     */
    private formatCellForExport(value: any, columnName: string): any {
        if (!value) return '';

        // Handle datetime columns
        if (this.isDateTimeColumn(columnName)) {
            try {
                const date = new Date(value);
                if (!isNaN(date.getTime())) {
                    return date.toLocaleString('vi-VN', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                    });
                }
            } catch (error) {
                console.warn('Date formatting error:', error);
            }
        }

        // Handle numeric columns
        if (this.isNumericColumn(columnName) && typeof value === 'string') {
            const numValue = parseFloat(value);
            return isNaN(numValue) ? value : numValue;
        }

        return value;
    }

    /**
     * Parse date from various formats
     */
    private parseDate(dateStr: string): Date | null {
        if (!dateStr || dateStr.trim() === '') return null;

        try {
            // Try multiple date formats
            const formats = [
                // ISO format
                /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/,
                // DD/MM/YYYY format
                /^\d{2}\/\d{2}\/\d{4}/,
                // YYYY/MM/DD format
                /^\d{4}\/\d{2}\/\d{2}/
            ];

            for (const format of formats) {
                if (format.test(dateStr)) {
                    const date = new Date(dateStr);
                    if (!isNaN(date.getTime())) {
                        return date;
                    }
                }
            }

            // Fallback to direct parsing
            const date = new Date(dateStr);
            return isNaN(date.getTime()) ? null : date;
        } catch (error) {
            console.warn('Date parsing error:', error);
            return null;
        }
    }

    /**
     * Check if column contains datetime data
     */
    private isDateTimeColumn(column: string): boolean {
        return [
            'Ngày giờ tàu đến ga', 
            'Giờ bắt đầu dỡn cắt xe', 
            'Giờ kết thúc dỡn cắt xe',
            'Giờ bắt đầu nối xe', 
            'Giờ kết thúc nối xe', 
            'Ngày giờ tàu chạy'
        ].includes(column);
    }

    /**
     * Check if column contains numeric data
     */
    private isNumericColumn(column: string): boolean {
        return [
            'STT', 
            'Số lượng xe cắt', 
            'Số lượng xe nối',
            'Giờ dỡn cắt xe',
            'Giờ dỡn nối xe',
            'Tổng số giờ tàu dừng'
        ].includes(column);
    }

    /**
     * Get list of editable columns
     */
    private getEditableColumns(): string[] {
        return [
            "Mác tàu",
            "Ngày giờ tàu đến ga",
            "Giờ bắt đầu dỡn cắt xe",
            "Giờ kết thúc dỡn cắt xe",
            "Giờ bắt đầu nối xe",
            "Giờ kết thúc nối xe",
            "Số lượng xe cắt(ghi rõ số toa xe)",
            "Số lượng xe nối(ghi rõ số toa xe)",
            "Ngày giờ tàu chạy",
            "Số xe có vận đơn không phải của RAT"
        ];
    }
}