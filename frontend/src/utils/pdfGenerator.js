import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generarPDFTransferencia = ({ 
  fecha, 
  hora, 
  cantidad, 
  origen, 
  destino, 
  usuario, 
  cliente,
  polin,
  color
}) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Encabezado
  doc.setFontSize(20);
  doc.setTextColor(40);
  doc.text('Sistema de Control de Polines', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(16);
  doc.text('Comprobante de Transferencia Interna', pageWidth / 2, 30, { align: 'center' });
  
  doc.setLineWidth(0.5);
  doc.line(20, 35, pageWidth - 20, 35);

  // Información General
  doc.setFontSize(12);
  doc.setTextColor(0);
  
  const startY = 50;

  doc.setFont('helvetica', 'bold');
  doc.text('Detalles de la Operación:', 20, startY);
  
  doc.setFont('helvetica', 'normal');
  autoTable(doc, {
    startY: startY + 5,
    margin: { left: 20, right: 20 },
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229] }, // Color primario índigo
    body: [
      ['Fecha:', fecha],
      ['Hora:', hora],
      ['Usuario Solicitante:', usuario],
      ['Cliente Propietario:', cliente],
      ['Tipo de Polín:', polin],
      ['Color:', color],
      ['Estado Origen:', origen],
      ['Estado Destino:', destino],
      ['CANTIDAD TRANSFERIDA:', String(cantidad)],
    ],
    styles: { fontSize: 11, cellPadding: 4 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { cellWidth: 'auto' }
    }
  });

  // Pie de página o nota
  const finalY = doc.lastAutoTable.finalY + 20;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.text('Nota: Esta transferencia es un movimiento interno de inventario y no representa salida física de material de las instalaciones.', 20, finalY, { maxWidth: pageWidth - 40 });
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Documento generado automáticamente por el Sistema de Control de Polines el ${new Date().toLocaleString()}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });

  // Guardar el PDF
  const filename = `Transferencia_${cliente.replace(/\s+/g, '_')}_${fecha.replace(/\//g, '-')}.pdf`;
  doc.save(filename);
};
