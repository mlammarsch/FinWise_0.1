export interface Account {
  id: string
  name: string
  description?: string
  note?: string
  accountType: AccountType
  isActive: boolean
  isOfflineBudget: boolean
  accountGroupId: string
  sortOrder: number
  iban?: string
  balance: number
  creditLimit?: number
  offset: number
  image?: string
}

export interface AccountGroup {
  id: string
  name: string
  sortOrder: number
  image?: string
}

export enum AccountType {
  CHECKING = 'CHECKING',
  SAVINGS = 'SAVINGS',
  CREDIT = 'CREDIT',
  CASH = 'CASH'
}

export enum TransactionType {
  EXPENSE = 'EXPENSE',
  INCOME = 'INCOME',
  TRANSFER = 'TRANSFER'
}

export enum RecurrencePattern {
  ONCE = 'ONCE',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY'
}

export interface PlanningTransaction {
  id: string
  startDate: string
  accountId: string
  categoryId?: string | null
  payee?: string
  amount: number
  description?: string
  transactionType: TransactionType
  recurrencePattern: RecurrencePattern
  endDate?: string | null
  recurrenceCount?: number | null
  tagIds: string[]
  counterPlanningTransactionId?: string | null
}

export interface Transaction {
  id: string
  accountId: string
  categoryId?: string
  date: string
  valueDate: string          // Neues Feld: Wertstellungsdatum
  amount: number
  description: string
  note?: string
  tagIds: string[]           // Umbenannt von "tags"
  type: TransactionType      // Neues Feld: Transaktionstyp
  runningBalance: number     // Neues Feld: Laufender Saldo
  counterTransactionId?: string | null   // Neues Feld: Gegenbuchung
  planningTransactionId?: string | null    // Neues Feld: Planung
  isReconciliation?: boolean // Neues Feld: Kennzeichnung für Ausgleichsbuchungen
  transferToAccountId?: string | null // Neues Feld: Zielkonto bei Transfers
}

export interface Category {
  id: string
  name: string
  icon?: string
  budgeted: number
  activity: number
  available: number
  isIncomeCategory: boolean
  isHidden: boolean
  sortOrder: number
}

export interface Tag {
  id: string
  name: string
}

export interface PlanningItem {
  id: string
  categoryId: string
  year: number
  month: number
  plannedAmount: number
}

export interface StatisticItem {
  year: number
  month: number
  categoryId: string
  amount: number
}

// Erweiterung für die Empfänger-Funktionalität:
export interface Recipient {
  id: string
  name: string
}
