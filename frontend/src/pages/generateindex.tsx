import React, { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Play,  RotateCcw, Filter } from "lucide-react";

import { Button } from "../components/ui/Button";
import {
  Card,
  CardContent,

} from "../components/ui/Card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/Select";
import { Input } from "../components/ui/Input";

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "../components/ui/tab1";

import { Calendar, CalendarDays, Info } from "lucide-react";

// ----------------------
// Types
// ----------------------
type OutputRow = {
  id: string;
  name: string;
  month: number; // 1-12
  year: number; // YYYY
  value: number;
};

type ScriptState = {
  id: number; // 1..5
  title: string;
  progress: number; // 0..100
  running: boolean;
  paused: boolean;
  outputs: Record<string, OutputRow[]>; // key = output-1..output-4
};

// ----------------------
// Helpers
// ----------------------
const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const Iteration = ["Provisional", "Final", "Revised"];

function range(n: number) {
  return Array.from({ length: n }, (_, i) => i);
}

function makeFakeRows(
  seed: number,
  month: number,
  year: number,
  count = 42
): OutputRow[] {
  // deterministic-ish generator per seed; simple LCG
  let s = seed * 9301 + 49297;
  const next = () => (s = (s * 1103515245 + 12345) % 2 ** 31);
  return range(count).map((i) => {
    next();
    const value = (s % 10000) / 100;
    return {
      id: `${seed}-${i}`,
      name: `Row ${i + 1}`,
      month,
      year,
      value: Math.round(value * 100) / 100,
    };
  });
}

