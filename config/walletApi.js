import axios from "@/utils/interceptor";

const URL = process.env.NEXT_PUBLIC_SERVER_URL;

// Wallet balance (credits) for an org. Backed by the Node route
// GET /api/lago/wallet/:org_id (docs/billing-idempotency-outbox-credit-system.md §4).
export const getWalletBalance = async (orgId) => {
  try {
    const { data } = await axios.get(`${URL}/api/lago/wallet/${orgId}`);
    return data;
  } catch (error) {
    console.error("getWalletBalance failed:", error);
    throw error;
  }
};

// Kick off a wallet top-up. The real integration hands off to the payment
// gateway's hosted checkout; this returns whatever the backend provides
// (e.g. a checkout URL). Left thin until the fee-direction decision + gateway
// choice are finalized (doc §6).
export const createTopupCheckout = async (orgId, amountUsd) => {
  try {
    const { data } = await axios.post(`${URL}/api/lago/wallet/${orgId}/topup`, { amount_usd: amountUsd });
    return data;
  } catch (error) {
    console.error("createTopupCheckout failed:", error);
    throw error;
  }
};
