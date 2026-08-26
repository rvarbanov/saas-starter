import { describe, expect, it } from "vitest";
import { accountsReceivablePack } from "./accounts-receivable";
import { comingSoonPack } from "./index";
import { saasAnalyticsPack } from "./saas-analytics";
import { shadcnClassicPack } from "./shadcn-classic";
import { sportTeamsPack } from "./sport-teams";
import { CHART_RANGES, type ComingSoonPack, TABLE_PAGE_SIZE, TABLE_ROW_COUNT } from "./types";

const PACKS: ReadonlyArray<readonly [string, ComingSoonPack]> = [
  ["saas-analytics", saasAnalyticsPack],
  ["shadcn-classic", shadcnClassicPack],
  ["accounts-receivable", accountsReceivablePack],
  ["sport-teams", sportTeamsPack],
];

function expectPackShape(pack: ComingSoonPack) {
  expect(pack.kpis).toHaveLength(4);
  for (const kpi of pack.kpis) {
    expect(kpi.title.length).toBeGreaterThan(0);
    expect(kpi.value.length).toBeGreaterThan(0);
    expect(kpi.delta.length).toBeGreaterThan(0);
    expect(kpi.footnote.length).toBeGreaterThan(0);
  }

  expect(pack.chartTitle.length).toBeGreaterThan(0);
  for (const range of CHART_RANGES) {
    expect(pack.chart[range].length).toBeGreaterThan(0);
    for (const point of pack.chart[range]) {
      expect(point.label.length).toBeGreaterThan(0);
      expect(typeof point.value).toBe("number");
    }
  }

  expect(pack.tableColumns.name.length).toBeGreaterThan(0);
  expect(pack.tableColumns.category.length).toBeGreaterThan(0);
  expect(pack.tableColumns.status.length).toBeGreaterThan(0);
  expect(pack.tableColumns.metric.length).toBeGreaterThan(0);
  expect(pack.tableColumns.owner.length).toBeGreaterThan(0);

  expect(pack.tableRows).toHaveLength(TABLE_ROW_COUNT);
  expect(TABLE_ROW_COUNT % TABLE_PAGE_SIZE).toBe(0);
  for (const row of pack.tableRows) {
    expect(row.name.length).toBeGreaterThan(0);
    expect(row.category.length).toBeGreaterThan(0);
    expect(row.status.length).toBeGreaterThan(0);
    expect(row.metric.length).toBeGreaterThan(0);
    expect(row.owner.length).toBeGreaterThan(0);
  }
}

describe("coming-soon packs", () => {
  it("re-exports SaaS analytics as the default pack", () => {
    expect(comingSoonPack).toBe(saasAnalyticsPack);
  });

  it.each(PACKS)("%s matches the locked pack shape", (_name, pack) => {
    expectPackShape(pack);
  });

  it("uses the locked SaaS analytics KPI values and chart title", () => {
    expect(saasAnalyticsPack.kpis.map((kpi) => kpi.title)).toEqual([
      "MRR",
      "New sign-ups",
      "Active users",
      "Growth rate",
    ]);
    expect(saasAnalyticsPack.kpis.map((kpi) => kpi.value)).toEqual([
      "$12,450",
      "1,234",
      "45,678",
      "4.5%",
    ]);
    expect(saasAnalyticsPack.kpis.map((kpi) => kpi.delta)).toEqual([
      "+12.5%",
      "-20%",
      "+12.5%",
      "+4.5%",
    ]);
    expect(saasAnalyticsPack.chartTitle).toBe("Total visitors");
    expect(saasAnalyticsPack.tableColumns).toEqual({
      name: "Plan",
      category: "Segment",
      status: "Status",
      metric: "Seats",
      owner: "Owner",
    });
  });

  it("uses locked chart titles for the code-swap packs", () => {
    expect(shadcnClassicPack.chartTitle).toBe("Total visitors");
    expect(accountsReceivablePack.chartTitle).toBe("Collections");
    expect(sportTeamsPack.chartTitle).toBe("Attendance");
  });
});
