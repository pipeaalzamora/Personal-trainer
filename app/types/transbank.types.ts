export interface CreateTransactionResponse {
  token: string;
  url: string;
}

export interface CommitTransactionResponse {
  vci: string;
  amount: number;
  status: string;
  buy_order: string;
  session_id: string;
  card_detail: {
    card_number: string;
  };
  accounting_date: string;
  transaction_date: string;
  authorization_code: string;
  payment_type_code: string;
  response_code: number;
}

export interface RefundTransactionResponse {
  type: string;
  authorization_code: string;
  authorization_date: string;
  nullified_amount: number;
  response_code: number;
}

export interface CaptureTransactionResponse {
  authorization_code: string;
  authorization_date: string;
  captured_amount: number;
  response_code: number;
}