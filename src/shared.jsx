import React from "react";
import { X } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Tokens                                                             */
/* ------------------------------------------------------------------ */
export const COLORS = {
  ink: "#1C2B24",
  paper: "#F4F1E8",
  paperDim: "#EAE5D6",
  line: "#D8D0BC",
  green: "#2F6B4F",
  greenDeep: "#1F4A37",
  rust: "#A8472F",
  gold: "#B8912B",
  slate: "#5B6B63",
  white: "#FFFDF8",
};

export const CATEGORY_PALETTE = [
  "#2F6B4F", "#A8472F", "#B8912B", "#3D5A80", "#7B4B94",
  "#5B6B63", "#4A6FA5", "#8B5E34", "#6B7F45", "#9A4C6B",
];
export const ACCOUNT_PALETTE = [
  "#3D5A80", "#7B4B94", "#2F6B4F", "#B8912B", "#5B6B63", "#A8472F",
];

export const fontDisplay = "'Fraunces', Georgia, serif";
export const fontBody = "'Inter', system-ui, sans-serif";
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
