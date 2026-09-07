import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, MessageSquare } from 'lucide-react';
import { BillState, SettlementResult } from '../types';
import { formatLineReport } from '../utils/lineFormatter';
import { generateShareUrl } from '../utils/urlState';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: BillState;
  settlement: SettlementResult;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  bill,
  settlement,
}) => {
  const [activeTab, setActiveTab] = useState<'line' | 'link'>('line');
  const [isDetailed, setIsDetailed] = useState(true);
  const [copiedLine, setCopiedLine] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  const lineReport = formatLineReport(bill, settlement, isDetailed);
  const shareUrl = generateShareUrl(bill);

  const handleCopyLine = async () => {
    try {
      await navigator.clipboard.writeText(lineReport);
      setCopiedLine(true);
      setTimeout(() => setCopiedLine(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <MessageSquare className="text-zinc-900 dark:text-white" size={18} />
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
              分享分帳結算報告
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-zinc-100 dark:border-zinc-800 px-4 pt-2">
          <button
            onClick={() => setActiveTab('line')}
            className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'line'
                ? 'border-zinc-900 dark:border-white text-zinc-900 dark:text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
            }`}
          >
            <span>💬 LINE 格式文字</span>
          </button>
          <button
            onClick={() => setActiveTab('link')}
            className={`pb-2 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'link'
                ? 'border-zinc-900 dark:border-white text-zinc-900 dark:text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
            }`}
          >
            <span>🔗 網址與 QR Code</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {activeTab === 'line' ? (
            <div className="space-y-3">
              {/* Detail format switcher */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  複製內容格式：
                </span>
                <div className="inline-flex p-0.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-[11px]">
                  <button
                    type="button"
                    onClick={() => setIsDetailed(true)}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                      isDetailed
                        ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm font-bold'
                        : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    📝 完整含逐筆計算過程
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDetailed(false)}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                      !isDetailed
                        ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm font-bold'
                        : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    精簡版
                  </button>
                </div>
              </div>

              <textarea
                readOnly
                rows={12}
                value={lineReport}
                className="w-full p-3 text-xs font-mono bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none resize-none text-zinc-800 dark:text-zinc-200 leading-relaxed"
              />
              <button
                onClick={handleCopyLine}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-sm"
              >
                {copiedLine ? (
                  <>
                    <Check size={16} className="text-emerald-500" />
                    <span>已複製 LINE 文字報告！</span>
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    <span>一鍵複製 LINE 純文字明細</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-3 flex flex-col items-center text-center">
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                此網址已完整壓縮此份帳單，朋友點開即可查看或接力補充：
              </p>

              <div className="p-3 bg-white rounded-xl shadow-md border border-zinc-200 dark:border-zinc-700 my-1">
                <QRCodeSVG
                  value={shareUrl}
                  size={160}
                  level="M"
                  includeMargin={false}
                />
              </div>

              <div className="w-full flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-500 font-mono truncate"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors flex items-center gap-1"
                >
                  {copiedLink ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
                  <span>複製</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
