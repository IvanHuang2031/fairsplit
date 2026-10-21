import { describe, it, expect } from 'vitest';
import { calculateSettlement, removeMemberFromExpenses } from './settlement';
import { Member, Expense, SettlementOptions } from '../types';

const optionsTWD: SettlementOptions = { currency: 'TWD', roundToInteger: true };
const optionsUSD: SettlementOptions = { currency: 'USD', roundToInteger: false };

const members: Member[] = [
  { id: 'a', name: 'A' },
  { id: 'b', name: 'B' },
  { id: 'c', name: 'C' },
];
const remaining = members.filter(m => m.id !== 'a');

const base = { date: '2026-10-21', createdAt: 0, updatedAt: 0 };

function expectBalanced(expenses: Expense[], options: SettlementOptions) {
  for (const e of expenses) {
    const paid = e.payers.reduce((s, p) => s + p.amount, 0);
    expect(paid).toBeCloseTo(e.totalAmount, 2);
    if (e.splitType === 'exact_amount') {
      const owed = e.shares.reduce((s, x) => s + (x.exactAmount || 0), 0);
      expect(owed).toBeCloseTo(e.totalAmount, 2);
    }
  }
  const result = calculateSettlement(remaining, expenses, options);
  const net = result.balances.reduce((s, b) => s + b.netBalance, 0);
  expect(net).toBeCloseTo(0, 2);
}

describe('removeMemberFromExpenses', () => {
  it('deducts the removed payer from a multi-payer expense', () => {
    const expenses: Expense[] = [{
      ...base, id: 'e1', title: '晚餐', totalAmount: 300,
      payers: [{ memberId: 'a', amount: 200 }, { memberId: 'b', amount: 100 }],
      splitType: 'equal_all', shares: [],
    }];
    const out = removeMemberFromExpenses(expenses, 'a', true);
    expect(out[0].totalAmount).toBe(100);
    expect(out[0].payers).toEqual([{ memberId: 'b', amount: 100 }]);
    expectBalanced(out, optionsTWD);
  });

  it('drops an equal_selected expense only shared by the removed member', () => {
    const expenses: Expense[] = [{
      ...base, id: 'e1', title: '飲料', totalAmount: 60,
      payers: [{ memberId: 'b', amount: 60 }],
      splitType: 'equal_selected', shares: [{ memberId: 'a' }],
    }];
    expect(removeMemberFromExpenses(expenses, 'a', true)).toEqual([]);
  });

  it('keeps an equal_selected expense split among remaining participants', () => {
    const expenses: Expense[] = [{
      ...base, id: 'e1', title: '計程車', totalAmount: 300,
      payers: [{ memberId: 'b', amount: 300 }],
      splitType: 'equal_selected', shares: [{ memberId: 'a' }, { memberId: 'b' }, { memberId: 'c' }],
    }];
    const out = removeMemberFromExpenses(expenses, 'a', true);
    expect(out[0].totalAmount).toBe(300);
    expect(out[0].shares).toEqual([{ memberId: 'b' }, { memberId: 'c' }]);
    expectBalanced(out, optionsTWD);
  });

  it('rescales exact amounts so they still add up to the new total', () => {
    const expenses: Expense[] = [{
      ...base, id: 'e1', title: '購物', totalAmount: 1000,
      payers: [{ memberId: 'a', amount: 400 }, { memberId: 'b', amount: 600 }],
      splitType: 'exact_amount',
      shares: [
        { memberId: 'a', exactAmount: 100 },
        { memberId: 'b', exactAmount: 300 },
        { memberId: 'c', exactAmount: 600 },
      ],
    }];
    const out = removeMemberFromExpenses(expenses, 'a', true);
    expect(out[0].totalAmount).toBe(600);
    expect(out[0].shares).toEqual([
      { memberId: 'b', exactAmount: 200 },
      { memberId: 'c', exactAmount: 400 },
    ]);
    expectBalanced(out, optionsTWD);
  });

  it('stays balanced with decimals', () => {
    const expenses: Expense[] = [{
      ...base, id: 'e1', title: 'Hotel', totalAmount: 100,
      payers: [{ memberId: 'a', amount: 33.33 }, { memberId: 'c', amount: 66.67 }],
      splitType: 'exact_amount',
      shares: [
        { memberId: 'a', exactAmount: 10 },
        { memberId: 'b', exactAmount: 45.5 },
        { memberId: 'c', exactAmount: 44.5 },
      ],
    }];
    const out = removeMemberFromExpenses(expenses, 'a', false);
    expect(out[0].totalAmount).toBe(66.67);
    expectBalanced(out, optionsUSD);
  });

  it('leaves expenses not involving the member untouched', () => {
    const expense: Expense = {
      ...base, id: 'e1', title: '門票', totalAmount: 200,
      payers: [{ memberId: 'b', amount: 200 }],
      splitType: 'by_shares', shares: [{ memberId: 'b', shares: 1 }, { memberId: 'c', shares: 1 }],
    };
    expect(removeMemberFromExpenses([expense], 'a', true)[0]).toBe(expense);
  });
});