// ----------------------
// Tiny table with sorting, search, pagination
// ----------------------
function DataTable({ rows }: { rows: OutputRow[] }) {
  const [page, setPage] = useState(1);
  const [perPage] = useState(8);
  const [sortKey, setSortKey] = useState<keyof OutputRow>("id");
  const [asc, setAsc] = useState(true);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const r = !ql
      ? rows
      : rows.filter((r) =>
          `${r.id} ${r.name} ${r.value}`.toLowerCase().includes(ql)
        );
    const sorted = [...r].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av < bv) return asc ? -1 : 1;
      if (av > bv) return asc ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [rows, q, sortKey, asc]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const pageRows = filtered.slice((page - 1) * perPage, page * perPage);

  const setSort = (k: keyof OutputRow) => {
    if (k === sortKey) setAsc((v) => !v);
    else {
      setSortKey(k);
      setAsc(true);
    }
  };

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Input
          placeholder="Search rows..."
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          className="max-w-xs"
        />
        <div className="text-sm text-muted-foreground">
          {filtered.length} items
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th
                className="px-3 py-2 text-left cursor-pointer"
                onClick={() => setSort("id")}
              >
                ID
              </th>
              <th
                className="px-3 py-2 text-left cursor-pointer"
                onClick={() => setSort("name")}
              >
                Name
              </th>
              <th
                className="px-3 py-2 text-left cursor-pointer"
                onClick={() => setSort("month")}
              >
                Month
              </th>
              <th
                className="px-3 py-2 text-left cursor-pointer"
                onClick={() => setSort("year")}
              >
                Year
              </th>
              <th
                className="px-3 py-2 text-left cursor-pointer"
                onClick={() => setSort("value")}
              >
                Value
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r, i) => (
              <tr key={r.id} className={i % 2 ? "bg-muted/20" : undefined}>
                <td className="px-3 py-2 font-mono">{r.id}</td>
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2">{months[r.month - 1]}</td>
                <td className="px-3 py-2">{r.year}</td>
                <td className="px-3 py-2">{r.value.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Prev
        </Button>
        <div className="text-xs text-muted-foreground">
          Page {page} / {totalPages}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

// ----------------------
// Script Outputs Component
// ----------------------
function ScriptOutputs({ script }: { script: ScriptState }) {
  const tabKeys = ["output-1", "output-2", "output-3", "output-4"];
  const [activeTab, setActiveTab] = React.useState(tabKeys[0]);

  return (
    <div className="w-full">
      {/* Button-style tabs */}
      <div className="flex gap-2 mb-4">
        {tabKeys.map((key) => (
          <Button
            key={key}
            variant={activeTab === key ? "primary" : "outline"}
            size="sm"
            onClick={() => setActiveTab(key)}
          >
            {key.replace("-", " ")}
          </Button>
        ))}
      </div>

      {/* Tab content */}
      {tabKeys.map((key) => (
        <div key={key} className={activeTab === key ? "block" : "hidden"}>
          <Card className="border-dashed">
            <CardContent className="p-3">
              {script.progress < 100 ? (
                <div className="text-sm text-muted-foreground">
                  Run the script to populate {key.replace("-", " ")}. Data will
                  reflect the selected month and year.
                </div>
              ) : script.outputs[key].length ? (
                <DataTable rows={script.outputs[key]} />
              ) : (
                <div className="text-sm text-muted-foreground">No rows.</div>
              )}
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}

// ----------------------
// Main Dashboard
// ----------------------
export default function GenerateIndex() {
  const [month, setMonth] = useState<number | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [activeScriptTab, setActiveScriptTab] = useState("script-1");
  const TabsName = ["", "Rural", "Urban", "HouseRent", "Airfare", "PDS"];

  const [scripts, setScripts] = useState<ScriptState[]>(() =>
    range(5).map((i) => ({
      id: i + 1,
      title: TabsName[i + 1],
      progress: 0,
      running: false,
      paused: false,
      outputs: {
        "output-1": [],
        "output-2": [],
        "output-3": [],
        "output-4": [],
      },
    }))
  );

  // timers persisted across renders
  const timers = useRef<Record<number, ReturnType<typeof setInterval> | null>>(
    {}
  );

  const canSubmit = month !== null && year !== null;

  const resetAll = () => {
    Object.values(timers.current).forEach((t) => t && clearInterval(t));
    timers.current = {};
    setScripts((prev) =>
      prev.map((s) => ({
        ...s,
        progress: 0,
        running: false,
        paused: false,
        outputs: {
          "output-1": [],
          "output-2": [],
          "output-3": [],
          "output-4": [],
        },
      }))
    );
  };

  const simulateScript = (
    index: number,
    selectedMonth: number,
    selectedYear: number,
    onDone: () => void
  ) => {
    // stop existing
    if (timers.current[index]) clearInterval(timers.current[index]!);

    setScripts((prev) =>
      prev.map((s, i) =>
        i === index ? { ...s, running: true, paused: false, progress: 0 } : s
      )
    );

    let p = 0;
    timers.current[index] = setInterval(() => {
      p = Math.min(100, p + 4 + Math.floor(Math.random() * 6));
      setScripts((prev) =>
        prev.map((s, i) => (i === index ? { ...s, progress: p } : s))
      );

      if (p >= 100) {
        if (timers.current[index]) clearInterval(timers.current[index]!);
        timers.current[index] = null;
        // generate deterministic yet varied outputs per script
        const out = {
          "output-1": makeFakeRows(
            index * 101 + 1,
            selectedMonth,
            selectedYear
          ),
          "output-2": makeFakeRows(
            index * 101 + 2,
            selectedMonth,
            selectedYear
          ),
          "output-3": makeFakeRows(
            index * 101 + 3,
            selectedMonth,
            selectedYear
          ),
          "output-4": makeFakeRows(
            index * 101 + 4,
            selectedMonth,
            selectedYear
          ),
        } as Record<string, OutputRow[]>;

        setScripts((prev) =>
          prev.map((s, i) =>
            i === index
              ? {
                  ...s,
                  running: false,
                  progress: 100,
                  outputs: out,
                }
              : s
          )
        );
        onDone();
      }
    }, 120);
  };

  const runAllSequential = async () => {
    if (!canSubmit) return;
    resetAll();

    const m = month!;
    const y = year!;

    // sequentially await completion via a Promise wrapper
    for (let i = 0; i < scripts.length; i++) {
      await new Promise<void>((resolve) => simulateScript(i, m, y, resolve));
    }
  };

  return (
    <div className="min-h-screen bg-white w-full p-6 md:p-8 ">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Filter className="h-5 w-5 text-primary" />
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          Generate Index
        </h1>
      </div>

      {/* Filters */}
      {/* Filters */}
      <Card className="mb-6 border-0 shadow-lg rounded-2xl bg-gradient-to-br from-white to-slate-50/70">
        <CardContent className="p-5">
          <div className="flex flex-col lg:flex-row lg:items-end gap-4 w-full">
            {/* Month Selector */}
            <div className="flex-1 w-full">
              <label className="mb-2  text-sm font-medium text-slate-700 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-blue-600" />
                Month
              </label>
              <Select onValueChange={(v) => setMonth(parseInt(v))}>
                <SelectTrigger className="w-full h-11 bg-white border-slate-200/80 hover:border-blue-300 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200 rounded-xl shadow-sm">
                  <SelectValue
                    placeholder="Select month"
                    className="placeholder:text-slate-400"
                  />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 shadow-lg max-h-72">
                  {months.map((m, i) => (
                    <SelectItem
                      key={m}
                      value={`${i + 1}`}
                      className="rounded-lg focus:bg-blue-50/80 data-[state=checked]:bg-blue-50 data-[state=checked]:text-blue-700"
                    >
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Year Selector */}
            <div className="flex-1 w-full">
              <label className="mb-2 block text-sm font-medium text-slate-700 flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4 text-blue-600" />
                Year
              </label>
              <Select onValueChange={(v) => setYear(parseInt(v))}>
                <SelectTrigger className="w-full h-11 bg-white border-slate-200/80 hover:border-blue-300 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200 rounded-xl shadow-sm">
                  <SelectValue
                    placeholder="Select year"
                    className="placeholder:text-slate-400"
                  />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 shadow-lg max-h-72">
                  {range(7).map((i) => {
                    const y = 2022 + i;
                    return (
                      <SelectItem
                        key={y}
                        value={`${y}`}
                        className="rounded-lg focus:bg-blue-50/80 data-[state=checked]:bg-blue-50 data-[state=checked]:text-blue-700"
                      >
                        {y}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 w-full">
              <label className="mb-2  text-sm font-medium text-slate-700 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-blue-600" />
                Iteration
              </label>
              <Select onValueChange={(v) => setMonth(parseInt(v))}>
                <SelectTrigger className="w-full h-11 bg-white border-slate-200/80 hover:border-blue-300 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all duration-200 rounded-xl shadow-sm">
                  <SelectValue
                    placeholder="Select Iteration"
                    className="placeholder:text-slate-400"
                  />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-slate-200 shadow-lg max-h-72">
                  {Iteration.map((m, i) => (
                    <SelectItem
                      key={m}
                      value={`${i + 1}`}
                      className="rounded-lg focus:bg-blue-50/80 data-[state=checked]:bg-blue-50 data-[state=checked]:text-blue-700"
                    >
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-2">
              <Button
                disabled={!canSubmit}
                onClick={runAllSequential}
                className="flex-1 h-11 px-5 bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 hover:from-blue-700 hover:via-blue-800 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all duration-300 rounded-xl flex items-center justify-center gap-2"
              >
                <Play className="h-4 w-4" />
                <span className="font-medium">Run All Scripts</span>
                {canSubmit && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="ml-1 text-xs bg-white/20 px-1.5 py-0.5 rounded-full"
                  >
                    Go
                  </motion.span>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={resetAll}
                className="h-11 px-4 border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400 hover:text-slate-900 transition-colors duration-200 rounded-xl flex items-center justify-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Reset</span>
              </Button>
            </div>
          </div>

          {/* Status Indicator */}
          {canSubmit && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 bg-blue-50/50 border border-blue-100 rounded-lg flex items-start gap-2.5"
            >
              <div className="p-1.5 bg-blue-100 rounded-full mt-0.5">
                <Info className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800">
                  Ready to process
                </p>
                <p className="text-xs text-blue-600 mt-0.5">
                  Data will be generated for {month && months[month - 1]} {year}
                </p>
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Script Progress Panels */}
      {/* Script Progress Panels */}
      {/* Script Progress Panels */}
      <div className="mb-8">
        <div className="mb-2 text-sm text-muted-foreground">
          Script Progress
        </div>

        {/* Responsive grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 w-full">
  {scripts.map((s, idx) => (
    <motion.div
      key={s.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.03 }}
      className="w-full"
    >
      <div className="flex flex-col justify-between rounded-xl shadow-sm border border-gray-200 p-4 bg-white h-full
                      transition-transform duration-300 hover:scale-105 hover:shadow-lg">
        {/* Title */}
        <h4 className="text-sm font-semibold text-gray-700 mb-2 truncate">{s.title}</h4>

        {/* Progress */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-3 rounded-full bg-gray-200 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 transition-all duration-500"
              style={{ width: `${s.progress}%` }}
            />
          </div>
          <div className="w-10 text-right text-xs tabular-nums text-gray-500">
            {s.progress}%
          </div>
        </div>
      </div>
    </motion.div>
  ))}
</div>

      </div>

      {/* Script Outputs Tabs */}
      <div>
        <div className="mb-2 text-sm text-muted-foreground">Script Outputs</div>
        <Tabs value={activeScriptTab} onValueChange={setActiveScriptTab}>
          <TabsList className="grid grid-cols-5 mb-4">
            {scripts.map((s) => (
              <TabsTrigger key={s.id} value={`script-${s.id}`}>
                {s.title}
              </TabsTrigger>
            ))}
          </TabsList>

          {scripts.map((s) => (
            <TabsContent key={s.id} value={`script-${s.id}`}>
              <ScriptOutputs script={s} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
