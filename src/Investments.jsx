import React, { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, TrendingUp, Target, ArrowRight } from "lucide-react";
import {
  COLORS, fontDisplay, fontBody, fontMono, ACCOUNT_PALETTE,
  uid, brl, inputStyle,
  Modal, Field, PrimaryBtn, GhostBtn, IconBtn, Panel, EmptyHint, Header,
} from "./shared.jsx";

const TYPES = ["Renda Fixa", "Renda Variável", "Fundos", "Cripto", "Previdência", "Outro"];

export default function Investments({ investments, accounts, transactions, persistInvestments, onDeleteRequest }) {
  const [modal, setModal] = useState(null); // null | { editing? }

  const accountById = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a])), [accounts]);

  const rows = useMemo(() => {
    return investments.map((inv) => {
      const aportes = transactions
        .filter((t) => t.type === "transferencia" && t.toAccountId === inv.accountId)
        .reduce((a, t) => a + t.amount, 0);
      const retiradas = transactions
        .filter((t) => t.type === "transferencia" && t.fromAccountId === inv.accountId)
        .reduce((a, t) => a + t.amount, 0);
      const rendimentos = transactions
        .filter((t) => t.type === "receita" && t.accountId === inv.accountId)
        .reduce((a, t) => a + t.amount, 0);
      return { ...inv, aportado: aportes - retiradas, rendimentos };
    });
  }, [investments, transactions]);

  const totalAportado = rows.reduce((a, r) => a + r.aportado, 0);
  const totalRendimentos = rows.reduce((a, r) => a + r.rendimentos, 0);

  return (
    <div>
      <Header
        title="Investimentos"
        subtitle="Onde seu dinheiro está aportado, metas e próximos passos"
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        <div className="rounded-md p-5" style={{ background: COLORS.white, border: `1px solid ${COLORS.line}` }}>
          <span style={{ fontFamily: fontBody, fontSize: 12.5, color: COLORS.slate, fontWeight: 600 }}>Total aportado</span>
          <div style={{ fontFamily: fontMono, fontSize: 24, fontWeight: 600, color: COLORS.ink, marginTop: 6 }}>{brl(totalAportado)}</div>
        </div>
        <div className="rounded-md p-5" style={{ background: COLORS.white, border: `1px solid ${COLORS.line}` }}>
          <span style={{ fontFamily: fontBody, fontSize: 12.5, color: COLORS.slate, fontWeight: 600 }}>Rendimentos / dividendos recebidos</span>
          <div style={{ fontFamily: fontMono, fontSize: 24, fontWeight: 600, color: COLORS.green, marginTop: 6 }}>{brl(totalRendimentos)}</div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="mt-8">
          <EmptyHint text='Nenhuma posição cadastrada ainda. Crie uma posição, vincule a um banco (aba Bancos) e depois registre aportes lançando uma "Transferência" para essa conta em Lançamentos.' />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          {rows.map((inv) => {
            const pct = inv.targetAmount > 0 ? Math.min(100, (inv.aportado / inv.targetAmount) * 100) : null;
            const acc = accountById[inv.accountId];
            return (
              <div key={inv.id} className="rounded-md p-5" style={{ background: COLORS.white, border: `1px solid ${COLORS.line}` }}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span style={{ width: 11, height: 11, borderRadius: 11, background: inv.color, flexShrink: 0 }} />
                    <div className="min-w-0">
                      <div style={{ fontFamily: fontDisplay, fontSize: 17, fontWeight: 600, color: COLORS.ink }} className="truncate">{inv.name}</div>
                      <div style={{ fontFamily: fontBody, fontSize: 12, color: COLORS.slate }}>{inv.type}{acc ? ` · conta: ${acc.name}` : ""}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <IconBtn onClick={() => setModal({ editing: inv })} title="Editar"><Pencil size={13} /></IconBtn>
                    <IconBtn onClick={() => onDeleteRequest(inv)} title="Excluir" color={COLORS.rust}><Trash2 size={13} /></IconBtn>
                  </div>
                </div>

                <div className="flex items-baseline justify-between mt-4">
                  <span style={{ fontFamily: fontMono, fontSize: 21, fontWeight: 600, color: COLORS.ink }}>{brl(inv.aportado)}</span>
                  {inv.targetAmount > 0 && (
                    <span style={{ fontFamily: fontMono, fontSize: 12.5, color: COLORS.slate }}>meta: {brl(inv.targetAmount)}</span>
                  )}
                </div>

                {pct !== null && (
                  <div className="mt-2" style={{ height: 7, borderRadius: 4, background: COLORS.paperDim, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: COLORS.gold }} />
                  </div>
                )}

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
    </div>
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

      <Field label="Tipo">
        <select style={inputStyle} value={type} onChange={(e) => setType(e.target.value)}>
          {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </Field>

      <Field
        label="Conta bancária vinculada"
        hint="Aportes = transferências para essa conta. Rendimentos = receitas lançadas nessa conta. Crie a conta antes, na aba Bancos."
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
        <input style={inputStyle} type="number" step="0.01" min="0" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)}
