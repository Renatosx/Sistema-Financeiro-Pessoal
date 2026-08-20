import React, { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Check, AlertTriangle } from "lucide-react";
import {
  COLORS, fontDisplay, fontBody, fontMono,
  uid, brl, inputStyle,
  Modal, Field, PrimaryBtn, GhostBtn, IconBtn, Panel, EmptyHint, Header,
} from "./shared.jsx";

const KINDS = ["Compra parcelada", "Empréstimo", "Financiamento", "Cartão de crédito", "Outro"];

export default function Installments({ installments, accounts, settings, persistInstallments, persistSettings, onPay, onDeleteRequest }) {
  const [modal, setModal] = useState(null);
  const [editingLimit, setEditingLimit] = useState(false);
  const [limitDraft, setLimitDraft] = useState(settings?.monthlyCommitLimit?.toString() || "");

  const accountById = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a])), [accounts]);

  const rows = useMemo(() => {
    return installments.map((i) => {
      const remaining = Math.max(0, i.installmentsTotal - i.installmentsPaid);
      const remainingAmount = remaining * i.installmentAmount;
      const totalToPay = i.installmentsTotal * i.installmentAmount;
      const interestPaid = i.totalAmount > 0 ? Math.max(0, totalToPay - i.totalAmount) : 0;
      return { ...i, remaining, remainingAmount, totalToPay, interestPaid, done: remaining === 0 };
    });
  }, [installments]);

  const active = rows.filter((r) => !r.done);
  const done = rows.filter((r) => r.done);
  const committed = active.reduce((a, r) => a + r.installmentAmount, 0);
  const limit = settings?.monthlyCommitLimit || 0;
  const available = limit > 0 ? Math.max(0, limit - committed) : null;
  const overCommitted = limit > 0 && committed > limit;

  return (
    <div>
      <Header
        title="Parcelamentos"
        subtitle="Compras parceladas, financiamentos e empréstimos em andamento"
        right={
          <button
            onClick={() => setModal({})}
            className="flex items-center gap-1.5 rounded-md"
            style={{ fontFamily: fontBody, fontWeight: 600, fontSize: 14, padding: "9px 14px", background: COLORS.ink, color: COLORS.white }}
          >
            <Plus size={15} /> Novo parcelamento
          </button>
        }
      />

      <div className="mt-6">
        <Panel
          title="Comprometimento mensal"
          right={
            !editingLimit && (
              <button onClick={() => { setLimitDraft(limit.toString()); setEditingLimit(true); }} style={{ fontFamily: fontBody, fontSize: 12.5, color: COLORS.slate, textDecoration: "underline" }}>
                {limit > 0 ? "editar limite" : "definir limite"}
              </button>
            )
          }
        >
          {editingLimit ? (
            <div className="flex items-center gap-2">
              <input
                style={{ ...inputStyle, maxWidth: 180 }} type="number" step="0.01" min="0"
                value={limitDraft} onChange={(e) => setLimitDraft(e.target.value)}
                placeholder="Limite mensal, ex.: 1500"
              />
              <PrimaryBtn onClick={() => { persistSettings({ ...settings, monthlyCommitLimit: parseFloat(limitDraft) || 0 }); setEditingLimit(false); }}>Salvar</PrimaryBtn>
              <GhostBtn onClick={() => setEditingLimit(false)}>Cancelar</GhostBtn>
            </div>
          ) : (
            <>
              <div className="flex items-baseline justify-between">
                <span style={{ fontFamily: fontMono, fontSize: 22, fontWeight: 600, color: overCommitted ? COLORS.rust : COLORS.ink }}>
                  {brl(committed)} <span style={{ fontSize: 13, color: COLORS.slate, fontWeight: 400 }}>comprometidos / mês</span>
                </span>
                {limit > 0 && (
                  <span style={{ fontFamily: fontMono, fontSize: 13, color: COLORS.slate }}>limite: {brl(limit)}</span>
                )}
              </div>
              {limit > 0 && (
                <div className="mt-2" style={{ height: 8, borderRadius: 5, background: COLORS.paperDim, overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(100, (committed / limit) * 100)}%`, height: "100%", background: overCommitted ? COLORS.rust : COLORS.green }} />
                </div>
              )}
              {limit > 0 && (
                <div className="mt-2" style={{ fontFamily: fontBody, fontSize: 12.5, color: overCommitted ? COLORS.rust : COLORS.slate }}>
                  {overCommitted ? (
                    <span className="flex items-center gap-1"><AlertTriangle size={13} /> Você passou do limite que definiu.</span>
                  ) : (
                    <>Ainda cabe <strong style={{ color: COLORS.ink }}>{brl(available)}</strong> por mês em novos parcelamentos.</>
                  )}
                </div>
              )}
              {limit === 0 && (
                <div className="mt-2" style={{ fontFamily: fontBody, fontSize: 12.5, color: COLORS.slate }}>
                  Defina um limite mensal para saber quanto ainda pode comprometer.
                </div>
              )}
            </>
          )}
        </Panel>
      </div>

      <div className="mt-8">
        <h3 style={{ fontFamily: fontDisplay, fontSize: 17, fontWeight: 600, color: COLORS.ink, marginBottom: 10 }}>Em andamento</h3>
        {active.length === 0 ? (
          <EmptyHint text="Nenhum parcelamento ativo." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {active.map((i) => (
              <InstallmentCard key={i.id} inst={i} account={accountById[i.accountId]} onEdit={() => setModal({ editing: i })} onDelete={() => onDeleteRequest(i)} onPay={() => onPay(i)} />
            ))}
          </div>
        )}
      </div>

      {done.length > 0 && (
        <div className="mt-8">
          <h3 style={{ fontFamily: fontDisplay, fontSize: 17, fontWeight: 600, color: COLORS.ink, marginBottom: 10 }}>Quitados</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {done.map((i) => (
              <InstallmentCard key={i.id} inst={i} account={accountById[i.accountId]} onEdit={() => setModal({ editing: i })} onDelete={() => onDeleteRequest(i)} />
            ))}
          </div>
        </div>
      )}

      {modal && (
        <InstallmentModal
          initial={modal.editing}
          accounts={accounts}
          onClose={() => setModal(null)}
          onSave={(inst) => {
            if (modal.editing) {
              persistInstallments(installments.map((x) => (x.id === inst.id ? inst : x)));
            } else {
              persistInstallments([...installments, { ...inst, id: uid() }]);
            }
            setModal(null);
          }}
        />
      )}
    </div>
  );
}

function InstallmentCard({ inst, account, onEdit, onDelete, onPay }) {
  const pct = inst.installmentsTotal > 0 ? (inst.installmentsPaid / inst.installmentsTotal) * 100 : 0;
  return (
    <div className="rounded-md p-5" style={{ background: COLORS.white, border: `1px solid ${COLORS.line}`, opacity: inst.done ? 0.7 : 1 }}>
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div style={{ fontFamily: fontDisplay, fontSize: 16.5, fontWeight: 600, color: COLORS.ink }} className="truncate">{inst.description}</div>
          <div style={{ fontFamily: fontBody, fontSize: 12, color: COLORS.slate }}>{inst.kind}{account ? ` · ${account.name}` : ""}</div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <IconBtn onClick={onEdit} title="Editar"><Pencil size={13} /></IconBtn>
          <IconBtn onClick={onDelete} title="Excluir" color={COLORS.rust}><Trash2 size={13} /></IconBtn>
        </div>
      </div>

      <div className="flex items-baseline justify-between mt-4">
        <span style={{ fontFamily: fontMono, fontSize: 20, fontWeight: 600, color: COLORS.ink }}>{brl(inst.installmentAmount)}<span style={{ fontSize: 12, color: COLORS.slate, fontWeight: 400 }}>/parcela</span></span>
        <span style={{ fontFamily: fontMono, fontSize: 12.5, color: COLORS.slate }}>{inst.installmentsPaid}/{inst.installmentsTotal} pagas</span>
      </div>

      <div className="mt-2" style={{ height: 7, borderRadius: 4, background: COLORS.paperDim, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: inst.done ? COLORS.slate : COLORS.gold }} />
      </div>

      <div className="flex justify-between mt-3" style={{ fontFamily: fontBody, fontSize: 12, color: COLORS.slate }}>
        <span>Falta pagar: <strong style={{ color: COLORS.ink }}>{brl(inst.remainingAmount)}</strong></span>
        {inst.interestRate > 0 && <span>Juros: {inst.interestRate}% a.m.</span>}
      </div>
      {inst.interestPaid > 0 && (
        <div style={{ fontFamily: fontBody, fontSize: 12, color: COLORS.rust, marginTop: 2 }}>
          Custo estimado em juros: {brl(inst.interestPaid)}
        </div>
      )}

      {!inst.done ? (
        <button
          onClick={onPay}
          className="mt-3 w-full rounded-md flex items-center justify-center gap-1.5"
          style={{ fontFamily: fontBody, fontWeight: 600, fontSize: 13, padding: "8px", border: `1px solid ${COLORS.line}`, color: COLORS.ink }}
        >
          <Check size={14} /> Registrar pagamento da parcela
        </button>
      ) : (
        <div className="mt-3 flex items-center gap-1.5" style={{ color: COLORS.green, fontFamily: fontBody, fontSize: 13, fontWeight: 600 }}>
          <Check size={15} /> Quitado
        </div>
      )}
    </div>
  );
}

function InstallmentModal({ initial, accounts, onClose, onSave }) {
  const [description, setDescription] = useState(initial?.description || "");
  const [kind, setKind] = useState(initial?.kind || KINDS[0]);
  const [totalAmount, setTotalAmount] = useState(initial?.totalAmount?.toString() || "");
  const [installmentsTotal, setInstallmentsTotal] = useState(initial?.installmentsTotal?.toString() || "");
  const [installmentAmount, setInstallmentAmount] = useState(initial?.installmentAmount?.toString() || "");
  const [installmentsPaid, setInstallmentsPaid] = useState(initial?.installmentsPaid?.toString() || "0");
  const [interestRate, setInterestRate] = useState(initial?.interestRate?.toString() || "");
  const [accountId, setAccountId] = useState(initial?.accountId || accounts?.[0]?.id || "");

  return (
    <Modal title={initial ? "Editar parcelamento" : "Novo parcelamento"} onClose={onClose}>
      <Field label="Descrição">
        <input style={inputStyle} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Notebook Dell, Empréstimo pessoal…" />
      </Field>

      <Field label="Tipo">
        <select style={inputStyle} value={kind} onChange={(e) => setKind(e.target.value)}>
          {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor total financiado">
          <input style={inputStyle} type="number" step="0.01" min="0" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} placeholder="0,00" />
        </Field>
        <Field label="Valor da parcela">
          <input style={inputStyle} type="number" step="0.01" min="0" value={installmentAmount} onChange={(e) => setInstallmentAmount(e.target.value)} placeholder="0,00" />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Total de parcelas">
          <input style={inputStyle} type="number" min="1" value={installmentsTotal} onChange={(e) => setInstallmentsTotal(e.target.value)} placeholder="12" />
        </Field>
        <Field label="Parcelas já pagas">
          <input style={inputStyle} type="number" min="0" value={installmentsPaid} onChange={(e) => setInstallmentsPaid(e.target.value)} placeholder="0" />
        </Field>
      </div>

      <Field label="Juros ao mês, % (opcional)">
        <input style={inputStyle} type="number" step="0.01" min="0" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} placeholder="Ex.: 2.5" />
      </Field>

      {accounts?.length > 0 && (
        <Field label="Conta de pagamento (opcional)">
          <select style={inputStyle} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Field>
      )}

      <div className="flex gap-2 justify-end mt-5">
        <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
        <PrimaryBtn
          onClick={() => {
            if (!description.trim() || !(parseFloat(installmentAmount) > 0) || !(parseInt(installmentsTotal) > 0)) return;
            onSave({
              id: initial?.id, description: description.trim(), kind,
              totalAmount: parseFloat(totalAmount) || 0,
              installmentAmount: parseFloat(installmentAmount),
              installmentsTotal: parseInt(installmentsTotal),
              installmentsPaid: Math.min(parseInt(installmentsPaid) || 0, parseInt(installmentsTotal)),
              interestRate: parseFloat(interestRate) || 0,
              accountId: accountId || null,
            });
          }}
        >
          Salvar
        </PrimaryBtn>
      </div>
    </Modal>
  );
}
