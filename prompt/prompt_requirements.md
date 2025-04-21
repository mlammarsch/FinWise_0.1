Die Funktion für das zu öffnende Dropdown Modal in der BudgetMonthCard läuft laut Debugger durch. Jedoch vermute ich, dass diese Funktion nicht richtig berechnet:
 if (containerRef.value) {
    const rect = containerRef.value.getBoundingClientRect();
    dropdownX.value = event.clientX - rect.left;
    dropdownY.value = event.clientY - rect.top;
  } else {
    dropdownX.value = event.clientX;
    dropdownY.value = event.clientY;
  }
  Das Dropdown wird laut debugger erfolgreich geöffnet. Erscheint nur nirgendwo auf dem Bildschirm.
