import React, { useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  Copy, 
  Check, 
  TrendingUp, 
  TrendingDown, 
  Scale, 
  MessageSquareShare,
  Calculator
} from 'lucide-react';
import { SettlementResult, Member, Expense } from '../types';
import { formatCurrency, getAllExpenseBreakdowns } from '../utils/settlement';

interface SettlementViewProps {
  settlement: SettlementResult;
  members: Member[];
  expenses: Expense[];
  currency: string;
  roundToInteger: boolean;
  onOpenShareModal: () => void;
}

export const SettlementView: React.FC<SettlementViewProps> = ({
  settlement,
  members,
  expenses,
  currency,
  roundToInteger,
  onOpenShareModal,
}) => {
  const [activeTab, setActiveTab] = useState<'transfers' | 'balances' | 'breakdowns'>('transfers');
  const [copiedTransferIdx, setCopiedTransferIdx] = useState<number | null>(null);

  const { totalSpent, balances, transfers, perMemberAvg } = settlement;

  const breakdowns = useMemo(() => {
    return getAllExpenseBreakdowns(members, expenses, { currency, roundToInteger });
  }, [members, expenses, currency, roundToInteger]);

  const handleFireConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.7 },
    });
  };

  const handleCopySingleTransfer = async (from: string, to: string, amount: number, idx: number) => {
    const text = `${from} 應轉帳給 ${to}：${formatCurrency(amount, currency, roundToInteger)}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTransferIdx(idx);
      setTimeout(() => setCopiedTransferIdx(null), 2000);
    } catch {
      // Ignore
    }
  };

  return (
    <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 md:p-5 shadow-sm transition-colors">
      {/* Header & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Scale size={18} className="text-zinc-700 dark:text-zinc-300" />
            <h2 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-white">
              結算統計與還款建議
            </h2>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            人均約 {formatCurrency(perMemberAvg, currency, roundToInteger)} · 支援查看每筆花費的詳細出資與計算公式
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="inline-flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-xs font-medium self-start sm:self-auto overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('transfers')}
            className={`px-3 py-1.5 rounded-lg transition-all flex-shrink-0 ${
              activeTab === 'transfers'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm font-bold'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            最佳還款 ({transfers.length})
          </button>
          <button
            onClick={() => setActiveTab('balances')}
            className={`px-3 py-1.5 rounded-lg transition-all flex-shrink-0 ${
              activeTab === 'balances'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm font-bold'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            個人收支淨額
          </button>
          <button
            onClick={() => setActiveTab('breakdowns')}
            className={`px-3 py-1.5 rounded-lg transition-all flex-shrink-0 flex items-center gap-1 ${
              activeTab === 'breakdowns'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm font-bold'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Calculator size={13} />
            <span>逐筆計算明細 ({expenses.length})</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      {balances.length === 0 ? (
        <div className="py-8 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-400 dark:text-zinc-500 text-xs">
          請先在上方新增成員並記帳以查看結算結果
        </div>
      ) : activeTab === 'transfers' ? (
        /* Transfers List */
        <div>
          {transfers.length === 0 ? (
            <div className="py-8 px-4 text-center bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-800">
              <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                太棒了！大家帳目已完全平衡
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 mb-3">
                沒有任何人欠款，無需進行任何轉帳。
              </p>
              <button
                onClick={handleFireConfetti}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
              >
                <Sparkles size={14} className="text-amber-500" />
                <span>放個煙火慶祝</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {transfers.map((transfer, idx) => (
                <div
                  key={`${transfer.fromId}-${transfer.toId}-${idx}`}
                  className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-between gap-2 hover:border-zinc-300 dark:hover:border-zinc-600 transition-all"
                >
                  {/* Left: From -> To */}
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-zinc-200/80 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100 truncate max-w-[110px]">
                      {transfer.fromName}
                    </span>

                    <div className="flex flex-col items-center flex-shrink-0 text-zinc-400">
                      <ArrowRight size={16} />
                      <span className="text-[9px] font-medium">付給</span>
                    </div>

                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 truncate max-w-[110px]">
                      {transfer.toName}
                    </span>
                  </div>

                  {/* Right: Amount & Copy */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm sm:text-base font-bold font-mono text-zinc-900 dark:text-white">
                      {formatCurrency(transfer.amount, currency, roundToInteger)}
                    </span>

                    <button
                      onClick={() =>
                        handleCopySingleTransfer(
                          transfer.fromName,
                          transfer.toName,
                          transfer.amount,
                          idx
                        )
                      }
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                      title="複製此筆轉帳資訊"
                    >
                      {copiedTransferIdx === idx ? (
                        <Check size={14} className="text-emerald-500" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeTab === 'balances' ? (
        /* Member Balances List */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {balances.map(b => {
            const isCreditor = b.netBalance > 0.001;
            const isDebtor = b.netBalance < -0.001;
            return (
              <div
                key={b.memberId}
                className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-between gap-3"
              >
                <div>
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-white">
                    {b.memberName}
                  </h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    已付 {formatCurrency(b.totalPaid, currency, roundToInteger)} · 應付 {formatCurrency(b.totalOwed, currency, roundToInteger)}
                  </p>
                </div>

                <div>
                  {isCreditor ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono">
                      <TrendingUp size={12} />
                      + {formatCurrency(b.netBalance, currency, roundToInteger)}
                    </span>
                  ) : isDebtor ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 font-mono">
                      <TrendingDown size={12} />
                      - {formatCurrency(Math.abs(b.netBalance), currency, roundToInteger)}
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded-lg text-xs font-medium bg-zinc-200/60 dark:bg-zinc-700/60 text-zinc-500 dark:text-zinc-400">
                      已結平
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Detailed Breakdown of each Expense */
        <div className="space-y-3">
          {breakdowns.length === 0 ? (
            <div className="py-6 text-center text-xs text-zinc-400">
              目前尚無支出紀錄
            </div>
          ) : (
            breakdowns.map((b, idx) => (
              <div
                key={b.expenseId}
                className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/80 space-y-2.5"
              >
                {/* Title & Amount */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-[11px] font-bold flex items-center justify-center text-zinc-700 dark:text-zinc-300">
                      {idx + 1}
                    </span>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                      {b.title}
                    </h3>
                  </div>
                  <span className="text-sm font-bold font-mono text-zinc-900 dark:text-white">
                    {formatCurrency(b.totalAmount, currency, roundToInteger)}
                  </span>
                </div>

                {/* Meta details */}
                <div className="text-xs space-y-1 text-zinc-600 dark:text-zinc-400 pl-7">
                  <div>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">💳 代墊人：</span>
                    <span>{b.payersSummary}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">🤝 分攤方式：</span>
                    <span>{b.splitSummary}</span>
                  </div>
                  {b.calculationFormula && (
                    <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 p-2 rounded-lg mt-1 border border-zinc-200/50 dark:border-zinc-700/50">
                      🧮 計算公式：{b.calculationFormula}
                    </div>
                  )}
                </div>

                {/* Member shares table/grid */}
                <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60 pl-7">
                  <span className="text-[11px] font-bold text-zinc-500 block mb-1.5">
                    每位成員此筆分攤與出資差額：
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                    {b.memberShares.map(s => {
                      const net = s.paidAmount - s.owedAmount;
                      return (
                        <div
                          key={s.memberId}
                          className="flex items-center justify-between p-1.5 rounded-lg bg-white/60 dark:bg-zinc-900/60 border border-zinc-200/50 dark:border-zinc-700/50"
                        >
                          <span className="font-medium text-zinc-800 dark:text-zinc-200">
                            {s.memberName}
                          </span>
                          <div className="flex items-center gap-2 font-mono text-[11px]">
                            <span className="text-zinc-400">
                              出 {formatCurrency(s.paidAmount, currency, roundToInteger)} / 攤 {formatCurrency(s.owedAmount, currency, roundToInteger)}
                            </span>
                            {net > 0 ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                +{formatCurrency(net, currency, roundToInteger)}
                              </span>
                            ) : net < 0 ? (
                              <span className="text-red-500 font-bold">
                                -{formatCurrency(Math.abs(net), currency, roundToInteger)}
                              </span>
                            ) : (
                              <span className="text-zinc-400">$0</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Share / Export Bar */}
      {balances.length > 0 && (
        <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 text-center sm:text-left">
            總計代墊：<span className="font-mono font-bold text-zinc-900 dark:text-white">{formatCurrency(totalSpent, currency, roundToInteger)}</span>
          </div>

          <button
            onClick={onOpenShareModal}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-sm"
          >
            <MessageSquareShare size={15} />
            <span>複製 LINE 格式文字 / 分享帳單</span>
          </button>
        </div>
      )}
    </section>
  );
};
