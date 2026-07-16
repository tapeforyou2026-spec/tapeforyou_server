const PDFDocument = require('pdfkit');

// Deliberately no prices/GST anywhere on this document — a packing slip is a
// warehouse pick-and-pack reference, not a billing document (that's what
// InvoiceService is for). Generated on-demand and returned as a Buffer
// (not persisted to disk or a DB row like invoices) since it isn't a legal
// document that needs to stay byte-identical/archived — nothing depends on
// re-fetching the exact same file later.
class PackingSlipService {
  generateBuffer(order) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(22).fillColor('#0B8B87').text('TAPES FOR YOU', 50, 50);
      doc.fontSize(10).fillColor('#555').text('Good Leaf Packing Industry', 50, 80);

      doc.fontSize(14).fillColor('#000').text('PACKING SLIP', 400, 50, { align: 'right' });
      doc.fontSize(10).fillColor('#555')
        .text(`Order: #${order.order_number}`, 400, 70, { align: 'right' })
        .text(`Date: ${new Date(order.created_at).toLocaleDateString('en-IN')}`, 400, 85, { align: 'right' });

      doc.moveTo(50, 115).lineTo(550, 115).stroke('#0B8B87');

      if (order.shipping_address) {
        const addr = order.shipping_address;
        doc.fontSize(11).fillColor('#000').text('Ship To:', 50, 130);
        doc.fontSize(10).fillColor('#333')
          .text(addr.name, 50, 145)
          .text(addr.line1 + (addr.line2 ? `, ${addr.line2}` : ''), 50, 158)
          .text(`${addr.city}, ${addr.state} - ${addr.pincode}`, 50, 171)
          .text(addr.phone || '', 50, 184);
      }

      let y = 220;
      doc.rect(50, y, 500, 20).fill('#0B8B87');
      doc.fontSize(9).fillColor('#fff')
        .text('Product', 55, y + 5)
        .text('SKU', 260, y + 5)
        .text('Variant', 340, y + 5)
        .text('Qty', 500, y + 5);

      y += 25;
      doc.fillColor('#000');
      let totalQty = 0;
      for (const item of order.items || []) {
        const variant = [item.width, item.length, item.color].filter(Boolean).join(' / ');
        doc.fontSize(8)
          .text(item.product_name.substring(0, 40), 55, y, { width: 200 })
          .text(item.sku, 260, y)
          .text(variant.substring(0, 25) || '—', 340, y, { width: 150 })
          .text(String(item.quantity), 500, y);
        totalQty += item.quantity;
        y += 20;
        if (y > 700) { doc.addPage(); y = 50; }
      }

      doc.moveTo(50, y + 5).lineTo(550, y + 5).stroke('#ccc');
      y += 15;
      doc.fontSize(10).fillColor('#000').text(`Total Items: ${(order.items || []).length}    Total Quantity: ${totalQty}`, 50, y);

      y += 50;
      doc.fontSize(9).fillColor('#555')
        .text('Packed By: ______________________', 50, y)
        .text('Checked By: ______________________', 320, y);

      doc.end();
    });
  }
}

module.exports = new PackingSlipService();
