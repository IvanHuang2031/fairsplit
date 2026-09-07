import { Member, Expense, SettlementOptions, SettlementResult, MemberBalance, DebtTransfer, ExpenseBreakdown } from '../types';

/**
 * Format currency with locale formatting
 */
export function formatCurrency(amount: number, currency: string = 'TWD', roundToInteger: boolean = true): string {
  const rounded = roundToInteger ? Math.round(amount) : Number(amount.toFixed(2));
  const numStr = rounded.toLocaleString(undefined, {
    minimumFractionDigits: roundToInteger ? 0 : 2,
    maximumFractionDigits: roundToInteger ? 0 : 2,
  });

  switch (currency.toUpperCase()) {
    case 'TWD':
    case 'NTD':
      return `NT$ ${numStr}`;
    case 'JPY':
      return `¥${numStr}`;
    case 'USD':
      return `$${numStr}`;
    case 'EUR':
      return `€${numStr}`;
    case 'KRW':
      return `₩${numStr}`;
    case 'HKD':
      return `HK$ ${numStr}`;
    default:
      return `${currency} ${numStr}`;
  }
}

/**
 * Distribute an amount among shares ensuring the sum strictly equals the target amount
 */
function distributeAmount(
  totalAmount: number,
  participants: { memberId: string; weight: number }[],
  roundToInteger: boolean
): Record<string, number> {
  const result: Record<string, number> = {};
  if (participants.length === 0 || totalAmount <= 0) return result;

  const totalWeight = participants.reduce((acc, p) => acc + p.weight, 0);
  if (totalWeight <= 0) return result;

  if (roundToInteger) {
    let allocated = 0;
    const items = participants.map(p => {
      const exact = (totalAmount * p.weight) / totalWeight;
      const floorVal = Math.floor(exact);
      allocated += floorVal;
      return {
        memberId: p.memberId,
        base: floorVal,
        remainder: exact - floorVal,
      };
    });

    let diff = Math.round(totalAmount - allocated);
    // Sort descending by highest remainder fraction to distribute leftover pennies/integers fairly
    items.sort((a, b) => b.remainder - a.remainder);
    for (let i = 0; i < items.length; i++) {
      const extra = diff > 0 ? 1 : 0;
      if (diff > 0) diff--;
      result[items[i].memberId] = items[i].base + extra;
    }
  } else {
    let allocated = 0;
    const items = participants.map((p, idx) => {
      if (idx === participants.length - 1) {
        // Last person absorbs precision diff
        const lastVal = Number((totalAmount - allocated).toFixed(2));
        return { memberId: p.memberId, val: lastVal };
      }
      const val = Number(((totalAmount * p.weight) / totalWeight).toFixed(2));
      allocated += val;
      return { memberId: p.memberId, val };
    });

    for (const item of items) {
      result[item.memberId] = item.val;
    }
  }

  return result;
}

/**
 * Main settlement calculation engine
 */
