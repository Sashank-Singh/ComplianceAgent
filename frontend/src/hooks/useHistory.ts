"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addHistoryEntry,
  clearHistory as clearStore,
  getHistory,
} from "@/lib/storage";
import { CheckResponse, HistoryEntry } from "@/lib/types";

export function useHistory() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const addEntry = useCallback((result: CheckResponse) => {
    const updated = addHistoryEntry(result);
    setHistory(updated);
  }, []);

  const clearAll = useCallback(() => {
    clearStore();
    setHistory([]);
  }, []);

  return { history, addEntry, clearHistory: clearAll };
}
