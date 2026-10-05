/* eslint-disable import/no-unused-modules */
import axios from "@/utils/interceptor";

const URL = process.env.NEXT_PUBLIC_SERVER_URL;

export const getBillingSubscription = async () => {
  const { data } = await axios.get(`${URL}/api/billing/subscription`);
  return data;
};

export const startBillingCheckout = async () => {
  const { data } = await axios.post(`${URL}/api/billing/checkout`);
  return data;
};

export const subscribeBilling = async () => {
  const { data } = await axios.post(`${URL}/api/billing/subscribe`);
  return data;
};

export const cancelBilling = async () => {
  const { data } = await axios.post(`${URL}/api/billing/cancel`);
  return data;
};

export const resumeBilling = async () => {
  const { data } = await axios.post(`${URL}/api/billing/resume`);
  return data;
};

export const retryBillingPayment = async () => {
  const { data } = await axios.post(`${URL}/api/billing/retry`);
  return data;
};

export const getBillingPortal = async () => {
  const { data } = await axios.post(`${URL}/api/billing/portal`);
  return data;
};
