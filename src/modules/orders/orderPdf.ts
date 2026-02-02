import PDFDocument from "pdfkit";

type OrderItem = {
  quantity: number;
  price: number;
  product: { name: string };
};

type OrderForPdf = {
  id: string;
  name: string;
  totalAmount: number;
  discount: number;
  status: string;
  paymentMethod: string | null;
  createdAt: Date;
  items: OrderItem[];
  createdBy: { name: string | null; email: string } | null;
  organization: { name: string };
};

const MARGIN = 50;
const PAGE_WIDTH = 595; // A4 width in points
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

function formatDate(d: Date): string {
  return new Date(d).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(amount: number): string {
  return "$" + new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Builds a PDF buffer for the given order.
 */
export function buildOrderPdf(order: OrderForPdf): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: MARGIN });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    let y = MARGIN;

    // ========== HEADER ==========
    // Title
    doc.fontSize(22).font("Helvetica-Bold")
      .text("ORDER RECEIPT", MARGIN, y, { align: "center", width: CONTENT_WIDTH });
    y = doc.y + 8;

    // Store name
    doc.fontSize(16).font("Helvetica-Bold")
      .text(order.organization.name, MARGIN, y, { align: "center", width: CONTENT_WIDTH });
    y = doc.y + 20;

    // Divider line
    doc.strokeColor("#cccccc").lineWidth(1)
      .moveTo(MARGIN, y).lineTo(PAGE_WIDTH - MARGIN, y).stroke();
    y += 20;

    // ========== ORDER INFO (Two columns) ==========
    const labelWidth = 120;
    const valueWidth = 150;
    const col1X = MARGIN;
    const col2X = MARGIN + 270;
    const lineHeight = 18;

    doc.fontSize(10).font("Helvetica");

    // Row 1: Order # & Date
    const orderNumber = order.id.slice(-3).padStart(3, "0");
    doc.font("Helvetica-Bold").text("Order #:", col1X, y, { continued: false });
    doc.font("Helvetica").text(orderNumber, col1X + labelWidth, y);
    doc.font("Helvetica-Bold").text("Date:", col2X, y);
    doc.font("Helvetica").text(formatDate(order.createdAt), col2X + 80, y);
    y += lineHeight;

    // Row 2: Order Name & Status
    doc.font("Helvetica-Bold").text("Order Name:", col1X, y);
    doc.font("Helvetica").text(order.name || "—", col1X + labelWidth, y);
    doc.font("Helvetica-Bold").text("Status:", col2X, y);
    doc.font("Helvetica").text(order.status, col2X + 80, y);
    y += lineHeight;

    // Row 3: Payment & Created By
    doc.font("Helvetica-Bold").text("Payment:", col1X, y);
    doc.font("Helvetica").text(order.paymentMethod || "—", col1X + labelWidth, y);
    if (order.createdBy?.name || order.createdBy?.email) {
      doc.font("Helvetica-Bold").text("Created By:", col2X, y);
      doc.font("Helvetica").text(order.createdBy.name || order.createdBy.email, col2X + 80, y);
    }
    y += 25;

    // Divider line
    doc.strokeColor("#cccccc")
      .moveTo(MARGIN, y).lineTo(PAGE_WIDTH - MARGIN, y).stroke();
    y += 15;

    // ========== ITEMS TABLE ==========
    // Table column positions
    const colItem = MARGIN;
    const colQty = MARGIN + 280;
    const colPrice = MARGIN + 340;
    const colTotal = MARGIN + 420;

    const colItemW = 270;
    const colQtyW = 50;
    const colPriceW = 70;
    const colTotalW = 70;

    // Table header background
    doc.rect(MARGIN, y, CONTENT_WIDTH, 22).fill("#f5f5f5");
    y += 5;

    // Table header text
    doc.fillColor("#333333").fontSize(11).font("Helvetica-Bold");
    doc.text("Item", colItem + 5, y, { width: colItemW });
    doc.text("Qty", colQty, y, { width: colQtyW, align: "center" });
    doc.text("Price", colPrice, y, { width: colPriceW, align: "right" });
    doc.text("Total", colTotal, y, { width: colTotalW, align: "right" });
    y += 22;

    // Table rows
    doc.font("Helvetica").fontSize(10).fillColor("#000000");
    let subtotal = 0;

    for (let i = 0; i < order.items.length; i++) {
      const item = order.items[i];
      const lineTotal = item.price * item.quantity;
      subtotal += lineTotal;

      // Alternate row background
      if (i % 2 === 1) {
        doc.rect(MARGIN, y - 2, CONTENT_WIDTH, 20).fill("#fafafa");
        doc.fillColor("#000000");
      }

      const rowY = y;
      doc.text(item.product.name, colItem + 5, rowY, { width: colItemW - 10 });
      doc.text(String(item.quantity), colQty, rowY, { width: colQtyW, align: "center" });
      doc.text(formatCurrency(item.price), colPrice, rowY, { width: colPriceW, align: "right" });
      doc.text(formatCurrency(lineTotal), colTotal, rowY, { width: colTotalW, align: "right" });

      y += 20;
    }

    y += 5;

    // Bottom border of table
    doc.strokeColor("#cccccc")
      .moveTo(MARGIN, y).lineTo(PAGE_WIDTH - MARGIN, y).stroke();
    y += 15;

    // ========== TOTALS SECTION ==========
    const totalsLabelX = colPrice - 60;
    const totalsValueX = colTotal;
    const totalsValueW = colTotalW;

    doc.fontSize(11);

    if (order.discount > 0) {
      // Subtotal
      doc.font("Helvetica").text("Subtotal:", totalsLabelX, y, { width: 120, align: "right" });
      doc.text(formatCurrency(subtotal), totalsValueX, y, { width: totalsValueW, align: "right" });
      y += 18;

      // Discount
      doc.font("Helvetica").fillColor("#e74c3c").text("Discount:", totalsLabelX, y, { width: 120, align: "right" });
      doc.text("-" + formatCurrency(order.discount), totalsValueX, y, { width: totalsValueW, align: "right" });
      doc.fillColor("#000000");
      y += 22;
    }

    // Total (highlighted)
    doc.rect(totalsLabelX - 10, y - 4, 200, 26).fill("#f0f0f0");
    doc.fillColor("#000000").fontSize(13).font("Helvetica-Bold");
    doc.text("TOTAL:", totalsLabelX, y, { width: 120, align: "right" });
    doc.text(formatCurrency(order.totalAmount), totalsValueX, y, { width: totalsValueW, align: "right" });

    // ========== FOOTER ==========
    doc.fontSize(9).font("Helvetica").fillColor("#888888");
    doc.text("Thank you for your order!", MARGIN, 780, { align: "center", width: CONTENT_WIDTH });

    doc.end();
  });
}
