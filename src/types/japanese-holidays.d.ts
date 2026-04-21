declare module "japanese-holidays" {
  export function isHoliday(date: Date, furikae?: boolean): string | undefined;
  export function getHolidaysOf(
    year: number,
    furikae?: boolean
  ): Array<{ month: number; date: number; name: string }>;
  export function shiftDate(date: Date, days: number): Date;
  export function shiftWeek(date: Date, weeks: number): Date;
  export function shiftMonth(date: Date, months: number): Date;
  export function shiftYear(date: Date, years: number): Date;
}
