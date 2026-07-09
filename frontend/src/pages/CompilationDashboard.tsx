import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import { dashboardAPI } from '../api/dashboardAPI';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface StatCard {
  label: string;
  value: string;
  unit?: string;
  delta: string;
  deltaKind: 'up' | 'dn' | 'flat';
  foot: string;
  footLink?: string;
  tone: 'b' | 'v' | 'g' | 's';
  icon: 'bars' | 'shield' | 'check' | 'clock';
  showInflationLabel?: boolean;
}

type FeedTone = 'primary' | 'green' | 'red' | 'saffron' | 'violet';

interface ActivityItem {
  id: number;
  tone: FeedTone;
  icon: 'up' | 'check' | 'cross' | 'upload' | 'user';
  html: string;
  timestamp: string;
}

interface ChartDataPoint {
  month: string;
  cpi: number;
  yoY: number;
  moM: number;
}

/* ------------------------------------------------------------------ */
/*  Inline SVG icon helpers (match reference stroke icons)             */
/* ------------------------------------------------------------------ */
const svgProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
} as const;

const KpiIcon = ({ name }: { name: StatCard['icon'] }) => {
  switch (name) {
    case 'bars':
      return (
        <svg {...svgProps}>
          <path d="M4 19V9m5 10V5m5 14v-7m5 7V3" />
        </svg>
      );
    case 'shield':
      return (
        <svg {...svgProps}>
          <path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" />
          <path d="M9.3 12l1.8 1.8 3.6-4.1" />
        </svg>
      );
    case 'check':
      return (
        <svg {...svgProps}>
          <path d="M9 12l2 2 4-4" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
    case 'clock':
      return (
        <svg {...svgProps}>
          <path d="M12 6v6l4 2" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
  }
};

const DeltaIcon = ({ kind }: { kind: StatCard['deltaKind'] }) => {
  const p = { ...svgProps, strokeWidth: 2.5 } as const;
  if (kind === 'up')
    return (
      <svg {...p}>
        <path d="M7 17L17 7M7 7h8M17 7v8" />
      </svg>
    );
  if (kind === 'dn')
    return (
      <svg {...p}>
        <path d="M7 7l10 10M17 17H9M17 17V9" />
      </svg>
    );
  return (
    <svg {...p}>
      <path d="M5 12h14" />
    </svg>
  );
};

const FeedIcon = ({ name }: { name: ActivityItem['icon'] }) => {
  switch (name) {
    case 'up':
      return (
        <svg {...svgProps}>
          <path d="M12 3v12m0 0l-4-4m4 4l4-4" />
        </svg>
      );
    case 'check':
      return (
        <svg {...svgProps}>
          <path d="M9 12l2 2 4-4" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
    case 'cross':
      return (
        <svg {...svgProps}>
          <path d="M15 9l-6 6m0-6l6 6" />
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
    case 'upload':
      return (
        <svg {...svgProps}>
          <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-7L9 4H5a2 2 0 00-2 2z" />
        </svg>
      );
    case 'user':
      return (
        <svg {...svgProps}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3 19a6 6 0 0112 0" />
        </svg>
      );
  }
};

const FEED_TONE: Record<FeedTone, { bg: string; fg: string }> = {
  primary: { bg: 'var(--primary-soft)', fg: 'var(--primary)' },
  green: { bg: 'var(--green-soft)', fg: 'var(--green)' },
  red: { bg: 'var(--red-soft)', fg: 'var(--red)' },
  saffron: { bg: 'var(--saffron-soft)', fg: 'var(--saffron)' },
  violet: { bg: 'var(--violet-soft)', fg: 'var(--violet)' },
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function CompilationDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<StatCard[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const indexData = await dashboardAPI.getLatestIndexValues();
      const approvalData = await dashboardAPI.getApprovalRequests({ page_size: 5 });

      processStatsData(indexData);
      processChartData(indexData);
      processActivitiesData(approvalData);
    } catch (err) {
      console.error('Dashboard data load failed:', err);
      setError('Failed to load dashboard data. Using fallback data.');
      loadFallbackData();
    } finally {
      setLoading(false);
    }
  };

  const processStatsData = (data: any) => {
    try {
      if (data && data.data && Array.isArray(data.data)) {
        const d = data.data[0] || {};
        setStats([
          {
            label: 'Latest Provisional',
            value: d.provisional_index?.toFixed(1) || '194.6',
            unit: 'idx',
            delta: `${d.provisional_inflation?.toFixed(2) || 4.31}% YoY`,
            deltaKind: 'dn',
            foot: `${d.month || 'Jun'} ${d.year || 2026} · Provisional · Base 2024=100`,
            tone: 'b',
            icon: 'bars',
            showInflationLabel: true,
          },
          {
            label: 'Latest Final',
            value: d.final_index?.toFixed(1) || '193.8',
            unit: 'idx',
            delta: `${d.final_inflation?.toFixed(2) || 4.49}% YoY`,
            deltaKind: 'dn',
            foot: `${d.final_month || 'May'} ${d.final_year || 2026} · Final · officially released`,
            tone: 'v',
            icon: 'shield',
            showInflationLabel: true,
          },
          {
            label: 'Price Coverage',
            value: d.coverage_percentage?.toFixed(1) || '98.7',
            unit: '%',
            delta: `${d.items_covered || '1,114'} / ${d.total_items || '1,129'} items`,
            deltaKind: 'flat',
            foot: `Latest compiled · ${d.month || 'Jun'} ${d.year || 2026} Provisional`,
            tone: 'g',
            icon: 'check',
          },
          {
            label: 'Pending Approvals',
            value: `${d.pending_approvals ?? 3}`,
            delta: `${d.awaiting_you ?? 2} awaiting you`,
            deltaKind: 'flat',
            foot: 'Review now →',
            footLink: '/compile/approval',
            tone: 's',
            icon: 'clock',
          },
        ]);
      } else {
        loadFallbackData();
      }
    } catch (err) {
      console.error('Error processing stats:', err);
      loadFallbackData();
    }
  };

  const processChartData = (data: any) => {
    try {
      if (data && data.data && Array.isArray(data.data)) {
        const points = data.data.slice(-12).map((item: any) => ({
          month: item.month || 'N/A',
          cpi: parseFloat(item.index_value) || 190,
          yoY: parseFloat(item.yoy_inflation) || 2.8,
          moM: parseFloat(item.mom_inflation) || 0.2,
        }));
        setChartData(points.length ? points : getFallbackChartData());
      }
    } catch (err) {
      console.error('Error processing chart data:', err);
      setChartData(getFallbackChartData());
    }
  };

  const processActivitiesData = (data: any) => {
    try {
      if (data && data.results && Array.isArray(data.results) && data.results.length) {
        const items: ActivityItem[] = data.results.map((item: any) => {
          const status = (item.approval_status || '').toUpperCase();
          const tone: FeedTone =
            status === 'APPROVED'
              ? 'green'
              : status === 'REJECTED'
              ? 'red'
              : status === 'PENDING'
              ? 'primary'
              : 'saffron';
          const icon: ActivityItem['icon'] =
            status === 'APPROVED'
              ? 'check'
              : status === 'REJECTED'
              ? 'cross'
              : 'up';
          return {
            id: item.id,
            tone,
            icon,
            html: `<b>${item.compiler_name || 'System'}</b> ${(
              item.approval_status || 'processed'
            ).toLowerCase()} ${item.compile_type || 'compilation'}`,
            timestamp: formatTime(item.created_at || item.approved_at),
          };
        });
        setActivities(items);
      } else {
        setActivities(getFallbackActivities());
      }
    } catch (err) {
      console.error('Error processing activities:', err);
      setActivities(getFallbackActivities());
    }
  };

  const loadFallbackData = () => {
    setStats([
      {
        label: 'Latest Provisional',
        value: '194.6',
        unit: 'idx',
        delta: '4.31% YoY',
        deltaKind: 'dn',
        foot: 'Jun 2026 · Provisional · Base 2024=100',
        tone: 'b',
        icon: 'bars',
        showInflationLabel: true,
      },
      {
        label: 'Latest Final',
        value: '193.8',
        unit: 'idx',
        delta: '4.49% YoY',
        deltaKind: 'dn',
        foot: 'May 2026 · Final · officially released',
        tone: 'v',
        icon: 'shield',
        showInflationLabel: true,
      },
      {
        label: 'Price Coverage',
        value: '98.7',
        unit: '%',
        delta: '1,114 / 1,129 items',
        deltaKind: 'flat',
        foot: 'Latest compiled · Jun 2026 Provisional',
        tone: 'g',
        icon: 'check',
      },
      {
        label: 'Pending Approvals',
        value: '3',
        delta: '2 awaiting you',
        deltaKind: 'flat',
        foot: 'Review now →',
        footLink: '/compile/approval',
        tone: 's',
        icon: 'clock',
      },
    ]);
    setChartData(getFallbackChartData());
    setActivities(getFallbackActivities());
  };

  const getFallbackChartData = (): ChartDataPoint[] => [
    { month: 'Jul', cpi: 190, yoY: 2.8, moM: 0.2 },
    { month: 'Aug', cpi: 191, yoY: 3.1, moM: 0.5 },
    { month: 'Sep', cpi: 191.5, yoY: 3.2, moM: 0.3 },
    { month: 'Oct', cpi: 192, yoY: 3.4, moM: 0.3 },
    { month: 'Nov', cpi: 192.8, yoY: 3.6, moM: 0.4 },
    { month: 'Dec', cpi: 193, yoY: 3.8, moM: 0.1 },
    { month: 'Jan', cpi: 193.2, yoY: 4.0, moM: 0.1 },
    { month: 'Feb', cpi: 193.5, yoY: 4.1, moM: 0.2 },
    { month: 'Mar', cpi: 193.8, yoY: 4.2, moM: 0.2 },
    { month: 'Apr', cpi: 194, yoY: 4.3, moM: 0.1 },
    { month: 'May', cpi: 193.8, yoY: 4.49, moM: -0.1 },
    { month: 'Jun', cpi: 194.6, yoY: 4.31, moM: 0.4 },
  ];

  const getFallbackActivities = (): ActivityItem[] => [
    {
      id: 1,
      tone: 'primary',
      icon: 'up',
      html: '<b>kumar.sanjeev89</b> started compilation <b>#v6</b> for Jun 2026',
      timestamp: '14 minutes ago',
    },
    {
      id: 2,
      tone: 'green',
      icon: 'check',
      html: '<b>Jose Kurian</b> approved <b>#v4</b> · May 2026 Final',
      timestamp: 'Yesterday · 16:48',
    },
    {
      id: 3,
      tone: 'red',
      icon: 'cross',
      html: '<b>Jose Kurian</b> rejected <b>#v5</b> · Jan 2025 — weight mismatch',
      timestamp: 'Yesterday · 14:02',
    },
    {
      id: 4,
      tone: 'saffron',
      icon: 'upload',
      html: '<b>vinay.k</b> uploaded price data ZIP · <b>2.4M rows</b>',
      timestamp: 'Jun 24 · 09:08',
    },
    {
      id: 5,
      tone: 'violet',
      icon: 'user',
      html: 'New user <b>Test Test2</b> added to <b>Admin</b> role',
      timestamp: 'Jun 12 · 11:30',
    },
  ];

  const formatTime = (dateString: string): string => {
    if (!dateString) return 'Recently';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diff = Math.floor((now.getTime() - date.getTime()) / 60000);
      if (diff < 1) return 'Just now';
      if (diff < 60) return `${diff} minutes ago`;
      if (diff < 1440) return `${Math.floor(diff / 60)} hours ago`;
      if (diff < 2880) return 'Yesterday';
      return date.toLocaleDateString();
    } catch {
      return 'Recently';
    }
  };

  /* ---------------------------------------------------------------- */
  return (
    <div className="cpi-dash">
      <style>{DASH_CSS}</style>

      {/* header */}
      <div className="phead">
        <div>
          <h1>Compilation Dashboard</h1>
          <p>
            National CPI cycle for <b>June 2026</b> ·{' '}
            <span className="tag prov">Provisional</span>
          </p>
          {error && <p className="err-note">⚠️ {error}</p>}
        </div>
        <div className="acts">
          <button className="btn ghost sm" onClick={loadDashboardData} disabled={loading}>
            <svg {...svgProps} className={loading ? 'spin' : ''}>
              <path d="M21 12a9 9 0 11-2.6-6.4M21 4v5h-5" />
            </svg>
            Refresh
          </button>
          <button className="btn primary sm" onClick={() => navigate('/compile/generateindex')}>
            <svg {...svgProps}>
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Compilation
          </button>
        </div>
      </div>

      {/* kpis */}
      <div className="grid kpis">
        {stats.map((s, i) => (
          <div className="kpi" key={i}>
            <div className="top">
              <span className="lab">{s.label}</span>
              <span className={`ic ${s.tone}`}>
                <KpiIcon name={s.icon} />
              </span>
            </div>
            <div className="val">
              {s.value}
              {s.unit && <small> {s.unit}</small>}
            </div>
            {s.showInflationLabel ? (
              <div className="kpi-sub">
                <span className="k">Inflation</span>
                <span className={`delta ${s.deltaKind}`}>
                  <DeltaIcon kind={s.deltaKind} />
                  {s.delta}
                </span>
              </div>
            ) : (
              <div
                className={`delta ${s.deltaKind}`}
                style={s.tone === 's' ? { color: 'var(--saffron)' } : undefined}
              >
                <DeltaIcon kind={s.deltaKind} />
                {s.delta}
              </div>
            )}
            <div className="foot">
              {s.footLink ? (
                <a className="link" onClick={() => navigate(s.footLink!)}>
                  {s.foot}
                </a>
              ) : (
                s.foot
              )}
            </div>
          </div>
        ))}
      </div>

      {/* chart + activity */}
      <div className="dash-2">
        <div className="card">
          <div className="card-h">
            <div>
              <h3>Index &amp; inflation trend</h3>
              <div className="sub">
                Last 12 months · Index, YoY &amp; MoM inflation · All-India
              </div>
            </div>
            <div className="chart-legend">
              <span className="lg-item">
                <i style={{ background: 'var(--primary)' }} />
                CPI Index
              </span>
              <span className="lg-item">
                <i style={{ background: 'var(--saffron)' }} />
                YoY %
              </span>
              <span className="lg-item">
                <i style={{ background: 'var(--green)' }} />
                MoM %
              </span>
            </div>
          </div>
          <div className="chart-wrap">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={chartData} margin={{ top: 16, right: 12, left: -8, bottom: 4 }}>
                  <defs>
                    <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.22} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    stroke="var(--faint)"
                    tick={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}
                    tickLine={false}
                    axisLine={{ stroke: 'var(--border)' }}
                  />
                  <YAxis
                    yAxisId="idx"
                    domain={[188, 196]}
                    stroke="var(--faint)"
                    tick={{ fontSize: 11, fontFamily: 'var(--font-mono)' }}
                    tickLine={false}
                    axisLine={false}
                    width={38}
                  />
                  <YAxis
                    yAxisId="inf"
                    orientation="right"
                    domain={[0, 6]}
                    stroke="var(--saffron)"
                    tick={{ fontSize: 11, fontFamily: 'var(--font-mono)', fill: 'var(--saffron)' }}
                    tickFormatter={(v) => `${v}%`}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      boxShadow: 'var(--shadow)',
                      color: 'var(--text)',
                      fontSize: 12,
                    }}
                    labelStyle={{ color: 'var(--ink)', fontWeight: 700 }}
                  />
                  <Area
                    yAxisId="idx"
                    type="monotone"
                    dataKey="cpi"
                    name="CPI Index"
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    fill="url(#cg)"
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    yAxisId="inf"
                    type="monotone"
                    dataKey="yoY"
                    name="YoY %"
                    stroke="var(--saffron)"
                    strokeWidth={2.4}
                    strokeDasharray="5 4"
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    yAxisId="inf"
                    type="monotone"
                    dataKey="moM"
                    name="MoM %"
                    stroke="var(--green)"
                    strokeWidth={2.4}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">Loading chart data…</div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-h">
            <h3>Recent activity</h3>
            <a className="link" onClick={() => navigate('/compile/approval')}>
              View log
            </a>
          </div>
          <div className="feed">
            {activities.length ? (
              activities.map((a) => (
                <div className="feed-item" key={a.id}>
                  <span
                    className="feed-ic"
                    style={{ background: FEED_TONE[a.tone].bg, color: FEED_TONE[a.tone].fg }}
                  >
                    <FeedIcon name={a.icon} />
                  </span>
                  <div className="feed-body">
                    <p dangerouslySetInnerHTML={{ __html: a.html }} />
                    <div className="t">{a.timestamp}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="feed-empty">No recent activity</div>
            )}
          </div>
        </div>
      </div>

      {/* quick actions */}
      <div className="qa">
        <div className="qa-card" onClick={() => navigate('/compile/generateindex')}>
          <span className="ic b">
            <svg {...svgProps}>
              <path d="M12 3v12m0 0l-4-4m4 4l4-4" />
              <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
            </svg>
          </span>
          <div>
            <b>Generate index</b>
            <span>Upload &amp; compile new cycle</span>
          </div>
        </div>
        <div className="qa-card" onClick={() => navigate('/reference_data/weights')}>
          <span className="ic g">
            <svg {...svgProps}>
              <path d="M12 3v18M5 7l7-4 7 4" />
            </svg>
          </span>
          <div>
            <b>Review weights</b>
            <span>COICOP expenditure shares</span>
          </div>
        </div>
        <div className="qa-card" onClick={() => navigate('/compile/approval')}>
          <span className="ic s">
            <svg {...svgProps}>
              <path d="M9 12l2 2 4-4" />
              <circle cx="12" cy="12" r="9" />
            </svg>
          </span>
          <div>
            <b>Approve release</b>
            <span>Requests awaiting review</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Scoped styles — ported from reference.html (dashboard section)     */
/* ------------------------------------------------------------------ */
const DASH_CSS = `
.cpi-dash{font-family:var(--font-sans);color:var(--text);padding:26px 30px 8px;max-width:1340px;margin:0 auto}
.cpi-dash svg{display:block}
.cpi-dash .spin{animation:cpi-spin 1s linear infinite}
@keyframes cpi-spin{to{transform:rotate(360deg)}}

.cpi-dash .phead{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:22px;flex-wrap:wrap}
.cpi-dash .phead h1{font-family:var(--font-display);font-size:27px;font-weight:700;color:var(--ink);letter-spacing:-.025em;line-height:1.1}
.cpi-dash .phead p{color:var(--muted);font-size:13.5px;margin-top:5px}
.cpi-dash .phead p b{color:var(--text)}
.cpi-dash .phead .err-note{color:var(--saffron);font-size:12.5px;margin-top:6px}
.cpi-dash .phead .acts{display:flex;gap:10px;align-items:center}

.cpi-dash .tag{font-size:10.5px;font-weight:700;letter-spacing:.04em;padding:3px 8px;border-radius:6px;text-transform:uppercase;font-family:var(--font-mono);display:inline-block}
.cpi-dash .tag.prov{background:var(--saffron-soft);color:var(--saffron)}
.cpi-dash .tag.final{background:var(--green-soft);color:var(--green)}

.cpi-dash .btn{display:inline-flex;align-items:center;gap:8px;padding:9px 16px;border-radius:10px;font-size:13px;font-weight:600;transition:.15s;border:1px solid transparent;white-space:nowrap;cursor:pointer;font-family:inherit}
.cpi-dash .btn svg{width:16px;height:16px}
.cpi-dash .btn.primary{background:var(--primary);color:#fff;box-shadow:0 1px 2px rgba(29,82,214,.3)}
.cpi-dash .btn.primary:hover{background:var(--primary-600)}
.cpi-dash .btn.ghost{background:var(--surface);color:var(--text);border-color:var(--border-strong)}
.cpi-dash .btn.ghost:hover{background:var(--surface-3);border-color:var(--faint)}
.cpi-dash .btn.sm{padding:7px 12px;font-size:12.5px}
.cpi-dash .btn:disabled{opacity:.5;cursor:not-allowed}

.cpi-dash .link{color:var(--primary);font-size:12.5px;font-weight:600;display:inline-flex;align-items:center;gap:4px;cursor:pointer}
.cpi-dash .link:hover{text-decoration:underline}

.cpi-dash .grid{display:grid;gap:18px}
.cpi-dash .kpis{grid-template-columns:repeat(4,1fr)}
.cpi-dash .kpi{background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);padding:18px 20px;box-shadow:var(--shadow-sm);position:relative;overflow:hidden}
.cpi-dash .kpi .top{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.cpi-dash .kpi .lab{font-size:12px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.04em}
.cpi-dash .kpi .ic{width:34px;height:34px;border-radius:9px;display:grid;place-items:center}
.cpi-dash .kpi .ic svg{width:17px;height:17px}
.cpi-dash .kpi .val{font-family:var(--font-display);font-size:30px;font-weight:700;color:var(--ink);letter-spacing:-.03em;line-height:1;font-variant-numeric:tabular-nums}
.cpi-dash .kpi .val small{font-size:14px;color:var(--faint);font-weight:600;font-family:var(--font-mono)}
.cpi-dash .kpi .delta{display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:600;margin-top:9px;font-family:var(--font-mono)}
.cpi-dash .kpi .delta svg{width:13px;height:13px}
.cpi-dash .delta.up{color:var(--red)}
.cpi-dash .delta.dn{color:var(--green)}
.cpi-dash .delta.flat{color:var(--muted)}
.cpi-dash .kpi .foot{font-size:11.5px;color:var(--faint);margin-top:2px}
.cpi-dash .kpi-sub{display:flex;align-items:center;gap:8px;margin-top:9px}
.cpi-dash .kpi-sub .k{font-size:11.5px;color:var(--faint);font-weight:600}
.cpi-dash .kpi-sub .delta{margin-top:0}

.cpi-dash .ic.b{background:var(--primary-soft);color:var(--primary)}
.cpi-dash .ic.s{background:var(--saffron-soft);color:var(--saffron)}
.cpi-dash .ic.g{background:var(--green-soft);color:var(--green)}
.cpi-dash .ic.v{background:var(--violet-soft);color:var(--violet)}

.cpi-dash .card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);box-shadow:var(--shadow-sm)}
.cpi-dash .card-h{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border);gap:12px;flex-wrap:wrap}
.cpi-dash .card-h h3{font-size:14.5px;font-weight:700;color:var(--ink);letter-spacing:-.01em}
.cpi-dash .card-h .sub{font-size:12px;color:var(--faint);margin-top:2px}

.cpi-dash .dash-2{display:grid;grid-template-columns:1.55fr 1fr;gap:18px;margin-top:18px}
.cpi-dash .chart-wrap{padding:8px 8px 4px}
.cpi-dash .chart-empty{height:260px;display:grid;place-items:center;color:var(--faint);font-size:13px}
.cpi-dash .chart-legend{display:flex;gap:18px}
.cpi-dash .lg-item{display:flex;align-items:center;gap:7px;font-size:12px;color:var(--muted);font-weight:500}
.cpi-dash .lg-item i{width:10px;height:10px;border-radius:3px;display:inline-block}

.cpi-dash .feed{padding:8px 0}
.cpi-dash .feed-item{display:flex;gap:13px;padding:12px 20px;border-bottom:1px solid var(--border)}
.cpi-dash .feed-item:last-child{border-bottom:none}
.cpi-dash .feed-ic{width:32px;height:32px;border-radius:9px;display:grid;place-items:center;flex:none}
.cpi-dash .feed-ic svg{width:15px;height:15px}
.cpi-dash .feed-body{flex:1;min-width:0}
.cpi-dash .feed-body p{font-size:13px;color:var(--text);line-height:1.4}
.cpi-dash .feed-body p b{font-weight:600}
.cpi-dash .feed-body .t{font-size:11.5px;color:var(--faint);margin-top:3px;font-family:var(--font-mono)}
.cpi-dash .feed-empty{padding:32px 20px;text-align:center;color:var(--faint);font-size:13px;font-weight:500}

.cpi-dash .qa{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:18px}
.cpi-dash .qa-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);padding:18px;box-shadow:var(--shadow-sm);cursor:pointer;transition:.18s;display:flex;align-items:center;gap:14px}
.cpi-dash .qa-card:hover{transform:translateY(-2px);box-shadow:var(--shadow);border-color:var(--primary)}
.cpi-dash .qa-card .ic{width:44px;height:44px;border-radius:12px;display:grid;place-items:center;flex:none}
.cpi-dash .qa-card .ic svg{width:21px;height:21px}
.cpi-dash .qa-card b{font-size:14px;color:var(--ink);font-weight:600;display:block}
.cpi-dash .qa-card span{font-size:12px;color:var(--muted)}

@media (max-width:1080px){
  .cpi-dash .kpis{grid-template-columns:repeat(2,1fr)}
  .cpi-dash .dash-2{grid-template-columns:1fr}
}
@media (max-width:640px){
  .cpi-dash{padding:16px 14px 8px}
  .cpi-dash .kpis{grid-template-columns:1fr}
  .cpi-dash .qa{grid-template-columns:1fr}
  .cpi-dash .chart-legend{display:none}
}
`;
