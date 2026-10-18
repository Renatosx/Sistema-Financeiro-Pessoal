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

// Quanto realmente cai na conta por este item.
// O salário base recebe os descontos do mês (cai o líquido); os demais caem pelo valor cheio.
export function depositOf(entry, monthEntries) {
  if (entry.received && typeof entry.receivedAmount === "number") return entry.receivedAmount;
  if (entry.kind === "desconto") return 0;
  if (entry.kind === "base") {
    const desc = monthEntries.filter((e) => e.kind === "desconto").reduce((a, e) => a + e.amount, 0);
    const firstBase = monthEntries.find((e) => e.kind === "base");
    if (firstBase && firstBase.id === entry.id) return Math.max(0, entry.amount - desc);
  }
  return entry.amount;
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
    const finalEntries = nextEntries.map((e) => ({ ...e }));
    const months = [...new Set(finalEntries.map((e) => e.month))];
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
    const base = templates.filter((t) => t.active !== false && t.kind === "base").reduce((a, t) => a + t.amount, 0);
    const created = [];
    templates.filter((t) => t.active !== false).forEach((t) => {
      if (entries.some((e) => e.month === month && e.templateId === t.id)) return;
      const amount = t.kind === "desconto" && t.mode === "percent" ? +(base * (t.amount / 100)).toFixed(2) : t.amount;
      created.push({
        id: uid(), month, templateId: t.id, kind: t.kind, name: t.name, amount,
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
    if (data.id) commit(entries.map((x) => (x.id === data.id ? { ...x, ...data } : x)));
    else commit([...entries, { ...data, id: uid(), month, received: false, provId: null }]);
    setModal(null);
  };

  const saveTemplate = (data) => {
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
    const others = templates.filter((t) => t.active !== false && t.kind !== "base" && t.kind !== "desconto" && t.kind !== "extra").reduce((a, t) => a + t.amount, 0);
    const desc = templates.filter((t) => t.active !== false && t.kind === "desconto").reduce((a, t) => a + (t.mode === "percent" ? b * (t.amount / 100) : t.amount), 0);
    return b + others - desc;
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
                      {kindLabel(t.kind)} · dia {t.day}{accountById[t.accountId] ? ` · ${accountById[t.accountId].name}` : ""}{t.active === false ? " · inativo" : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span style={{ fontFamily: fontMono, fontSize: 13.5, fontWeight: 600, color: t.kind === "desconto" ? COLORS.rust : COLORS.green }}>
                      {t.kind === "desconto" ? "−" : "+"} {t.kind === "desconto" && t.mode === "percent" ? `${t.amount}%` : brl(t.amount)}
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
  const [day, setDay] = useState((initial?.day || 5).toString());
  const [date, setDate] = useState(initial?.date || `${month}-${String(Math.min(todayISO().slice(8, 10) * 1, 28)).padStart(2, "0")}`);
  const [accountId, setAccountId] = useState(initial?.accountId || accounts[0]?.id || "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId || "");
  const [active, setActive] = useState(initial?.active !== false);
  const incomeCats = categories.filter((c) => c.type === "receita");

  return (
    <Modal title={(initial ? "Editar " : "Novo ") + (isTpl ? "modelo recorrente" : "item do mês")} onClose={onClose}>
      <Field label="Tipo">
        <select style={inputStyle} value={kind} onChange={(e) => setKind(e.target.value)}>
          {INCOME_KINDS.map((k) => <option key={k.v} value={k.v}>{k.l}</option>)}
        </select>
      </Field>
      <Field label="Descrição">
        <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === "extra" ? "Ex.: Planilha Fator R — Cliente X" : "Ex.: Salário Asip"} />
      </Field>
      {isTpl && kind === "desconto" && (
        <Field label="Forma do desconto">
          <select style={inputStyle} value={dmode} onChange={(e) => setDmode(e.target.value)}>
            <option value="fixo">Valor fixo (R$)</option>
            <option value="percent">% do salário base</option>
          </select>
        </Field>
      )}
      <Field label={isTpl && kind === "desconto" && dmode === "percent" ? "Percentual (%)" : "Valor (R$)"}>
        <input style={inputStyle} type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </Field>
      {isTpl ? (
        <Field label="Dia do mês" hint="Em meses curtos usa o último dia.">
          <input style={inputStyle} type="number" min="1" max="31" value={day} onChange={(e) => setDay(e.target.value)} />
        </Field>
      ) : (
        <Field label="Data prevista">
          <input style={inputStyle} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      )}
      {kind !== "desconto" && (
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
      {kind === "desconto" && !isTpl && (
        <div style={{ fontFamily: fontBody, fontSize: 12, color: COLORS.slate }}>Descontos reduzem o que cai na conta pelo salário base do mês.</div>
      )}
      <div className="flex gap-2 justify-end mt-5">
        <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
        <PrimaryBtn
          onClick={() => {
            const v = parseFloat(amount);
            if (!name.trim() || !(v > 0)) return;
            const common = {
              id: initial?.id, kind, name: name.trim(), amount: v,
              accountId: kind === "desconto" ? null : accountId || null,
              categoryId: kind === "desconto" ? null : categoryId || null,
            };
            if (isTpl) onSave({ ...common, mode: kind === "desconto" ? dmode : "fixo", day: Math.min(31, Math.max(1, parseInt(day, 10) || 1)), active });
            else {
              if (!date) return;
              onSave({ ...common, date });
            }
          }}
        >
          Salvar
        </PrimaryBtn>
      </div>
    </Modal>
  );
}
