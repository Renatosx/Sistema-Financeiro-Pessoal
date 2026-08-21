import React, { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Zap, Repeat, TrendingUp, TrendingDown } from "lucide-react";
import {
  COLORS, fontDisplay, fontBody, fontMono,
  uid, brl, inputStyle, todayISO,
  Modal, Field, PrimaryBtn, GhostBtn, IconBtn, EmptyHint, Header,
} from "./shared.jsx";

export default function Provisions({ provisions, categories, accounts, persistProvisions, onLaunch, onDeleteRequest }) {
  const [modal, setModal] = useState(null);

  const categoryById = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);
  const accountById = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a])), [accounts]);

  const pending = useMemo(
    () => provisions.filter((p) => p.status !== "concluido").sort((a, b) => (a.expectedDate < b.expectedDate ? -1 : 1)),
    [provisions]
  );
  const done = useMemo(() => provisions.filter((p) => p.status === "concluido"), [provisions]);

  const totalReceber = pending.filter((p) => p.type === "receber").reduce((a, p) => a + p.amount, 0);
  const totalPagar = pending.filter((p) => p.type === "pagar").reduce((a, p) => a + p.amount, 0);

  const today = todayISO();

  return (
    <div>
      <Header
        title="Provisões"
        subtitle="Contas a receber e a pagar no futuro, inclusive fixas e recorrentes"
        right={
          <button
            onClick={() => setModal({})}
            className="flex items-center gap-1.5 rounded-md"
            style={{ fontFamily: fontBody, fontWeight: 600, fontSize: 14, padding: "9px 14px", background: COLORS.ink, color: COLORS.white }}
          >
            <Plus size={15} /> Nova provisão
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        <div className="rounded-md p-5" style={{ background: COLORS.white, border: `1px solid ${COLORS.line}` }}>
          <div className="flex items-center gap-2">
            <TrendingUp size={15} style={{ color: COLORS.green }} />
            <span style={{ fontFamily: fontBody, fontSize: 12.5, color: COLORS.slate, fontWeight: 600 }}>A receber</span>
          </div>
          <div style={{ fontFamily: fontMono, fontSize: 24, fontWeight: 600, color: COLORS.green, marginTop: 6 }}>{brl(totalReceber)}</div>
        </div>
        <div className="rounded-md p-5" style={{ background: COLORS.white, border: `1px solid ${COLORS.line}` }}>
          <div className="flex items-center gap-2">
            <TrendingDown size={15} style={{ color: COLORS.rust }} />
            <span style={{ fontFamily: fontBody, fontSize: 12.5, color: COLORS.slate, fontWeight: 600 }}>A pagar</span>
          </div>
          <div style={{ fontFamily: fontMono, fontSize: 24, fontWeight: 600, color: COLORS.rust, marginTop: 6 }}>{brl(totalPagar)}</div>
        </div>
      </div>

      <div className="mt-8">
        <h3 style={{ fontFamily: fontDisplay, fontSize: 17, fontWeight: 600, color: COLORS.ink, marginBottom: 10 }}>Pendentes</h3>
        {pending.length === 0 ? (
          <EmptyHint text="Nenhuma provisão pendente." />
        ) : (
          <div className="rounded-md overflow-hidden" style={{ border: `1px solid ${COLORS.line}`, background: COLORS.white }}>
            {pending.map((p, i) => {
              const overdue = p.expectedDate < today;
              const cat = categoryById[p.categoryId];
              const acc = accountById[p.accountId];
              return (
                <div key={p.id} className="flex items-center justify-between px-4 md:px-5 py-3 gap-3" style={{ borderTop: i === 0 ? "none" : `1px dashed ${COLORS.line}` }}>
                  <div className="flex items-center gap-3 min-w-0">
                    {p.recurring && <Repeat size={14} style={{ color: COLORS.slate, flexShrink: 0 }} />}
                    {p.recurring && p.autoLaunch && <Zap size={13} style={{ color: COLORS.gold, flexShrink: 0 }} />}
                    <div className="min-w-0">
                      <div style={{ fontFamily: fontBody, fontSize: 14, fontWeight: 600, color: COLORS.ink }} className="truncate">{p.description}</div>
                      <div style={{ fontFamily: fontBody, fontSize: 12, color: overdue ? COLORS.rust : COLORS.slate }}>
                        {overdue ? "Venceu em " : "Previsto para "}
                        {new Date(p.expectedDate + "T00:00:00").toLocaleDateString("pt-BR")}
                        {cat ? ` · ${cat.name}` : ""}{acc ? ` · ${acc.name}` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span style={{ fontFamily: fontMono, fontSize: 15, fontWeight: 600, color: p.type === "receber" ? COLORS.green : COLORS.rust }}>
                      {p.type === "receber" ? "+" : "−"} {brl(p.amount)}
                    </span>
                    <button
                      onClick={() => onLaunch(p)}
                      title="Lançar agora"
                      className="flex items-center gap-1 rounded-md px-2.5 py-1.5"
                      style={{ fontFamily: fontBody, fontSize: 12.5, fontWeight: 600, border: `1px solid ${COLORS.line}`, color: COLORS.ink }}
                    >
                      <Zap size={13} /> Lançar
                    </button>
                    <IconBtn onClick={() => setModal({ editing: p })} title="Editar"><Pencil size={13} /></IconBtn>
                    <IconBtn onClick={() => onDeleteRequest(p)} title="Excluir" color={COLORS.rust}><Trash2 size={13} /></IconBtn>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {done.length > 0 && (
        <div className="mt-8">
          <h3 style={{ fontFamily: fontDisplay, fontSize: 17, fontWeight: 600, color: COLORS.ink, marginBottom: 10 }}>Concluídas</h3>
          <div className="rounded-md overflow-hidden" style={{ border: `1px solid ${COLORS.line}`, background: COLORS.white, opacity: 0.7 }}>
            {done.map((p, i) => (
              <div key={p.id} className="flex items-center justify-between px-4 md:px-5 py-3 gap-3" style={{ borderTop: i === 0 ? "none" : `1px dashed ${COLORS.line}` }}>
                <span style={{ fontFamily: fontBody, fontSize: 13.5, color: COLORS.ink }}>{p.description}</span>
                <div className="flex items-center gap-2">
                  <span style={{ fontFamily: fontMono, fontSize: 13.5, color: COLORS.slate }}>{brl(p.amount)}</span>
                  <IconBtn onClick={() => onDeleteRequest(p)} title="Excluir" color={COLORS.rust}><Trash2 size={13} /></IconBtn>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {modal && (
        <ProvisionModal
          initial={modal.editing}
          categories={categories}
          accounts={accounts}
          onClose={() => setModal(null)}
          onSave={(p) => {
            if (modal.editing) {
              persistProvisions(provisions.map((x) => (x.id === p.id ? p : x)));
            } else {
              persistProvisions([...provisions, { ...p, id: uid(), status: "pendente" }]);
            }
            setModal(null);
          }}
        />
      )}
    </div>
  );
}

function ProvisionModal({ initial, categories, accounts, onClose, onSave }) {
  const [description, setDescription] = useState(initial?.description || "");
  const [type, setType] = useState(initial?.type || "receber");
  const [amount, setAmount] = useState(initial?.amount?.toString() || "");
  const [expectedDate, setExpectedDate] = useState(initial?.expectedDate || todayISO());
  const [recurring, setRecurring] = useState(initial?.recurring || false);
  const [autoLaunch, setAutoLaunch] = useState(initial?.autoLaunch || false);
  const [categoryId, setCategoryId] = useState(initial?.categoryId || "");
  const [accountId, setAccountId] = useState(initial?.accountId || accounts?.[0]?.id || "");

  const filteredCats = categories.filter((c) => c.type === (type === "receber" ? "receita" : "despesa"));

  return (
    <Modal title={initial ? "Editar provisão" : "Nova provisão"} onClose={onClose}>
      <div className="flex gap-2 mb-4">
        {[{ v: "receber", l: "A receber" }, { v: "pagar", l: "A pagar" }].map((t) => (
          <button
            key={t.v}
            onClick={() => { setType(t.v); setCategoryId(""); }}
            className="flex-1 rounded-md py-2"
            style={{
              fontFamily: fontBody, fontWeight: 600, fontSize: 13.5,
              background: type === t.v ? (t.v === "receber" ? COLORS.green : COLORS.rust) : COLORS.paperDim,
              color: type === t.v ? COLORS.white : COLORS.slate,
            }}
          >
            {t.l}
          </button>
        ))}
      </div>

      <Field label="Descrição">
        <input style={inputStyle} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Serviço prestado — Cliente X" />
      </Field>

      <Field label="Valor">
        <input style={inputStyle} type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
      </Field>

      <Field label={recurring ? "Próximo vencimento" : "Data prevista"}>
        <input style={inputStyle} type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
      </Field>

      {filteredCats.length > 0 && (
        <Field label="Categoria (opcional)">
          <select style={inputStyle} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Nenhuma</option>
            {filteredCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
      )}

      {accounts?.length > 0 && (
        <Field label="Conta (opcional)">
          <select style={inputStyle} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Field>
      )}

      <label className="flex items-center gap-2 mt-1 mb-2 cursor-pointer">
        <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
        <span style={{ fontFamily: fontBody, fontSize: 13, color: COLORS.ink }}>
          É fixa/recorrente (repete todo mês automaticamente após lançar)
        </span>
      </label>

      {recurring && (
        <label className="flex items-center gap-2 mt-1 mb-2 cursor-pointer">
          <input type="checkbox" checked={autoLaunch} onChange={(e) => setAutoLaunch(e.target.checked)} />
          <span style={{ fontFamily: fontBody, fontSize: 13, color: COLORS.ink }}>
            Lançar automaticamente quando vencer (sem precisar clicar)
          </span>
        </label>
      )}

      <div className="flex gap-2 justify-end mt-5">
        <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
        <PrimaryBtn
          onClick={() => {
            if (!description.trim() || !(parseFloat(amount) > 0) || !expectedDate) return;
            onSave({
              id: initial?.id, description: description.trim(), type,
              amount: parseFloat(amount), expectedDate, recurring,
              autoLaunch: recurring ? autoLaunch : false,
              categoryId: categoryId || null, accountId: accountId || null,
              status: initial?.status || "pendente",
            });
          }}
        >
          Salvar
        </PrimaryBtn>
      </div>
    </Modal>
  );
}
