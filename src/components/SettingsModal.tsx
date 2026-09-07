import React from 'react';
import { X, Settings } from 'lucide-react';
import { SettlementOptions } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  options: SettlementOptions;
  onChangeOptions: (opts: Partial<SettlementOptions>) => void;
}

const CURRENCIES = [
  { code: 'TWD', name: '新台幣 (NT$)', defaultRound: true },
  { code: 'JPY', name: '日圓 (¥)', defaultRound: true },
  { code: 'USD', name: '美元 ($)', defaultRound: false },
  { code: 'EUR', name: '歐元 (€)', defaultRound: false },
  { code: 'KRW', name: '韓元 (₩)', defaultRound: true },
  { code: 'HKD', name: '港幣 (HK$)', defaultRound: false },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  options,
  onChangeOptions,
}) => {
  if (!isOpen) return null;

  const handleCurrencyChange = (code: string) => {
    const cur = CURRENCIES.find(c => c.code === code);
    onChangeOptions({
      currency: code,
      roundToInteger: cur ? cur.defaultRound : options.roundToInteger,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Settings className="text-zinc-900 dark:text-white" size={18} />
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
              帳單設定
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Currency selection */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              幣別符號
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CURRENCIES.map(c => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleCurrencyChange(c.code)}
                  className={`p-2.5 rounded-xl text-xs font-medium border text-left transition-all ${
                    options.currency === c.code
                      ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-950 dark:border-white shadow-sm'
                      : 'bg-zinc-50 dark:bg-zinc-800/60 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <div className="font-bold">{c.code}</div>
                  <div className="text-[11px] opacity-80 truncate">{c.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Round to integer toggle */}
          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-xs font-bold text-zinc-900 dark:text-white block">
                  整數四捨五入（無小數點）
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
                  自動消除小數並平衡除不盡的零頭，適合台幣/日幣
                </span>
              </div>
              <input
                type="checkbox"
                checked={options.roundToInteger}
                onChange={e => onChangeOptions({ roundToInteger: e.target.checked })}
                className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800"
              />
            </label>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-xs font-bold bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-sm mt-2"
          >
            完成設定
          </button>
        </div>
      </div>
    </div>
  );
};
