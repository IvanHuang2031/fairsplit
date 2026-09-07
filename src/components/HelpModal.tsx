import React from 'react';
import { X, HelpCircle, Users, Receipt, Wifi, Share2, Smartphone } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <HelpCircle className="text-zinc-900 dark:text-white" size={20} />
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">
              分帳小幫手 · 新手使用指南
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
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
          {/* Step 1 */}
          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/80 space-y-1.5">
            <div className="flex items-center gap-2 text-zinc-900 dark:text-white font-bold text-sm">
              <Users size={16} className="text-zinc-700 dark:text-zinc-300" />
              <span>步驟 1：建立分帳名單</span>
            </div>
            <p>
              在「分帳成員名單」輸入朋友姓名並點擊「加入」。出遊人數無上限，也可以直接點「+ 快速填入範例成員」體驗。
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/80 space-y-1.5">
            <div className="flex items-center gap-2 text-zinc-900 dark:text-white font-bold text-sm">
              <Receipt size={16} className="text-zinc-700 dark:text-zinc-300" />
              <span>步驟 2：記錄每筆支出（誰付款、怎麼分）</span>
            </div>
            <p>點擊「記一筆」新增花費：</p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li><strong className="text-zinc-800 dark:text-zinc-200">誰付款</strong>：單人代墊或點「多人共同代墊」各自輸入出資金額。</li>
              <li><strong className="text-zinc-800 dark:text-zinc-200">怎麼分</strong>：支援全員均分、特定幾人分（如沒喝酒不攤酒錢）、按大人小孩份數、或自訂各自金額。</li>
            </ul>
          </div>

          {/* Step 3 */}
          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/80 space-y-1.5">
            <div className="flex items-center gap-2 text-zinc-900 dark:text-white font-bold text-sm">
              <Wifi size={16} className="text-emerald-500" />
              <span>步驟 3：開啟多人手機即時同步（大家一起記）</span>
            </div>
            <p>
              點擊右上角「開啟同步」會產生 6 位數房號與 QR Code。朋友打開手機相機一掃直接進房，大家各自記帳，所有人畫面秒級同步！
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/80 space-y-1.5">
            <div className="flex items-center gap-2 text-zinc-900 dark:text-white font-bold text-sm">
              <Share2 size={16} className="text-zinc-700 dark:text-zinc-300" />
              <span>步驟 4：查看最少轉帳結算 & 發 LINE 請款</span>
            </div>
            <p>
              系統會自動將多角欠款簡化為「最少轉帳次數」。點擊「分享」，一鍵複製排版好的 LINE 文字，直接貼到聊天室請大家轉帳收款！
            </p>
          </div>

          {/* Mobile Home Screen Tip */}
          <div className="p-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 space-y-1.5">
            <div className="flex items-center gap-2 text-zinc-900 dark:text-white font-bold">
              <Smartphone size={16} />
              <span>手機加到主畫面（免安裝 App）</span>
            </div>
            <p>
              iPhone 在 Safari 點「分享 ➡️ 加入主畫面」；Android 在 Chrome 點「選單 ➡️ 安裝/加到主畫面」，即可像原生 App 隨點隨用，離線也能記帳！
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-xs font-bold bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-sm"
          >
            我知道了，開始分帳！
          </button>
        </div>
      </div>
    </div>
  );
};
