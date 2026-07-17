const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { Invoice } = require('../models');
const { generateInvoiceNumber } = require('../utils/crypto');
const { splitGST } = require('../utils/gst');

class InvoiceService {
  async generateForOrder(order) {
    const invoiceNumber = generateInvoiceNumber();
    const invoiceDate = new Date().toISOString().split('T')[0];
    const invoicesDir = path.join(process.cwd(), 'src/uploads/invoices');
    fs.mkdirSync(invoicesDir, { recursive: true });
    const filePath = path.join(invoicesDir, `${invoiceNumber}.pdf`);

    const subtotal = parseFloat(order.subtotal);
    const gstAmount = parseFloat(order.gst_amount);
    const { cgst, sgst, igst } = splitGST(gstAmount, order.is_b2b);

    await this.generatePDF({ order, invoiceNumber, invoiceDate, filePath, cgst, sgst, igst });

    const invoice = await Invoice.create({
      order_id: order.id,
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate,
      file_path: `/uploads/invoices/${invoiceNumber}.pdf`,
      subtotal,
      cgst,
      sgst,
      igst,
      total_gst: gstAmount,
      total: parseFloat(order.total),
      is_inter_state: false,
    });

    return invoice;
  }

  async generatePDF({ order, invoiceNumber, invoiceDate, filePath, cgst, sgst, igst }) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // Header
      doc.fontSize(22).fillColor('#0B8B87').text('TAPES FOR YOU', 50, 50);
      doc.fontSize(10).fillColor('#555')
        .text('Good Leaf Packing Industry', 50, 80)
        .text('GST Invoice', 50, 95);

      doc.fontSize(14).fillColor('#000').text('TAX INVOICE', 400, 50, { align: 'right' });
      doc.fontSize(10).fillColor('#555')
        .text(`Invoice No: ${invoiceNumber}`, 400, 70, { align: 'right' })
        .text(`Date: ${invoiceDate}`, 400, 85, { align: 'right' })
        .text(`Order: #${order.order_number}`, 400, 100, { align: 'right' });

      doc.moveTo(50, 120).lineTo(550, 120).stroke('#0B8B87');

      // Bill To
      if (order.shipping_address) {
        doc.fontSize(11).fillColor('#000').text('Bill To:', 50, 135);
        doc.fontSize(10).fillColor('#333')
          .text(order.shipping_address.name, 50, 150)
          .text(order.shipping_address.line1, 50, 163)
          .text(`${order.shipping_address.city}, ${order.shipping_address.state} - ${order.shipping_address.pincode}`, 50, 176);
      }

      // Items table header
      let y = 220;
      doc.rect(50, y, 500, 20).fill('#0B8B87');
      doc.fontSize(9).fillColor('#fff')
        .text('Product', 55, y + 5)
        .text('SKU', 200, y + 5)
        .text('Qty', 300, y + 5)
        .text('Rate', 340, y + 5)
        .text('GST%', 390, y + 5)
        .text('GST Amt', 430, y + 5)
        .text('Total', 490, y + 5);

      y += 25;
      doc.fillColor('#000');
      for (const item of order.items || []) {
        doc.fontSize(8)
          .text(item.product_name.substring(0, 35), 55, y)
          .text(item.sku, 200, y)
          .text(item.quantity, 310, y)
          .text(`₹${item.unit_price}`, 340, y)
          .text(`${item.gst_percent}%`, 395, y)
          .text(`₹${item.gst_amount}`, 430, y)
          .text(`₹${item.total}`, 490, y);
        y += 18;
        if (y > 700) { doc.addPage(); y = 50; }
      }

      doc.moveTo(50, y + 5).lineTo(550, y + 5).stroke('#ccc');
      y += 15;

      // Totals
      const totalsX = 380;
      doc.fontSize(9).fillColor('#333')
        .text('Subtotal:', totalsX, y).text(`₹${order.subtotal}`, 490, y);
      y += 14;
      if (cgst > 0) {
        doc.text(`CGST (9%):`, totalsX, y).text(`₹${cgst}`, 490, y); y += 14;
        doc.text(`SGST (9%):`, totalsX, y).text(`₹${sgst}`, 490, y); y += 14;
      }
      if (igst > 0) {
        doc.text(`IGST (18%):`, totalsX, y).text(`₹${igst}`, 490, y); y += 14;
      }
      if (parseFloat(order.coupon_discount) > 0) {
        doc.fillColor('green').text(`Discount:`, totalsX, y).text(`-₹${order.coupon_discount}`, 490, y); y += 14;
      }
      doc.fillColor('#000');
      if (parseFloat(order.shipping_charge) > 0) {
        doc.text(`Shipping:`, totalsX, y).text(`₹${order.shipping_charge}`, 490, y); y += 14;
      }
      doc.rect(totalsX - 5, y, 175, 20).fill('#0B8B87');
      doc.fontSize(11).fillColor('#fff')
        .text('TOTAL:', totalsX, y + 4).text(`₹${order.total}`, 490, y + 4);

      doc.end();
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
  }
}

module.exports = new InvoiceService();
