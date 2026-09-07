import { describe, it, expect } from 'vitest';
import { encodeBillState, decodeBillState } from './urlState';
import { formatLineReport } from './lineFormatter';
import { calculateSettlement } from './settlement';
import { BillState } from '../types';

describe('URL State & Line Formatter', () => {
  const dummyBill: BillState = {
    title: '宜蘭兩天一夜',
    members: [
      { id: '1', name: '小明' },
      { id: '2', name: '小華' },
      { id: '3', name: '阿美' },
    ],
    expenses: [
      {
        id: 'e1',
        title: '民宿包棟',
        date: '2026-09-07',
        totalAmount: 6000,
        payers: [{ memberId: '1', amount: 6000 }],
        splitType: 'equal_all',
        shares: [],
        createdAt: 1000,
        updatedAt: 1000,
      },
    ],
    options: {
      currency: 'TWD',
      roundToInteger: true,
    },
    lastModified: 1000,
  };

  it('correctly encodes and decodes bill state without loss', () => {
    const encoded = encodeBillState(dummyBill);
    expect(encoded).toBeTruthy();
    const decoded = decodeBillState(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded?.title).toBe(dummyBill.title);
    expect(decoded?.members).toHaveLength(3);
    expect(decoded?.expenses).toHaveLength(1);
    expect(decoded?.expenses[0].totalAmount).toBe(6000);
  });

  it('generates well-structured LINE report text', () => {
    const settlement = calculateSettlement(dummyBill.members, dummyBill.expenses, dummyBill.options);
    const report = formatLineReport(dummyBill, settlement);
    expect(report).toContain('🧾【宜蘭兩天一夜】');
    expect(report).toContain('總支出：NT$ 6,000');
    expect(report).toContain('小明');
    expect(report).toContain('小華');
    expect(report).toContain('阿美');
    expect(report).toContain('最佳還款路線');
  });
});
