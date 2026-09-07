import React, { useState } from 'react';
import { 
  Wifi, 
  WifiOff, 
  Sun, 
  Moon, 
  Settings, 
  RotateCcw, 
  Share2, 
  Check, 
  Edit3,
  HelpCircle 
} from 'lucide-react';
import { BillState } from '../types';

interface HeaderProps {
  bill: BillState;
  theme: 'dark' | 'light';
  peerCount: number;
  isLive: boolean;
  onToggleTheme: () => void;
  onUpdateTitle: (title: string) => void;
  onOpenLiveModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenShareModal: () => void;
  onOpenHelpModal: () => void;
  onResetBill: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  bill,
  theme,
  peerCount,
  isLive,
  onToggleTheme,
  onUpdateTitle,
  onOpenLiveModal,
  onOpenSettingsModal,
  onOpenShareModal,
  onOpenHelpModal,
  onResetBill,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(bill.title);

  const handleSaveTitle = () => {
    if (titleInput.trim()) {
      onUpdateTitle(titleInput.trim());
    } else {
      setTitleInput(bill.title);
    }
    setIsEditingTitle(false);
  };

  const handleResetConfirm = () => {
    if (window.confirm('確定要清空目前這張帳單的所有成員與支出嗎？此操作無法復原。')) {
      onResetBill();
    }
  };

  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-white/80 dark:bg-zinc-950/80 border-b border-zinc-200 dark:border-zinc-800 transition-colors">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        {/* Left: App Logo & Title */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-2xl select-none" role="img" aria-label="money">💸</span>
          
          {isEditingTitle ? (
            <div className="flex items-center gap-1.5 flex-1 max-w-xs">
              <input
                type="text"
                value={titleInput}
                onChange={e => setTitleInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') setIsEditingTitle(false);
                }}
                autoFocus
                className="w-full px-2 py-1 text-base font-bold bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
              />
              <button
                onClick={handleSaveTitle}
                className="p-1 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white"
                title="儲存名稱"
              >
                <Check size={18} />
              </button>
            </div>
          ) : (
            <div 
              onClick={() => {
                setTitleInput(bill.title);
                setIsEditingTitle(true);
              }}
              className="flex items-center gap-1.5 cursor-pointer group min-w-0"
              title="點擊修改帳單名稱"
            >
              <h1 className="text-lg md:text-xl font-bold tracking-tight text-zinc-900 dark:text-white truncate">
                {bill.title || '分帳活動'}
              </h1>
              <Edit3 size={15} className="text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200 transition-colors flex-shrink-0" />
            </div>
          )}
        </div>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Live Sync Badge Button */}
          <button
            onClick={onOpenLiveModal}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
              isLive
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-800'
            }`}
            title={isLive ? '多人即時連線中，點擊查看 QR Code' : '點擊開啟多人即時同步房間'}
          >
            {isLive ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <Wifi size={13} />
                <span className="hidden sm:inline">{peerCount + 1} 人在線</span>
                <span className="sm:hidden">同步中</span>
              </>
            ) : (
              <>
                <WifiOff size={13} />
                <span>開啟同步</span>
              </>
            )}
          </button>

          {/* Share Button */}
          <button
            onClick={onOpenShareModal}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-sm"
            title="分享帳單與 LINE 複製"
          >
            <Share2 size={13} />
            <span className="hidden sm:inline">分享</span>
          </button>

          {/* Help Button */}
          <button
            onClick={onOpenHelpModal}
            className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="新手使用指南"
            aria-label="新手使用指南"
          >
            <HelpCircle size={18} />
          </button>

          {/* Settings Button */}
          <button
            onClick={onOpenSettingsModal}
            className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="幣別與精度設定"
            aria-label="幣別與精度設定"
          >
            <Settings size={18} />
          </button>

          {/* Dark / Light Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title={theme === 'dark' ? '切換為淺色模式' : '切換為深色模式'}
            aria-label="切換主題"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Reset Button */}
          <button
            onClick={handleResetConfirm}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            title="重設帳單"
            aria-label="重設帳單"
          >
            <RotateCcw size={17} />
          </button>
        </div>
      </div>
    </header>
  );
};
