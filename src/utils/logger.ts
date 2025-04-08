// src/utils/logger.ts
import { reactive } from 'vue';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export const LogConfig = reactive({
  level: LogLevel.INFO,
  enabledCategories: new Set<string>(['store', 'ui', 'service']),
  historyRetentionDays: 60
});

export function log(level: LogLevel, category: string, message: string, ...args: any[]) {
  if (level >= LogConfig.level && LogConfig.enabledCategories.has(category)) {
    const levelPrefix = LogLevel[level].padEnd(5);
    console.log(`[${levelPrefix}][${category}] ${message}`, ...args);

    if (message.includes('Transaction') || message.includes('Planning') ||
        message.includes('Category') || message.includes('transfer')) {
      addToHistory(level, category, message, args);
    }
  }
}

export const debugLog = (category: string, message: string, ...args: any[]) =>
  log(LogLevel.DEBUG, category, message, ...args);

export const infoLog = (category: string, message: string, ...args: any[]) =>
  log(LogLevel.INFO, category, message, ...args);

export const warnLog = (category: string, message: string, ...args: any[]) =>
  log(LogLevel.WARN, category, message, ...args);

export const errorLog = (category: string, message: string, ...args: any[]) =>
  log(LogLevel.ERROR, category, message, ...args);

// Zusätzlich exportiertes logger-Objekt (optional, falls gebraucht)
export const logger = {
  debug: debugLog,
  info: infoLog,
  warn: warnLog,
  error: errorLog
};

// History-Funktionalität
interface HistoryEntry {
  timestamp: number;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
}

const historyEntries: HistoryEntry[] = loadHistory();

function addToHistory(level: LogLevel, category: string, message: string, args: any[]) {
  const entry: HistoryEntry = {
    timestamp: Date.now(),
    level,
    category,
    message,
    data: args.length > 0 ? args[0] : undefined
  };

  historyEntries.push(entry);
  saveHistory();
}

function saveHistory() {
  localStorage.setItem('finwise_history', JSON.stringify(historyEntries));
}

function loadHistory(): HistoryEntry[] {
  try {
    const saved = localStorage.getItem('finwise_history');
    if (saved) {
      const parsed = JSON.parse(saved) as HistoryEntry[];
      return cleanupHistory(parsed);
    }
  } catch (err) {
    console.error('Fehler beim Laden der History:', err);
  }
  return [];
}

function cleanupHistory(entries: HistoryEntry[]): HistoryEntry[] {
  const cutoffTime = Date.now() - (LogConfig.historyRetentionDays * 24 * 60 * 60 * 1000);
  return entries.filter(entry => entry.timestamp >= cutoffTime);
}

export const historyManager = {
  getEntries: () => [...historyEntries],
  clear: () => {
    historyEntries.length = 0;
    saveHistory();
  },
  cleanupOldEntries: () => {
    const newEntries = cleanupHistory(historyEntries);
    historyEntries.length = 0;
    historyEntries.push(...newEntries);
    saveHistory();
  }
};
