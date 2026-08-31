export type RefundAmountStatus = { amountMinor: number; status: string };

export function reconcileRefunds(
  transactionAmountMinor: number,
  currentStatus: string,
  refunds: RefundAmountStatus[],
): { refundedAmountMinor: number; status: string } {
  const refundedAmountMinor = refunds
    .filter((refund) => refund.status === "succeeded")
    .reduce((sum, refund) => sum + refund.amountMinor, 0);
  const baseStatus = ["partially_refunded", "refunded"].includes(currentStatus) ? "settled" : currentStatus;
  const status = refundedAmountMinor === 0
    ? baseStatus
    : refundedAmountMinor >= transactionAmountMinor
      ? "refunded"
      : "partially_refunded";
  return { refundedAmountMinor, status };
}