"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CHART_RANGES, type ChartRange, comingSoonPack, TABLE_PAGE_SIZE } from "@/lib/coming-soon";

const RANGE_LABELS: Record<ChartRange, string> = {
  "3m": "Last 3 months",
  "30d": "Last 30 days",
  "7d": "Last 7 days",
};

function kpiDeltaIsNegative(delta: string): boolean {
  return delta.trim().startsWith("-");
}

function statusBadgeVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "Active":
    case "Paid":
    case "Done":
    case "In season":
      return "default";
    case "Trial":
    case "Open":
    case "In Process":
    case "Preseason":
      return "secondary";
    case "Churned":
    case "Overdue":
    case "Offseason":
      return "destructive";
    default:
      return "outline";
  }
}

export function ComingSoonDemo() {
  const pack = comingSoonPack;
  const [range, setRange] = useState<ChartRange>("3m");
  const [page, setPage] = useState(0);

  const chartConfig = {
    value: {
      label: pack.chartTitle,
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig;

  const pageCount = Math.ceil(pack.tableRows.length / TABLE_PAGE_SIZE);
  const pageRows = pack.tableRows.slice(
    page * TABLE_PAGE_SIZE,
    page * TABLE_PAGE_SIZE + TABLE_PAGE_SIZE,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {pack.kpis.map((kpi) => {
          const down = kpiDeltaIsNegative(kpi.delta);
          return (
            <Card key={kpi.title} className="@container/card">
              <CardHeader>
                <CardDescription>{kpi.title}</CardDescription>
                <CardTitle className="font-heading text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                  {kpi.value}
                </CardTitle>
                <CardAction>
                  <Badge variant="outline">
                    {down ? <TrendingDown /> : <TrendingUp />}
                    {kpi.delta}
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardFooter className="flex-col items-start gap-1.5 text-sm">
                <p className="text-muted-foreground">{kpi.footnote}</p>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <Card data-testid="coming-soon-chart">
        <CardHeader>
          <CardTitle>{pack.chartTitle}</CardTitle>
          <CardDescription>{RANGE_LABELS[range]}</CardDescription>
          <CardAction>
            <fieldset className="flex gap-1 border-0 p-0">
              <legend className="sr-only">Chart range</legend>
              {CHART_RANGES.map((chartRange) => (
                <Button
                  key={chartRange}
                  type="button"
                  size="sm"
                  variant={range === chartRange ? "default" : "outline"}
                  aria-pressed={range === chartRange}
                  onClick={() => setRange(chartRange)}
                >
                  {chartRange}
                </Button>
              ))}
            </fieldset>
          </CardAction>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px] w-full min-h-[200px]"
          >
            <AreaChart accessibilityLayer data={[...pack.chart[range]]}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                dataKey="value"
                type="natural"
                fill="var(--color-value)"
                fillOpacity={0.4}
                stroke="var(--color-value)"
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card data-testid="coming-soon-table">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{pack.tableColumns.name}</TableHead>
              <TableHead>{pack.tableColumns.category}</TableHead>
              <TableHead>{pack.tableColumns.status}</TableHead>
              <TableHead>{pack.tableColumns.metric}</TableHead>
              <TableHead>{pack.tableColumns.owner}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.map((row) => (
              <TableRow key={`${row.name}-${row.metric}`}>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell>{row.category}</TableCell>
                <TableCell>
                  <Badge variant={statusBadgeVariant(row.status)}>{row.status}</Badge>
                </TableCell>
                <TableCell>{row.metric}</TableCell>
                <TableCell>{row.owner}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <CardFooter className="justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Page {page + 1} of {pageCount}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page === 0}
              onClick={() => setPage((current) => current - 1)}
            >
              Previous
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              data-testid="coming-soon-table-next"
              disabled={page >= pageCount - 1}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
