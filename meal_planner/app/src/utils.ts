/** Generate a random ID */
export function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Given an ISO week start date (YYYY-MM-DD), return an array of 7 ISO date strings.
 */
export function getWeekDates(weekStartDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(weekStartDate + 'T12:00:00');
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

/**
 * Get the start of the current week (Monday) as YYYY-MM-DD.
 */
export function currentWeekStart(weekStart: 0 | 1 = 1): string {
  const today = new Date();
  const day = today.getDay(); // 0=Sun, 1=Mon...
  const diff = weekStart === 1
    ? (day === 0 ? -6 : 1 - day)
    : -day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

/** Format YYYY-MM-DD -> "Mon Jan 6" */
export function formatDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/** Parse CSV text into an array of Recipe objects (best-effort) */
export function parseRecipesCSV(csv: string) {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = values[i] ?? ''; });
    return obj;
  });
}

/** Export shopping list to CSV string */
export function shoppingListToCSV(items: { name: string; pantryAdjustedQuantity: number; unit: string; inPantry: boolean }[]): string {
  const header = 'Ingredient,Quantity,Unit,In Pantry';
  const rows = items.map((i) =>
    `"${i.name}",${i.pantryAdjustedQuantity},"${i.unit}",${i.inPantry ? 'Yes' : 'No'}`
  );
  return [header, ...rows].join('\n');
}
