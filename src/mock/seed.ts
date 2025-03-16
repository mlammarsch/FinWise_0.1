import { useAccountStore } from "../stores/accountStore";
import { useTransactionStore } from "../stores/transactionStore";
import { useTagStore } from "../stores/tagStore";
import { useCategoryStore } from "../stores/categoryStore";
import dayjs from "dayjs";

export function seedData(pinia: any) {
  const accountStore = useAccountStore(pinia);
  const transactionStore = useTransactionStore(pinia);
  const tagStore = useTagStore(pinia);
  const categoryStore = useCategoryStore(pinia);

  // Seed two accounts if none exist
  if (accountStore.accounts.length === 0) {
    const defaultGroupId = accountStore.accountGroups[0]?.id || "";
    accountStore.addAccount({
      name: "Geldbeutel",
      description: "Bargeld",
      balance: 0,
      isActive: true,
      isOfflineBudget: false,
      accountGroupId: defaultGroupId
    });
    const secondGroupId = accountStore.accountGroups[1]?.id || defaultGroupId;
    accountStore.addAccount({
      name: "Tagesgeld 70",
      description: "Sparkonto freie Verfügung",
      iban: "DE12345678901234567890",
      balance: 0,
      isActive: true,
      isOfflineBudget: false,
      accountGroupId: secondGroupId
    });
  }

  // Seed tags if none exist
  if (tagStore.tags.length === 0) {
    tagStore.addTag({ name: "Groceries", parentTagId: null });
    tagStore.addTag({ name: "Utilities", parentTagId: null });
  }

  // Seed categories if none exist
  if (categoryStore.categories.length === 0) {
    categoryStore.addCategory({ name: "Haushalt", parentCategoryId: null });
    categoryStore.addCategory({ name: "Freizeit", parentCategoryId: null });
  }

  // Seed 15 fake transactions if none exist
  if (transactionStore.transactions.length === 0) {
    const accounts = accountStore.accounts;
    const categories = categoryStore.categories;
    const tags = tagStore.tags;

    for (let i = 0; i < 15; i++) {
      const randomAccount = accounts[Math.floor(Math.random() * accounts.length)];
      const randomCategory = categories[Math.floor(Math.random() * categories.length)];
      const randomTag = tags[Math.floor(Math.random() * tags.length)];
      const amount = Math.round((Math.random() * 200 - 100) * 100) / 100;
      const date = dayjs().subtract(i, "day").format("YYYY-MM-DD");

      const transaction = {
        date,
        valueDate: date,
        accountId: randomAccount.id,
        categoryId: randomCategory ? randomCategory.id : null,
        tagIds: randomTag ? [randomTag.id] : [],
        payee: randomCategory ? randomCategory.name : "Unknown",
        amount,
        note: "Auto-generated",
        counterTransactionId: null,
        planningTransactionId: null,
        isReconciliation: false
      };

      transactionStore.addTransaction(transaction);
    }
  }
}
