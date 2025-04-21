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
  name: string
  accountId: string
  categoryId: string | null
  tagIds: string[]
  recipientId?: string
  amount: number
  amountType: AmountType
  approximateAmount?: number
  minAmount?: number
  maxAmount?: number
  note?: string
  startDate: string
  valueDate?: string
  endDate?: string | null
  recurrencePattern: RecurrencePattern
  recurrenceCount?: number | null
  recurrenceEndType: RecurrenceEndType
  executionDay?: number
  weekendHandling: WeekendHandlingType
  transactionType?: TransactionType
  counterPlanningTransactionId?: string | null
  transferToAccountId?: string
  isActive: boolean
  /** Neu: Nur Prognose, keine echten Transaktionen */
  forecastOnly: boolean
  autoExecute?: boolean  // wird nicht mehr genutzt
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

// Erweiterungen für src/types/index.ts

export enum AmountType {
  EXACT = 'EXACT',
  APPROXIMATE = 'APPROXIMATE',
  RANGE = 'RANGE'
}

export enum RecurrenceEndType {
  NEVER = 'NEVER',
  COUNT = 'COUNT',
  DATE = 'DATE'
}

export enum WeekendHandlingType {
  NONE = 'NONE',
  BEFORE = 'BEFORE',
  AFTER = 'AFTER'
}

// Erweiterte PlanningTransaction
export interface PlanningTransaction {
  id: string
  name: string // Anzeigename für die Planung
  accountId: string
  categoryId: string | null
  tagIds: string[]
  recipientId?: string
  amount: number
  amountType: AmountType
  approximateAmount?: number
  minAmount?: number
  maxAmount?: number
  note?: string
  startDate: string
  endDate?: string | null
  recurrencePattern: RecurrencePattern
  recurrenceCount?: number | null
  recurrenceEndType: RecurrenceEndType
  executionDay?: number // Tag des Monats/der Woche für die Ausführung
  weekendHandling: WeekendHandlingType // Umgang mit Wochenenden
  transactionType?: TransactionType
  counterPlanningTransactionId?: string | null
  transferToAccountId?: string
  isActive: boolean
  autoExecute: boolean // Automatische Ausführung
}

export enum RuleConditionType {
  ACCOUNT_IS = 'ACCOUNT_IS',
  PAYEE_EQUALS = 'PAYEE_EQUALS',
  PAYEE_CONTAINS = 'PAYEE_CONTAINS',
  AMOUNT_EQUALS = 'AMOUNT_EQUALS',
  AMOUNT_GREATER = 'AMOUNT_GREATER',
  AMOUNT_LESS = 'AMOUNT_LESS',
  DATE_IS = 'DATE_IS',
  DATE_APPROX = 'DATE_APPROX',
  DESCRIPTION_CONTAINS = 'DESCRIPTION_CONTAINS'
}

export enum RuleActionType {
  SET_CATEGORY = 'SET_CATEGORY',
  ADD_TAG = 'ADD_TAG',
  SET_NOTE = 'SET_NOTE',
  LINK_SCHEDULE = 'LINK_SCHEDULE'
}

export interface RuleCondition {
  type: RuleConditionType
  operator: string // is, contains, equals, etc.
  value: string | number
}

export interface RuleAction {
  type: RuleActionType
  field?: string // Nur bei SET-Actions
  value: string | string[] | number
}

export interface AutomationRule {
  id: string
  name: string
  description?: string
  stage: 'PRE' | 'DEFAULT' | 'POST' // Ausführungszeitpunkt
  conditions: RuleCondition[]
  actions: RuleAction[]
  priority: number
  isActive: boolean
}
