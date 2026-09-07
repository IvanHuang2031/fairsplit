import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  DollarSign, 
  Calendar, 
  AlertCircle 
} from 'lucide-react';
import { Member, Expense, SplitType, Payer, SplitShare } from '../types';
import { formatCurrency } from '../utils/settlement';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  currency: string;
  roundToInteger: boolean;
  onSaveExpense: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => void;
  editingExpense?: Expense | null;
}

const CATEGORIES = [
  { label: '餐飲', emoji: '🍜' },
  { label: '交通', emoji: '🚗' },
  { label: '住宿', emoji: '🏠' },
  { label: '門票', emoji: '🎟️' },
  { label: '購物', emoji: '🛍️' },
  { label: '其他', emoji: '💡' },
];

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  members,
  currency,
  roundToInteger,
  onSaveExpense,
  editingExpense,
}) => {
  const [title, setTitle] = useState('');
  const [totalAmountStr, setTotalAmountStr] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('餐飲');
  const [note, setNote] = useState('');

  // Payer state
  const [isMultiPayer, setIsMultiPayer] = useState(false);
  const [singlePayerId, setSinglePayerId] = useState('');
  const [multiPayers, setMultiPayers] = useState<Record<string, string>>({});

  // Split state
  const [splitType, setSplitType] = useState<SplitType>('equal_all');
  const [selectedMembers, setSelectedMembers] = useState<Record<string, boolean>>({});
  const [memberShares, setMemberShares] = useState<Record<string, number>>({});
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>({});

  const [errorMessage, setErrorMessage] = useState('');

  // Initialize or reset when modal opens or editingExpense changes
  useEffect(() => {
    if (!isOpen) return;

    if (editingExpense) {
      setTitle(editingExpense.title);
      setTotalAmountStr(String(editingExpense.totalAmount));
      setDate(editingExpense.date);
      setCategory(editingExpense.category || '餐飲');
      setNote(editingExpense.note || '');

      // Payers
      if (editingExpense.payers.length > 1) {
        setIsMultiPayer(true);
        const map: Record<string, string> = {};
        editingExpense.payers.forEach(p => {
          map[p.memberId] = String(p.amount);
        });
        setMultiPayers(map);
      } else if (editingExpense.payers.length === 1) {
        setIsMultiPayer(false);
        setSinglePayerId(editingExpense.payers[0].memberId);
      }

      // Split Type
      setSplitType(editingExpense.splitType);
      const selectedMap: Record<string, boolean> = {};
      const sharesMap: Record<string, number> = {};
      const exactMap: Record<string, string> = {};

      members.forEach(m => {
        selectedMap[m.id] = false;
        sharesMap[m.id] = 1;
        exactMap[m.id] = '';
      });

      editingExpense.shares.forEach(s => {
        selectedMap[s.memberId] = true;
        if (s.shares !== undefined) sharesMap[s.memberId] = s.shares;
        if (s.exactAmount !== undefined) exactMap[s.memberId] = String(s.exactAmount);
      });

      setSelectedMembers(selectedMap);
      setMemberShares(sharesMap);
      setExactAmounts(exactMap);
    } else {
      // Create new
      setTitle('');
      setTotalAmountStr('');
      setDate(new Date().toISOString().split('T')[0]);
      setCategory('餐飲');
      setNote('');
      setIsMultiPayer(false);
      setSinglePayerId(members[0]?.id || '');
      setMultiPayers({});
      setSplitType('equal_all');

      const selectedMap: Record<string, boolean> = {};
      const sharesMap: Record<string, number> = {};
      const exactMap: Record<string, string> = {};
      members.forEach(m => {
        selectedMap[m.id] = true;
        sharesMap[m.id] = 1;
        exactMap[m.id] = '';
      });
      setSelectedMembers(selectedMap);
      setMemberShares(sharesMap);
      setExactAmounts(exactMap);
    }
    setErrorMessage('');
  }, [isOpen, editingExpense, members]);

  if (!isOpen) return null;

  const totalAmount = parseFloat(totalAmountStr) || 0;

  // Multi-payer total check
  const currentMultiPayerSum = Object.values(multiPayers).reduce(
    (sum, val) => sum + (parseFloat(val) || 0),
    0
  );

  // Exact split total check
  const currentExactSum = Object.values(exactAmounts).reduce(
    (sum, val) => sum + (parseFloat(val) || 0),
    0
  );

  const handleToggleMemberSelect = (memberId: string) => {
    setSelectedMembers(prev => ({
      ...prev,
      [memberId]: !prev[memberId],
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!title.trim()) {
      setErrorMessage('請填寫支出名稱（例如：午餐、車票）');
      return;
    }
    if (totalAmount <= 0) {
      setErrorMessage('請輸入有效的支出金額');
      return;
    }

    // Build Payers
    let finalPayers: Payer[] = [];
    if (!isMultiPayer) {
      if (!singlePayerId) {
        setErrorMessage('請選擇由誰付款代墊');
        return;
      }
      finalPayers = [{ memberId: singlePayerId, amount: totalAmount }];
    } else {
      const activePayers = Object.entries(multiPayers)
        .map(([mId, amtStr]) => ({
          memberId: mId,
          amount: parseFloat(amtStr) || 0,
        }))
        .filter(p => p.amount > 0);

      if (activePayers.length === 0) {
        setErrorMessage('請至少填寫一位付款人的代墊金額');
        return;
      }

      const diff = Math.abs(currentMultiPayerSum - totalAmount);
      if (diff > 0.05) {
        setErrorMessage(
          `多人代墊加總 (${currentMultiPayerSum}) 與總金額 (${totalAmount}) 不符，差額 ${Math.round(diff * 100) / 100}`
        );
        return;
      }
      finalPayers = activePayers;
    }

    // Build Shares
    let finalShares: SplitShare[] = [];
    if (splitType === 'equal_all') {
      finalShares = members.map(m => ({ memberId: m.id, shares: 1 }));
    } else if (splitType === 'equal_selected') {
      const selected = members.filter(m => selectedMembers[m.id]);
      if (selected.length === 0) {
        setErrorMessage('請至少勾選一位分攤成員');
        return;
      }
      finalShares = selected.map(m => ({ memberId: m.id, shares: 1 }));
    } else if (splitType === 'by_shares') {
      const activeShares = members
        .map(m => ({
          memberId: m.id,
          shares: memberShares[m.id] || 0,
        }))
        .filter(s => s.shares > 0);

      if (activeShares.length === 0) {
        setErrorMessage('請至少填寫一位成員的分配份數');
        return;
      }
      finalShares = activeShares;
    } else if (splitType === 'exact_amount') {
      const diff = Math.abs(currentExactSum - totalAmount);
      if (diff > 0.05) {
        setErrorMessage(
          `自訂分攤加總 (${currentExactSum}) 與總金額 (${totalAmount}) 不符，差額 ${Math.round(diff * 100) / 100}`
        );
        return;
      }
      finalShares = members
        .map(m => ({
          memberId: m.id,
          exactAmount: parseFloat(exactAmounts[m.id]) || 0,
        }))
        .filter(s => (s.exactAmount || 0) > 0);
    }

    onSaveExpense({
      title: title.trim(),
      totalAmount,
      date,
      category,
      note: note.trim(),
      payers: finalPayers,
      splitType,
      shares: finalShares,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <h2 className="text-base font-bold text-zinc-900 dark:text-white">
            {editingExpense ? '編輯支出' : '新增一筆支出'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSave} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Quick Categories */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {CATEGORIES.map(cat => (
              <button
                key={cat.label}
                type="button"
                onClick={() => setCategory(cat.label)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all flex-shrink-0 ${
                  category === cat.label
                    ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-950 dark:border-white'
                    : 'bg-zinc-100 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Title & Amount Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                支出品項名稱 *
              </label>
              <input
                type="text"
                placeholder="例如：晚餐火鍋、包棟民宿..."
                value={title}
                onChange={e => setTitle(e.target.value)}
                autoFocus
                className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                總金額 ({currency}) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  step={roundToInteger ? '1' : '0.01'}
                  min="0"
                  placeholder="0"
                  value={totalAmountStr}
                  onChange={e => setTotalAmountStr(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-base font-bold font-mono bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white"
                />
                <DollarSign size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              </div>
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              日期
            </label>
            <div className="relative">
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white text-zinc-700 dark:text-zinc-300"
              />
              <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            </div>
          </div>

          {/* 1. Who Paid Section */}
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                誰付的錢？
              </span>
              <button
                type="button"
                onClick={() => setIsMultiPayer(!isMultiPayer)}
                className="text-[11px] text-zinc-500 hover:text-zinc-900 dark:hover:text-white underline underline-offset-2"
              >
                {isMultiPayer ? '切換為單人付款' : '多人共同代墊？點此設定'}
              </button>
            </div>

            {!isMultiPayer ? (
              /* Single Payer Selection */
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {members.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSinglePayerId(m.id)}
                    className={`py-2 px-3 rounded-xl text-xs font-medium border flex items-center justify-between transition-all ${
                      singlePayerId === m.id
                        ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-950 dark:border-white shadow-sm'
                        : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <span className="truncate">{m.name}</span>
                    {singlePayerId === m.id && <Check size={14} />}
                  </button>
                ))}
              </div>
            ) : (
              /* Multi Payer Inputs */
              <div className="space-y-2 p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-700">
                <div className="text-[11px] text-zinc-500 mb-2 flex items-center justify-between">
                  <span>分別輸入每位成員出的金額：</span>
                  <span className={Math.abs(currentMultiPayerSum - totalAmount) < 0.05 ? 'text-emerald-500 font-bold' : 'text-amber-500 font-bold'}>
                    已填 {formatCurrency(currentMultiPayerSum, currency, roundToInteger)} / 共 {formatCurrency(totalAmount, currency, roundToInteger)}
                  </span>
                </div>
                {members.map(m => (
                  <div key={m.id} className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 w-24 truncate">
                      {m.name}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step={roundToInteger ? '1' : '0.01'}
                      placeholder="0"
                      value={multiPayers[m.id] || ''}
                      onChange={e =>
                        setMultiPayers(prev => ({ ...prev, [m.id]: e.target.value }))
                      }
                      className="w-32 px-2.5 py-1 text-right text-xs font-mono font-semibold bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Who Splits Section */}
          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <span className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-2">
              這筆錢要跟誰分？
            </span>

            {/* Split Mode Tabs */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl mb-3 text-[11px]">
              <button
                type="button"
                onClick={() => setSplitType('equal_all')}
                className={`py-1.5 rounded-lg font-medium transition-all ${
                  splitType === 'equal_all'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                全員平分
              </button>
              <button
                type="button"
                onClick={() => setSplitType('equal_selected')}
                className={`py-1.5 rounded-lg font-medium transition-all ${
                  splitType === 'equal_selected'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                特定人分
              </button>
              <button
                type="button"
                onClick={() => setSplitType('by_shares')}
                className={`py-1.5 rounded-lg font-medium transition-all ${
                  splitType === 'by_shares'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                依份數
              </button>
              <button
                type="button"
                onClick={() => setSplitType('exact_amount')}
                className={`py-1.5 rounded-lg font-medium transition-all ${
                  splitType === 'exact_amount'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                自訂金額
              </button>
            </div>

            {/* Split Options Details */}
            {splitType === 'equal_all' && (
              <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl text-center text-xs text-zinc-500 dark:text-zinc-400">
                全部 {members.length} 人平均分攤，
                {totalAmount > 0 && members.length > 0 && (
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 ml-1">
                    每人約 {formatCurrency(totalAmount / members.length, currency, roundToInteger)}
                  </span>
                )}
              </div>
            )}

            {splitType === 'equal_selected' && (
              <div className="space-y-1.5">
                <div className="text-[11px] text-zinc-500 mb-1">
                  勾選要一起分攤這筆費用的成員：
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {members.map(m => {
                    const isChecked = Boolean(selectedMembers[m.id]);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleToggleMemberSelect(m.id)}
                        className={`flex items-center justify-between p-2 rounded-xl text-xs font-medium border transition-all ${
                          isChecked
                            ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-950 dark:border-white'
                            : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-700 text-zinc-500'
                        }`}
                      >
                        <span className="truncate">{m.name}</span>
                        {isChecked && <Check size={14} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {splitType === 'by_shares' && (
              <div className="space-y-2 p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-700">
                <div className="text-[11px] text-zinc-500 mb-1">
                  設定每人佔幾份（例如：大人 2 份、小孩 1 份）：
                </div>
                {members.map(m => (
                  <div key={m.id} className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 w-28 truncate">
                      {m.name}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={memberShares[m.id] ?? 1}
                        onChange={e =>
                          setMemberShares(prev => ({
                            ...prev,
                            [m.id]: parseFloat(e.target.value) || 0,
                          }))
                        }
                        className="w-16 px-2 py-1 text-center text-xs font-mono font-semibold bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white"
                      />
                      <span className="text-xs text-zinc-400">份</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {splitType === 'exact_amount' && (
              <div className="space-y-2 p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200 dark:border-zinc-700">
                <div className="text-[11px] text-zinc-500 mb-2 flex items-center justify-between">
                  <span>輸入每人各自分攤的特定金額：</span>
                  <span className={Math.abs(currentExactSum - totalAmount) < 0.05 ? 'text-emerald-500 font-bold' : 'text-amber-500 font-bold'}>
                    已分 {formatCurrency(currentExactSum, currency, roundToInteger)} / 共 {formatCurrency(totalAmount, currency, roundToInteger)}
                  </span>
                </div>
                {members.map(m => (
                  <div key={m.id} className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 w-24 truncate">
                      {m.name}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step={roundToInteger ? '1' : '0.01'}
                      placeholder="0"
                      value={exactAmounts[m.id] || ''}
                      onChange={e =>
                        setExactAmounts(prev => ({ ...prev, [m.id]: e.target.value }))
                      }
                      className="w-32 px-2.5 py-1 text-right text-xs font-mono font-semibold bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-sm"
            >
              {editingExpense ? '儲存變更' : '新增此筆花費'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
