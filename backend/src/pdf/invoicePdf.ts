import PDFDocument from 'pdfkit';
import { Writable } from 'stream';

const money = (n: number) =>
  'Rs. ' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d: Date | string) => new Date(d).toISOString().slice(0, 10);

export function writeInvoicePdf(out: Writable, inv: any, items: any[], biz: any) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  doc.pipe(out);
  const L = 40;
  const R = 555;

  // Header
  doc.font('Helvetica-Bold').fontSize(18).text(biz.BusinessName, L, 40);
  doc
    .font('Helvetica')
    .fontSize(9)
    .text(
      [biz.Address, biz.Phone && `Phone: ${biz.Phone}`, biz.Gstin && `GSTIN: ${biz.Gstin}`]
        .filter(Boolean)
        .join('\n'),
      L,
      62,
      { width: 280 },
    );

  doc.font('Helvetica-Bold').fontSize(16).text('TAX INVOICE', L, 40, { align: 'right', width: R - L });
  doc
    .font('Helvetica')
    .fontSize(9)
    .text(
      `Invoice No: ${inv.InvoiceNo}\nDate: ${fmtDate(inv.InvoiceDate)}\nStatus: ${inv.Status}`,
      L,
      62,
      { align: 'right', width: R - L },
    );

  // Bill to
  doc.moveTo(L, 125).lineTo(R, 125).stroke();
  doc.font('Helvetica-Bold').fontSize(10).text('Bill To', L, 133);
  doc
    .font('Helvetica')
    .fontSize(9)
    .text(
      [inv.CustomerName, inv.CustomerAddress, inv.CustomerGstin && `GSTIN: ${inv.CustomerGstin}`]
        .filter(Boolean)
        .join('\n'),
      L,
      147,
      { width: 300 },
    );

  // Table
  type Col = { t: string; x: number; w: number; a: 'left' | 'right' };
  const cols: Col[] = [
    { t: '#', x: 40, w: 20, a: 'left' },
    { t: 'Item', x: 60, w: 170, a: 'left' },
    { t: 'Qty', x: 230, w: 40, a: 'right' },
    { t: 'Rate', x: 272, w: 58, a: 'right' },
    { t: 'Disc%', x: 332, w: 36, a: 'right' },
    { t: 'Taxable', x: 370, w: 65, a: 'right' },
    { t: 'GST%', x: 437, w: 33, a: 'right' },
    { t: 'Total', x: 472, w: 83, a: 'right' },
  ];

  const drawHeader = (y: number) => {
    doc.rect(L, y - 3, R - L, 16).fill('#eeeeee');
    doc.fillColor('#000').font('Helvetica-Bold').fontSize(9);
    cols.forEach((c) => doc.text(c.t, c.x, y, { width: c.w, align: c.a }));
    doc.font('Helvetica');
    return y + 18;
  };

  let y = drawHeader(205);
  items.forEach((it, i) => {
    if (y > 730) {
      doc.addPage();
      y = drawHeader(40);
    }
    const cells = [
      String(i + 1),
      it.Description,
      String(it.Quantity),
      money(it.UnitPrice).replace('Rs. ', ''),
      String(it.DiscountPct),
      money(it.TaxableAmount).replace('Rs. ', ''),
      String(it.GstRate),
      money(it.LineTotal).replace('Rs. ', ''),
    ];
    doc.fontSize(9);
    cols.forEach((c, idx) => doc.text(cells[idx], c.x, y, { width: c.w, align: c.a }));
    y += 16;
  });

  // Totals
  if (y > 640) {
    doc.addPage();
    y = 40;
  }
  doc.moveTo(L, y).lineTo(R, y).stroke();
  y += 10;
  const row = (label: string, value: string, bold = false) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 11 : 9);
    doc.text(label, 340, y, { width: 120, align: 'left' });
    doc.text(value, 460, y, { width: 95, align: 'right' });
    y += bold ? 20 : 15;
  };
  row('Sub Total', money(inv.SubTotal));
  if (Number(inv.DiscountTotal) > 0) row('Discount', '- ' + money(inv.DiscountTotal));
  if (inv.IsInterState) {
    row('IGST', money(inv.IgstTotal));
  } else {
    row('CGST', money(inv.CgstTotal));
    row('SGST', money(inv.SgstTotal));
  }
  if (Number(inv.RoundOff) !== 0) row('Round Off', money(inv.RoundOff));
  row('Grand Total', money(inv.GrandTotal), true);
  row('Paid', money(inv.PaidAmount));
  row('Balance Due', money(Number(inv.GrandTotal) - Number(inv.PaidAmount)), true);

  if (inv.Notes) {
    doc.font('Helvetica').fontSize(9).text(`Notes: ${inv.Notes}`, L, y + 10, { width: 300 });
  }

  doc.font('Helvetica').fontSize(8).fillColor('#666')
    .text('This is a computer generated invoice.', L, 790, { align: 'center', width: R - L });

  doc.end();
}
