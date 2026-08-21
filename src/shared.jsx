import React from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Tokens                                                             */
/* ------------------------------------------------------------------ */
export const COLORS = {
  ink: "var(--ink)",
  paper: "var(--paper)",
  paperDim: "var(--paperDim)",
  line: "var(--line)",
  green: "var(--green)",
  greenDeep: "var(--green)",
  rust: "var(--rust)",
  gold: "var(--gold)",
  slate: "var(--slate)",
  white: "var(--white)",
};

export const CATEGORY_PALETTE = [
  "#2F6B4F", "#A8472F", "#B8912B", "#3D5A80", "#7B4B94",
  "#5B6B63", "#4A6FA5", "#8B5E34", "#6B7F45", "#9A4C6B",
];
export const ACCOUNT_PALETTE = [
  "#3D5A80", "#7B4B94", "#2F6B4F", "#B8912B", "#5B6B63", "#A8472F",
];

export const fontDisplay = "'Fraunces', Georgia, serif";
export const fontBody = "'Plus Jakarta Sans', system-ui, sans-serif";
export const fontMono = "'IBM Plex Mono', ui-monospace, monospace";

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
export const brl = (n) =>
  (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const monthKey = (d) => d.slice(0, 7); // "YYYY-MM"
export const todayISO = () => new Date().toISOString().slice(0, 10);
export const monthLabel = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
};
export const shiftMonth = (ym, delta) => {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
export const addMonthToDate = (dateStr) => {
  const d = new Date(dateStr + "T00:00:00");
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
};

const pad2 = (n) => String(n).padStart(2, "0");
const isoDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
export const brDate = (iso) => new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");

export function periodRange(type, anchor, customStart, customEnd) {
  if (type === "personalizado") {
    return { start: customStart, end: customEnd, label: `${brDate(customStart)} – ${brDate(customEnd)}` };
  }
  const d = new Date(anchor + "T00:00:00");
  if (type === "trimestre") {
    const q = Math.floor(d.getMonth() / 3);
    const start = new Date(d.getFullYear(), q * 3, 1);
    const end = new Date(d.getFullYear(), q * 3 + 3, 0);
    return { start: isoDate(start), end: isoDate(end), label: `${q + 1}º Trimestre de ${d.getFullYear()}` };
  }
  if (type === "semestre") {
    const s = d.getMonth() < 6 ? 0 : 1;
    const start = new Date(d.getFullYear(), s * 6, 1);
    const end = new Date(d.getFullYear(), s * 6 + 6, 0);
    return { start: isoDate(start), end: isoDate(end), label: `${s + 1}º Semestre de ${d.getFullYear()}` };
  }
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { start: isoDate(start), end: isoDate(end), label: monthLabel(`${d.getFullYear()}-${pad2(d.getMonth() + 1)}`) };
}

export function shiftPeriod(type, anchor, delta) {
  const d = new Date(anchor + "T00:00:00");
  const months = type === "trimestre" ? 3 : type === "semestre" ? 6 : 1;
  const nd = new Date(d.getFullYear(), d.getMonth() + delta * months, 1);
  return isoDate(nd);
}

export function parseCSV(text) {
  const firstLine = text.split("\n")[0] || "";
  const delim = (firstLine.split(";").length > firstLine.split(",").length) ? ";" : ",";
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const rows = lines.map((line) => {
    const result = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === delim && !inQuotes) { result.push(cur); cur = ""; continue; }
      cur += ch;
    }
    result.push(cur);
    return result.map((c) => c.trim());
  });
  return { delim, rows };
}

export function parseDateFlexible(str) {
  str = (str || "").trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  const m = str.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = "20" + y;
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

export function parseAmountFlexible(str) {
  str = (str || "").trim().replace(/[R$\s]/g, "");
  if (!str) return null;
  if (str.includes(",") && str.includes(".")) {
    str = str.replace(/\./g, "").replace(",", ".");
  } else if (str.includes(",")) {
    str = str.replace(",", ".");
  }
  const n = parseFloat(str);
  return isNaN(n) ? null : n;
}

export function parseOFX(text) {
  const blocks = text.split(/<STMTTRN>/i).slice(1).map((b) => b.split(/<\/STMTTRN>/i)[0]);
  const extract = (tag, block) => {
    const re = new RegExp(`<${tag}>([^<\\r\\n]*)`, "i");
    const m = block.match(re);
    return m ? m[1].trim() : "";
  };
  return blocks
    .map((block) => {
      const dtRaw = extract("DTPOSTED", block);
      const amtRaw = extract("TRNAMT", block);
      const memo = extract("MEMO", block) || extract("NAME", block);
      const date = dtRaw && dtRaw.length >= 8 ? `${dtRaw.slice(0, 4)}-${dtRaw.slice(4, 6)}-${dtRaw.slice(6, 8)}` : null;
      const amount = amtRaw ? parseFloat(amtRaw.replace(",", ".")) : null;
      return { date, description: memo, amount };
    })
    .filter((t) => t.date && t.amount !== null && !isNaN(t.amount));
}

export function matchCategoryRule(description, rules) {
  if (!description || !rules?.length) return null;
  const desc = description.toLowerCase();
  const rule = rules.find((r) => r.keyword && desc.includes(r.keyword.toLowerCase()));
  return rule ? { categoryId: rule.categoryId, subcategoryId: rule.subcategoryId || null } : null;
}

/* ------------------------------------------------------------------ */
/*  Shared styles                                                       */
/* ------------------------------------------------------------------ */
export const inputStyle = {
  width: "100%",
  fontFamily: fontBody,
  fontSize: 14,
  padding: "9px 11px",
  border: `1px solid ${COLORS.line}`,
  borderRadius: 5,
  background: COLORS.white,
  color: COLORS.ink,
  outline: "none",
  boxSizing: "border-box",
};

/* ------------------------------------------------------------------ */
/*  Shared UI atoms                                                     */
/* ------------------------------------------------------------------ */
export function Stamp({ positive, labelPositive = "Superávit", labelNegative = "Déficit" }) {
  return (
    <span
      style={{
        fontFamily: fontMono,
        fontSize: 11,
        letterSpacing: "0.08em",
        padding: "3px 8px",
        borderRadius: 3,
        border: `1px solid ${positive ? COLORS.green : COLORS.rust}`,
        color: positive ? COLORS.green : COLORS.rust,
        textTransform: "uppercase",
      }}
    >
      {positive ? labelPositive : labelNegative}
    </span>
  );
}

export function IconBtn({ onClick, title, children, color }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 rounded transition-colors"
      style={{ color: color || COLORS.slate }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = COLORS.paperDim)}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
    >
      {children}
    </button>
  );
}

