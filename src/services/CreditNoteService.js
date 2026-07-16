const PDFDocument = require('pdfkit');

// Generated on-demand from the existing Invoice + Payment rows, the same
// way PackingSlipService works — there is no dedicated `credit_notes` table.
// A credit note only ever needs to exist for orders that already have both
// an Invoice and a refunded Payment, and its numbering (CN-<invoice number>)
// is derived deterministically from the invoice it's reversing, so nothing
// needs to be persisted to reproduce the exact same document later.
class CreditNoteService {
  generateBuffer({ order, invoice, payment }) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const refundAmount = parseFloat(payment.refund_amount || payment.amount);
      const invoiceTotal = parseFloat(invoice.total);
      const ratio = invoiceTotal > 0 ? Math.min(refundAmount / invoiceTotal, 1) : 1;
      const reversedGst = parseFloat((parseFloat(invoice.total_gst) * ratio).toFixed(2));
      const reversedCgst = parseFloat((parseFloat(invoice.cgst) * ratio).toFixed(2));
      const reversedSgst = parseFloat((parseFloat(invoice.sgst) * ratio).toFixed(2));
      const reversedIgst = parseFloat((parseFloat(invoice.igst) * ratio).toFixed(2));
      const reversedTaxable = parseFloat((refundAmount - reversedGst).toFixed(2));

      doc.fontSize(22).fillColor('#0B8B87').text('TAPES FOR YOU', 50, 50);
      doc.fontSize(10).fillColor('#555').text('Good Leaf Packing Industry', 50, 80);

      doc.fontSize(14).fillColor('#000').text('CREDIT NOTE', 400, 50, { align: 'right' });
      doc.fontSize(10).fillColor('#555')
        .text(`Credit Note No: CN-${invoice.invoice_number}`, 400, 70, { align: 'right' })
        .text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 400, 85, { align: 'right' })
        .text(`Against Invoice: ${invoice.invoice_number}`, 400, 100, { align: 'right' })
        .text(`Order: #${order.order_number}`, 400, 115, { align: 'right' });

      doc.moveTo(50, 135).lineTo(550, 135).stroke('#0B8B87');

      if (order.shipping_address) {
        const addr = order.shipping_address;
        doc.fontSize(11).fillColor('#000').text('Customer:', 50, 150);
        doc.fontSize(10).fillColor('#333')
          .text(addr.name, 50, 165)
          .text(addr.line1, 50, 178)
          .text(`${addr.city}, ${addr.state} - ${addr.pincode}`, 50, 191);
      }

      let y = 230;
      doc.rect(50, y, 500, 20).fill('#0B8B87');
      doc.fontSize(9).fillColor('#fff')
        .text('Description', 55, y + 5)
        .text('Taxable Value', 260, y + 5)
        .text('CGST', 360, y + 5)
        .text('SGST', 410, y + 5)
        .text('IGST', 460, y + 5)
        .text('Amount', 500, y + 5);

      y += 25;
      doc.fontSize(9).fillColor('#000')
        .text(order.cancel_reason ? `Refund — ${order.cancel_reason}` : 'Refund adjustment', 55, y, { width: 195 })
        .text(`₹${reversedTaxable.toFixed(2)}`, 260, y)
        .text(`₹${reversedCgst.toFixed(2)}`, 360, y)
        .text(`₹${reversedSgst.toFixed(2)}`, 410, y)
        .text(`₹${reversedIgst.toFixed(2)}`, 460, y)
        .text(`₹${refundAmount.toFixed(2)}`, 500, y);

      y += 30;
      doc.moveTo(50, y).lineTo(550, y).stroke('#ccc');
      y += 15;

      doc.rect(370, y, 180, 22).fill('#0B8B87');
      doc.fontSize(11).fillColor('#fff').text('TOTAL CREDIT:', 375, y + 5).text(`₹${refundAmount.toFixed(2)}`, 500, y + 5);

      y += 50;
      doc.fontSize(8).fillColor('#888').text('This is a system-generated credit note issued against the refund recorded for this order.', 50, y);

      doc.end();
    });
  }
}

module.exports = new CreditNoteService();
