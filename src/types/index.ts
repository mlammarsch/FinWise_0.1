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
  ACCOUNTTRANSFER = 'ACCOUNTTRANSFER',
  CATEGORYTRANSFER = 'CATEGORYTRANSFER'
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
  accountId: string
  categoryId: string | null
  tagIds: string[]
  payee: string
  amount: number
  description?: string
  startDate: string
  endDate?: string | null
  recurrencePattern: RecurrencePattern
  recurrenceCount?: number | null
  transactionType?: TransactionType
  counterPlanningTransactionId?: string | null
  recipientId?: string
  transferToAccountId?: string
}

export interface Transaction {
  id: string
  accountId: string
  categoryId?: string
  date: string
  valueDate: string
  amount: number
  description: string
  note?: string
  tagIds: string[]
  type: TransactionType
  runningBalance: number
  counterTransactionId?: string | null
  planningTransactionId?: string | null
  isReconciliation?: boolean
  transferToAccountId?: string | null
  reconciled?: boolean
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
  isActive: boolean
  sortOrder: number
  categoryGroupId?: string
}

export interface CategoryGroup {
  id: string
  name: string
  sortOrder: number
  isIncomeGroup: boolean
}

export interface Tag {
  id: string
  name: string
  parentTagId?: string | null
  color: string
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

export interface Recipient {
  id: string
  name: string
}
