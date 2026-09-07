import React, { useState, useMemo } from 'react';
import { Plus, Share2, Wifi } from 'lucide-react';
import { useBillState } from './hooks/useBillState';
import { calculateSettlement, formatCurrency } from './utils/settlement';
import { Expense } from './types';
import { Header } from './components/Header';
import { MemberManager } from './components/MemberManager';
import { ExpenseList } from './components/ExpenseList';
import { ExpenseModal } from './components/ExpenseModal';
import { SettlementView } from './components/SettlementView';
import { LiveRoomModal } from './components/LiveRoomModal';
import { ShareModal } from './components/ShareModal';
import { SettingsModal } from './components/SettingsModal';
import { HelpModal } from './components/HelpModal';

export const App: React.FC = () => {
  const {
    bill,
    theme,
    peerCount,
    isLive,
    setTitle,
    addMember,
    removeMember,
    addExpense,
    updateExpense,
    deleteExpense,
    setOptions,
    resetBill,
    joinRoom,
    leaveRoom,
    toggleTheme,
  } = useBillState();

  // Modals state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isLiveModalOpen, setIsLiveModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  // Settlement calculation
  const settlement = useMemo(() => {
    return calculateSettlement(bill.members, bill.expenses, bill.options);
  }, [bill.members, bill.expenses, bill.options]);

  const handleOpenAddExpense = () => {
    setEditingExpense(null);
    setIsExpenseModalOpen(true);
  };

  const handleOpenEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setIsExpenseModalOpen(true);
  };

  const handleSaveExpense = (
    expenseData: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    if (editingExpense) {
      updateExpense(editingExpense.id, expenseData);
    } else {
      addExpense(expenseData);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Header */}
      <Header
        bill={bill}
        theme={theme}
        peerCount={peerCount}
        isLive={isLive}
        onToggleTheme={toggleTheme}
        onUpdateTitle={setTitle}
        onOpenLiveModal={() => setIsLiveModalOpen(true)}
        onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onOpenHelpModal={() => setIsHelpModalOpen(true)}
        onResetBill={resetBill}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-4 md:py-6 space-y-4 md:space-y-6 pb-24">
        {/* Live sync banner if connected */}
        {isLive && (
          <div 
            onClick={() => setIsLiveModalOpen(true)}
            className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold cursor-pointer hover:bg-emerald-500/15 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>
                即時房間連線中（代碼：<span className="font-mono font-bold tracking-wider">{bill.roomId}</span>）· 目前 {peerCount + 1} 人在線同步
              </span>
            </div>
            <span className="underline underline-offset-2">查看 QR Code</span>
          </div>
        )}

        {/* Quick Overview Summary Banner */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 sm:p-4 text-center shadow-sm">
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 block">
              總支出金額
            </span>
            <span className="text-sm sm:text-lg font-bold font-mono text-zinc-900 dark:text-white mt-0.5 block truncate">
              {formatCurrency(settlement.totalSpent, bill.options.currency, bill.options.roundToInteger)}
            </span>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 sm:p-4 text-center shadow-sm">
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 block">
              分攤成員
            </span>
            <span className="text-sm sm:text-lg font-bold text-zinc-900 dark:text-white mt-0.5 block">
              {bill.members.length} 人
            </span>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 sm:p-4 text-center shadow-sm">
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 block">
              平均每人
            </span>
            <span className="text-sm sm:text-lg font-bold font-mono text-zinc-900 dark:text-white mt-0.5 block truncate">
              {formatCurrency(settlement.perMemberAvg, bill.options.currency, bill.options.roundToInteger)}
            </span>
          </div>
        </div>

        {/* Section 1: Member Manager */}
        <MemberManager
          members={bill.members}
          onAddMember={addMember}
          onRemoveMember={removeMember}
        />

        {/* Section 2: Expense List */}
        <ExpenseList
          expenses={bill.expenses}
          members={bill.members}
          currency={bill.options.currency}
          roundToInteger={bill.options.roundToInteger}
          onOpenAddModal={handleOpenAddExpense}
          onEditExpense={handleOpenEditExpense}
          onDeleteExpense={deleteExpense}
        />

        {/* Section 3: Settlement View */}
        <SettlementView
          settlement={settlement}
          currency={bill.options.currency}
          roundToInteger={bill.options.roundToInteger}
          onOpenShareModal={() => setIsShareModalOpen(true)}
        />
      </main>

      {/* Sticky Mobile Bottom Floating Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 backdrop-blur-md bg-white/90 dark:bg-zinc-950/90 border-t border-zinc-200 dark:border-zinc-800 p-3 sm:hidden transition-colors">
        <div className="max-w-md mx-auto flex items-center gap-2">
          <button
            onClick={handleOpenAddExpense}
            disabled={bill.members.length === 0}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-md active:scale-95 transition-all disabled:opacity-40"
          >
            <Plus size={16} />
            <span>記一筆花費</span>
          </button>

          <button
            onClick={() => setIsShareModalOpen(true)}
            className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 active:scale-95 transition-all"
            title="分享與複製 LINE 文字"
          >
            <Share2 size={16} />
          </button>

          <button
            onClick={() => setIsLiveModalOpen(true)}
            className={`p-3 rounded-xl border active:scale-95 transition-all ${
              isLive
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700'
            }`}
            title="多人即時同步房間"
          >
            <Wifi size={16} />
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 border-t border-zinc-200 dark:border-zinc-900 text-center text-xs text-zinc-400 dark:text-zinc-500 space-y-1">
        <p>分帳小幫手 FairSplit · 極簡黑白 · 隨時可用 · 免裝 App</p>
        <p className="text-[10px]">資料自動保存在手機與瀏覽器中 · 支援 WebRTC P2P 多人即時同步</p>
      </footer>

      {/* Modals */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        members={bill.members}
        currency={bill.options.currency}
        roundToInteger={bill.options.roundToInteger}
        onSaveExpense={handleSaveExpense}
        editingExpense={editingExpense}
      />

      <LiveRoomModal
        isOpen={isLiveModalOpen}
        onClose={() => setIsLiveModalOpen(false)}
        roomId={bill.roomId}
        peerCount={peerCount}
        onJoinRoom={joinRoom}
        onLeaveRoom={leaveRoom}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        bill={bill}
        settlement={settlement}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        options={bill.options}
        onChangeOptions={setOptions}
      />

      <HelpModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />
    </div>
  );
};
