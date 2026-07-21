const ExcelJS = require('exceljs');
const { sequelize } = require('../models');
const R = require('../utils/response');
const ReportPdfService = require('../services/ReportPdfService');

async function fetchSalesReport({ from, to } = {}) {
  const dateFilter = from && to ? `AND DATE(o.created_at) BETWEEN '${from}' AND '${to}'` : '';
  const [rows] = await sequelize.query(`
    SELECT
      DATE(o.created_at) as date,
      COUNT(o.id) as total_orders,
      SUM(CASE WHEN o.payment_status = 'paid' THEN o.total ELSE 0 END) as revenue,
      SUM(CASE WHEN o.payment_status = 'paid' THEN o.gst_amount ELSE 0 END) as gst_collected,
      COUNT(CASE WHEN o.status = 'cancelled' THEN 1 END) as cancellations
    FROM orders o
    WHERE 1=1 ${dateFilter}
    GROUP BY DATE(o.created_at)
    ORDER BY date DESC
    LIMIT 90
  `);
  return rows;
}

async function fetchGstReport({ month, year } = {}) {
  // No CGST/SGST vs IGST split by buyer state exists (or is modeled) anywhere
  // in this codebase — the seller's "home state" for inter/intra-state
  // determination isn't tracked, so every order is always split 50/50 as
  // CGST+SGST. There is deliberately no `igst` column here; showing one
  // would just be a permanently-zero fake column (a previous version of the
  // admin UI referenced `igst` that never existed in this query at all).
  const [rows] = await sequelize.query(`
    SELECT
      oi.sku,
      oi.product_name,
      p.hsn_code,
      SUM(oi.quantity) as qty_sold,
      SUM(oi.total) as taxable_value,
      oi.gst_percent,
      SUM(oi.gst_amount) as total_gst,
      SUM(oi.gst_amount / 2) as cgst,
      SUM(oi.gst_amount / 2) as sgst
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    LEFT JOIN product_variants pv ON pv.id = oi.variant_id
    LEFT JOIN products p ON p.id = pv.product_id
    WHERE o.payment_status = 'paid'
      ${month ? `AND EXTRACT(MONTH FROM o.created_at) = ${parseInt(month, 10)}` : ''}
      ${year ? `AND EXTRACT(YEAR FROM o.created_at) = ${parseInt(year, 10)}` : ''}
    GROUP BY oi.sku, oi.product_name, p.hsn_code, oi.gst_percent
    ORDER BY total_gst DESC
  `);
  return rows;
}

async function fetchInventoryReport() {
  const [rows] = await sequelize.query(`
    SELECT
      pv.id as variant_id,
      pv.sku,
      p.name as product_name,
      c.name as category,
      pv.color,
      pv.width,
      pv.length,
      pv.stock_qty,
      pv.low_stock_alert,
      pv.mrp,
      pv.selling_price,
      (pv.stock_qty * pv.mrp) as mrp_value,
      (pv.stock_qty * pv.selling_price) as selling_value,
      COALESCE(si.incoming_qty, 0) as incoming_qty,
      CASE WHEN pv.stock_qty = 0 THEN 'Out of Stock'
           WHEN pv.stock_qty <= pv.low_stock_alert THEN 'Low Stock'
           ELSE 'In Stock' END as stock_status
    FROM product_variants pv
    JOIN products p ON p.id = pv.product_id
    JOIN categories c ON c.id = p.category_id
    LEFT JOIN (
      SELECT variant_id, SUM(quantity) as incoming_qty
      FROM stock_ins
      WHERE status = 'ordered'
      GROUP BY variant_id
    ) si ON si.variant_id = pv.id
    ORDER BY pv.stock_qty ASC
  `);
  return rows;
}

async function fetchCustomerReport() {
  const [rows] = await sequelize.query(`
    SELECT
      u.id,
      u.name,
      u.email,
      u.phone,
      COUNT(o.id) as total_orders,
      COALESCE(SUM(CASE WHEN o.payment_status = 'paid' THEN o.total ELSE 0 END), 0) as total_spent,
      MAX(o.created_at) as last_order_date
    FROM users u
    LEFT JOIN orders o ON o.user_id = u.id
    GROUP BY u.id, u.name, u.email, u.phone
    ORDER BY total_spent DESC
    LIMIT 100
  `);
  return rows;
}

