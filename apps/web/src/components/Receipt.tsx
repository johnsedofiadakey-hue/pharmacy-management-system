import type { Sale } from "@/lib/firebase/callables";

// BLUEPRINT.md §52 — printed via the browser's native print dialog
// (window.print()), styled with Tailwind's print: variants so it's the only
// thing visible on the printed page (see pos/page.tsx: the rest of the UI is
// print:hidden). This targets a standard printer through the OS print
// dialog — a receipt/label printer's own driver handles paper width from
// there. No thermal-printer-specific ESC/POS integration is attempted; that
// needs a specific hardware target to build against; a receipt printer set
// as the browser's print destination works with this as-is.
export function Receipt({ sale }: { sale: Sale }) {
  return (
    <div className="hidden print:block print:p-4 print:text-sm">
      <div className="mb-2 text-center font-bold">PHARMACY RECEIPT</div>
      <div className="mb-2 text-center text-xs">
        Transaction: {sale.id}
        <br />
        {new Date(sale.createdAt).toLocaleString()}
      </div>
      <hr className="my-2" />
      <table className="w-full text-xs">
        <tbody>
          {sale.items?.map((item) => (
            <tr key={item.id}>
              <td>Product {item.productId.slice(0, 8)}</td>
              <td className="text-right">
                {item.quantity} × {item.unitPrice}
              </td>
              <td className="text-right">{item.lineTotal}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <hr className="my-2" />
      <div className="flex justify-between text-xs">
        <span>Subtotal</span>
        <span>GHS {sale.subtotal}</span>
      </div>
      <div className="flex justify-between text-xs">
        <span>Discount</span>
        <span>GHS {sale.discountTotal}</span>
      </div>
      <div className="flex justify-between font-bold">
        <span>Total</span>
        <span>GHS {sale.total}</span>
      </div>
      {sale.payments?.map((p) => (
        <div key={p.id} className="flex justify-between text-xs">
          <span>{p.paymentMethod}</span>
          <span>GHS {p.amount}</span>
        </div>
      ))}
      <hr className="my-2" />
      <div className="text-center text-xs">Thank you — returns accepted within 7 days with receipt.</div>
    </div>
  );
}