export function Modal({ title, onClose, children, width = 460 }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(28,43,36,0.45)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full rounded-md shadow-xl overflow-hidden"
        style={{ maxWidth: width, background: COLORS.white, border: `1px solid ${COLORS.line}`, maxHeight: "90vh", overflowY: "auto" }}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: `1px solid ${COLORS.line}`, position: "sticky", top: 0, background: COLORS.white }}
        >
          <h3 style={{ fontFamily: fontDisplay, fontSize: 19, color: COLORS.ink, fontWeight: 600 }}>
            {title}
          </h3>
          <button onClick={onClose} style={{ color: COLORS.slate }}>
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Field({ label, children, hint }) {
  return (
    <label className="block mb-3">
      <span
        style={{ fontFamily: fontBody, fontSize: 12, color: COLORS.slate, fontWeight: 600, letterSpacing: "0.03em" }}
        className="uppercase block mb-1"
      >
        {label}
      </span>
      {children}
      {hint && <span style={{ fontFamily: fontBody, fontSize: 11.5, color: COLORS.slate, display: "block", marginTop: 4 }}>{hint}</span>}
    </label>
  );
}

export function PrimaryBtn({ children, onClick, type = "button", full }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="rounded-md transition-opacity hover:opacity-90"
      style={{
        fontFamily: fontBody,
        fontWeight: 600,
        fontSize: 14,
        padding: "10px 16px",
        background: COLORS.ink,
        color: COLORS.white,
        width: full ? "100%" : "auto",
      }}
    >
      {children}
    </button>
  );
}

export function GhostBtn({ children, onClick, full }) {
  return (
    <button
      onClick={onClick}
      className="rounded-md transition-colors"
      style={{
        fontFamily: fontBody,
        fontWeight: 600,
        fontSize: 14,
        padding: "10px 16px",
        background: "transparent",
        color: COLORS.ink,
        border: `1px solid ${COLORS.line}`,
        width: full ? "100%" : "auto",
      }}
    >
      {children}
    </button>
  );
}

export function Panel({ title, right, children }) {
  return (
    <div className="rounded-md p-5" style={{ background: COLORS.white, border: `1px solid ${COLORS.line}` }}>
      <div className="flex items-center justify-between mb-3">
        <h3 style={{ fontFamily: fontDisplay, fontSize: 17, fontWeight: 600, color: COLORS.ink }}>{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}

export function EmptyHint({ text }) {
  return (
    <div className="flex items-center justify-center py-16 text-center px-4" style={{ fontFamily: fontBody, fontSize: 13.5, color: COLORS.slate }}>
      {text}
    </div>
  );
}

export function Header({ title, subtitle, right }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 style={{ fontFamily: fontDisplay, fontSize: 30, fontWeight: 700, color: COLORS.ink }}>{title}</h1>
        {subtitle && <p style={{ fontFamily: fontBody, fontSize: 13.5, color: COLORS.slate, marginTop: 2 }}>{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md px-3 py-2"
      style={{ fontFamily: fontBody, fontSize: 13, border: `1px solid ${COLORS.line}`, background: COLORS.white, color: COLORS.ink }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export function PeriodSwitcher({ periodType, setPeriodType, periodAnchor, setPeriodAnchor, customStart, setCustomStart, customEnd, setCustomEnd, label }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={periodType}
        onChange={setPeriodType}
        options={[
          { value: "mes", label: "Mensal" },
          { value: "trimestre", label: "Trimestral" },
          { value: "semestre", label: "Semestral" },
          { value: "personalizado", label: "Personalizado" },
        ]}
      />
      {periodType === "personalizado" ? (
        <div className="flex items-center gap-1.5">
          <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} style={{ ...inputStyle, width: 145 }} />
          <span style={{ fontFamily: fontBody, fontSize: 12.5, color: COLORS.slate }}>até</span>
          <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} style={{ ...inputStyle, width: 145 }} />
        </div>
      ) : (
        <div className="flex items-center gap-1 rounded-md" style={{ border: `1px solid ${COLORS.line}`, background: COLORS.white }}>
          <IconBtn onClick={() => setPeriodAnchor(shiftPeriod(periodType, periodAnchor, -1))} title="Período anterior"><ChevronLeft size={16} /></IconBtn>
          <span style={{ fontFamily: fontMono, fontSize: 13, minWidth: 160, textAlign: "center", textTransform: "capitalize" }}>{label}</span>
          <IconBtn onClick={() => setPeriodAnchor(shiftPeriod(periodType, periodAnchor, 1))} title="Próximo período"><ChevronRight size={16} /></IconBtn>
        </div>
      )}
    </div>
  );
}
