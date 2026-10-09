import type { Order } from "./types";

export const STAGES = ["Placed", "Paid", "Packed", "Shipped", "Delivered"];

/** Where an order sits on the fulfilment tape. Cancelled and refunded orders break the tape. */
export function stageOf(o: Pick<Order, "status" | "paymentStatus" | "paymentMethod">) {
  if (o.status === "cancelled" || o.status === "refunded") return { at: 0, broken: true };
  const at = o.status === "delivered" ? 4 : o.status === "shipped" ? 3 : o.status === "processing" ? 2 : o.paymentStatus === "paid" ? 1 : 0;
  return { at, broken: false };
}
