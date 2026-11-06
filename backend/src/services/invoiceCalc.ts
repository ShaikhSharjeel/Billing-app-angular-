export interface LineInput {
  productId: number;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  gstRate: number;
}

export interface LineResult extends LineInput {
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  lineTotal: number;
}

export interface InvoiceTotals {
  lines: LineResult[];
  subTotal: number; // gross, discount se pehle
  discountTotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  roundOff: number;
  grandTotal: number;
}

export const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Same state  -> CGST + SGST (GST rate ka aadha-aadha)
 * Different   -> IGST (poora GST rate)
 */
export function calculateInvoice(inputs: LineInput[], isInterState: boolean): InvoiceTotals {
  let subTotal = 0, discountTotal = 0, cgstTotal = 0, sgstTotal = 0, igstTotal = 0, taxableSum = 0;

  const lines: LineResult[] = inputs.map((l) => {
    const gross = r2(l.quantity * l.unitPrice);
    const discount = r2((gross * l.discountPct) / 100);
    const taxable = r2(gross - discount);
    const tax = r2((taxable * l.gstRate) / 100);

    let cgst = 0, sgst = 0, igst = 0;
    if (isInterState) {
      igst = tax;
    } else {
      cgst = r2(tax / 2);
      sgst = r2(tax - cgst);
    }

    subTotal += gross;
    discountTotal += discount;
    taxableSum += taxable;
    cgstTotal += cgst;
    sgstTotal += sgst;
    igstTotal += igst;

    return {
      ...l,
      taxableAmount: taxable,
      cgstAmount: cgst,
      sgstAmount: sgst,
      igstAmount: igst,
      lineTotal: r2(taxable + cgst + sgst + igst),
    };
  });

  const beforeRound = r2(taxableSum + cgstTotal + sgstTotal + igstTotal);
  const grandTotal = Math.round(beforeRound);

  return {
    lines,
    subTotal: r2(subTotal),
    discountTotal: r2(discountTotal),
    cgstTotal: r2(cgstTotal),
    sgstTotal: r2(sgstTotal),
    igstTotal: r2(igstTotal),
    roundOff: r2(grandTotal - beforeRound),
    grandTotal,
  };
}
