import React, { useMemo, useState } from "react";
import { Printer } from "lucide-react";
import {
  COLORS, fontDisplay, fontBody, fontMono,
  brl, todayISO, periodRange, shiftPeriod,
  Header, Panel, PeriodSwitcher, EmptyHint,
} from "./shared.jsx";

export default function DRE({ transactions, categories }) {
  const [periodType, setPeriodType] = useState("mes");
  const [periodAnchor, setPeriodAnchor] = useState(`${todayISO().slice(0, 7)}-01`);
  const [customStart, setCustomStart] = useState(todayISO());
  const [customEnd, setCustomEnd] = useState(todayISO());

  const period = useMemo(() => periodRange(periodType, periodAnchor, customStart, customEnd), [periodType, periodAnchor, customStart, customEnd]);
  const prevAnchor = useMemo(() => (periodType === "personalizado" ? null : shiftPeriod(periodType, periodAnchor, -1)), [periodType, periodAnchor]);
  const prevPeriod = useMemo(() => (prevAnchor ? periodRange(periodType, prevAnchor, customStart, customEnd) : null), [prevAnchor, periodType, customStart, customEnd]);

  const catById = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);

  const buildLines = (start, end, type) => {
    const tx = transactions.filter((t) => t.type === type && t.date >= start && t.date <= end);
    const map = {};
    tx.forEach((t) => { map[t.categoryId] = (map[t.categoryId] || 0) + t.amount; });
    return Object.entries(map)
      .map(([id, value]) => ({ id, name: catById[id]?.name || "Sem categoria", value }))
      .sort((a, b) => b.value - a.value);
  };

  const receitas = useMemo(() => buildLines(period.start, period.end, "receita"), [period, transactions, catById]);
  const despesas = useMemo(() => buildLines(period.start, period.end, "despesa"), [period, transactions, catById]);
  const totalReceitas = receitas.reduce((a, r) => a + r.value, 0);
  const totalDespesas = despesas.reduce((a, r) => a + r.value, 0);
  const resultado = totalReceitas - totalDespesas;
  const margem = totalReceitas > 0 ? (resultado / totalReceitas) * 100 : 0;

  const prevReceitasTotal = useMemo(
    () => (prevPeriod ? buildLines(prevPeriod.start, prevPeriod.end, "receita").reduce((a, r) => a + r.value, 0) : null),
    [prevPeriod, transactions, catById]
  );
  const prevDespesasTotal = useMemo(
    () => (prevPeriod ? buildLines(prevPeriod.start, prevPeriod.end, "despesa").reduce((a, r) => a + r.value, 0) : null),
    [prevPeriod, transactions, catById]
  );
  const prevResultado = prevReceitasTotal !== null ? prevReceitasTotal - prevDespesasTotal : null;

  const variacao = (curr, prev) => (prev === null || prev === 0 ? null : ((curr - prev) / Math.abs(prev)) * 100);
  const VarCell = ({ curr, prev, goodWhenPositive = true }) => {
    const v = variacao(curr, prev);
    if (v === null) return <td className="text-right" style={{ fontFamily: fontMono, fontSize: 12, color: COLORS.slate, padding: "7px 10px" }}>—</td>;
    const positive = goodWhenPositive ? v >= 0 : v <= 0;
    return (
      <td className="text-right" style={{ fontFamily: fontMono, fontSize: 12, fontWeight: 600, padding: "7px 10px", color: positive ? COLORS.green : COLORS.rust }}>
        {v >= 0 ? "+" : ""}{v.toFixed(1)}%
      </td>
    );
  };

  return (
    <div>
      <Header
        title="DRE"
        subtitle="Demonstrativo de Resultado — receitas, despesas e resultado do período"
        right={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => window.print()}
              className="no-print flex items-center gap-1.5 rounded-md"
              style={{ fontFamily: fontBody, fontWeight: 600, fontSize: 13, padding: "9px 12px", border: `1px solid ${COLORS.line}`, color: COLORS.ink, background: COLORS.white }}
            >
              <Printer size={14} /> Exportar PDF
            </button>
            <PeriodSwitcher
              periodType={periodType} setPeriodType={setPeriodType}
              periodAnchor={periodAnchor} setPeriodAnchor={setPeriodAnchor}
              customStart={customStart} setCustomStart={setCustomStart}
              customEnd={customEnd} setCustomEnd={setCustomEnd}
              label={period.label}
            />
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        <div className="rounded-md p-5" style={{ background: COLORS.white, border: `1px solid ${COLORS.line}` }}>
          <span style={{ fontFamily: fontBody, fontSize: 12.5, color: COLORS.slate, fontWeight: 600 }}>Total de receitas</span>
          <div style={{ fontFamily: fontMono, fontSize: 22, fontWeight: 600, color: COLORS.green, marginTop: 6 }}>{brl(totalReceitas)}</div>
        </div>
        <div className="rounded-md p-5" style={{ background: COLORS.white, border: `1px solid ${COLORS.line}` }}>
          <span style={{ fontFamily: fontBody, fontSize: 12.5, color: COLORS.slate, fontWeight: 600 }}>Total de despesas</span>
          <div style={{ fontFamily: fontMono, fontSize: 22, fontWeight: 600, color: COLORS.rust, marginTop: 6 }}>{brl(totalDespesas)}</div>
        </div>
        <div className="rounded-md p-5" style={{ background: COLORS.white, border: `1px solid ${COLORS.line}` }}>
          <span style={{ fontFamily: fontBody, fontSize: 12.5, color: COLORS.slate, fontWeight: 600 }}>Resultado do período</span>
          <div style={{ fontFamily: fontMono, fontSize: 22, fontWeight: 600, color: resultado >= 0 ? COLORS.green : COLORS.rust, marginTop: 6 }}>{brl(resultado)}</div>
          <div style={{ fontFamily: fontBody, fontSize: 11.5, color: COLORS.slate, marginTop: 2 }}>margem: {margem.toFixed(1)}%</div>
        </div>
      </div>

      <div className="mt-6">
        <Panel title={`Demonstrativo — ${period.label}`}>
          {receitas.length === 0 && despesas.length === 0 ? (
            <EmptyHint text="Nenhum lançamento neste período." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 560 }}>
                <thead>
                  <tr>
                    <th className="text-left" style={{ fontFamily: fontBody, fontSize: 11, fontWeight: 600, color: COLORS.slate, textTransform: "uppercase", letterSpacing: "0.03em", borderBottom: `1px solid ${COLORS.line}`, padding: "6px 10px" }}>Conta</th>
                    <th className="text-right" style={{ fontFamily: fontBody, fontSize: 11, fontWeight: 600, color: COLORS.slate, textTransform: "uppercase", letterSpacing: "0.03em", borderBottom: `1px solid ${COLORS.line}`, padding: "6px 10px" }}>Valor</th>
                    <th className="text-right" style={{ fontFamily: fontBody, fontSize: 11, fontWeight: 600, color: COLORS.slate, textTransform: "uppercase", letterSpacing: "0.03em", borderBottom: `1px solid ${COLORS.line}`, padding: "6px 10px" }}>AV%</th>
                    {prevPeriod && (
                      <th className="text-right" style={{ fontFamily: fontBody, fontSize: 11, fontWeight: 600, color: COLORS.slate, textTransform: "uppercase", letterSpacing: "0.03em", borderBottom: `1px solid ${COLORS.line}`, padding: "6px 10px" }}>vs. anterior</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={4} style={{ fontFamily: fontDisplay, fontSize: 14, fontWeight: 700, color: COLORS.ink, padding: "10px 10px 4px" }}>RECEITAS</td>
                  </tr>
                  {receitas.map((r) => (
                    <tr key={r.id} style={{ borderTop: `1px dashed ${COLORS.line}` }}>
                      <td style={{ fontFamily: fontBody, fontSize: 13, color: COLORS.ink, padding: "6px 10px" }}>{r.name}</td>
                      <td className="text-right" style={{ fontFamily: fontMono, fontSize: 13, color: COLORS.ink, padding: "6px 10px" }}>{brl(r.value)}</td>
                      <td className="text-right" style={{ fontFamily: fontMono, fontSize: 12, color: COLORS.slate, padding: "6px 10px" }}>{totalReceitas > 0 ? ((r.value / totalReceitas) * 100).toFixed(1) : "0.0"}%</td>
                      {prevPeriod && <td />}
                    </tr>
                  ))}
                  <tr style={{ borderTop: `1px solid ${COLORS.line}`, background: COLORS.paperDim }}>
                    <td style={{ fontFamily: fontBody, fontSize: 13, fontWeight: 700, color: COLORS.ink, padding: "7px 10px" }}>Total de receitas</td>
                    <td className="text-right" style={{ fontFamily: fontMono, fontSize: 13, fontWeight: 700, color: COLORS.green, padding: "7px 10px" }}>{brl(totalReceitas)}</td>
                    <td className="text-right" style={{ fontFamily: fontMono, fontSize: 12, color: COLORS.slate, padding: "7px 10px" }}>100%</td>
                    {prevPeriod && <VarCell curr={totalReceitas} prev={prevReceitasTotal} goodWhenPositive />}
                  </tr>

                  <tr>
                    <td colSpan={4} style={{ fontFamily: fontDisplay, fontSize: 14, fontWeight: 700, color: COLORS.ink, padding: "14px 10px 4px" }}>(–) DESPESAS</td>
                  </tr>
                  {despesas.map((r) => (
                    <tr key={r.id} style={{ borderTop: `1px dashed ${COLORS.line}` }}>
                      <td style={{ fontFamily: fontBody, fontSize: 13, color: COLORS.ink, padding: "6px 10px" }}>{r.name}</td>
                      <td className="text-right" style={{ fontFamily: fontMono, fontSize: 13, color: COLORS.ink, padding: "6px 10px" }}>{brl(r.value)}</td>
                      <td className="text-right" style={{ fontFamily: fontMono, fontSize: 12, color: COLORS.slate, padding: "6px 10px" }}>{totalReceitas > 0 ? ((r.value / totalReceitas) * 100).toFixed(1) : "0.0"}%</td>
                      {prevPeriod && <td />}
                    </tr>
                  ))}
                  <tr style={{ borderTop: `1px solid ${COLORS.line}`, background: COLORS.paperDim }}>
                    <td style={{ fontFamily: fontBody, fontSize: 13, fontWeight: 700, color: COLORS.ink, padding: "7px 10px" }}>Total de despesas</td>
                    <td className="text-right" style={{ fontFamily: fontMono, fontSize: 13, fontWeight: 700, color: COLORS.rust, padding: "7px 10px" }}>{brl(totalDespesas)}</td>
                    <td className="text-right" style={{ fontFamily: fontMono, fontSize: 12, color: COLORS.slate, padding: "7px 10px" }}>{totalReceitas > 0 ? ((totalDespesas / totalReceitas) * 100).toFixed(1) : "0.0"}%</td>
                    {prevPeriod && <VarCell curr={totalDespesas} prev={prevDespesasTotal} goodWhenPositive={false} />}
                  </tr>

                  <tr style={{ borderTop: `2px solid ${COLORS.ink}` }}>
                    <td style={{ fontFamily: fontDisplay, fontSize: 15, fontWeight: 700, color: COLORS.ink, padding: "10px" }}>= RESULTADO DO PERÍODO</td>
                    <td className="text-right" style={{ fontFamily: fontMono, fontSize: 15, fontWeight: 700, color: resultado >= 0 ? COLORS.green : COLORS.rust, padding: "10px" }}>{brl(resultado)}</td>
                    <td className="text-right" style={{ fontFamily: fontMono, fontSize: 12, color: COLORS.slate, padding: "10px" }}>{margem.toFixed(1)}%</td>
                    {prevPeriod && <VarCell curr={resultado} prev={prevResultado} goodWhenPositive />}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
