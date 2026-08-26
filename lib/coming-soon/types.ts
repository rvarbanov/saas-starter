export const CHART_RANGES = ["3m", "30d", "7d"] as const;

export type ChartRange = (typeof CHART_RANGES)[number];

export const TABLE_PAGE_SIZE = 8;
export const TABLE_ROW_COUNT = 24;

export type ComingSoonKpi = {
  title: string;
  value: string;
  delta: string;
  footnote: string;
};

export type ComingSoonChartPoint = {
  label: string;
  value: number;
};

export type ComingSoonTableRow = {
  name: string;
  category: string;
  status: string;
  metric: string;
  owner: string;
};

export type ComingSoonTableColumns = {
  name: string;
  category: string;
  status: string;
  metric: string;
  owner: string;
};

export type ComingSoonPack = {
  kpis: readonly [ComingSoonKpi, ComingSoonKpi, ComingSoonKpi, ComingSoonKpi];
  chartTitle: string;
  chart: Record<ChartRange, readonly ComingSoonChartPoint[]>;
  tableColumns: ComingSoonTableColumns;
  tableRows: readonly ComingSoonTableRow[];
};