export function calculateSettlement(
  members: Member[],
  expenses: Expense[],
  options: SettlementOptions
): SettlementResult {
  const memberMap = new Map<string, Member>();
  members.forEach(m => memberMap.set(m.id, m));

  const totalPaidMap: Record<string, number> = {};
  const totalOwedMap: Record<string, number> = {};

  members.forEach(m => {
    totalPaidMap[m.id] = 0;
    totalOwedMap[m.id] = 0;
  });

  let totalSpent = 0;

  for (const expense of expenses) {
    totalSpent += expense.totalAmount;

    // 1. Accumulate payments
    for (const payer of expense.payers) {
      if (totalPaidMap[payer.memberId] !== undefined) {
        totalPaidMap[payer.memberId] += payer.amount;
      }
    }

    // 2. Accumulate owed splits
    let splits: Record<string, number> = {};

    switch (expense.splitType) {
      case 'equal_all': {
        const participants = members.map(m => ({ memberId: m.id, weight: 1 }));
        splits = distributeAmount(expense.totalAmount, participants, options.roundToInteger);
        break;
      }
      case 'equal_selected': {
        const participants = expense.shares
          .filter(s => memberMap.has(s.memberId))
          .map(s => ({ memberId: s.memberId, weight: 1 }));
        splits = distributeAmount(expense.totalAmount, participants, options.roundToInteger);
        break;
      }
      case 'by_shares': {
        const participants = expense.shares
          .filter(s => memberMap.has(s.memberId))
          .map(s => ({ memberId: s.memberId, weight: Math.max(0.1, s.shares || 1) }));
        splits = distributeAmount(expense.totalAmount, participants, options.roundToInteger);
        break;
      }
      case 'exact_amount': {
        for (const s of expense.shares) {
          if (memberMap.has(s.memberId)) {
            splits[s.memberId] = s.exactAmount || 0;
          }
        }
        break;
      }
    }

    for (const [memberId, owed] of Object.entries(splits)) {
      if (totalOwedMap[memberId] !== undefined) {
        totalOwedMap[memberId] += owed;
      }
    }
  }

  // 3. Compute balances
  const balances: MemberBalance[] = members.map(m => {
    const paid = totalPaidMap[m.id] || 0;
    const owed = totalOwedMap[m.id] || 0;
    const rawNet = paid - owed;
    const net = options.roundToInteger ? Math.round(rawNet) : Number(rawNet.toFixed(2));
    return {
      memberId: m.id,
      memberName: m.name,
      totalPaid: options.roundToInteger ? Math.round(paid) : Number(paid.toFixed(2)),
      totalOwed: options.roundToInteger ? Math.round(owed) : Number(owed.toFixed(2)),
      netBalance: net,
    };
  });

  // 4. Greedy Minimum Cash Flow Algorithm
  interface Party {
    id: string;
    name: string;
    amount: number;
  }

  const debtors: Party[] = [];
  const creditors: Party[] = [];

  for (const b of balances) {
    if (b.netBalance < -0.001) {
      debtors.push({
        id: b.memberId,
        name: b.memberName,
        amount: Math.abs(b.netBalance),
      });
    } else if (b.netBalance > 0.001) {
      creditors.push({
        id: b.memberId,
        name: b.memberName,
        amount: b.netBalance,
      });
    }
  }

  // Sort descending by amount for greedy matching
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const transfers: DebtTransfer[] = [];

  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const amountToTransfer = Math.min(debtor.amount, creditor.amount);
    const finalAmount = options.roundToInteger
      ? Math.round(amountToTransfer)
      : Number(amountToTransfer.toFixed(2));

    if (finalAmount > 0) {
      transfers.push({
        fromId: debtor.id,
        fromName: debtor.name,
        toId: creditor.id,
        toName: creditor.name,
        amount: finalAmount,
      });
    }

    debtor.amount -= amountToTransfer;
    creditor.amount -= amountToTransfer;

    if (debtor.amount < 0.001) {
      dIdx++;
    }
    if (creditor.amount < 0.001) {
      cIdx++;
    }
  }

  const perMemberAvg = members.length > 0
    ? (options.roundToInteger ? Math.round(totalSpent / members.length) : Number((totalSpent / members.length).toFixed(2)))
    : 0;

  return {
    totalSpent: options.roundToInteger ? Math.round(totalSpent) : Number(totalSpent.toFixed(2)),
    balances,
    transfers,
    perMemberAvg,
  };
}

/**
 * Generate detailed breakdown and calculation formula for an individual expense
 */
