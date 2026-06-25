import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportarExcel = (datos, columnas, nombreArchivo) => {
  const filas = datos.map((row) =>
    Object.fromEntries(columnas.map(({ campo, header }) => [header, row[campo] ?? '']))
  );
  const ws = XLSX.utils.json_to_sheet(filas);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Datos');
  XLSX.writeFile(wb, `${nombreArchivo}.xlsx`);
};

export const exportarPDF = ({ titulo, subtitulo, columnas, datos, nombreArchivo }) => {
  const doc = new jsPDF({ orientation: 'landscape' });

  doc.setFontSize(14);
  doc.setTextColor(40);
  doc.text(titulo, 14, 16);

  if (subtitulo) {
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(subtitulo, 14, 23);
  }

  autoTable(doc, {
    startY: subtitulo ? 28 : 22,
    head: [columnas.map((c) => c.header)],
    body: datos.map((row) => columnas.map((c) => row[c.campo] ?? '')),
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [30, 30, 46], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 250] },
  });

  doc.save(`${nombreArchivo}.pdf`);
};