// New — per-product sales performance. Stock is summed via a separate
// subquery rather than SUM(pv.stock_qty) in the main GROUP BY: the main query
// already fans out one row per order_item per variant, so summing stock_qty
// directly there would multiply a variant's stock by however many times it
// was ordered.
async function fetchProductReport() {
  const [rows] = await sequelize.query(`
    SELECT
      p.id,
      p.name as product_name,
      c.name as category,
      p.hsn_code,
      COALESCE(SUM(CASE WHEN o.payment_status = 'paid' THEN oi.quantity ELSE 0 END), 0) as qty_sold,
      COALESCE(SUM(CASE WHEN o.payment_status = 'paid' THEN oi.total ELSE 0 END), 0) as revenue,
      COUNT(DISTINCT CASE WHEN o.payment_status = 'paid' THEN oi.order_id END) as order_count,
      COALESCE(stock.total_stock, 0) as current_stock,
      p.avg_rating
    FROM products p
    JOIN categories c ON c.id = p.category_id
    LEFT JOIN product_variants pv ON pv.product_id = p.id
    LEFT JOIN order_items oi ON oi.variant_id = pv.id
    LEFT JOIN orders o ON o.id = oi.order_id
    LEFT JOIN (
      SELECT product_id, SUM(stock_qty) as total_stock FROM product_variants GROUP BY product_id
    ) stock ON stock.product_id = p.id
    GROUP BY p.id, c.name, stock.total_stock
    ORDER BY revenue DESC
    LIMIT 200
  `);
  return rows;
}

// New — per-shipment courier performance (not aggregated by courier, to stay
// consistent with the other reports here which are all per-row detail
// listings, e.g. GST is per-SKU not per-month).
async function fetchCourierReport() {
  const [rows] = await sequelize.query(`
    SELECT
      o.order_number,
      u.name as customer_name,
      s.courier_name,
      s.awb_code,
      s.status,
      s.created_at as shipped_at,
      s.delivered_at,
      CASE WHEN s.delivered_at IS NOT NULL
           THEN EXTRACT(DAY FROM (s.delivered_at - s.created_at))
           END as days_to_deliver
    FROM shipments s
    JOIN orders o ON o.id = s.order_id
    JOIN users u ON u.id = o.user_id
    ORDER BY s.created_at DESC
    LIMIT 200
  `);
  return rows;
}

// New — there is no dedicated Refund model; refunds are tracked on the
// existing Payment row (refund_id/refund_amount/refunded_at, populated
// wherever the Razorpay refund flow is triggered), so this reads from
// `payments` filtered to refunded/partially_refunded rather than a separate
// refunds table.
async function fetchRefundReport() {
  const [rows] = await sequelize.query(`
    SELECT
      o.order_number,
      u.name as customer_name,
      p.method,
      p.amount,
      p.refund_amount,
      p.refund_id,
      p.refunded_at,
      o.status as order_status,
      o.cancel_reason
    FROM payments p
    JOIN orders o ON o.id = p.order_id
    JOIN users u ON u.id = o.user_id
    WHERE p.status IN ('refunded', 'partially_refunded')
    ORDER BY p.refunded_at DESC NULLS LAST
    LIMIT 200
  `);
  return rows;
}

