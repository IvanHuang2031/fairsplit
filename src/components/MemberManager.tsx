import React, { useState } from 'react';
import { UserPlus, X, User, Users } from 'lucide-react';
import { Member } from '../types';

interface MemberManagerProps {
  members: Member[];
  onAddMember: (name: string) => void;
  onRemoveMember: (id: string) => void;
}

export const MemberManager: React.FC<MemberManagerProps> = ({
  members,
  onAddMember,
  onRemoveMember,
}) => {
  const [nameInput, setNameInput] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      onAddMember(nameInput.trim());
      setNameInput('');
    }
  };

  const handleQuickAddPresets = () => {
    const presets = ['小明', '小華', '阿美'];
    presets.forEach(p => {
      if (!members.some(m => m.name === p)) {
        onAddMember(p);
      }
    });
  };

  return (
    <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 md:p-5 shadow-sm transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-zinc-700 dark:text-zinc-300" />
          <h2 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-white">
            分帳成員名單
          </h2>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
            {members.length} 人
          </span>
        </div>

        {members.length === 0 && (
          <button
            onClick={handleQuickAddPresets}
            className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white underline underline-offset-2"
          >
            + 快速填入範例成員
          </button>
        )}
      </div>

      {/* Add Member Form */}
      <form onSubmit={handleAdd} className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="輸入成員姓名 (例如：大偉、欣怡)..."
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white placeholder-zinc-400 transition-colors"
          />
          <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        </div>
        <button
          type="submit"
          disabled={!nameInput.trim()}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 disabled:opacity-40 transition-colors shadow-sm"
        >
          <UserPlus size={16} />
          <span>加入</span>
        </button>
      </form>

      {/* Member Tags List */}
      {members.length === 0 ? (
        <div className="py-4 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-400 dark:text-zinc-500 text-xs">
          尚未新增成員，請在上方輸入名字開始分帳
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {members.map(member => (
            <div
              key={member.id}
              className="group inline-flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/80 text-xs font-medium text-zinc-800 dark:text-zinc-200 transition-all hover:border-zinc-300 dark:hover:border-zinc-600"
            >
              <span>{member.name}</span>
              <button
                type="button"
                onClick={() => onRemoveMember(member.id)}
                className="p-0.5 rounded-md text-zinc-400 hover:text-red-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                title={`移除 ${member.name}`}
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
