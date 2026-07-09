import { NavLink, useNavigate } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../app/hooks";
import { selectAuth, logout } from "../features/auth/authSlice";
import mospiLogo from "../assets/img/mospi_new_lgo.png";

interface SidebarProps {
  darkMode?: boolean;
  toggleTheme?: () => void;
  onClose?: () => void;
  isCollapsed: boolean;
}

const svg = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  "aria-hidden": true,
} as const;

interface NavEntry {
  to: string;
  label: string;
  icon: React.ReactElement;
  badge?: string;
  badgeStyle?: React.CSSProperties;
  roles: string[]; // roles allowed to see this item
  end?: boolean;
}

interface NavSection {
  section: string;
  items: NavEntry[];
}

const ALL = ["admin", "compiler", "approver", "reviewer", "user"];

/* Nav structure — mirrors reference.html rail, mapped to real app routes */
const NAV: NavSection[] = [
  {
    section: "Overview",
    items: [
      {
        to: "/",
        end: true,
        label: "Dashboard",
        roles: ALL,
        icon: (
          <svg {...svg}>
            <rect x="3" y="3" width="7" height="9" rx="1" />
            <rect x="14" y="3" width="7" height="5" rx="1" />
            <rect x="14" y="12" width="7" height="9" rx="1" />
            <rect x="3" y="16" width="7" height="5" rx="1" />
          </svg>
        ),
      },
      {
        to: "/compile/capi_data",
        label: "AI Assistant",
        badge: "AI",
        badgeStyle: { background: "var(--primary)" },
        roles: ["admin", "compiler", "approver"],
        icon: (
          <svg {...svg}>
            <path d="M12 3l1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7z" strokeLinejoin="round" />
            <path d="M18.5 14l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" strokeLinejoin="round" />
          </svg>
        ),
      },
    ],
  },
  {
    section: "Price Data",
    items: [
      {
        to: "/upload_data/uploaded_data_New",
        label: "Data Explorer",
        roles: ["admin", "compiler", "approver"],
        icon: (
          <svg {...svg}>
            <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-7L9 4H5a2 2 0 00-2 2z" />
            <circle cx="12" cy="13" r="2.5" />
          </svg>
        ),
      },
    ],
  },
  {
    section: "Analysis",
    items: [
      {
        to: "/reference_data/weight",
        label: "Geo Analysis",
        roles: ["admin"],
        icon: (
          <svg {...svg}>
            <path d="M9 3L3 5v16l6-2 6 2 6-2V3l-6 2-6-2z" />
            <path d="M9 3v16m6-14v16" />
            <circle cx="12" cy="10" r="1.6" />
          </svg>
        ),
      },
    ],
  },
  {
    section: "Compilation",
    items: [
      {
        to: "/compilation2/FileUploadCompilation",
        label: "Generate Index",
        roles: ["admin", "compiler"],
        icon: (
          <svg {...svg}>
            <path d="M12 3v12m0 0l-4-4m4 4l4-4" />
            <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
          </svg>
        ),
      },
      {
        to: "/compilation/approve_index",
        label: "Approval Queue",
        badge: "3",
        roles: ["admin", "approver"],
        icon: (
          <svg {...svg}>
            <path d="M9 12l2 2 4-4" />
            <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
      },
      {
        to: "/compilation/compilation_index",
        label: "Compiled Indexes",
        roles: ["admin", "compiler", "approver", "reviewer"],
        icon: (
          <svg {...svg}>
            <path d="M4 19V9m5 10V5m5 14v-7m5 7V3" />
          </svg>
        ),
      },
      {
        to: "/compilation/compile_results",
        label: "Finalized Index",
        roles: ["admin", "compiler", "approver"],
        icon: (
          <svg {...svg}>
            <circle cx="12" cy="9" r="6" />
            <path d="M9 14l-1 7 4-2 4 2-1-7" />
          </svg>
        ),
      },
    ],
  },
  {
    section: "Reference Data",
    items: [
      {
        to: "/reference_data/weight",
        label: "Weights",
        roles: ["admin", "compiler", "approver", "reviewer"],
        icon: (
          <svg {...svg}>
            <path d="M12 3v18m0-18l7 4M12 3L5 7m0 0l-3 7a4 4 0 006 0L5 7zm14 0l-3 7a4 4 0 006 0l-3-7z" />
          </svg>
        ),
      },
      {
        to: "/reference_data/coicop_mapping",
        label: "COICOP Mapping",
        roles: ["admin", "compiler", "approver", "reviewer"],
        icon: (
          <svg {...svg}>
            <path d="M9 4l6 2 6-2v14l-6 2-6-2-6 2V6z" />
            <path d="M9 4v14m6-12v14" />
          </svg>
        ),
      },
      {
        to: "/reference_data/market_details",
        label: "Markets",
        roles: ["admin", "compiler", "approver"],
        icon: (
          <svg {...svg}>
            <path d="M3 9l1-5h16l1 5M5 9v10a1 1 0 001 1h12a1 1 0 001-1V9M3 9h18" />
          </svg>
        ),
      },
    ],
  },
  {
    section: "Administration",
    items: [
      {
        to: "/users",
        label: "Users & Roles",
        roles: ["admin"],
        icon: (
          <svg {...svg}>
            <circle cx="9" cy="8" r="3.5" />
            <path d="M3 20a6 6 0 0112 0" />
            <path d="M16 5a3.5 3.5 0 010 7M19 20a6 6 0 00-3-5.2" />
          </svg>
        ),
      },
    ],
  },
];

const ROLE_DISPLAY: Record<string, string> = {
  admin: "PSD Admin",
  compiler: "Compiler",
  approver: "Approver",
  reviewer: "Reviewer",
  user: "PSD User",
};

export default function Sidebar({ onClose, isCollapsed }: SidebarProps) {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user } = useAppSelector(selectAuth);

  const role = (user?.role || "user").toLowerCase();
  const fullName =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim() ||
    (user as any)?.name ||
    user?.email?.split("@")[0] ||
    "User";
  const initial = fullName.charAt(0).toUpperCase();

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login", { replace: true });
  };

  return (
    <aside className={`rail ${isCollapsed ? "collapsed" : ""}`}>
      {/* brand */}
      <div className="brand">
        <div className="brand-row">
          <div className="brand-mark">
            <img src={mospiLogo} alt="Data for Development emblem" />
          </div>
          <div className="brand-text">
            <b>Consumer Price Index</b>
            <span>Compilation Suite</span>
          </div>
        </div>
        <div className="tricolor" aria-hidden="true">
          <i></i>
          <i></i>
          <i></i>
        </div>
      </div>

      {/* nav */}
      <nav className="nav" aria-label="Primary">
        {NAV.map((sec) => {
          const visible = sec.items.filter((it) => it.roles.includes(role));
          if (!visible.length) return null;
          return (
            <div key={sec.section}>
              <div className="nav-section">{sec.section}</div>
              {visible.map((it) => (
                <NavLink
                  key={it.label}
                  to={it.to}
                  end={it.end}
                  className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
                  onClick={onClose}
                >
                  {it.icon}
                  <span className="label">{it.label}</span>
                  {it.badge && (
                    <span className="badge" style={it.badgeStyle}>
                      {it.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      {/* footer */}
      <div className="rail-foot">
        <div className="av" aria-hidden="true">
          {initial}
        </div>
        <div className="who">
          <b>{fullName}</b>
          <span>{ROLE_DISPLAY[role] || role}</span>
        </div>
        <button className="lg" type="button" aria-label="Sign out" title="Sign out" onClick={handleLogout}>
          <svg {...svg}>
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4m7 14l5-5-5-5m5 5H9" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
