import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

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
    doc.rect(14, 40, 182, 35, 'F');
    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.text('RESUMEN DEL PERIODO', 20, 48);
    
    doc.setFontSize(9);
    doc.text(`Saldo Total: $${(profile?.saldo_total || 0).toLocaleString('de-DE')}`, 20, 56);
    doc.text(`Ingresos: $${stats.ingresos.toLocaleString('de-DE')}`, 20, 62);
    doc.text(`Egresos Totales: $${stats.egresos.toLocaleString('de-DE')}`, 20, 68);
    
    doc.text(`Gastos Fijos: $${stats.egresosFijos.toLocaleString('de-DE')}`, 100, 62);
    doc.text(`Gastos Variables: $${stats.egresosVariables.toLocaleString('de-DE')}`, 100, 68);

    // Table
    const tableData = transactions.map(t => {
      let tipoClasificacion = 'N/A';
      if (t.tipo === 'ingreso') {
        tipoClasificacion = 'INGRESO';
      } else {
        tipoClasificacion = t.categoria?.es_fijo ? 'FIJO' : 'VARIABLE';
      }

      return [
        format(new Date(t.fecha), 'dd/MM/yyyy'),
        tipoClasificacion,
        t.descripcion || 'Sin descripción',
        t.cuenta?.nombre || 'N/A',
        t.categoria?.nombre || 'General',
        `$${Number(t.monto).toLocaleString('de-DE')}`
      ];
    });

    autoTable(doc, {
      startY: 85,
      head: [['Fecha', 'Tipo', 'Descripción', 'Cuenta', 'Categoría', 'Monto']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 8 },
      columnStyles: {
        5: { halign: 'right' }
      }
    });

    doc.save(`LogiCash_Reporte_${format(new Date(), 'yyyyMMdd')}.pdf`);
  },

  exportToExcel: (transactions: any[]) => {
    const tableData = transactions.map(t => {
      let tipoClasificacion = 'N/A';
      if (t.tipo === 'ingreso') {
        tipoClasificacion = 'INGRESO';
      } else {
        tipoClasificacion = t.categoria?.es_fijo ? 'FIJO' : 'VARIABLE';
      }

      return {
        Fecha: format(new Date(t.fecha), 'yyyy-MM-dd'),
        Tipo: tipoClasificacion,
        Descripción: t.descripcion || 'Sin descripción',
        Cuenta: t.cuenta?.nombre || 'N/A',
        Categoría: t.categoria?.nombre || 'General',
        Monto: Number(t.monto)
      };
    });

    const ws = XLSX.utils.json_to_sheet(tableData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transacciones');
    
    XLSX.writeFile(wb, `LogiCash_Historial_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  }
};
