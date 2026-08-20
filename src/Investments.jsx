import React, { useMemo, useState } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Plus, Pencil, Trash2, TrendingUp, ArrowRight, ChevronDown, ChevronUp, Award } from "lucide-react";
import {
  COLORS, fontDisplay, fontBody, fontMono, ACCOUNT_PALETTE,
  uid, brl, inputStyle, todayISO,
  Modal, Field, PrimaryBtn, GhostBtn, IconBtn, Panel, EmptyHint, Header,
} from "./shared.jsx";

const TYPES = ["Renda Fixa", "Renda Variável", "Fundos", "Cripto", "Previdência", "Outro"];
const TYPE_COLORS = {
  "Renda Fixa": "#3D5A80", "Renda Variável": "#C9A227", "Fundos": "#256D5C",
  "Cripto": "#9C3B3B", "Previdência": "#7B4B94", "Outro": "#5B6478",
};

export default function Investments({ investments, accounts, transactions, purchases, settings, persistInvestments, persistPurchases, persistSettings, onDeleteRequest }) {
  const [modal, setModal] = useState(null);
  const [purchaseFor, setPurchaseFor] = useState(null); // investment
  const [expanded, setExpanded] = useState(null); // investment id showing purchase history
  const [editingTargets, setEditingTargets] = useState(false);
  const [targetDrafts, setTargetDrafts] = useState({});

  const accountById = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a])), [accounts]);

  const purchasesByInv = useMemo(() => {
    const map = {};
    purchases.forEach((p) => { (map[p.investmentId] ||= []).push(p); });
    return map;
  }, [purchases]);

  const purchasedByAccount = useMemo(() => {
    const map = {};
    investments.forEach((inv) => {
      const total = (purchasesByInv[inv.id] || []).reduce((a, p) => a + p.amount, 0);
      if (inv.accountId) map[inv.accountId] = (map[inv.accountId] || 0) + total;
    });
    return map;
  }, [investments, purchasesByInv]);

  const rows = useMemo(() => {
    return investments.map((inv) => {
      const invPurchases = (purchasesByInv[inv.id] || []).sort((a, b) => (a.date < b.date ? 1 : -1));
      const quotas = invPurchases.reduce((a, p) => a + p.quantity, 0);
      const totalInvested = invPurchases.reduce((a, p) => a + p.amount, 0);
      const pm = quotas > 0 ? totalInvested / quotas : 0;
      const acc = accountById[inv.accountId];
      const disponivel = acc ? acc.balance - (purchasedByAccount[inv.accountId] || 0) : 0;
      const rendimentos = transactions.filter((t) => t.type === "receita" && t.accountId === inv.accountId).reduce((a, t) => a + t.amount, 0);
      return { ...inv, quotas, totalInvested, pm, disponivel, rendimentos, purchases: invPurchases, accountBalance: acc?.balance || 0 };
    });
  }, [investments, purchasesByInv, purchasedByAccount, accountById, transactions]);

  const totalInvested = rows.reduce((a, r) => a + r.totalInvested, 0);
  const totalRendimentos = useMemo(() => {
    const uniqueAccIds = [...new Set(investments.map((i) => i.accountId).filter(Boolean))];
    return uniqueAccIds.reduce((a, id) => a + transactions.filter((t) => t.type === "receita" && t.accountId === id).reduce((s, t) => s + t.amount, 0), 0);
  }, [investments, transactions]);
  const totalDisponivel = useMemo(() => {
    const uniqueAccIds = [...new Set(investments.map((i) => i.accountId).filter(Boolean))];
    return uniqueAccIds.reduce((a, id) => {
      const acc = accountById[id];
      if (!acc) return a;
      return a + (acc.balance - (purchasedByAccount[id] || 0));
    }, 0);
  }, [investments, accountById, purchasedByAccount]);

  const ranking = useMemo(() => [...rows].filter((r) => r.totalInvested > 0).sort((a, b) => b.totalInvested - a.totalInvested), [rows]);

  const allocationByClass = useMemo(() => {
    const map = {};
    rows.forEach((r) => { map[r.type] = (map[r.type] || 0) + r.totalInvested; });
    return TYPES.map((t) => ({
      name: t, value: map[t] || 0,
      pct: totalInvested > 0 ? ((map[t] || 0) / totalInvested) * 100 : 0,
      target: settings?.assetClassTargets?.[t] || 0,
      color: TYPE_COLORS[t],
    })).filter((r) => r.value > 0 || r.target > 0);
  }, [rows, totalInvested, settings]);

  const pieData = allocationByClass.filter((a) => a.value > 0);

  return (
    <div>
      <Header
        title="Investimentos"
        subtitle="Onde seu dinheiro está aportado, cotas, preço médio e metas"
        right={
          <button
            onClick={() => setModal({})}
            className="flex items-center gap-1.5 rounded-md"
            style={{ fontFamily: fontBody, fontWeight: 600, fontSize: 14, padding: "9px 14px", background: COLORS.ink, color: COLORS.white }}
          >
            <Plus size={15} /> Nova posição
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        <div className="rounded-md p-5" style={{ background: COLORS.white, border: `1px solid ${COLORS.line}` }}>
          <span style={{ fontFamily: fontBody, fontSize: 12.5, color: COLORS.slate, fontWeight: 600 }}>Total investido (compras)</span>
          <div style={{ fontFamily: fontMono, fontSize: 22, fontWeight: 600, color: COLORS.ink, marginTop: 6 }}>{brl(totalInvested)}</div>
        </div>
        <div className="rounded-md p-5" style={{ background: COLORS.white, border: `1px solid ${COLORS.line}` }}>
          <span style={{ fontFamily: fontBody, fontSize: 12.5, color: COLORS.slate, fontWeight: 600 }}>Rendimentos recebidos</span>
          <div style={{ fontFamily: fontMono, fontSize: 22, fontWeight: 600, color: COLORS.green, marginTop: 6 }}>{brl(totalRendimentos)}</div>
        </div>
        <div className="rounded-md p-5" style={{ background: COLORS.white, border: `1px solid ${COLORS.line}` }}>
          <span style={{ fontFamily: fontBody, fontSize: 12.5, color: COLORS.slate, fontWeight: 600 }}>Disponível pra aportar</span>
          <div style={{ fontFamily: fontMono, fontSize: 22, fontWeight: 600, color: COLORS.gold, marginTop: 6 }}>{brl(totalDisponivel)}</div>
        </div>
      </div>

      {(pieData.length > 0 || Object.keys(settings?.assetClassTargets || {}).length > 0 || editingTargets) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
          <Panel title="Alocação por classe de ativo">
            {pieData.length === 0 ? (
              <EmptyHint text="Registre compras nos ativos para ver a alocação." />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                    {pieData.map((d, i) => <Cell key={i} fill={d.color} stroke={COLORS.white} strokeWidth={2} />)}
                  </Pie>
                  <Tooltip formatter={(v) => brl(v)} contentStyle={{ fontFamily: fontBody, fontSize: 13, borderRadius: 6, border: `1px solid ${COLORS.line}` }} />
                  <Legend wrapperStyle={{ fontFamily: fontBody, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Panel>

          <Panel
            title="Meta de alocação (%)"
            right={
              !editingTargets && (
                <button
                  onClick={() => { setTargetDrafts(Object.fromEntries(TYPES.map((t) => [t, (settings?.assetClassTargets?.[t] || 0).toString()]))); setEditingTargets(true); }}
                  style={{ fontFamily: fontBody, fontSize: 12.5, color: COLORS.slate, textDecoration: "underline" }}
                >
                  editar metas
                </button>
              )
            }
          >
            {editingTargets ? (
              <div>
                {TYPES.map((t) => (
                  <div key={t} className="flex items-center justify-between gap-3 mb-2">
                    <span style={{ fontFamily: fontBody, fontSize: 13, color: COLORS.ink }}>{t}</span>
                    <input
                      style={{ ...inputStyle, width: 80, textAlign: "right" }} type="number" min="0" max="100"
                      value={targetDrafts[t] || ""} onChange={(e) => setTargetDrafts({ ...targetDrafts, [t]: e.target.value })}
                    />
                  </div>
                ))}
                <div className="flex gap-2 justify-end mt-3">
                  <GhostBtn onClick={() => setEditingTargets(false)}>Cancelar</GhostBtn>
                  <PrimaryBtn
                    onClick={() => {
                      const next = Object.fromEntries(TYPES.map((t) => [t, parseFloat(targetDrafts[t]) || 0]));
                      persistSettings({ ...settings, assetClassTargets: next });
                      setEditingTargets(false);
                    }}
                  >
                    Salvar
                  </PrimaryBtn>
                </div>
              </div>
            ) : allocationByClass.length === 0 ? (
              <EmptyHint text="Defina metas de alocação por classe de ativo." />
            ) : (
              <div>
                {allocationByClass.map((a) => (
                  <div key={a.name} className="mb-3">
                    <div className="flex justify-between mb-1">
                      <span style={{ fontFamily: fontBody, fontSize: 13, color: COLORS.ink }}>{a.name}</span>
                      <span style={{ fontFamily: fontMono, fontSize: 12, color: COLORS.slate }}>
                        {a.pct.toFixed(0)}% {a.target > 0 ? `/ meta ${a.target}%` : ""}
                      </span>
                    </div>
                    <div style={{ height: 7, borderRadius: 4, background: COLORS.paperDim, overflow: "hidden", position: "relative" }}>
                      <div style={{ width: `${Math.min(100, a.pct)}%`, height: "100%", background: a.color }} />
                      {a.target > 0 && (
                        <div style={{ position: "absolute", left: `${Math.min(100, a.target)}%`, top: 0, bottom: 0, width: 2, background: COLORS.ink }} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      )}

      {ranking.length > 1 && (
        <div className="mt-6">
          <Panel title="Ranking — quem recebeu mais aporte">
            <div className="space-y-2">
              {ranking.map((r, i) => (
                <div key={r.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {i === 0 && <Award size={14} style={{ color: COLORS.gold }} />}
                    <span style={{ fontFamily: fontBody, fontSize: 13.5, color: COLORS.ink }}>{i + 1}. {r.name}</span>
                  </div>
                  <span style={{ fontFamily: fontMono, fontSize: 13.5, color: COLORS.slate }}>{brl(r.totalInvested)}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="mt-8">
          <EmptyHint text='Nenhuma posição cadastrada ainda. Crie uma posição, vincule a um banco (aba Bancos) e registre as compras pra acompanhar cotas e preço médio.' />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          {rows.map((inv) => {
            const pctMeta = inv.targetAmount > 0 ? Math.min(100, (inv.totalInvested / inv.targetAmount) * 100) : null;
            const acc = accountById[inv.accountId];
            const isOpen = expanded === inv.id;
            return (
              <div key={inv.id} className="rounded-md p-5" style={{ background: COLORS.white, border: `1px solid ${COLORS.line}` }}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span style={{ width: 11, height: 11, borderRadius: 11, background: inv.color, flexShrink: 0 }} />
                    <div className="min-w-0">
                      <div style={{ fontFamily: fontDisplay, fontSize: 17, fontWeight: 600, color: COLORS.ink }} className="truncate">{inv.name}</div>
                      <div style={{ fontFamily: fontBody, fontSize: 12, color: COLORS.slate }}>{inv.type}{acc ? ` · ${acc.name}` : ""}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <IconBtn onClick={() => setModal({ editing: inv })} title="Editar"><Pencil size={13} /></IconBtn>
                    <IconBtn onClick={() => onDeleteRequest(inv)} title="Excluir" color={COLORS.rust}><Trash2 size={13} /></IconBtn>
                  </div>
                </div>

                <div className="flex items-baseline justify-between mt-4">
                  <span style={{ fontFamily: fontMono, fontSize: 21, fontWeight: 600, color: COLORS.ink }}>{brl(inv.totalInvested)}</span>
                  {inv.targetAmount > 0 && (
                    <span style={{ fontFamily: fontMono, fontSize: 12.5, color: COLORS.slate }}>meta: {brl(inv.targetAmount)}</span>
                  )}
                </div>
                {pctMeta !== null && (
                  <div className="mt-2" style={{ height: 7, borderRadius: 4, background: COLORS.paperDim, overflow: "hidden" }}>
                    <div style={{ width: `${pctMeta}%`, height: "100%", background: COLORS.gold }} />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 mt-4">
                  <div className="rounded-md p-2.5" style={{ background: COLORS.paperDim }}>
                    <div style={{ fontFamily: fontBody, fontSize: 11, color: COLORS.slate }}>Cotas</div>
                    <div style={{ fontFamily: fontMono, fontSize: 15, fontWeight: 600, color: COLORS.ink }}>{inv.quotas || "—"}</div>
                  </div>
                  <div className="rounded-md p-2.5" style={{ background: COLORS.paperDim }}>
                    <div style={{ fontFamily: fontBody, fontSize: 11, color: COLORS.slate }}>PM (preço médio)</div>
                    <div style={{ fontFamily: fontMono, fontSize: 15, fontWeight: 600, color: COLORS.ink }}>{inv.pm > 0 ? brl(inv.pm) : "—"}</div>
                  </div>
                </div>

                <div className="mt-2 rounded-md p-2.5" style={{ background: COLORS.paperDim }}>
                  <div style={{ fontFamily: fontBody, fontSize: 11, color: COLORS.slate }}>Disponível na conta pra aportar</div>
                  <div style={{ fontFamily: fontMono, fontSize: 15, fontWeight: 600, color: inv.disponivel >= 0 ? COLORS.gold : COLORS.rust }}>{brl(inv.disponivel)}</div>
                </div>

                {inv.rendimentos > 0 && (
                  <div className="flex items-center gap-1.5 mt-3" style={{ fontFamily: fontBody, fontSize: 12.5, color: COLORS.green }}>
                    <TrendingUp size={13} /> {brl(inv.rendimentos)} em rendimentos recebidos
                  </div>
                )}

                {inv.nextStep && (
                  <div className="flex items-start gap-1.5 mt-3 rounded-md p-2.5" style={{ background: COLORS.paperDim }}>
                    <ArrowRight size={13} style={{ color: COLORS.slate, marginTop: 2, flexShrink: 0 }} />
                    <span style={{ fontFamily: fontBody, fontSize: 12.5, color: COLORS.ink }}>{inv.nextStep}</span>
                  </div>
                )}

                <button
                  onClick={() => setPurchaseFor(inv)}
                  className="mt-3 w-full rounded-md flex items-center justify-center gap-1.5"
                  style={{ fontFamily: fontBody, fontWeight: 600, fontSize: 13, padding: "8px", border: `1px solid ${COLORS.line}`, color: COLORS.ink }}
                >
                  <Plus size={14} /> Registrar compra
                </button>

                {inv.purchases.length > 0 && (
                  <button
                    onClick={() => setExpanded(isOpen ? null : inv.id)}
                    className="mt-2 w-full flex items-center justify-center gap-1"
                    style={{ fontFamily: fontBody, fontSize: 12, color: COLORS.slate }}
                  >
                    {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    {isOpen ? "Ocultar histórico" : `Ver histórico (${inv.purchases.length})`}
                  </button>
                )}

                {isOpen && (
                  <div className="mt-2 rounded-md overflow-hidden" style={{ border: `1px solid ${COLORS.line}` }}>
                    {inv.purchases.map((p, i) => (
                      <div key={p.id} className="flex items-center justify-between px-3 py-2" style={{ borderTop: i === 0 ? "none" : `1px dashed ${COLORS.line}` }}>
                        <div>
                          <div style={{ fontFamily: fontBody, fontSize: 12.5, color: COLORS.ink }}>
                            {p.quantity} un × {brl(p.unitPrice)}
                          </div>
                          <div style={{ fontFamily: fontBody, fontSize: 11, color: COLORS.slate }}>
                            {new Date(p.date + "T00:00:00").toLocaleDateString("pt-BR")}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span style={{ fontFamily: fontMono, fontSize: 12.5, color: COLORS.ink }}>{brl(p.amount)}</span>
                          <IconBtn
                            onClick={() => persistPurchases(purchases.filter((x) => x.id !== p.id))}
                            title="Excluir compra" color={COLORS.rust}
                          >
                            <Trash2 size={12} />
                          </IconBtn>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <InvestmentModal
          initial={modal.editing}
          accounts={accounts}
          onClose={() => setModal(null)}
          onSave={(inv) => {
            if (modal.editing) {
              persistInvestments(investments.map((x) => (x.id === inv.id ? inv : x)));
            } else {
              persistInvestments([...investments, { ...inv, id: uid() }]);
            }
            setModal(null);
          }}
        />
      )}

      {purchaseFor && (
        <PurchaseModal
          investment={purchaseFor}
          onClose={() => setPurchaseFor(null)}
          onSave={(p) => {
            persistPurchases([...purchases, { ...p, id: uid(), investmentId: purchaseFor.id }]);
            setPurchaseFor(null);
          }}
        />
      )}
    </div>
  );
}

function PurchaseModal({ investment, onClose, onSave }) {
  const [date, setDate] = useState(todayISO());
  const [quantity, setQuantity] = useState("");
  const [unitPrice, setUnitPrice] = useState("");

  const amount = (parseFloat(quantity) || 0) * (parseFloat(unitPrice) || 0);

  return (
    <Modal title={`Registrar compra — ${investment.name}`} onClose={onClose} width={400}>
      <Field label="Data">
        <input style={inputStyle} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Field label="Quantidade (cotas/unidades)">
        <input style={inputStyle} type="number" step="0.000001" min="0" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="Ex.: 10" />
      </Field>
      <Field label="Preço unitário">
        <input style={inputStyle} type="number" step="0.01" min="0" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} placeholder="0,00" />
      </Field>
      <div className="rounded-md p-3 mb-3" style={{ background: COLORS.paperDim }}>
        <span style={{ fontFamily: fontBody, fontSize: 12, color: COLORS.slate }}>Total da compra</span>
        <div style={{ fontFamily: fontMono, fontSize: 18, fontWeight: 600, color: COLORS.ink }}>{brl(amount)}</div>
      </div>
      <div className="flex gap-2 justify-end mt-5">
        <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
        <PrimaryBtn
          onClick={() => {
            if (!(parseFloat(quantity) > 0) || !(parseFloat(unitPrice) > 0) || !date) return;
            onSave({ date, quantity: parseFloat(quantity), unitPrice: parseFloat(unitPrice), amount });
          }}
        >
          Salvar
        </PrimaryBtn>
      </div>
    </Modal>
  );
}

function InvestmentModal({ initial, accounts, onClose, onSave }) {
  const [name, setName] = useState(initial?.name || "");
  const [type, setType] = useState(initial?.type || TYPES[0]);
  const [accountId, setAccountId] = useState(initial?.accountId || accounts?.[0]?.id || "");
  const [targetAmount, setTargetAmount] = useState(initial?.targetAmount?.toString() || "");
  const [nextStep, setNextStep] = useState(initial?.nextStep || "");
  const [color, setColor] = useState(initial?.color || ACCOUNT_PALETTE[0]);

  return (
    <Modal title={initial ? "Editar posição" : "Nova posição de investimento"} onClose={onClose}>
      <Field label="Nome">
        <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Tesouro Selic 2029" />
      </Field>

      <Field label="Classe do ativo">
        <select style={inputStyle} value={type} onChange={(e) => setType(e.target.value)}>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </Field>

      <Field
        label="Conta bancária vinculada"
        hint="O saldo dessa conta menos o total já comprado vira o 'disponível pra aportar'."
      >
        {accounts?.length > 0 ? (
          <select style={inputStyle} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        ) : (
          <span style={{ fontFamily: fontBody, fontSize: 12.5, color: COLORS.rust }}>
            Você ainda não tem nenhuma conta cadastrada. Crie uma na aba Bancos primeiro.
          </span>
        )}
      </Field>

      <Field label="Meta de aporte total (opcional)">
        <input style={inputStyle} type="number" step="0.01" min="0" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} placeholder="0,00" />
      </Field>

      <Field label="Próximo passo (opcional)">
        <textarea
          style={{ ...inputStyle, minHeight: 60, resize: "vertical" }}
          value={nextStep}
          onChange={(e) => setNextStep(e.target.value)}
          placeholder="Ex.: Aportar mais R$500 até dezembro"
        />
      </Field>

      <Field label="Cor">
        <div className="flex flex-wrap gap-2">
          {ACCOUNT_PALETTE.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{
                width: 26, height: 26, borderRadius: 26, background: c,
                border: color === c ? `2px solid ${COLORS.ink}` : "2px solid transparent",
                boxShadow: color === c ? `0 0 0 2px ${COLORS.white} inset` : "none",
              }}
            />
          ))}
        </div>
      </Field>

      <div className="flex gap-2 justify-end mt-5">
        <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
        <PrimaryBtn
          onClick={() => {
            if (!name.trim() || !accountId) return;
            onSave({
              id: initial?.id, name: name.trim(), type, accountId, color,
              targetAmount: parseFloat(targetAmount) || 0, nextStep: nextStep.trim(),
            });
          }}
        >
          Salvar
        </PrimaryBtn>
      </div>
    </Modal>
  );
}
