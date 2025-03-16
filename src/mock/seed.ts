import { useAccountStore } from "../stores/accountStore";
import { useTransactionStore } from "../stores/transactionStore";
import { useTagStore } from "../stores/tagStore";
import { useCategoryStore } from "../stores/categoryStore";
import { useRecipientStore } from "../stores/recipientStore";
import { usePlanningStore } from "../stores/planningStore";
import { useStatisticsStore } from "../stores/statisticsStore";
import { useThemeStore } from "../stores/themeStore";
import { createPinia } from 'pinia'; // Import createPinia

import dayjs from "dayjs";

// Create a Pinia instance
const pinia = createPinia();

export function seedData() { // Removed pinia parameter from function definition
  const accountStore = useAccountStore(pinia);
  const transactionStore = useTransactionStore(pinia);
  const tagStore = useTagStore(pinia);
  const categoryStore = useCategoryStore(pinia);
  const recipientStore = useRecipientStore(pinia);

  // Seed recipients if none exist
  if (recipientStore.recipients.length === 0) {
    recipientStore.addRecipient({ name: "Rewe" });
    recipientStore.addRecipient({ name: "Freizeitindustrie" });
    recipientStore.addRecipient({ name: "Autowerkstatt Halmich" });
  }

  // Seed tags if none exist
  if (tagStore.tags.length === 0) {
    tagStore.addTag({ name: "HaushaltTag", parentTagId: null });
    tagStore.addTag({ name: "FreizeitTag", parentTagId: null });
    tagStore.addTag({ name: "LebensmittelTag", parentTagId: null });
    tagStore.addTag({ name: "ReisenTag", parentTagId: null });
  }

  // Seed categories if none exist
  if (categoryStore.categories.length === 0) {
    categoryStore.addCategory({ name: "HaushaltCat", parentCategoryId: null });
    categoryStore.addCategory({ name: "FreizeitCat", parentCategoryId: null });
  }

  // Seed accounts if none exist
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
      description: "IngDiba Giro 86",
      iban: "DE12345678901234567890",
      balance: 1377.15,
      isActive: true,
      isOfflineBudget: false,
      accountGroupId: secondGroupId
    });
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

  // Seed 15 fake transactions if none exist
  if (transactionStore.transactions.length === 0) {
    const accounts = accountStore.accounts;
    const categories = categoryStore.categories;
    const tags = tagStore.tags;
    const recipients = recipientStore.recipients;

    for (let i = 0; i < 15; i++) {
      const randomAccount = accounts[Math.floor(Math.random() * accounts.length)];
      const randomCategory = categories[Math.floor(Math.random() * categories.length)];

      // Select 1-2 unique random tags
      let randomTags: string[] = [];
      if (tags.length > 0) {
        const firstTag = tags[Math.floor(Math.random() * tags.length)];
        randomTags.push(firstTag.id);
        if (tags.length > 1 && Math.random() > 0.5) {
          let secondTag;
          do {
            secondTag = tags[Math.floor(Math.random() * tags.length)];
          } while (secondTag.id === firstTag.id);
          randomTags.push(secondTag.id);
        }
      }

      const randomRecipient = recipients[Math.floor(Math.random() * recipients.length)];
      const amount = Math.round((Math.random() * 200 - 100) * 100) / 100;
      const date = dayjs().subtract(i, "day").format("YYYY-MM-DD");

      const transaction = {
        date,
        valueDate: date,
        accountId: randomAccount.id,
        categoryId: randomCategory ? randomCategory.id : null,
        tagIds: randomTags,
        recipientId: randomRecipient ? randomRecipient.id : null,
        payee: randomCategory ? randomCategory.name : "Unbekannt",
        description: `Buchung ${i + 1} -desc`,
        amount,
        note: "auto-generated-note",
        counterTransactionId: null,
        planningTransactionId: null,
        isReconciliation: false
      };

      transactionStore.addTransaction(transaction);
    }
  }
}

export function clearData() {
  localStorage.removeItem('finwise_accounts');
  localStorage.removeItem('finwise_account_groups');
  localStorage.removeItem('finwise_transactions');
  localStorage.removeItem('finwise_categories');
  localStorage.removeItem('finwise_recipients');
  localStorage.removeItem('finwise_tags');
  localStorage.removeItem('finwise_planning');
  localStorage.removeItem('finwise_statistics');
  localStorage.removeItem('finwise_theme');

  // Clear Pinia stores (reset to initial state)
  const accountStore = useAccountStore(pinia);
  const transactionStore = useTransactionStore(pinia);
  const tagStore = useTagStore(pinia);
  const categoryStore = useCategoryStore(pinia);
  const recipientStore = useRecipientStore(pinia);
  const planningStore = usePlanningStore(pinia);
  const statisticsStore = useStatisticsStore(pinia);
  const themeStore = useThemeStore(pinia);

  accountStore.$reset();
  transactionStore.$reset();
  tagStore.$reset();
  categoryStore.$reset();
  recipientStore.$reset();
  planningStore.$reset();
  statisticsStore.$reset();
  themeStore.$reset();
}
