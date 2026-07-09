import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "../app/hooks";
import { selectAuth, switchRole } from "../features/auth/authSlice";

interface NavbarProps {
  darkMode: boolean;
  toggleTheme: () => void;
  onMenuToggle: () => void;
  onCollapseToggle: () => void;
  isCollapsed: boolean;
  isMobile: boolean;
}

const svg = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  "aria-hidden": true,
} as const;

const PAGE_LABELS: Record<string, { mod: string; page: string }> = {
  "/": { mod: "Overview", page: "Dashboard" },
  "/compile/capi_data": { mod: "Overview", page: "AI Assistant" },
  "/upload_data/uploaded_data_New": { mod: "Price Data", page: "Data Explorer" },
  "/compilation2/FileUploadCompilation": { mod: "Compilation", page: "Generate Index" },
  "/compilation/approve_index": { mod: "Compilation", page: "Approval Queue" },
  "/compilation/compilation_index": { mod: "Compilation", page: "Compiled Indexes" },
  "/compilation/compile_results": { mod: "Compilation", page: "Finalized Index" },
  "/reference_data/weight": { mod: "Reference Data", page: "Weights" },
  "/reference_data/coicop_mapping": { mod: "Reference Data", page: "COICOP Mapping" },
  "/reference_data/market_details": { mod: "Reference Data", page: "Markets" },
  "/users": { mod: "Administration", page: "Users & Roles" },
};

const getCrumb = (pathname: string) => {
  if (PAGE_LABELS[pathname]) return PAGE_LABELS[pathname];
  const seg = pathname.split("/").filter(Boolean);
  const last = (seg[seg.length - 1] || "Dashboard")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return { mod: "Overview", page: last };
};

const FONT_STEPS = [12.5, 14, 15.5]; // px on <html> — A− / A / A+

export default function Navbar({
  darkMode,
  toggleTheme,
  onMenuToggle,
  onCollapseToggle,
  isMobile,
}: NavbarProps) {
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(selectAuth);
  const [fontStep, setFontStep] = useState(1);
  const [highContrast, setHighContrast] = useState(false);

  const crumb = getCrumb(location.pathname);
  const role = (user?.role || "user").toLowerCase();

  const applyFont = (step: number) => {
    const s = Math.max(0, Math.min(FONT_STEPS.length - 1, step));
    setFontStep(s);
    document.documentElement.style.fontSize = `${FONT_STEPS[s]}px`;
  };

  const toggleContrast = () => {
    const next = !highContrast;
    setHighContrast(next);
    if (next) document.documentElement.setAttribute("data-contrast", "high");
    else document.documentElement.removeAttribute("data-contrast");
  };

  return (
    <header className="topbar" role="banner">
      <button
        className="icon-btn"
        type="button"
        aria-label="Toggle sidebar"
        title="Toggle sidebar"
        onClick={isMobile ? onMenuToggle : onCollapseToggle}
      >
        <svg {...svg}>
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>

      <nav className="crumb" aria-label="Breadcrumb">
        <b>{crumb.mod}</b>
        <svg {...svg}>
          <path d="M9 18l6-6-6-6" />
        </svg>
        <span aria-current="page">{crumb.page}</span>
      </nav>

      <div className="spacer"></div>

      {/* accessibility: text size + contrast */}
      <div className="a11y" role="group" aria-label="Accessibility options">
        <span className="lab" aria-hidden="true">
          Text
        </span>
        <button type="button" aria-label="Decrease text size" onClick={() => applyFont(fontStep - 1)}>
          A–
        </button>
        <button type="button" aria-label="Reset text size" style={{ fontSize: 13 }} onClick={() => applyFont(1)}>
          A
        </button>
        <button type="button" aria-label="Increase text size" style={{ fontSize: 15 }} onClick={() => applyFont(fontStep + 1)}>
          A+
        </button>
        <span className="divx" aria-hidden="true"></span>
        <button
          type="button"
          aria-pressed={highContrast}
          aria-label="High contrast mode"
          title="High contrast"
          onClick={toggleContrast}
        >
          <svg {...svg}>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 3a9 9 0 010 18z" fill="currentColor" stroke="none" />
          </svg>
        </button>
      </div>

      {/* role selector */}
      <div className="rolebar" title="Signed-in role — governs which actions are available">
        <svg {...svg}>
          <path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" />
          <path d="M9.3 12l1.8 1.8 3.6-4.1" />
        </svg>
        <span className="rl-lab">Role</span>
        <select
          aria-label="Role"
          value={role}
          onChange={(e) => dispatch(switchRole(e.target.value))}
        >
          <option value="admin">PSD Admin</option>
          <option value="compiler">Compiler</option>
          <option value="approver">Approver</option>
          <option value="reviewer">Reviewer</option>
          <option value="user">PSD User</option>
        </select>
      </div>

      {/* search */}
      <div className="search-mini" role="search">
        <svg {...svg}>
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4-4" />
        </svg>
        <input aria-label="Search the portal" placeholder="Search…" />
        <kbd aria-hidden="true">⌘K</kbd>
      </div>

      {/* theme */}
      <button
        className="icon-btn"
        type="button"
        aria-pressed={darkMode}
        aria-label="Toggle dark mode"
        title="Toggle theme"
        onClick={toggleTheme}
      >
        {darkMode ? (
          <svg {...svg}>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4l1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4l1.4-1.4" />
          </svg>
        ) : (
          <svg {...svg}>
            <path d="M21 12.8A9 9 0 1111.2 3 7 7 0 0021 12.8z" />
          </svg>
        )}
      </button>

      {/* notifications */}
      <button className="icon-btn" type="button" aria-label="Notifications, 1 unread" title="Notifications">
        <svg {...svg}>
          <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0" />
        </svg>
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 7,
            right: 8,
            width: 7,
            height: 7,
            background: "var(--saffron)",
            borderRadius: "50%",
            border: "2px solid var(--surface)",
          }}
        ></span>
      </button>
    </header>
  );
}