// `format` is always invoked by ReportPdfService as `format(rawValue, row)` —
// a `digits` second parameter here would silently receive the whole `row`
// object instead of a number, which is exactly what broke every PDF
// (`RangeError: minimumFractionDigits value is out of range`, since
// toLocaleString rejects a non-numeric option value).
const num = (v) => `Rs ${parseFloat(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateFmt = (v) => v ? new Date(v).toLocaleDateString('en-IN') : '-';
const datetimeFmt = (v) => v ? new Date(v).toLocaleString('en-IN') : '-';

// Registry driving the generic PDF download route below — each entry's
// `fetch` is the exact same function backing that report's JSON endpoint, so
// the PDF can never drift out of sync with what the admin sees on-screen.
const REPORTS = {
  sales: {
    title: 'Sales Report',
    fetch: fetchSalesReport,
    columns: [
      { label: 'Date', key: 'date', width: 80, format: dateFmt },
      { label: 'Orders', key: 'total_orders', width: 60 },
      { label: 'Revenue', key: 'revenue', width: 90, format: num },
      { label: 'GST Collected', key: 'gst_collected', width: 90, format: num },
      { label: 'Cancellations', key: 'cancellations', width: 90 },
    ],
  },
  gst: {
    title: 'GST Report',
    fetch: fetchGstReport,
    columns: [
      { label: 'SKU', key: 'sku', width: 110 },
      { label: 'Product', key: 'product_name' },
      { label: 'HSN', key: 'hsn_code', width: 70 },
      { label: 'GST%', key: 'gst_percent', width: 50 },
      { label: 'Qty', key: 'qty_sold', width: 50 },
      { label: 'Taxable Value', key: 'taxable_value', width: 90, format: num },
      { label: 'CGST', key: 'cgst', width: 80, format: num },
      { label: 'SGST', key: 'sgst', width: 80, format: num },
      { label: 'Total GST', key: 'total_gst', width: 90, format: num },
    ],
  },
  inventory: {
    title: 'Inventory Report',
    fetch: fetchInventoryReport,
    columns: [
      { label: 'SKU', key: 'sku', width: 110 },
      { label: 'Product', key: 'product_name' },
      { label: 'Category', key: 'category', width: 100 },
      { label: 'Stock', key: 'stock_qty', width: 55 },
      { label: 'Incoming', key: 'incoming_qty', width: 65 },
      { label: 'Status', key: 'stock_status', width: 85 },
      { label: 'MRP Value', key: 'mrp_value', width: 90, format: num },
      { label: 'Selling Value', key: 'selling_value', width: 90, format: num },
    ],
  },
  customers: {
    title: 'Customer Report',
    fetch: fetchCustomerReport,
    columns: [
      { label: 'Name', key: 'name', width: 130 },
      { label: 'Email', key: 'email', width: 170 },
      { label: 'Phone', key: 'phone', width: 90 },
      { label: 'Orders', key: 'total_orders', width: 60 },
      { label: 'Total Spent', key: 'total_spent', width: 100, format: num },
      { label: 'Last Order', key: 'last_order_date', width: 90, format: dateFmt },
    ],
  },
  products: {
    title: 'Product Report',
    fetch: fetchProductReport,
    columns: [
      { label: 'Product', key: 'product_name' },
      { label: 'Category', key: 'category', width: 100 },
      { label: 'HSN', key: 'hsn_code', width: 70 },
      { label: 'Qty Sold', key: 'qty_sold', width: 70 },
      { label: 'Revenue', key: 'revenue', width: 90, format: num },
      { label: 'Orders', key: 'order_count', width: 60 },
      { label: 'Current Stock', key: 'current_stock', width: 85 },
      { label: 'Rating', key: 'avg_rating', width: 60 },
    ],
  },
  courier: {
    title: 'Courier Report',
    fetch: fetchCourierReport,
    columns: [
      { label: 'Order #', key: 'order_number', width: 100 },
      { label: 'Customer', key: 'customer_name', width: 120 },
      { label: 'Courier', key: 'courier_name', width: 100 },
      { label: 'AWB', key: 'awb_code', width: 100 },
      { label: 'Status', key: 'status', width: 90 },
      { label: 'Shipped', key: 'shipped_at', width: 80, format: dateFmt },
      { label: 'Delivered', key: 'delivered_at', width: 80, format: dateFmt },
      { label: 'Days', key: 'days_to_deliver', width: 50 },
    ],
  },
  refunds: {
    title: 'Refund Report',
    fetch: fetchRefundReport,
    columns: [
      { label: 'Order #', key: 'order_number', width: 100 },
      { label: 'Customer', key: 'customer_name', width: 120 },
      { label: 'Method', key: 'method', width: 70 },
      { label: 'Paid Amount', key: 'amount', width: 90, format: num },
      { label: 'Refund Amount', key: 'refund_amount', width: 95, format: num },
      { label: 'Refunded On', key: 'refunded_at', width: 100, format: datetimeFmt },
      { label: 'Reason', key: 'cancel_reason' },
    ],
  },
};

exports.salesReport = async (req, res) => R.success(res, 'Sales report', await fetchSalesReport(req.query));
exports.gstReport = async (req, res) => R.success(res, 'GST report', await fetchGstReport(req.query));
exports.inventoryReport = async (req, res) => R.success(res, 'Inventory report', await fetchInventoryReport());
exports.customerReport = async (req, res) => R.success(res, 'Customer report', await fetchCustomerReport());
exports.productReport = async (req, res) => R.success(res, 'Product report', await fetchProductReport());
exports.courierReport = async (req, res) => R.success(res, 'Courier report', await fetchCourierReport());
exports.refundReport = async (req, res) => R.success(res, 'Refund report', await fetchRefundReport());

exports.downloadReportPdf = async (req, res) => {
  const cfg = REPORTS[req.params.type];
  if (!cfg) return R.notFound(res, 'Unknown report type');

  const rows = await cfg.fetch(req.query);
  const buffer = await ReportPdfService.generateBuffer(cfg.title, cfg.columns, rows);
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${cfg.title.replace(/\s+/g, '-')}.pdf"`,
  });
  return res.send(buffer);
};

// Excel export — reuses the exact same `fetch`/`columns` as the PDF above
// (same REPORTS registry), so this can never show different numbers than
// what's on-screen or in the PDF. Opens directly in Excel; same underlying
// library (exceljs) this project already uses for the newsletter-subscribers
// export (NewsletterController.adminExport) — same pattern, not a new one.
exports.downloadReportExcel = async (req, res) => {
  const cfg = REPORTS[req.params.type];
  if (!cfg) return R.notFound(res, 'Unknown report type');

  const rows = await cfg.fetch(req.query);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(cfg.title.slice(0, 31)); // Excel sheet-name limit
  sheet.columns = cfg.columns.map((c) => ({ header: c.label, key: c.key, width: Math.max(12, Math.round((c.width || 100) / 7)) }));
  sheet.getRow(1).font = { bold: true };

  rows.forEach((row) => {
    const values = {};
    cfg.columns.forEach((c) => {
      values[c.key] = c.format ? c.format(row[c.key], row) : row[c.key];
    });
    sheet.addRow(values);
  });

  res.set({
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="${cfg.title.replace(/\s+/g, '-')}.xlsx"`,
  });
  await workbook.xlsx.write(res);
  res.end();
};
