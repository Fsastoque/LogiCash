import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Extend jsPDF with autotable plugin
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export const ExportService = {
  exportToPDF: (transactions: any[], stats: any, profile: any) => {
    const doc = new jsPDF();
    const dateStr = format(new Date(), 'dd/MM/yyyy HH:mm');

    // Header
    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229); // indigo-600
    doc.text('LogiCash - Reporte Financiero', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generado el: ${dateStr}`, 14, 28);
    doc.text(`Usuario: ${profile?.email || 'N/A'}`, 14, 33);

    // Summary Box
    doc.setFillColor(245, 245, 247);
    doc.rect(14, 40, 182, 30, 'F');
    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.text('RESUMEN DEL PERIODO', 20, 48);
    
    doc.setFontSize(10);
    doc.text(`Saldo Total: $${(profile?.saldo_total || 0).toLocaleString('de-DE')}`, 20, 56);
    doc.text(`Total Ingresos: $${stats.ingresos.toLocaleString('de-DE')}`, 20, 62);
    doc.text(`Total Egresos: $${stats.egresos.toLocaleString('de-DE')}`, 100, 62);

    // Table
    const tableData = transactions.map(t => [
      format(new Date(t.fecha), 'dd/MM/yyyy'),
      t.descripcion || 'Sin descripción',
      t.cuenta?.nombre || 'N/A',
      t.categoria?.nombre || 'General',
      t.tipo.toUpperCase(),
      `$${Number(t.monto).toLocaleString('de-DE')}`
    ]);

    doc.autoTable({
      startY: 80,
      head: [['Fecha', 'Descripción', 'Cuenta', 'Categoría', 'Tipo', 'Monto']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillStyle: [79, 70, 229] },
      styles: { fontSize: 8 },
      columnStyles: {
        5: { halign: 'right' }
      }
    });

    doc.save(`LogiCash_Reporte_${format(new Date(), 'yyyyMMdd')}.pdf`);
  },

  exportToExcel: (transactions: any[]) => {
    const tableData = transactions.map(t => ({
      Fecha: format(new Date(t.fecha), 'yyyy-MM-dd'),
      Descripción: t.descripcion || 'Sin descripción',
      Cuenta: t.cuenta?.nombre || 'N/A',
      Categoría: t.categoria?.nombre || 'General',
      Tipo: t.tipo.toUpperCase(),
      Monto: Number(t.monto)
    }));

    const ws = XLSX.utils.json_to_sheet(tableData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transacciones');
    
    XLSX.writeFile(wb, `LogiCash_Historial_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  }
};
