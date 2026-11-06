export const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export interface CalcLine { quantity: number; unitPrice: number; discountPct: number; gstRate: number; }

// Backend jaisa hi hisaab (sirf preview ke liye; final amount server nikalta hai)
export function calculate(lines: CalcLine[], interState: boolean) {
  let sub = 0, disc = 0, cgst = 0, sgst = 0, igst = 0, taxableSum = 0;
  const rows = lines.map((l) => {
    const gross = r2((l.quantity || 0) * (l.unitPrice || 0));
    const d = r2((gross * (l.discountPct || 0)) / 100);
    const taxable = r2(gross - d);
    const tax = r2((taxable * (l.gstRate || 0)) / 100);
    let c = 0, s = 0, i = 0;
    if (interState) i = tax;
    else { c = r2(tax / 2); s = r2(tax - c); }
    sub += gross; disc += d; taxableSum += taxable; cgst += c; sgst += s; igst += i;
    return { taxable, total: r2(taxable + c + s + i) };
  });
  const before = r2(taxableSum + cgst + sgst + igst);
  const grand = Math.round(before);
  return {
    rows,
    subTotal: r2(sub), discount: r2(disc), cgst: r2(cgst), sgst: r2(sgst), igst: r2(igst),
    roundOff: r2(grand - before), grand,
  };
}
