import { apiClient } from "./api";

export interface RazorpayOrderCreateResponse {
  razorpay_order_id: string;
  amount_paise: number;
  amount_inr: number;
  currency: string;
  status: string;
  purpose: "WALLET_TOPUP" | "BOOKING" | "SESSION";
  reference_id?: string | null;
  key_id: string;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  idempotent_replay: boolean;
}

export interface RazorpayVerifyResponse {
  verified: boolean;
  idempotent_replay: boolean;
  status: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  amount_paise: number;
  amount_inr: number;
  wallet_balance_inr: number;
  ledger_entry?: {
    ledger_fact_id: number;
    txn_id: string;
    txn_type_cd: number;
    dr_cr_ind: string;
    amount_inr: number;
    running_balance_inr: number;
    created_at: string;
  };
}

export interface HostPayoutRequestResponse {
  payout_id: string;
  amount_inr: number;
  remaining_host_earnings_inr?: number;
  upi_vpa: string;
  status: "PENDING_APPROVAL" | "PROCESSING" | "SETTLED" | "REJECTED";
  idempotent_replay: boolean;
}

export async function createRazorpayOrderOnServer(params: {
  purpose: "WALLET_TOPUP" | "BOOKING" | "SESSION";
  amountInr?: number;
  referenceId?: string;
  idempotencyKey?: string;
}): Promise<RazorpayOrderCreateResponse> {
  const idemKey =
    params.idempotencyKey ||
    `idem_${params.purpose.toLowerCase()}_${Date.now()}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;

  const res = await apiClient.post<RazorpayOrderCreateResponse>(
    "/payments/orders",
    {
      purpose: params.purpose,
      amount_inr: params.amountInr,
      reference_id: params.referenceId,
      idempotency_key: idemKey,
    }
  );
  return res.data;
}

export async function verifyRazorpayPaymentOnServer(params: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<RazorpayVerifyResponse> {
  const res = await apiClient.post<RazorpayVerifyResponse>(
    "/payments/verify",
    params
  );
  return res.data;
}

export async function requestHostPayoutOnServer(params: {
  amountInr: number;
  upiVpa: string;
  idempotencyKey?: string;
}): Promise<HostPayoutRequestResponse> {
  const idemKey =
    params.idempotencyKey ||
    `payout_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const res = await apiClient.post<HostPayoutRequestResponse>(
    "/payments/host-payouts",
    {
      amount_inr: params.amountInr,
      upi_vpa: params.upiVpa,
      idempotency_key: idemKey,
    }
  );
  return res.data;
}
