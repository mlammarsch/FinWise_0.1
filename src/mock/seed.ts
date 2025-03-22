// Datei: src/mock/seed.ts
import { useAccountStore } from "../stores/accountStore";
import { useTransactionStore } from "../stores/transactionStore";
import { useTagStore } from "../stores/tagStore";
import { useCategoryStore } from "../stores/categoryStore";
import { useRecipientStore } from "../stores/recipientStore";
import { usePlanningStore } from "../stores/planningStore";
import { useStatisticsStore } from "../stores/statisticsStore";
import { useThemeStore } from "../stores/themeStore";
import { createPinia } from "pinia";

import dayjs from "dayjs";
import { TransactionType } from "../types";

const pinia = createPinia();

export function seedData() {
  const accountStore = useAccountStore(pinia);
  const transactionStore = useTransactionStore(pinia);
  const tagStore = useTagStore(pinia);
  const categoryStore = useCategoryStore(pinia);
  const recipientStore = useRecipientStore(pinia);

  if (recipientStore.recipients.length === 0) {
    [
      "Rewe", "Aldi", "Lidl", "Bäcker", "Arbeitgeber GmbH", "Finanzamt",
      "Autowerkstatt Halmich", "Amazon", "Tankstelle", "Klaus Wilhelm"
    ].forEach((name) => recipientStore.addRecipient({ name }));
  }

  if (tagStore.tags.length === 0) {
    [
      "Lebensmittel", "Freizeit", "Auto", "Wohnen", "Haushalt",
      "Versicherung", "Gesundheit", "Urlaub", "Internet", "Telefon"
    ].forEach((name) => tagStore.addTag({ name, parentTagId: null }));
  }

  if (categoryStore.categories.length === 0) {
    [
      "Lebensmittel", "Freizeit", "Reparaturen", "Miete", "Versicherung",
      "Gesundheit", "Sparen", "Gehalt", "Nebenjob", "Bargeld"
    ].forEach((name) =>
      categoryStore.addCategory({ name, parentCategoryId: null })
    );
  }

  if (accountStore.accounts.length === 0) {
    const defaultGroupId = accountStore.accountGroups[0]?.id || "";
    const secondGroupId = accountStore.accountGroups[1]?.id || defaultGroupId;

    accountStore.addAccount({
      name: "Geldbeutel",
      description: "Bargeld",
      balance: 0,
      isActive: true,
      isOfflineBudget: false,
      accountGroupId: defaultGroupId
    });

    accountStore.addAccount({
      name: "Gehaltskonto",
      description: "Girokonto ING",
      iban: "DE89123456780123456789",
      balance: 1200,
      isActive: true,
      isOfflineBudget: false,
      accountGroupId: secondGroupId
    });

    accountStore.addAccount({
      name: "Tagesgeldkonto",
      description: "Sparkonto",
      iban: "DE89123456780987654321",
      balance: 3500,
      isActive: true,
      isOfflineBudget: false,
      accountGroupId: secondGroupId
    });
  }

  if (transactionStore.transactions.length === 0) {
    const accounts = accountStore.accounts;
    const categories = categoryStore.categories;
    const tags = tagStore.tags;
    const recipients = recipientStore.recipients;

    const today = dayjs();
    const total = 180;

    for (let i = 0; i < total; i++) {
      const date = today.subtract(Math.floor(Math.random() * 120), "day").format("YYYY-MM-DD");
      const isTransfer = Math.random() < 0.15;

      if (isTransfer && accounts.length > 1) {
        let from, to;
        do {
          from = accounts[Math.floor(Math.random() * accounts.length)];
          to = accounts[Math.floor(Math.random() * accounts.length)];
        } while (from.id === to.id);

        const amount = Math.round(Math.random() * 30000) / 100;

        transactionStore.addTransferTransaction(
          from.id,
          to.id,
          amount,
          date,
          date,
          `Seed Transfer ${i + 1}`
        );
      } else {
        const account = accounts[Math.floor(Math.random() * accounts.length)];
        const category = categories[Math.floor(Math.random() * categories.length)];
        const recipient = recipients[Math.floor(Math.random() * recipients.length)];

        const rand = Math.random();
        let amount = 0;
        let type: TransactionType;

        if (rand < 0.65) {
          // Ausgabe
          amount = -Math.round((Math.random() * 150 + 10) * 100) / 100;
          type = TransactionType.EXPENSE;
        } else {
          // Einnahme
          amount = Math.round((Math.random() * 1000 + 500) * 100) / 100;
          type = TransactionType.INCOME;
        }

        const tagCount = Math.floor(Math.random() * 2) + 1;
        const tagIds = [];
        while (tagIds.length < tagCount) {
          const tag = tags[Math.floor(Math.random() * tags.length)];
          if (!tagIds.includes(tag.id)) tagIds.push(tag.id);
        }

        transactionStore.addTransaction({
          date,
          valueDate: date,
          accountId: account.id,
          categoryId: category.id,
          tagIds,
          amount,
          note: "Seeded Buchung",
          recipientId: recipient.id,
          type,
          counterTransactionId: null,
          planningTransactionId: null,
          isReconciliation: false,
          runningBalance: 0,
          payee: recipient.name,
          transferToAccountId: null
        });
      }
    }
  }
}

export function clearData() {
  localStorage.removeItem("finwise_accounts");
  localStorage.removeItem("finwise_account_groups");
  localStorage.removeItem("finwise_transactions");
  localStorage.removeItem("finwise_categories");
  localStorage.removeItem("finwise_recipients");
  localStorage.removeItem("finwise_tags");
  localStorage.removeItem("finwise_planning");
  localStorage.removeItem("finwise_statistics");
  localStorage.removeItem("finwise_theme");

  const stores = [
    useAccountStore(pinia),
    useTransactionStore(pinia),
    useTagStore(pinia),
    useCategoryStore(pinia),
    useRecipientStore(pinia),
    usePlanningStore(pinia),
    useStatisticsStore(pinia),
    useThemeStore(pinia)
  ];

  stores.forEach((store) => {
    if (typeof store.reset === "function") store.reset();
  });
}
