"use client";

import { Trash2 } from "lucide-react";
import { HistoryEntry } from "@/lib/types";

interface HistoryListProps {
  entries: HistoryEntry[];
  onSelect: (domain: string) => void;
  onClear: () => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function HistoryList({ entries, onSelect, onClear }: HistoryListProps) {
  if (!entries.length) {
    return <p className="text-xs text-zinc-700 py-4">No checks yet</p>;
  }

  return (
    <div className="space-y-0.5">
      {entries.map((entry) => (
        <button
          key={entry.domain + entry.checkedAt}
          onClick={() => onSelect(entry.domain)}
          className="
            w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md
            hover:bg-white/[0.03] transition-colors text-left group
          "
        >
          <div
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              entry.compliant ? "bg-emerald-500" : "bg-red-500"
            }`}
          />
          <span className="flex-1 text-sm text-zinc-400 truncate group-hover:text-zinc-200 transition-colors">
            {entry.domain}
          </span>
          <span className="text-[11px] text-zinc-700 shrink-0">
            {timeAgo(entry.checkedAt)}
          </span>
        </button>
      ))}

      <button
        onClick={onClear}
        className="w-full flex items-center justify-center gap-1 py-2 mt-2 text-[11px] text-zinc-700 hover:text-red-400 transition-colors"
      >
        <Trash2 className="w-3 h-3" />
        Clear
      </button>
    </div>
  );
}
