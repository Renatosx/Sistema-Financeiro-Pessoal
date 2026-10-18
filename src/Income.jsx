import React, { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Repeat, ChevronLeft, ChevronRight, Wand2, Calculator } from "lucide-react";
import {
  COLORS, fontDisplay, fontBody, fontMono,
  uid, brl, inputStyle, todayISO, monthLabel, shiftMonth, brDate,
  Modal, Field, PrimaryBtn, GhostBtn, IconBtn, EmptyHint, Header, Panel,
} from "./shared.jsx";

export const INCOME_KINDS = [
  { v: "base", l: "Salário base", sign: 1 },
  { v: "prolabore", l: "Pró-labore", sign: 1 },
  { v: "beneficio", l: "Benefício (VR/VA/transporte...)", sign: 1 },
  { v: "extra", l: "Trabalho extra", sign: 1 },
  { v: "desconto", l: "Desconto (INSS/IR/...)", sign: -1 },
];
const kindLabel = (k) => INCOME_KINDS.find((x) => x.v === k)?.l || k;
const kindColor = (k) => (k === "desconto" ? COLORS.rust : k === "extra" ? COLORS.gold : COLORS.green);

const clampDate = (month, day) => {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${month}-${String(Math.min(Math.max(1, day || 1), last)).padStart(2, "0")}`;
};

/* ---------- Tabelas 2026 (conferir sempre com Receita Federal / Previdência) ---------- */
const INSS_BANDS = [[1621.0, 0.075], [2902.84, 0.09], [4354.27, 0.12], [8475.55, 0.14]];
export function inssCalc(base) {
  let prev = 0, total = 0;
  for (const [limit, rate] of INSS_BANDS) {
    if (base > prev) total += (Math.min(base, limit) - prev) * rate;
    prev = limit;
  }
  return +total.toFixed(2);
}
const IR_BANDS = [[2428.8, 0, 0], [2826.65, 0.075, 182.16], [3751.05, 0.15, 394.16], [4664.68, 0.225, 675.49], [Infinity, 0.275, 908.73]];
export function irrfCalc(gross, inss, deps = 0) {
  const ded = Math.max(607.2, inss + deps * 189.59);
  const b = Math.max(0, gross - ded);
  const band = IR_BANDS.find(([lim]) => b <= lim);
  const tax = Math.max(0, b * band[1] - band[2]);
  if (gross <= 5000) return 0;
  const red = gross <= 7350 ? Math.max(0, 978.62 - 0.133145 * gross) : 0;
  return +Math.max(0, tax - red).toFixed(2);
}

export const REGIMES = {
  simples: { label: "Simples Nacional (DAS)", taxes: [{ name: "DAS — Simples Nacional", rate: 6, hint: "Alíquota efetiva do seu anexo/faixa (ex.: Anexo III 1ª faixa = 6%)" }] },
  mei: {
    label: "MEI (DAS-MEI)",
    taxes: [
      { name: "DAS-MEI (serviços)", fixed: 86.05, hint: "5% do salário mínimo + R$ 5 de ISS" },
      { name: "DAS-MEI (comércio/indústria)", fixed: 82.05, hint: "5% do salário mínimo + R$ 1 de ICMS" },
      { name: "DAS-MEI (comércio e serviços)", fixed: 87.05, hint: "5% do salário mínimo + R$ 1 ICMS + R$ 5 ISS" },
    ],
    pick: true,
  },
  presumido: {
    label: "Lucro Presumido",
    activities: {
      servicos: { label: "Serviços (presunção 32%)", irpj: 32, csll: 32, local: { name: "ISS", rate: 5 } },
      comercio: { label: "Comércio/indústria (8% IRPJ / 12% CSLL)", irpj: 8, csll: 12, local: { name: "ICMS", rate: 18 } },
    },
  },
  real: { label: "Lucro Real", margin: true },
};

export function regimeTaxes(regime, activity, margin) {
  if (regime === "presumido") {
    const a = REGIMES.presumido.activities[activity];
    return [
      { name: "PIS (Lucro Presumido)", rate: 0.65 },
      { name: "COFINS (Lucro Presumido)", rate: 3 },
      { name: `IRPJ (Lucro Presumido, 15% × ${a.irpj}%)`, rate: +(0.15 * a.irpj).toFixed(3), hint: "Adicional de 10% sobre a parcela acima de R$ 60 mil/trimestre não incluso" },
      { name: `CSLL (Lucro Presumido, 9% × ${a.csll}%)`, rate: +(0.09 * a.csll).toFixed(3) },
      { name: `${a.local.name} (informe a alíquota do município/estado)`, rate: a.local.rate },
    ];
  }
  if (regime === "real") {
    const m = parseFloat(margin) || 0;
    return [
      { name: "PIS (Lucro Real, não cumulativo)", rate: 1.65, hint: "Sem créditos; ajuste se tiver créditos" },
      { name: "COFINS (Lucro Real, não cumulativo)", rate: 7.6, hint: "Sem créditos; ajuste se tiver créditos" },
      { name: `IRPJ (15% × margem de lucro ${m}%)`, rate: +(0.15 * m).toFixed(3), hint: "Estimativa: o IRPJ real incide sobre o lucro apurado" },
      { name: `CSLL (9% × margem de lucro ${m}%)`, rate: +(0.09 * m).toFixed(3), hint: "Estimativa: a CSLL real incide sobre o lucro apurado" },
      { name: "ISS (informe a alíquota do município)", rate: 5 },
    ];
  }
  if (regime === "simples") return REGIMES.simples.taxes.map((t) => ({ ...t }));
  if (regime === "mei") return REGIMES.mei.taxes.map((t) => ({ ...t }));
  return [];
}

const isCompanyKind = (k) => k === "prolabore" || k === "extra";
const originOf = (e) => e.origin || "clt";

// Recalcula os descontos automáticos (%, INSS, IRRF) de um mês a partir dos proventos.
export function normalizeMonth(list) {
  const baseSum = list.filter((e) => e.kind === "base").reduce((a, e) => a + e.amount, 0);
  const empSum = list.filter((e) => isCompanyKind(e.kind)).reduce((a, e) => a + e.amount, 0);
  return list.map((e) => {
    if (e.kind !== "desconto" || !e.mode || e.mode === "fixo") return e;
    const rate = typeof e.rate === "number" ? e.rate : e.amount;
    let amount = e.amount;
    if (e.mode === "percent") amount = +(((originOf(e) === "empresa" ? empSum : baseSum) * rate) / 100).toFixed(2);
    else if (e.mode === "inss") amount = inssCalc(baseSum);
    else if (e.mode === "irrf") amount = irrfCalc(baseSum, inssCalc(baseSum), e.deps || 0);
    return { ...e, amount };
  });
}

// Quanto realmente cai na conta por este item. Descontos "CLT" reduzem os salários base
// (rateio) e descontos "Empresa" reduzem o pró-labore/extras (rateio).
export function depositOf(entry, monthEntries) {
  if (entry.received && typeof entry.receivedAmount === "number") return entry.receivedAmount;
  if (entry.kind === "desconto") return 0;
  const descs = monthEntries.filter((e) => e.kind === "desconto");
  const clt = descs.filter((d) => originOf(d) !== "empresa").reduce((a, d) => a + d.amount, 0);
  const emp = descs.filter((d) => originOf(d) === "empresa").reduce((a, d) => a + d.amount, 0);
  const baseSum = monthEntries.filter((e) => e.kind === "base").reduce((a, e) => a + e.amount, 0);
  const empSum = monthEntries.filter((e) => isCompanyKind(e.kind)).reduce((a, e) => a + e.amount, 0);
  let cut = 0;
  if (entry.kind === "base" && baseSum > 0) cut = (clt * entry.amount) / baseSum;
  else if (isCompanyKind(entry.kind) && empSum > 0) cut = (emp * entry.amount) / empSum;
  return Math.max(0, +(entry.amount - cut).toFixed(2));
}

export default function Income({ income, persistIncome, accounts, categories, transactions, persistTx, provisions, persistProvisions }) {
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const [modal, setModal] = useState(null); // {mode:"entry"|"template", editing?}
  const [sim, setSim] = useState({ pct: "", value: "" });

  const templates = income.templates || [];
  const entries = income.entries || [];
  const accountById = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a])), [accounts]);
  const catById = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);
  const monthEntries = useMemo(
    () => entries.filter((e) => e.month === month).sort((a, b) => (a.date < b.date ? -1 : 1)),
    [entries, month]
  );

  const gross = monthEntries.filter((e) => e.kind !== "desconto").reduce((a, e) => a + e.amount, 0);
  const discounts = monthEntries.filter((e) => e.kind === "desconto").reduce((a, e) => a + e.amount, 0);
  const net = gross - discounts;
  const receivedTotal = monthEntries.filter((e) => e.received).reduce((a, e) => a + depositOf(e, monthEntries), 0);
  const pendingTotal = monthEntries.filter((e) => !e.received).reduce((a, e) => a + depositOf(e, monthEntries), 0);

  // Reconcilia as provisões "a receber" com os itens do mês (uma provisão por item, ligada por provId)
  const commit = (nextEntries, extra = {}) => {
    let nextProv = [...provisions];
    const monthsAll = [...new Set(nextEntries.map((e) => e.month))];
    const normById = {};
    monthsAll.forEach((m) => normalizeMonth(nextEntries.filter((e) => e.month === m)).forEach((e) => { normById[e.id] = e; }));
    const finalEntries = nextEntries.map((e) => ({ ...(normById[e.id] || e) }));
    const months = monthsAll;
    months.forEach((m) => {
      const list = finalEntries.filter((e) => e.month === m);
      list.forEach((e) => {
        const idx = e.provId ? nextProv.findIndex((p) => p.id === e.provId) : -1;
        if (e.received) return; // provisão já concluída
        const dep = depositOf(e, list);
        if (e.kind === "desconto" || dep <= 0) {
          if (idx >= 0) nextProv.splice(idx, 1);
          e.provId = null;
          return;
        }
        const [y, mm] = e.month.split("-");
        const base = {
          description: `${e.name} (${mm}/${y})`, type: "receber", amount: dep,
          expectedDate: e.date, recurring: false, autoLaunch: false,
          categoryId: e.categoryId || null, accountId: e.accountId || null, status: "pendente",
          source: "income",
        };
        if (idx >= 0) nextProv[idx] = { ...nextProv[idx], ...base };
        else { e.provId = uid(); nextProv.push({ ...base, id: e.provId }); }
      });
    });
    // remove provisões órfãs geradas por itens apagados
    const alive = new Set(finalEntries.map((e) => e.provId).filter(Boolean));
    const removedIds = (extra.removedProvIds || []).filter((id) => !alive.has(id));
    nextProv = nextProv.filter((p) => !removedIds.includes(p.id));
    persistProvisions(nextProv);
    persistIncome({ ...income, ...(extra.templates ? { templates: extra.templates } : {}), entries: finalEntries });
  };

  const generateMonth = () => {
    const created = [];
    templates.filter((t) => t.active !== false).forEach((t) => {
      if (entries.some((e) => e.month === month && e.templateId === t.id)) return;
      created.push({
        id: uid(), month, templateId: t.id, kind: t.kind, name: t.name, amount: t.amount,
        ...(t.kind === "desconto" ? { mode: t.mode || "fixo", rate: t.amount, origin: t.origin || "clt", deps: t.deps || 0 } : {}),
        date: clampDate(month, t.day), accountId: t.accountId || null, categoryId: t.categoryId || null,
        received: false, provId: null,
      });
    });
    if (created.length === 0) return;
    commit([...entries, ...created]);
  };

  const toggleReceived = (e) => {
    const list = entries.filter((x) => x.month === e.month);
    const [y, mm] = e.month.split("-");
    if (!e.received) {
      const dep = depositOf(e, list);
      const tx = {
        id: uid(), type: "receita", categoryId: e.categoryId || null, subcategoryId: null,
        accountId: e.accountId || accounts[0]?.id || null, amount: dep, date: todayISO(),
        description: `${e.name} (${mm}/${y})`,
      };
      persistTx([tx, ...transactions]);
      if (e.provId) persistProvisions(provisions.map((p) => (p.id === e.provId ? { ...p, status: "concluido" } : p)));
      persistIncome({
        ...income,
        entries: entries.map((x) => (x.id === e.id ? { ...x, received: true, receivedDate: tx.date, receivedAmount: dep, txId: tx.id } : x)),
      });
    } else {
      if (!window.confirm("Desmarcar como recebido? O lançamento de receita gerado por este item será removido.")) return;
      if (e.txId) persistTx(transactions.filter((t) => t.id !== e.txId));
      if (e.provId) persistProvisions(provisions.map((p) => (p.id === e.provId ? { ...p, status: "pendente" } : p)));
      persistIncome({
        ...income,
        entries: entries.map((x) => (x.id === e.id ? { ...x, received: false, receivedDate: null, receivedAmount: null, txId: null } : x)),
      });
    }
  };

  const removeEntry = (e) => {
    if (!window.confirm(`Excluir "${e.name}" deste mês?${e.received ? " (o lançamento de receita já gerado será mantido)" : ""}`)) return;
    commit(entries.filter((x) => x.id !== e.id), { removedProvIds: e.provId && !e.received ? [e.provId] : [] });
  };

  const saveEntry = (data) => {
    if (data.id) {
      commit(entries.map((x) => {
        if (x.id !== data.id) return x;
        const manual = x.mode && x.mode !== "fixo" && Math.abs(data.amount - x.amount) > 0.004;
        return { ...x, ...data, ...(manual ? { mode: "fixo", rate: data.amount } : x.mode === "fixo" || !x.mode ? { rate: data.amount } : {}) };
      }));
    } else {
      commit([...entries, { ...data, ...(data.kind === "desconto" ? { mode: "fixo", rate: data.amount } : {}), id: uid(), month, received: false, provId: null }]);
    }
    setModal(null);
  };

  const saveTemplate = (data) => {
    if (Array.isArray(data)) {
      persistIncome({ ...income, templates: [...templates, ...data.map((d) => ({ ...d, id: uid() }))] });
      setModal(null);
      return;
    }
    const next = data.id ? templates.map((t) => (t.id === data.id ? { ...t, ...data } : t)) : [...templates, { ...data, id: uid() }];
    persistIncome({ ...income, templates: next });
    setModal(null);
  };

  const removeTemplate = (t) => {
    if (!window.confirm(`Excluir o modelo "${t.name}"? Os meses já gerados não mudam.`)) return;
    persistIncome({ ...income, templates: templates.filter((x) => x.id !== t.id) });
  };

  // Simulador de aumento sobre os modelos ativos
  const baseTpl = templates.filter((t) => t.active !== false && t.kind === "base");
  const baseNow = baseTpl.reduce((a, t) => a + t.amount, 0);
  const pct = parseFloat(String(sim.pct).replace(",", "."));
  const valueIn = parseFloat(String(sim.value).replace(",", "."));
  const baseNew = !isNaN(valueIn) && sim.value !== "" ? valueIn : !isNaN(pct) && sim.pct !== "" ? baseNow * (1 + pct / 100) : null;
  const calcNet = (b) => {
    // monta um mês fictício com os modelos ativos e o salário base informado
    const fake = templates.filter((t) => t.active !== false).map((t) => {
      const amt = t.kind === "base" && t.id === baseTpl[0]?.id ? b - (baseNow - baseTpl[0].amount) : t.amount;
      return { id: t.id, kind: t.kind, amount: amt, rate: t.amount, mode: t.mode, origin: t.origin, deps: t.deps };
    });
    const n = normalizeMonth(fake);
    const prov = n.filter((e) => e.kind !== "desconto").reduce((a, e) => a + e.amount, 0);
    const disc = n.filter((e) => e.kind === "desconto").reduce((a, e) => a + e.amount, 0);
    return prov - disc;
  };
  const netNow = calcNet(baseNow);
  const netNew = baseNew != null ? calcNet(baseNew) : null;

  const applyRaise = () => {
    if (baseNew == null || baseTpl.length === 0) return;
    if (!window.confirm(`Aplicar novo salário base de ${brl(baseNew)} ao modelo? Meses já gerados não mudam.`)) return;
    const firstId = baseTpl[0].id;
    persistIncome({ ...income, templates: templates.map((t) => (t.id === firstId ? { ...t, amount: +baseNew.toFixed(2) } : t)) });
    setSim({ pct: "", value: "" });
  };

  const card = (label, value, color) => (
    <div className="rounded-md p-4" style={{ background: COLORS.white, border: `1px solid ${COLORS.line}` }}>
      <div style={{ fontFamily: fontBody, fontSize: 12.5, color: COLORS.slate, fontWeight: 600 }}>{label}</div>
      <div style={{ fontFamily: fontMono, fontSize: 20, fontWeight: 600, color, marginTop: 4 }}>{brl(value)}</div>
    </div>
  );

  const missing = templates.some((t) => t.active !== false && !entries.some((e) => e.month === month && e.templateId === t.id));

  return (
    <div>
      <Header
        title="Salário e composições"
        subtitle="Salário, benefícios, descontos e extras: o que você deve receber e o que já caiu"
        right={
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setModal({ mode: "entry" })} className="flex items-center gap-1.5 rounded-md"
              style={{ fontFamily: fontBody, fontWeight: 600, fontSize: 14, padding: "9px 14px", background: COLORS.ink, color: COLORS.white }}>
              <Plus size={15} /> Novo extra / item
            </button>
          </div>
        }
      />

      <div className="flex items-center gap-2 mt-5">
        <IconBtn onClick={() => setMonth(shiftMonth(month, -1))} title="Mês anterior"><ChevronLeft size={16} /></IconBtn>
        <span style={{ fontFamily: fontDisplay, fontSize: 17, fontWeight: 600, color: COLORS.ink, textTransform: "capitalize", minWidth: 150, textAlign: "center" }}>{monthLabel(month)}</span>
        <IconBtn onClick={() => setMonth(shiftMonth(month, 1))} title="Próximo mês"><ChevronRight size={16} /></IconBtn>
        {missing && (
          <button onClick={generateMonth} className="flex items-center gap-1.5 rounded-md ml-2"
            style={{ fontFamily: fontBody, fontWeight: 600, fontSize: 13, padding: "7px 12px", border: `1px solid ${COLORS.line}`, color: COLORS.ink }}>
            <Wand2 size={14} /> Gerar mês pelos modelos
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-4">
        {card("Proventos", gross, COLORS.green)}
        {card("Descontos", discounts, COLORS.rust)}
        {card("Líquido previsto", net, COLORS.ink)}
        {card("Já recebido", receivedTotal, COLORS.green)}
        {card("Falta receber", pendingTotal, COLORS.gold)}
      </div>

      <div className="mt-6">
        {monthEntries.length === 0 ? (
          <EmptyHint text={templates.length ? "Nada neste mês ainda. Use “Gerar mês pelos modelos” ou adicione um extra." : "Comece cadastrando seus modelos recorrentes (salário, benefícios, descontos) abaixo."} />
        ) : (
          <div className="rounded-md overflow-hidden" style={{ border: `1px solid ${COLORS.line}`, background: COLORS.white }}>
            {monthEntries.map((e, i) => {
              const dep = depositOf(e, monthEntries);
              const isDesc = e.kind === "desconto";
              const acc = accountById[e.accountId];
              const cat = catById[e.categoryId];
              return (
                <div key={e.id} className="flex items-center justify-between px-4 md:px-5 py-3 gap-3"
                  style={{ borderTop: i === 0 ? "none" : `1px dashed ${COLORS.line}`, opacity: e.received ? 0.65 : 1 }}>
                  <div className="flex items-center gap-3 min-w-0">
                    {!isDesc ? (
                      <input type="checkbox" checked={!!e.received} onChange={() => toggleReceived(e)} title="Marcar como recebido" style={{ width: 18, height: 18 }} />
                    ) : <span style={{ width: 18 }} />}
                    <div className="min-w-0">
                      <div style={{ fontFamily: fontBody, fontSize: 14, fontWeight: 600, color: COLORS.ink, textDecoration: e.received ? "line-through" : "none" }} className="truncate">{e.name}</div>
                      <div style={{ fontFamily: fontBody, fontSize: 12, color: COLORS.slate }}>
                        <span style={{ color: kindColor(e.kind), fontWeight: 600 }}>{kindLabel(e.kind)}</span>
                        {e.kind === "desconto" && e.mode && e.mode !== "fixo" ? " (automático)" : ""}
                        {" · "}{brDate(e.date)}{acc ? ` · ${acc.name}` : ""}{cat ? ` · ${cat.name}` : ""}
                        {e.received && e.receivedDate ? ` · recebido em ${brDate(e.receivedDate)}` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <div style={{ fontFamily: fontMono, fontSize: 15, fontWeight: 600, color: isDesc ? COLORS.rust : COLORS.green }}>
                        {isDesc ? "−" : "+"} {brl(e.amount)}
                      </div>
                      {e.kind === "base" && dep !== e.amount && (
                        <div style={{ fontFamily: fontBody, fontSize: 11.5, color: COLORS.slate }}>cai na conta {brl(dep)}</div>
                      )}
                    </div>
                    <IconBtn onClick={() => setModal({ mode: "entry", editing: e })} title="Editar"><Pencil size={13} /></IconBtn>
                    <IconBtn onClick={() => removeEntry(e)} title="Excluir" color={COLORS.rust}><Trash2 size={13} /></IconBtn>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-8">
        <Panel
          title="Modelos recorrentes"
          right={
            <button onClick={() => setModal({ mode: "template" })} className="flex items-center gap-1 rounded-md"
              style={{ fontFamily: fontBody, fontWeight: 600, fontSize: 12.5, padding: "6px 10px", border: `1px solid ${COLORS.line}`, color: COLORS.ink }}>
              <Plus size={13} /> Novo modelo
            </button>
          }
        >
          {templates.length === 0 ? (
            <div style={{ fontFamily: fontBody, fontSize: 13, color: COLORS.slate }}>Cadastre o que se repete todo mês: salário base, pró-labore, VR/VA, transporte, INSS, IR...</div>
          ) : (
            <div className="space-y-2">
              {templates.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-md px-3 py-2" style={{ background: COLORS.paperDim, opacity: t.active === false ? 0.5 : 1 }}>
                  <div className="min-w-0">
                    <div style={{ fontFamily: fontBody, fontSize: 13.5, fontWeight: 600, color: COLORS.ink }} className="flex items-center gap-1.5 truncate">
                      <Repeat size={12} style={{ color: COLORS.slate }} /> {t.name}
                    </div>
                    <div style={{ fontFamily: fontBody, fontSize: 12, color: COLORS.slate }}>
                      {kindLabel(t.kind)}{t.kind === "desconto" ? ` (${t.origin === "empresa" ? "empresa, sobre o faturamento" : "salário CLT"})` : ""} · dia {t.day}{accountById[t.accountId] ? ` · ${accountById[t.accountId].name}` : ""}{t.active === false ? " · inativo" : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span style={{ fontFamily: fontMono, fontSize: 13.5, fontWeight: 600, color: t.kind === "desconto" ? COLORS.rust : COLORS.green }}>
                      {t.kind === "desconto" ? "−" : "+"} {t.mode === "inss" || t.mode === "irrf" ? "auto" : t.kind === "desconto" && t.mode === "percent" ? `${String(t.amount).replace(".", ",")}%` : brl(t.amount)}
                    </span>
                    <IconBtn onClick={() => setModal({ mode: "template", editing: t })} title="Editar"><Pencil size={13} /></IconBtn>
                    <IconBtn onClick={() => removeTemplate(t)} title="Excluir" color={COLORS.rust}><Trash2 size={13} /></IconBtn>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Simulador de aumento" right={<Calculator size={16} style={{ color: COLORS.slate }} />}>
          {baseTpl.length === 0 ? (
            <div style={{ fontFamily: fontBody, fontSize: 13, color: COLORS.slate }}>Cadastre um modelo de “Salário base” para simular.</div>
          ) : (
            <div>
              <div style={{ fontFamily: fontBody, fontSize: 13, color: COLORS.slate }}>
                Base atual <b style={{ color: COLORS.ink }}>{brl(baseNow)}</b> · líquido estimado <b style={{ color: COLORS.ink }}>{brl(netNow)}</b>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <Field label="Aumento (%)">
                  <input style={inputStyle} inputMode="decimal" value={sim.pct} onChange={(e) => setSim({ pct: e.target.value, value: "" })} placeholder="Ex.: 8" />
                </Field>
                <Field label="ou novo valor base">
                  <input style={inputStyle} inputMode="decimal" value={sim.value} onChange={(e) => setSim({ pct: "", value: e.target.value })} placeholder="Ex.: 3500" />
                </Field>
              </div>
              {netNew != null && (
                <div className="rounded-md p-3 mt-1" style={{ background: COLORS.paperDim, fontFamily: fontBody, fontSize: 13, color: COLORS.ink }}>
                  <div>Novo base: <b>{brl(baseNew)}</b></div>
                  <div>Novo líquido: <b>{brl(netNew)}</b></div>
                  <div style={{ color: netNew - netNow >= 0 ? COLORS.green : COLORS.rust }}>
                    Diferença: <b>{netNew - netNow >= 0 ? "+" : "−"} {brl(Math.abs(netNew - netNow))}</b>/mês · {netNew - netNow >= 0 ? "+" : "−"} {brl(Math.abs((netNew - netNow) * 12))}/ano
                  </div>
                  <div className="mt-2"><GhostBtn onClick={applyRaise}>Aplicar ao modelo</GhostBtn></div>
                </div>
              )}
              <div style={{ fontFamily: fontBody, fontSize: 11.5, color: COLORS.slate, marginTop: 8 }}>
                Descontos em % (cadastrados como modelo) acompanham o novo valor; descontos fixos permanecem.
              </div>
            </div>
          )}
        </Panel>
      </div>

      {modal && (
        <ItemModal
          mode={modal.mode} initial={modal.editing} month={month}
          accounts={accounts} categories={categories}
          onClose={() => setModal(null)}
          onSave={modal.mode === "template" ? saveTemplate : saveEntry}
        />
      )}
    </div>
  );
}

function ItemModal({ mode, initial, month, accounts, categories, onClose, onSave }) {
  const isTpl = mode === "template";
  const [kind, setKind] = useState(initial?.kind || (isTpl ? "base" : "extra"));
  const [name, setName] = useState(initial?.name || "");
  const [amount, setAmount] = useState(initial?.amount?.toString() || "");
  const [dmode, setDmode] = useState(initial?.mode || "fixo");
  const [origin, setOrigin] = useState(initial?.origin || "clt");
  const [deps, setDeps] = useState((initial?.deps || 0).toString());
  const [day, setDay] = useState((initial?.day || 5).toString());
  const [date, setDate] = useState(initial?.date || `${month}-${String(Math.min(todayISO().slice(8, 10) * 1, 28)).padStart(2, "0")}`);
  const [accountId, setAccountId] = useState(initial?.accountId || accounts[0]?.id || "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId || "");
  const [active, setActive] = useState(initial?.active !== false);
  const [regime, setRegime] = useState("");
  const [activity, setActivity] = useState("servicos");
  const [margin, setMargin] = useState("20");
  const [taxes, setTaxes] = useState([]); // [{name, rate, fixed, hint, on}]
  const incomeCats = categories.filter((c) => c.type === "receita");
  const isDesc = kind === "desconto";
  const auto = dmode === "inss" || dmode === "irrf";

  const pickRegime = (r, act = activity, mg = margin) => {
    setRegime(r);
    setTaxes(regimeTaxes(r, act, mg).map((t, i) => ({ ...t, on: REGIMES[r]?.pick ? i === 0 : true })));
  };
  const setTax = (i, patch) => setTaxes((prev) => prev.map((t, j) => (j === i ? { ...t, ...patch } : t)));

  const applyShortcut = (v) => {
    if (v === "inss") { setDmode("inss"); setName("INSS"); setAmount("0"); }
    else if (v === "irrf") { setDmode("irrf"); setName("IRRF"); setAmount("0"); }
    else if (v === "vt") { setDmode("percent"); setName("Vale-transporte (6% do salário)"); setAmount("6"); }
    else { setDmode("fixo"); }
  };

  const common = () => ({
    id: initial?.id, kind, name: name.trim(),
    accountId: isDesc ? null : accountId || null,
    categoryId: isDesc ? null : categoryId || null,
  });

  return (
    <Modal title={(initial ? "Editar " : "Novo ") + (isTpl ? "modelo recorrente" : "item do mês")} onClose={onClose} width={520}>
      <Field label="Tipo">
        <select style={inputStyle} value={kind} onChange={(e) => setKind(e.target.value)}>
          {INCOME_KINDS.map((k) => <option key={k.v} value={k.v}>{k.l}</option>)}
        </select>
      </Field>

      {isDesc && (
        <Field label="Origem do desconto" hint={origin === "empresa" ? "Impostos da empresa: lançar o faturamento como “Trabalho extra” ou “Pró-labore”." : "Descontos sobre o salário CLT."}>
          <select style={inputStyle} value={origin} onChange={(e) => { setOrigin(e.target.value); setRegime(""); setTaxes([]); if (dmode === "inss" || dmode === "irrf") setDmode("fixo"); }}>
            <option value="clt">Salário (CLT)</option>
            <option value="empresa">Empresa (regime tributário)</option>
          </select>
        </Field>
      )}

      {isDesc && isTpl && !initial && origin === "clt" && (
        <Field label="Atalho">
          <select style={inputStyle} defaultValue="" onChange={(e) => applyShortcut(e.target.value)}>
            <option value="">Personalizado</option>
            <option value="inss">INSS (tabela progressiva 2026, automático)</option>
            <option value="irrf">IRRF (regra 2026, automático)</option>
            <option value="vt">Vale-transporte (6% do salário base)</option>
          </select>
        </Field>
      )}

      {isDesc && isTpl && !initial && origin === "empresa" && (
        <div className="rounded-md p-3 mb-3" style={{ background: COLORS.paperDim }}>
          <Field label="Regime tributário">
            <select style={inputStyle} value={regime} onChange={(e) => pickRegime(e.target.value)}>
              <option value="">Selecione…</option>
              {Object.entries(REGIMES).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}
            </select>
          </Field>
          {regime === "presumido" && (
            <Field label="Atividade">
              <select style={inputStyle} value={activity} onChange={(e) => { setActivity(e.target.value); pickRegime("presumido", e.target.value); }}>
                {Object.entries(REGIMES.presumido.activities).map(([k, a]) => <option key={k} value={k}>{a.label}</option>)}
              </select>
            </Field>
          )}
          {regime === "real" && (
            <Field label="Margem de lucro estimada (%)" hint="IRPJ/CSLL do Lucro Real incidem sobre o lucro; aqui entram como estimativa.">
              <input style={inputStyle} type="number" step="0.1" min="0" value={margin} onChange={(e) => { setMargin(e.target.value); pickRegime("real", activity, e.target.value); }} />
            </Field>
          )}
          {taxes.map((t, i) => (
            <div key={i} className="flex items-center gap-2 mb-2">
              <input type="checkbox" checked={t.on} onChange={(e) => setTax(i, { on: e.target.checked })} />
              <div className="flex-1 min-w-0">
                <div style={{ fontFamily: fontBody, fontSize: 13, color: COLORS.ink }}>{t.name}</div>
                {t.hint && <div style={{ fontFamily: fontBody, fontSize: 11.5, color: COLORS.slate }}>{t.hint}</div>}
              </div>
              <input
                style={{ ...inputStyle, width: 96 }} type="number" step="0.01" min="0"
                value={t.fixed != null ? t.fixed : t.rate}
                onChange={(e) => setTax(i, t.fixed != null ? { fixed: parseFloat(e.target.value) || 0 } : { rate: parseFloat(e.target.value) || 0 })}
              />
              <span style={{ fontFamily: fontBody, fontSize: 12, color: COLORS.slate, width: 20 }}>{t.fixed != null ? "R$" : "%"}</span>
            </div>
          ))}
          {taxes.length > 0 && (
            <div style={{ fontFamily: fontBody, fontSize: 11.5, color: COLORS.slate }}>
              Percentuais incidem sobre o faturamento do mês (pró-labore + trabalho extra). Confira alíquotas com seu contador.
            </div>
          )}
          <div className="flex items-center gap-3 mt-3">
            <Field label="Dia do vencimento">
              <input style={{ ...inputStyle, width: 90 }} type="number" min="1" max="31" value={day} onChange={(e) => setDay(e.target.value)} />
            </Field>
          </div>
        </div>
      )}

      {!(isDesc && isTpl && !initial && origin === "empresa") && (
        <>
          <Field label="Descrição">
            <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === "extra" ? "Ex.: Planilha Fator R — Cliente X" : "Ex.: Salário Asip"} />
          </Field>
          {isTpl && isDesc && !auto && (
            <Field label="Forma do desconto">
              <select style={inputStyle} value={dmode} onChange={(e) => setDmode(e.target.value)}>
                <option value="fixo">Valor fixo (R$)</option>
                <option value="percent">{origin === "empresa" ? "% do faturamento (pró-labore + extras)" : "% do salário base"}</option>
              </select>
            </Field>
          )}
          {dmode === "irrf" && isDesc && (
            <Field label="Dependentes (R$ 189,59 cada)">
              <input style={inputStyle} type="number" min="0" value={deps} onChange={(e) => setDeps(e.target.value)} />
            </Field>
          )}
          {auto ? (
            <div style={{ fontFamily: fontBody, fontSize: 12, color: COLORS.slate, marginBottom: 12 }}>
              Calculado automaticamente sobre o salário base de cada mês ({dmode === "inss" ? "tabela INSS 2026, teto R$ 8.475,55" : "tabela IRRF 2026, com desconto simplificado/deduções e redutor até R$ 7.350"}).
            </div>
          ) : (
            <Field label={isDesc && dmode === "percent" ? "Percentual (%)" : "Valor (R$)"}>
              <input style={inputStyle} type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </Field>
          )}
          {isTpl ? (
            <Field label="Dia do mês" hint="Em meses curtos usa o último dia.">
              <input style={inputStyle} type="number" min="1" max="31" value={day} onChange={(e) => setDay(e.target.value)} />
            </Field>
          ) : (
            <Field label="Data prevista">
              <input style={inputStyle} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          )}
        </>
      )}

      {!isDesc && (
        <>
          <Field label="Banco / conta">
            <select style={inputStyle} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>
          {incomeCats.length > 0 && (
            <Field label="Categoria (opcional)">
              <select style={inputStyle} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Nenhuma</option>
                {incomeCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          )}
        </>
      )}
      {isTpl && (
        <label className="flex items-center gap-2 mt-1 mb-2 cursor-pointer">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          <span style={{ fontFamily: fontBody, fontSize: 13, color: COLORS.ink }}>Ativo (entra ao gerar o mês)</span>
        </label>
      )}
      {isDesc && !isTpl && (
        <div style={{ fontFamily: fontBody, fontSize: 12, color: COLORS.slate }}>Descontos reduzem o que cai na conta pelo {origin === "empresa" ? "pró-labore/extras" : "salário base"} do mês.</div>
      )}
      <div className="flex gap-2 justify-end mt-5">
        <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
        <PrimaryBtn
          onClick={() => {
            const d = Math.min(31, Math.max(1, parseInt(day, 10) || 1));
            if (isDesc && isTpl && !initial && origin === "empresa") {
              const chosen = taxes.filter((t) => t.on);
              if (!chosen.length) return;
              onSave(chosen.map((t) => ({
                kind: "desconto", origin: "empresa", name: t.name,
                mode: t.fixed != null ? "fixo" : "percent", amount: t.fixed != null ? t.fixed : t.rate,
                day: d, active: true, accountId: null, categoryId: null,
              })));
              return;
            }
            const v = auto ? 0 : parseFloat(amount);
            if (!name.trim() || (!auto && !(v > 0))) return;
            const base = { ...common(), amount: v };
            if (isDesc) { base.origin = origin; base.deps = parseInt(deps, 10) || 0; }
            if (isTpl) onSave({ ...base, mode: isDesc ? dmode : "fixo", day: d, active });
            else {
              if (!date) return;
              onSave({ ...base, date });
            }
          }}
        >
          Salvar
        </PrimaryBtn>
      </div>
    </Modal>
  );
}
