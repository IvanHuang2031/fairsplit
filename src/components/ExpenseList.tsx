import React from 'react';
import { Plus, Receipt, Edit2, Trash2 } from 'lucide-react';
import { Expense, Member } from '../types';
import { formatCurrency } from '../utils/settlement';

interface ExpenseListProps {
  expenses: Expense[];
  members: Member[];
  currency: string;
  roundToInteger: boolean;
  onOpenAddModal: () => void;
  onEditExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
}

export const ExpenseList: React.FC<ExpenseListProps> = ({
  expenses,
  members,
  currency,
  roundToInteger,
  onOpenAddModal,
  onEditExpense,
  onDeleteExpense,
}) => {
  const memberMap = new Map<string, string>();
  members.forEach(m => memberMap.set(m.id, m.name));

  const totalSpent = expenses.reduce((acc, e) => acc + e.totalAmount, 0);

  const getPayerSummary = (expense: Expense) => {
    if (expense.payers.length === 1) {
      const p = expense.payers[0];
      const name = memberMap.get(p.memberId) || '未知';
      return `${name} 代墊`;
    }
    return `多人代墊 (${expense.payers.length}人)`;
  };

  const getSplitSummary = (expense: Expense) => {
    switch (expense.splitType) {
      case 'equal_all':
        return `全員均分 (${members.length}人)`;
      case 'equal_selected':
        return `特定 ${expense.shares.length} 人分攤`;
      case 'by_shares':
        return `依份數分攤`;
      case 'exact_amount':
        return `自訂每人金額`;
      default:
        return '';
    }
  };

  return (
    <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 md:p-5 shadow-sm transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Receipt size={18} className="text-zinc-700 dark:text-zinc-300" />
            <h2 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-white">
              支出紀錄
            </h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
              {expenses.length} 筆
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            累計支出：<span className="font-mono font-bold text-zinc-900 dark:text-white">{formatCurrency(totalSpent, currency, roundToInteger)}</span>
          </p>
        </div>

        <button
          onClick={onOpenAddModal}
          disabled={members.length === 0}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 disabled:opacity-40 transition-colors shadow-sm"
        >
          <Plus size={15} />
          <span>記一筆</span>
        </button>
      </div>

      {/* Expense Cards List */}
      {expenses.length === 0 ? (
        <div className="py-8 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-400 dark:text-zinc-500 text-xs">
          <Receipt size={28} className="mx-auto mb-2 opacity-40" />
          <p>目前還沒有任何花費紀錄</p>
          <button
            onClick={onOpenAddModal}
            disabled={members.length === 0}
            className="mt-2 text-xs font-semibold text-zinc-900 dark:text-white underline underline-offset-2"
          >
            點此新增第一筆花費
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {expenses.map(expense => (
            <div
              key={expense.id}
              className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/70 hover:border-zinc-300 dark:hover:border-zinc-600 transition-all flex items-center justify-between gap-3"
            >
              {/* Left Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {expense.category && (
                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-zinc-200/60 dark:bg-zinc-700/60 text-zinc-700 dark:text-zinc-300 flex-shrink-0">
                      {expense.category}
                    </span>
                  )}
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                    {expense.title}
                  </h3>
                  <span className="text-[11px] text-zinc-400 flex-shrink-0">
                    {expense.date}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                  <span>💳 {getPayerSummary(expense)}</span>
                  <span>🤝 {getSplitSummary(expense)}</span>
                </div>
              </div>

              {/* Right: Amount & Actions */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-base font-bold font-mono tracking-tight text-zinc-900 dark:text-white">
                    {formatCurrency(expense.totalAmount, currency, roundToInteger)}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEditExpense(expense)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                    title="編輯"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`確定要刪除「${expense.title}」這筆支出嗎？`)) {
                        onDeleteExpense(expense.id);
                      }
                    }}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    title="刪除"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
