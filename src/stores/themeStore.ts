import { defineStore } from "pinia";
import { ref, watch } from "vue";

export const useThemeStore = defineStore("theme", () => {
  const isDarkMode = ref(false);

  function initTheme() {
    const savedTheme = localStorage.getItem("theme");

    if (savedTheme) {
      isDarkMode.value = savedTheme === "dark";
    } else {
      // Nutzt System-Präferenz, falls kein Theme gespeichert wurde
      isDarkMode.value = window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    applyTheme(); // WICHTIG: Direkt anwenden
  }

  function toggleTheme() {
    isDarkMode.value = !isDarkMode.value;
    localStorage.setItem("theme", isDarkMode.value ? "dark" : "light");
    applyTheme();
  }

  function applyTheme() {
    const theme = isDarkMode.value ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);

    // Falls DaisyUI das Theme überschreibt, nach 100ms erneut setzen
    // setTimeout(() => {
    //   document.documentElement.setAttribute("data-theme", theme);
    // }, 100);
  }

  // Reagiere auf Änderungen von isDarkMode
  watch(isDarkMode, () => {
    applyTheme();
  });

  return {
    isDarkMode,
    initTheme,
    toggleTheme,
    applyTheme,
  };
});
