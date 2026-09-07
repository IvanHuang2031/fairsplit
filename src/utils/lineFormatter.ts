import { BillState, SettlementResult } from '../types';
import { formatCurrency } from './settlement';
import { generateShareUrl } from './urlState';

/**
 * Format bill settlement into a clean, LINE/messaging app friendly text report
 */
export function formatLineReport(bill: BillState, settlement: SettlementResult): string {
  const { title, options, expenses } = bill;
  const { totalSpent, balances, transfers, perMemberAvg } = settlement;
  const currency = options.currency;
  const round = options.roundToInteger;

  const lines: string[] = [];

  lines.push(`🧾【${title || '分帳明細報告'}】`);
  lines.push(`📅 日期：${new Date().toLocaleDateString('zh-TW')} ${new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}`);
  lines.push(`💰 總支出：${formatCurrency(totalSpent, currency, round)}（共 ${expenses.length} 筆，人均約 ${formatCurrency(perMemberAvg, currency, round)}）`);
  lines.push('');

  // 1. Members balance
  lines.push('👥【個人收支狀況】');
  balances.forEach(b => {
    let statusText = '';
    if (b.netBalance > 0) {
      statusText = `🟢 應收 ${formatCurrency(b.netBalance, currency, round)}`;
    } else if (b.netBalance < 0) {
      statusText = `🔴 應付 ${formatCurrency(Math.abs(b.netBalance), currency, round)}`;
    } else {
      statusText = `⚪ 已平衡`;
    }
    lines.push(`• ${b.memberName}：已付 ${formatCurrency(b.totalPaid, currency, round)} | 應付 ${formatCurrency(b.totalOwed, currency, round)} (${statusText})`);
  });
  lines.push('');

  // 2. Transfer steps
  lines.push('🔄【最佳還款路線（最少轉帳）】');
  if (transfers.length === 0) {
    lines.push('🎉 大家帳目剛好完全平衡，無須任何轉帳！');
  } else {
    transfers.forEach((t, idx) => {
      lines.push(`${idx + 1}. ${t.fromName} ➡️ ${t.toName}：${formatCurrency(t.amount, currency, round)}`);
    });
  }
  lines.push('');

  // 3. Optional share link
  try {
    const shareUrl = generateShareUrl(bill);
    lines.push(`🔗 查看/接力編輯完整帳目：\n${shareUrl}`);
  } catch {
    // Ignore URL generation failure in non-browser env
  }

  return lines.join('\n');
}
