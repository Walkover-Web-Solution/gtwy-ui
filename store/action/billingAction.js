import {
  getBillingSubscription,
  startBillingCheckout,
  subscribeBilling,
  cancelBilling,
  resumeBilling,
  retryBillingPayment,
  getBillingPortal,
} from "@/config/billingApi";

// Pass-through thunks: call the API and return its response unchanged (errors propagate to the caller).
export const getBillingSubscriptionAction = () => async () => getBillingSubscription();
export const startBillingCheckoutAction = () => async () => startBillingCheckout();
export const subscribeBillingAction = () => async () => subscribeBilling();
export const cancelBillingAction = () => async () => cancelBilling();
export const resumeBillingAction = () => async () => resumeBilling();
export const retryBillingPaymentAction = () => async () => retryBillingPayment();
export const getBillingPortalAction = () => async () => getBillingPortal();
