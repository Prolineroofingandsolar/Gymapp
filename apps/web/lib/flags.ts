/**
 * Feature flags for later phases. Nothing renders for an off flag —
 * no half-built screens ship. Flip via env when the module lands.
 */
export const FLAGS = {
  WORKOUTS: false,   // phase 2: daily WOD publishing, scores, benchmarks
  PT: false,         // phase 2: appointments, programmes, credits
  COMMUNITY: false,  // phase 2: moderated feed, events, challenges
  DELIVERY: false,   // phase 2: email/push adapters (notifications recorded regardless)
  PAYMENTS: false,   // phase 3: behind PaymentsProvider interface
} as const;

/** Phase-3 seam: all payment code must live behind this interface. */
export interface PaymentsProvider {
  createCustomer(gymId: string, memberId: string, email: string): Promise<string>;
  subscribe(customerRef: string, planRef: string): Promise<{ subscriptionRef: string }>;
  charge(customerRef: string, pence: number, description: string): Promise<{ paymentRef: string }>;
  refund(paymentRef: string, pence?: number): Promise<void>;
  handleWebhook(payload: unknown, signature: string): Promise<{ event: string; data: unknown }>;
}

/** Phase-2 seam: delivery adapters implement this; today only recording exists. */
export interface Notifier {
  deliver(notificationId: string, channel: "email" | "push"): Promise<"sent" | "skipped">;
}
