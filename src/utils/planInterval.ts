export enum PlanInterval {
  DAY = "day",
  YEAR = "year",
  WEEK = "week",
  MONTH = "month",
  CUSTOM = "custom",
  QUARTER = "quarter",
  LIFETIME = "lifetime",
  HALF_YEAR = "half_year",
}

export const normalizePlanInterval = (
  value?: string | null
): PlanInterval | null => {
  if (!value) return null;
  const normalized = String(value).trim().toLowerCase();
  switch (normalized) {
    case "day":
    case "daily":
      return PlanInterval.DAY;
    case "week":
    case "weekly":
      return PlanInterval.WEEK;
    case "month":
    case "monthly":
      return PlanInterval.MONTH;
    case "quarter":
    case "quarterly":
      return PlanInterval.QUARTER;
    case "half_year":
    case "half-year":
    case "halfyear":
      return PlanInterval.HALF_YEAR;
    case "year":
    case "yearly":
      return PlanInterval.YEAR;
    case "lifetime":
      return PlanInterval.LIFETIME;
    case "custom":
      return PlanInterval.CUSTOM;
    default:
      return null;
  }
};
