import { BillState, SettlementResult } from '../types';
import { formatCurrency, getAllExpenseBreakdowns } from './settlement';
import { generateShareUrl } from './urlState';

/**
 * Format bill settlement into a clean, LINE/messaging app friendly text report
 * Includes full breakdown of each expense, who paid what, and exact calculation formulas.
 */
export function formatLineReport(
  bill: BillState,
  settlement: SettlementResult,
  includeBreakdown: boolean = true
): string {
  const { title, options, expenses, members } = bill;
  const { totalSpent, balances, transfers, perMemberAvg } = settlement;
  const currency = options.currency;
  const round = options.roundToInteger;

  const lines: string[] = [];

  lines.push(`🧾【${title || '分帳明細報告'}】`);
  lines.push(`📅 結算時間：${new Date().toLocaleDateString('zh-TW')} ${new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}`);
  lines.push(`💰 總支出：${formatCurrency(totalSpent, currency, round)}（共 ${expenses.length} 筆，人均約 ${formatCurrency(perMemberAvg, currency, round)}）`);
  lines.push('');

  // 1. Detailed Expense Breakdown & Formulas
  if (includeBreakdown && expenses.length > 0) {
    const breakdowns = getAllExpenseBreakdowns(members, expenses, options);
    lines.push('📝【逐筆支出明細與計算公式】');

    breakdowns.forEach((b, idx) => {
      lines.push(`${idx + 1}. ${b.title}（${formatCurrency(b.totalAmount, currency, round)}）`);
      lines.push(`   • 出資代墊：${b.payersSummary}`);
      lines.push(`   • 分攤方式：${b.splitSummary}`);
      if (b.calculationFormula) {
        lines.push(`   • 計算方式：${b.calculationFormula}`);
      }

      // Show each participant's share in this expense
      const sharesSummary = b.memberShares
        .map(s => {
          if (s.owedAmount > 0) {
            return `${s.memberName} 攤 ${formatCurrency(s.owedAmount, currency, round)}`;
          }
          return `${s.memberName} 不攤 ($0)`;
        })
        .join('、');
      lines.push(`   • 各自負擔：${sharesSummary}`);
      lines.push('');
    });
  }

  // 2. Member Balances & Calculation Formula
  lines.push('📊【個人總收支計算（怎麼算出來的）】');
  lines.push('💡 計算公式：個人淨收支 =「個人總代墊」-「個人總應攤」');
  balances.forEach(b => {
    let statusText = '';
    if (b.netBalance > 0) {
      statusText = `🟢 應收 ${formatCurrency(b.netBalance, currency, round)}`;
    } else if (b.netBalance < 0) {
      statusText = `🔴 應付 ${formatCurrency(Math.abs(b.netBalance), currency, round)}`;
    } else {
      statusText = `⚪ 已結平 ($0)`;
    }
    lines.push(`• ${b.memberName}：已出 ${formatCurrency(b.totalPaid, currency, round)} - 應攤 ${formatCurrency(b.totalOwed, currency, round)} ＝ ${statusText}`);
  });
  lines.push('');

  // 3. Optimized Transfer Roadmap
  lines.push('🔄【最佳還款路線（最少轉帳次數）】');
  if (transfers.length === 0) {
    lines.push('🎉 大家帳目剛好完全平衡，無須任何轉帳！');
  } else {
    transfers.forEach((t, idx) => {
      lines.push(`${idx + 1}. ${t.fromName} ➡️ ${t.toName}：${formatCurrency(t.amount, currency, round)}`);
    });
  }
  lines.push('');

  // 4. Share Link
  try {
    const shareUrl = generateShareUrl(bill);
    lines.push(`🔗 查看/編輯完整帳目：\n${shareUrl}`);
  } catch {
    // Ignore in non-browser env
  }

  return lines.join('\n');
}
