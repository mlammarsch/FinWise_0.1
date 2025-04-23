import dayjs from 'dayjs';
import { RecurrencePattern, WeekendHandlingType } from '@/types';
import { formatDate } from './formatters';

/**
 * Gibt den Wochentagsnamen zurück (kurze Form)
 */
export function getDayOfWeekName(day: number): string {
  const days = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
  return days[day];
}

/**
 * Gibt den Monatsnamen zurück
 */
export function getMonthName(month: number): string {
  return [
    "Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember"
  ][month];
}

/**
 * Erzeugt eine menschenlesbare Beschreibung eines Wiederholungsmusters
 */
export function createRecurrenceDescription(params: {
  startDate: string,
  repeatsEnabled: boolean,
  recurrencePattern: RecurrencePattern,
  executionDay: number | null,
  moveScheduleEnabled: boolean,
  weekendHandlingDirection: "before" | "after"
}): string {
  const { startDate, repeatsEnabled, recurrencePattern, executionDay,
          moveScheduleEnabled, weekendHandlingDirection } = params;

  if (!repeatsEnabled) {
    return `Einmalig am ${formatDate(startDate)}`;
  }

  const date = dayjs(startDate);
  const day = date.date();
  const monthName = getMonthName(date.month());
  let desc = "";

  switch (recurrencePattern) {
    case RecurrencePattern.DAILY:
      desc = "Täglich";
      break;
    case RecurrencePattern.WEEKLY:
      desc = `Wöchentlich am ${getDayOfWeekName(date.day())}`;
      break;
    case RecurrencePattern.BIWEEKLY:
      desc = `Alle zwei Wochen am ${getDayOfWeekName(date.day())}`;
      break;
    case RecurrencePattern.MONTHLY:
      const d = executionDay && executionDay > 0 && executionDay < 32
        ? executionDay
        : day;
      desc = `Monatlich am ${d}.`;
      break;
    case RecurrencePattern.QUARTERLY:
      desc = `Vierteljährlich am ${day}. ${monthName}`;
      break;
    case RecurrencePattern.YEARLY:
      desc = `Jährlich am ${day}. ${monthName}`;
      break;
    default:
      desc = formatDate(startDate);
  }

  if (moveScheduleEnabled) {
    const dir = weekendHandlingDirection === "before" ? "davor" : "danach";
    desc += ` (Wochenende: ${dir})`;
  }

  return desc;
}

/**
 * Berechnet die nächsten Termine für ein Wiederholungsmuster
 */
export function calculateUpcomingDates(params: {
  startDate: string,
  repeatsEnabled: boolean,
  recurrencePattern: RecurrencePattern,
  recurrenceEndType: any,
  endDate: string | null,
  recurrenceCount: number,
  executionDay: number | null,
  moveScheduleEnabled: boolean,
  weekendHandlingDirection: "before" | "after"
}): Array<{ date: string; day: string }> {
  const { startDate, repeatsEnabled, recurrencePattern, recurrenceEndType, endDate,
          recurrenceCount, executionDay, moveScheduleEnabled, weekendHandlingDirection } = params;

  const upcomingDates: Array<{ date: string; day: string }> = [];

  if (!startDate) return upcomingDates;

  let current = dayjs(startDate);
  const endLimit = dayjs().add(3, "years");
  let cnt = 0;
  const maxShow = 6;

  if (!repeatsEnabled) {
    upcomingDates.push({
      date: current.format("DD.MM.YYYY"),
      day: getDayOfWeekName(current.day()),
    });
    return upcomingDates;
  }

  while (cnt < 50 && current.isBefore(endLimit)) {
    let dateToUse = current;

    if (
      recurrenceEndType === "DATE" &&
      endDate &&
      current.isAfter(dayjs(endDate))
    ) {
      break;
    }
    if (
      recurrenceEndType === "COUNT" &&
      recurrenceCount &&
      cnt >= recurrenceCount
    ) {
      break;
    }

    if (moveScheduleEnabled) {
      const w = dateToUse.day();
      if (w === 0 || w === 6) {
        if (weekendHandlingDirection === "before") {
          dateToUse = w === 0
            ? dateToUse.subtract(2, "day")
            : dateToUse.subtract(1, "day");
        } else {
          dateToUse = w === 0
            ? dateToUse.add(1, "day")
            : dateToUse.add(2, "day");
        }
      }
    }

    if (upcomingDates.length < maxShow) {
      upcomingDates.push({
        date: dateToUse.format("DD.MM.YYYY"),
        day: getDayOfWeekName(dateToUse.day()),
      });
    }

    cnt++;
    switch (recurrencePattern) {
      case RecurrencePattern.DAILY:
        current = current.add(1, "day");
        break;
      case RecurrencePattern.WEEKLY:
        current = current.add(1, "week");
        break;
      case RecurrencePattern.BIWEEKLY:
        current = current.add(2, "weeks");
        break;
      case RecurrencePattern.MONTHLY:
        const orig = executionDay ?? dayjs(startDate).date();
        const next = current.add(1, "month");
        const maxD = next.daysInMonth();
        const setDay = Math.min(orig, maxD);
        current = next.date(setDay);
        break;
      case RecurrencePattern.QUARTERLY:
        current = current.add(3, "months");
        break;
      case RecurrencePattern.YEARLY:
        current = current.add(1, "year");
        break;
      default:
        cnt = 50;
    }

    if (
      recurrenceEndType === "DATE" &&
      endDate &&
      current.isAfter(dayjs(endDate))
    ) {
      break;
    }
  }

  return upcomingDates.slice(0, maxShow);
}
