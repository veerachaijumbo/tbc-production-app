import * as XLSX from 'xlsx';

/**
 * Export data to Excel file (.xlsx)
 */
export function exportToExcel(data, filename, sheetName = 'Sheet1') {
  if (!data || data.length === 0) {
    alert('ไม่มีข้อมูลให้ export');
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(data);

  // Auto column width
  const colWidths = Object.keys(data[0]).map((key) => ({
    wch: Math.max(
      key.length,
      ...data.map((row) => String(row[key] ?? '').length)
    ) + 2,
  }));
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const today = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${filename}-${today}.xlsx`);
}

/**
 * Format date for Excel display
 */
export function formatDateForExcel(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleString('th-TH', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  });
}