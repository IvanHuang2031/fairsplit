import { describe, it, expect } from 'vitest';
import { calculateSettlement, formatCurrency, getExpenseBreakdown } from './settlement';
import { Member, Expense, SettlementOptions } from '../types';

describe('Settlement Engine', () => {
  const optionsTWD: SettlementOptions = { currency: 'TWD', roundToInteger: true };
  const optionsUSD: SettlementOptions = { currency: 'USD', roundToInteger: false };

  it('handles simple 2-person equal split', () => {
    const members: Member[] = [
      { id: '1', name: '小明' },
      { id: '2', name: '小華' },
    ];

    const expenses: Expense[] = [
      {
        id: 'e1',
        title: '午餐',
        date: '2026-09-07',
        totalAmount: 200,
        payers: [{ memberId: '1', amount: 200 }],
        splitType: 'equal_all',
        shares: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    const result = calculateSettlement(members, expenses, optionsTWD);
    expect(result.totalSpent).toBe(200);
    expect(result.perMemberAvg).toBe(100);

    const ming = result.balances.find(b => b.memberId === '1')!;
    const hua = result.balances.find(b => b.memberId === '2')!;
    expect(ming.netBalance).toBe(100);
    expect(hua.netBalance).toBe(-100);

    expect(result.transfers).toHaveLength(1);
    expect(result.transfers[0]).toEqual({
      fromId: '2',
      fromName: '小華',
      toId: '1',
      toName: '小明',
      amount: 100,
    });
  });

  it('simplifies 3-person cyclic debts into minimum cash transfers', () => {
    const members: Member[] = [
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' },
      { id: '3', name: 'Charlie' },
    ];

    // Alice paid 300 for all 3 (each owes 100)
    // Bob paid 150 for Bob and Charlie (each owes 75)
    const expenses: Expense[] = [
      {
        id: 'e1',
        title: 'Hotel',
        date: '2026-09-07',
        totalAmount: 300,
        payers: [{ memberId: '1', amount: 300 }],
        splitType: 'equal_all',
        shares: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'e2',
        title: 'Taxi',
        date: '2026-09-07',
        totalAmount: 150,
        payers: [{ memberId: '2', amount: 150 }],
        splitType: 'equal_selected',
        shares: [{ memberId: '2' }, { memberId: '3' }],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    const result = calculateSettlement(members, expenses, optionsTWD);

    // Alice: paid 300, owes 100 => net +200
    // Bob: paid 150, owes 100 (e1) + 75 (e2) = 175 => net -25
    // Charlie: paid 0, owes 100 (e1) + 75 (e2) = 175 => net -175
    const alice = result.balances.find(b => b.memberId === '1')!;
    const bob = result.balances.find(b => b.memberId === '2')!;
    const charlie = result.balances.find(b => b.memberId === '3')!;

    expect(alice.netBalance).toBe(200);
    expect(bob.netBalance).toBe(-25);
    expect(charlie.netBalance).toBe(-175);

    // Minimal transfers: Bob -> Alice 25, Charlie -> Alice 175 (only 2 transfers, zero between Bob & Charlie!)
    expect(result.transfers).toHaveLength(2);
    const charlieTransfer = result.transfers.find(t => t.fromId === '3')!;
    const bobTransfer = result.transfers.find(t => t.fromId === '2')!;

    expect(charlieTransfer.toId).toBe('1');
    expect(charlieTransfer.amount).toBe(175);

    expect(bobTransfer.toId).toBe('1');
    expect(bobTransfer.amount).toBe(25);
  });

  it('supports multi-payer on a single expense', () => {
    const members: Member[] = [
      { id: '1', name: 'A' },
      { id: '2', name: 'B' },
      { id: '3', name: 'C' },
    ];

    // Dinner is 900. A paid 600, B paid 300. Split equal among all 3 (300 each).
    const expenses: Expense[] = [
      {
        id: 'e1',
        title: 'Dinner',
        date: '2026-09-07',
        totalAmount: 900,
        payers: [
          { memberId: '1', amount: 600 },
          { memberId: '2', amount: 300 },
        ],
        splitType: 'equal_all',
        shares: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    const result = calculateSettlement(members, expenses, optionsTWD);
    // A: paid 600, owes 300 => net +300
    // B: paid 300, owes 300 => net 0
    // C: paid 0, owes 300 => net -300
    expect(result.balances.find(b => b.memberId === '1')!.netBalance).toBe(300);
    expect(result.balances.find(b => b.memberId === '2')!.netBalance).toBe(0);
    expect(result.balances.find(b => b.memberId === '3')!.netBalance).toBe(-300);

    expect(result.transfers).toEqual([
      { fromId: '3', fromName: 'C', toId: '1', toName: 'A', amount: 300 }
    ]);
  });

  it('handles shares/weight split accurately', () => {
    const members: Member[] = [
      { id: '1', name: 'Adult' },
      { id: '2', name: 'Child' },
    ];

    // Adult: 2 shares, Child: 1 share. Total 300.
    const expenses: Expense[] = [
      {
        id: 'e1',
        title: 'Tickets',
        date: '2026-09-07',
        totalAmount: 300,
        payers: [{ memberId: '1', amount: 300 }],
        splitType: 'by_shares',
        shares: [
          { memberId: '1', shares: 2 },
          { memberId: '2', shares: 1 },
        ],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    const result = calculateSettlement(members, expenses, optionsTWD);
    expect(result.balances.find(b => b.memberId === '1')!.netBalance).toBe(100);
    expect(result.balances.find(b => b.memberId === '2')!.netBalance).toBe(-100);
  });

  it('balances remainder zero-sum when dividing 100 among 3 people', () => {
    const members: Member[] = [
      { id: '1', name: 'A' },
      { id: '2', name: 'B' },
      { id: '3', name: 'C' },
    ];

    const expenses: Expense[] = [
      {
        id: 'e1',
        title: 'Drink',
        date: '2026-09-07',
        totalAmount: 100,
        payers: [{ memberId: '1', amount: 100 }],
        splitType: 'equal_all',
        shares: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    const result = calculateSettlement(members, expenses, optionsTWD);
    // Net balances must sum to exactly 0
    const totalNet = result.balances.reduce((acc, b) => acc + b.netBalance, 0);
    expect(totalNet).toBe(0);

    // Sum of transfer amounts must match total debt
    const totalTransferAmount = result.transfers.reduce((acc, t) => acc + t.amount, 0);
    expect(totalTransferAmount).toBe(result.balances.find(b => b.memberId === '1')!.netBalance);
  });

  it('handles USD with 2-decimal precision', () => {
    const members: Member[] = [
      { id: '1', name: 'A' },
      { id: '2', name: 'B' },
      { id: '3', name: 'C' },
    ];

    const expenses: Expense[] = [
      {
        id: 'e1',
        title: 'Lunch',
        date: '2026-09-07',
        totalAmount: 10,
        payers: [{ memberId: '1', amount: 10 }],
        splitType: 'equal_all',
        shares: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    const result = calculateSettlement(members, expenses, optionsUSD);
    expect(result.totalSpent).toBe(10);
    const totalNet = result.balances.reduce((acc, b) => acc + b.netBalance, 0);
    expect(Math.abs(totalNet)).toBeLessThan(0.01);
  });

  it('generates clear expense breakdown with payers and formula', () => {
    const members: Member[] = [
      { id: '1', name: '小明' },
      { id: '2', name: '小華' },
      { id: '3', name: '阿美' },
    ];

    const expense: Expense = {
      id: 'e1',
      title: '火鍋',
      date: '2026-09-07',
      totalAmount: 1800,
      payers: [{ memberId: '1', amount: 1800 }],
      splitType: 'equal_all',
      shares: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const breakdown = getExpenseBreakdown(expense, members, optionsTWD);
    expect(breakdown.payersSummary).toContain('小明 代墊 NT$ 1,800');
    expect(breakdown.calculationFormula).toContain('1,800 ÷ 3人 = 每人 NT$ 600');
    expect(breakdown.memberShares).toHaveLength(3);
    const ming = breakdown.memberShares.find(s => s.memberId === '1')!;
    expect(ming.paidAmount).toBe(1800);
    expect(ming.owedAmount).toBe(600);
  });

  it('formats currency strings correctly', () => {
    expect(formatCurrency(1234, 'TWD', true)).toBe('NT$ 1,234');
    expect(formatCurrency(1234.56, 'USD', false)).toBe('$1,234.56');
    expect(formatCurrency(5000, 'JPY', true)).toBe('¥5,000');
  });
});
