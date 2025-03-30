/**
 * Pfad zur Komponente: src/utils/logger.ts
 * Zentrale Logging-Funktion, basierend auf einem Debug-Flag.
 */
import { ref } from 'vue';

export const isDebugEnabled = ref<boolean>(false);

export function debugLog(...args: any[]) {
  if (isDebugEnabled.value) {
    console.log(...args);
  }
}
