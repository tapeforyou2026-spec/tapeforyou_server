const PDFDocument = require('pdfkit');

const PAGE_MARGIN = 36;
const ROW_HEIGHT = 20;
const HEADER_HEIGHT = 24;

// Generic tabular-report renderer shared by every /admin/reports/:type/pdf
// download — the 7 reports (Sales, GST, Inventory, Product, Customer,
// Courier, Refund) are all "rows of data with a title", so one imperative
// pdfkit table drawer covers all of them instead of writing 7 near-identical
// PDF layouts by hand (same reasoning as PackingSlipService: pdfkit is the
// only PDF renderer in this project, no HTML-to-PDF step).
class ReportPdfService {
  // columns: [{ label, key, width?, format? }]
  generateBuffer(title, columns, rows) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: PAGE_MARGIN, size: 'A4', layout: 'landscape' });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const pageWidth = doc.page.width - PAGE_MARGIN * 2;
      const fixedWidth = columns.reduce((sum, c) => sum + (c.width || 0), 0);
      const flexCols = columns.filter(c => !c.width).length;
      const flexWidth = flexCols > 0 ? (pageWidth - fixedWidth) / flexCols : 0;
      const colWidths = columns.map(c => c.width || flexWidth);

      const drawHeader = () => {
        doc.fontSize(16).fillColor('#0B8B87').text('TAPES FOR YOU', PAGE_MARGIN, PAGE_MARGIN);
        doc.fontSize(11).fillColor('#333').text(title, PAGE_MARGIN, PAGE_MARGIN + 20);
        doc.fontSize(8).fillColor('#888').text(`Generated ${new Date().toLocaleString('en-IN')}`, PAGE_MARGIN, PAGE_MARGIN + 34);
        return PAGE_MARGIN + 54;
      };

      const drawTableHeader = (y) => {
        doc.rect(PAGE_MARGIN, y, pageWidth, HEADER_HEIGHT).fill('#0B8B87');
        let x = PAGE_MARGIN;
        doc.fontSize(8).fillColor('#fff');
        columns.forEach((c, i) => {
          doc.text(c.label, x + 4, y + 7, { width: colWidths[i] - 8, ellipsis: true });
          x += colWidths[i];
        });
        return y + HEADER_HEIGHT;
      };

      let y = drawTableHeader(drawHeader());
      doc.fontSize(8);

      rows.forEach((row, idx) => {
        if (y + ROW_HEIGHT > doc.page.height - PAGE_MARGIN) {
          doc.addPage();
          y = drawTableHeader(PAGE_MARGIN);
        }
        if (idx % 2 === 1) doc.rect(PAGE_MARGIN, y, pageWidth, ROW_HEIGHT).fill('#f7f7f7');

        let x = PAGE_MARGIN;
        doc.fillColor('#222');
        columns.forEach((c, i) => {
          const raw = row[c.key];
          const text = c.format ? c.format(raw, row) : (raw ?? '—');
          doc.text(String(text), x + 4, y + 6, { width: colWidths[i] - 8, ellipsis: true });
          x += colWidths[i];
        });
        y += ROW_HEIGHT;
      });

      if (!rows.length) {
        doc.fontSize(10).fillColor('#888').text('No data for this report.', PAGE_MARGIN, y + 10);
      }

      doc.end();
    });
  }
}

module.exports = new ReportPdfService();