export function getExpenseBreakdown(
  expense: Expense,
  members: Member[],
  options: SettlementOptions
): ExpenseBreakdown {
  const memberMap = new Map<string, Member>();
  members.forEach(m => memberMap.set(m.id, m));

  const { currency, roundToInteger } = options;

  // Payers summary
  const payersTextList = expense.payers.map(p => {
    const name = memberMap.get(p.memberId)?.name || '未知';
    return `${name} 代墊 ${formatCurrency(p.amount, currency, roundToInteger)}`;
  });
  const payersSummary = payersTextList.join('、');

  // Compute splits
  let splits: Record<string, number> = {};
  let splitSummary = '';
  let calculationFormula = '';

  switch (expense.splitType) {
    case 'equal_all': {
      splitSummary = `全員平分 (${members.length}人)`;
      const participants = members.map(m => ({ memberId: m.id, weight: 1 }));
      splits = distributeAmount(expense.totalAmount, participants, roundToInteger);
      const perPerson = members.length > 0 ? expense.totalAmount / members.length : 0;
      calculationFormula = `${formatCurrency(expense.totalAmount, currency, roundToInteger)} ÷ ${members.length}人 = 每人 ${formatCurrency(perPerson, currency, roundToInteger)}`;
      break;
    }
    case 'equal_selected': {
      const selected = expense.shares.filter(s => memberMap.has(s.memberId));
      const names = selected.map(s => memberMap.get(s.memberId)?.name || '').join('、');
      splitSummary = `特定人分 (${selected.length}人: ${names})`;
      const participants = selected.map(s => ({ memberId: s.memberId, weight: 1 }));
      splits = distributeAmount(expense.totalAmount, participants, roundToInteger);
      const perPerson = selected.length > 0 ? expense.totalAmount / selected.length : 0;
      calculationFormula = `${formatCurrency(expense.totalAmount, currency, roundToInteger)} ÷ ${selected.length}人 = 每人 ${formatCurrency(perPerson, currency, roundToInteger)}`;
      break;
    }
    case 'by_shares': {
      splitSummary = `依份數比例分攤`;
      const participants = expense.shares
        .filter(s => memberMap.has(s.memberId))
        .map(s => ({ memberId: s.memberId, weight: Math.max(0.1, s.shares || 1) }));
      splits = distributeAmount(expense.totalAmount, participants, roundToInteger);
      const totalShares = participants.reduce((acc, p) => acc + p.weight, 0);
      const perShare = totalShares > 0 ? expense.totalAmount / totalShares : 0;
      calculationFormula = `總計 ${totalShares} 份，每份約 ${formatCurrency(perShare, currency, roundToInteger)}`;
      break;
    }
    case 'exact_amount': {
      splitSummary = `自訂個別金額`;
      calculationFormula = `依各成員實際消費金額分攤`;
      for (const s of expense.shares) {
        if (memberMap.has(s.memberId)) {
          splits[s.memberId] = s.exactAmount || 0;
        }
      }
      break;
    }
  }

  // Payers map for this single expense
  const payerPaidMap: Record<string, number> = {};
  for (const p of expense.payers) {
    payerPaidMap[p.memberId] = (payerPaidMap[p.memberId] || 0) + p.amount;
  }

  const memberShares = members.map(m => {
    const paid = payerPaidMap[m.id] || 0;
    const owed = splits[m.id] || 0;
    return {
      memberId: m.id,
      memberName: m.name,
      paidAmount: roundToInteger ? Math.round(paid) : Number(paid.toFixed(2)),
      owedAmount: roundToInteger ? Math.round(owed) : Number(owed.toFixed(2)),
    };
  });

  return {
    expenseId: expense.id,
    title: expense.title,
    date: expense.date,
    totalAmount: roundToInteger ? Math.round(expense.totalAmount) : Number(expense.totalAmount.toFixed(2)),
    payersSummary,
    splitSummary,
    calculationFormula,
    memberShares,
  };
}

/**
 * Generate breakdowns for all expenses
 */
export function getAllExpenseBreakdowns(
  members: Member[],
  expenses: Expense[],
  options: SettlementOptions
): ExpenseBreakdown[] {
  return expenses.map(e => getExpenseBreakdown(e, members, options));
}

