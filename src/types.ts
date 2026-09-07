export type SplitType = 'equal_all' | 'equal_selected' | 'by_shares' | 'exact_amount';

export interface Member {
  id: string;
  name: string;
}

export interface Payer {
  memberId: string;
  amount: number;
}

export interface SplitShare {
  memberId: string;
  shares?: number; // Used in 'by_shares' (e.g. 1, 2)
  exactAmount?: number; // Used in 'exact_amount'
}

export interface Expense {
  id: string;
  title: string;
  date: string;
  totalAmount: number;
  payers: Payer[];
  splitType: SplitType;
  shares: SplitShare[];
  category?: string;
  note?: string;
  createdAt: number;
  updatedAt: number;
}

export interface SettlementOptions {
  currency: string;
  roundToInteger: boolean;
}

export interface MemberBalance {
  memberId: string;
  memberName: string;
  totalPaid: number;
  totalOwed: number;
  netBalance: number; // positive: to receive, negative: owes
}

export interface DebtTransfer {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  amount: number;
}

export interface SettlementResult {
  totalSpent: number;
  balances: MemberBalance[];
  transfers: DebtTransfer[];
  perMemberAvg: number;
}

export interface BillState {
  title: string;
  members: Member[];
  expenses: Expense[];
  options: SettlementOptions;
  roomId?: string;
  lastModified: number;
}
