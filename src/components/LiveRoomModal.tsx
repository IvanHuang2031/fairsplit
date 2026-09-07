import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, Users, LogOut, ArrowRight, ShieldCheck } from 'lucide-react';
import { generateRoomUrl } from '../utils/urlState';

interface LiveRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId?: string;
  peerCount: number;
  onJoinRoom: (roomId: string, isNewRoom?: boolean) => void;
  onLeaveRoom: () => void;
}

export const LiveRoomModal: React.FC<LiveRoomModalProps> = ({
  isOpen,
  onClose,
  roomId,
  peerCount,
  onJoinRoom,
  onLeaveRoom,
}) => {
  const [copied, setCopied] = useState(false);
  const [customRoomInput, setCustomRoomInput] = useState('');

  if (!isOpen) return null;

  const roomUrl = roomId ? generateRoomUrl(roomId) : '';

  const handleCopyLink = async () => {
    if (!roomUrl) return;
    try {
      await navigator.clipboard.writeText(roomUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleCreateNewRoom = () => {
    // Generate a 6-digit pure number (100000 - 999999)
    const randomCode = Math.floor(100000 + Math.random() * 900000).toString();
    onJoinRoom(randomCode, true);
  };

  const handleJoinCustomRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customRoomInput.trim();
    if (clean) {
      onJoinRoom(clean, false);
      setCustomRoomInput('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Users className="text-zinc-900 dark:text-white" size={20} />
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">
              多人即時協同記帳
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
        <div className="p-5 flex flex-col items-center text-center">
          {roomId ? (
            <>
              {/* Active Room View */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold mb-3">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>房間連線中：{peerCount + 1} 人在線</span>
              </div>

              <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
                房間代碼：<span className="font-mono font-bold text-zinc-900 dark:text-white text-sm tracking-wider">{roomId}</span>
              </div>

              {/* QR Code */}
              <div className="p-3 bg-white rounded-xl shadow-md border border-zinc-200 dark:border-zinc-700 my-2">
                <QRCodeSVG
                  value={roomUrl}
                  size={190}
                  level="M"
                  includeMargin={false}
                />
              </div>

              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 mb-4 leading-relaxed">
                朋友打開手機相機掃描 QR Code，<br />
                即可直接加入同一個帳本，雙方即時同步！
              </p>

              {/* Action Buttons */}
              <div className="w-full space-y-2">
                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-sm"
                >
                  {copied ? (
                    <>
                      <Check size={16} className="text-emerald-500" />
                      <span>已複製房間連結！</span>
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      <span>複製房間邀請網址</span>
                    </>
                  )}
                </button>

                <button
                  onClick={onLeaveRoom}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  <LogOut size={14} />
                  <span>結束/退出此同步房間</span>
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Not in room: Prompt to create or join */}
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 mb-3">
                <Users size={24} />
              </div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-1">
                開設多人即時連線房間
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-5 leading-relaxed">
                免註冊、免設定！開啟後大家可以用各自的手機隨時記帳，所有人的畫面秒級即時更新。
              </p>

              <button
                onClick={handleCreateNewRoom}
                className="w-full py-3 px-4 rounded-xl text-sm font-bold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-sm mb-4"
              >
                ✨ 立即建立新同步房間
              </button>

              <div className="w-full flex items-center gap-3 my-2">
                <div className="flex-1 h-px bg-zinc-200 dark:border-zinc-800"></div>
                <span className="text-xs text-zinc-400">或輸入朋友的房間代碼</span>
                <div className="flex-1 h-px bg-zinc-200 dark:border-zinc-800"></div>
              </div>

              <form onSubmit={handleJoinCustomRoom} className="w-full flex gap-2 mt-2">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="輸入 6 位數字代碼"
                  value={customRoomInput}
                  onChange={e => setCustomRoomInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="flex-1 px-3 py-2 text-sm font-mono text-center tracking-widest bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white"
                />
                <button
                  type="submit"
                  disabled={customRoomInput.trim().length !== 6}
                  className="px-3 py-2 rounded-xl text-sm font-semibold bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-300 dark:hover:bg-zinc-700 disabled:opacity-40 transition-colors"
                >
                  <ArrowRight size={16} />
                </button>
              </form>
            </>
          )}

          {/* Privacy Note */}
          <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 dark:text-zinc-500 mt-4">
            <ShieldCheck size={14} />
            <span>端到端即時同步，資料直接保存在各成員的手機與瀏覽器中</span>
          </div>
        </div>
      </div>
    </div>
  );
};
