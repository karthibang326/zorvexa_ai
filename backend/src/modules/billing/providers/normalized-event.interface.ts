export type NormalizedEventType = 
  | 'checkout.completed'
  | 'subscription.updated'
  | 'subscription.deleted'
  | 'payment.failed'
  | 'invoice.paid';

export interface NormalizedEvent {
  id: string;
  type: NormalizedEventType;
  orgId: string;
  planId: string;
  status: string;
  amount?: number;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  metadata?: any;
}
