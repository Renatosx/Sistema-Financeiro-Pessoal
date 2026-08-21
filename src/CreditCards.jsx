import React, { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Zap, CreditCard as CardIcon, CalendarClock, Upload } from "lucide-react";
import {
  COLORS, ACCOUNT_PALETTE, fontDisplay, fontBody, fontMono,
  uid, brl, inputStyle, todayISO,
  Modal, Field, PrimaryBtn, GhostBtn, IconBtn, Panel, EmptyHint, Header,
  parseCSV, parseOFX, parseDateFlexible, parseAmountFlexible,
} from "./shared.jsx";

function suggestInvoiceDate(card) {
  const d = new Date();
  d.setDate(card.dueDay || 10);
  if (d < new Date()) d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

export default function CreditCards({ cards, invoices, accounts, persistCards, persistInvoices, onPay, onDeleteRequest }) {
  const [cardModal, setCardModal] = useState(null);
  const [invoiceModal, setInvoiceModal] = useState(null); // card the invoice is being registered for
  const [importInvoiceCard, setImportInvoiceCard] = useState(null);
  const [confirmPay, setConfirmPay] = useState(null); // invoice being paid

  const accountById = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a])), [accounts]);
  const today = todayISO();

  const invoicesByCard = useMemo(() => {
    const map = {};
    invoices.forEach((inv) => { (map[inv.cardId] ||= []).push(inv); });
    return map;
  }, [invoices]);

  const pendingInvoices = invoices.filter((inv) => inv.status !== "pago");
  const totalAberto = pendingInvoices.reduce((a, inv) => a + inv.amount, 0);
  const proximoVencimento = pendingInvoices.length > 0
    ? pendingInvoices.reduce((min, inv) => (inv.dueDate < min ? inv.dueDate : min), pendingInvoices[0].dueDate)
    : null;

  const paidInvoices = useMemo(
    () => invoices.filter((inv) => inv.status === "pago").sort((a, b) => (a.dueDate < b.dueDate ? 1 : -1)).slice(0, 8),
    [invoices]
  );
  const cardById = useMemo(() => Object.fromEntries(cards.map((c) => [c.id, c])), [cards]);

  return (
    <div>
      <Header
        title="Cartões de crédito"
        subtitle="Faturas, vencimentos e pagamento dos seus cartões"
        right={
          <button
            onClick={() => setCardModal({})}
            className="flex items-center gap-1.5 rounded-md"
            style={{ fontFamily: fontBody, fontWeight: 600, fontSize: 14, padding: "9px 14px", background: COLORS.ink, color: COLORS.white }}
          >
            <Plus size={15} /> Novo cartão
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        <div className="rounded-md p-5" style={{ background: COLORS.white, border: `1px solid ${COLORS.line}` }}>
          <span style={{ fontFamily: fontBody, fontSize: 12.5, color: COLORS.slate, fontWeight: 600 }}>Total em faturas abertas</span>
          <div style={{ fontFamily: fontMono, fontSize: 22, fontWeight: 600, color: COLORS.rust, marginTop: 6 }}>{brl(totalAberto)}</div>
        </div>
        <div className="rounded-md p-5" style={{ background: COLORS.white, border: `1px solid ${COLORS.line}` }}>
          <span style={{ fontFamily: fontBody, fontSize: 12.5, color: COLORS.slate, fontWeight: 600 }}>Próximo vencimento</span>
          <div style={{ fontFamily: fontMono, fontSize: 22, fontWeight: 600, color: COLORS.ink, marginTop: 6 }}>
            {proximoVencimento ? new Date(proximoVencimento + "T00:00:00").toLocaleDateString("pt-BR") : "—"}
          </div>
        </div>
      </div>

      {cards.length === 0 ? (
        <div className="mt-8">
          <EmptyHint text="Nenhum cartão cadastrado ainda. Crie um cartão e registre a fatura pra acompanhar o vencimento." />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          {cards.map((card) => {
            const cardInvoices = (invoicesByCard[card.id] || []).sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
            const openInvoice = cardInvoices.find((inv) => inv.status !== "pago");
            const overdue = openInvoice && openInvoice.dueDate < today;
            const acc = accountById[card.accountId];
            return (
              <div key={card.id} className="rounded-md p-5" style={{ background: COLORS.white, border: `1px solid ${COLORS.line}` }}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="flex items-center justify-center rounded-md"
                      style={{ width: 32, height: 32, background: `${card.color}1A`, color: card.color, flexShrink: 0 }}
                    >
                      <CardIcon size={16} />
                    </span>
                    <div className="min-w-0">
                      <div style={{ fontFamily: fontDisplay, fontSize: 16, fontWeight: 600, color: COLORS.ink }} className="truncate">{card.name}</div>
                      <div style={{ fontFamily: fontBody, fontSize: 12, color: COLORS.slate }}>
                        {card.limit > 0 ? `Limite ${brl(card.limit)}` : "sem limite definido"}{acc ? ` · ${acc.name}` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <IconBtn onClick={() => setCardModal({ editing: card })} title="Editar"><Pencil size={13} /></IconBtn>
                    <IconBtn onClick={() => onDeleteRequest(card)} title="Excluir" color={COLORS.rust}><Trash2 size={13} /></IconBtn>
                  </div>
                </div>

                {openInvoice ? (
                  <>
                    <div className="flex items-baseline justify-between mt-4">
                      <span style={{ fontFamily: fontMono, fontSize: 21, fontWeight: 600, color: COLORS.ink }}>{brl(openInvoice.amount)}</span>
                      <span
                        className="flex items-center gap-1"
                        style={{ fontFamily: fontBody, fontSize: 12.5, color: overdue ? COLORS.rust : COLORS.slate, fontWeight: overdue ? 600 : 400 }}
                      >
                        <CalendarClock size={13} />
                        {overdue ? "venceu em " : "vence em "}
                        {new Date(openInvoice.dueDate + "T00:00:00").toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    <button
                      onClick={() => setConfirmPay(openInvoice)}
                      className="mt-4 w-full rounded-md flex items-center justify-center gap-1.5"
                      style={{ fontFamily: fontBody, fontWeight: 600, fontSize: 13, padding: "9px", background: COLORS.ink, color: COLORS.white }}
                    >
                      <Zap size={14} /> Pagar fatura
                    </button>
                  </>
                ) : (
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => setInvoiceModal(card)}
                      className="flex-1 rounded-md flex items-center justify-center gap-1.5"
                      style={{ fontFamily: fontBody, fontWeight: 600, fontSize: 13, padding: "9px", border: `1px solid ${COLORS.line}`, color: COLORS.ink }}
                    >
                      <Plus size={14} /> Registrar
                    </button>
                    <button
                      onClick={() => setImportInvoiceCard(card)}
                      className="flex-1 rounded-md flex items-center justify-center gap-1.5"
                      style={{ fontFamily: fontBody, fontWeight: 600, fontSize: 13, padding: "9px", border: `1px solid ${COLORS.line}`, color: COLORS.ink }}
                    >
                      <Upload size={14} /> Importar
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {paidInvoices.length > 0 && (
        <div className="mt-8">
          <Panel title="Faturas pagas recentemente">
            <div className="space-y-2">
              {paidInvoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between">
                  <span style={{ fontFamily: fontBody, fontSize: 13.5, color: COLORS.ink }}>
                    {cardById[inv.cardId]?.name || "Cartão"} · {new Date(inv.dueDate + "T00:00:00").toLocaleDateString("pt-BR")}
                  </span>
                  <span style={{ fontFamily: fontMono, fontSize: 13.5, color: COLORS.slate }}>{brl(inv.amount)}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {cardModal && (
        <CreditCardModal
          initial={cardModal.editing}
          accounts={accounts}
          onClose={() => setCardModal(null)}
          onSave={(c) => {
            if (cardModal.editing) {
              persistCards(cards.map((x) => (x.id === c.id ? c : x)));
            } else {
              persistCards([...cards, { ...c, id: uid() }]);
            }
            setCardModal(null);
          }}
        />
      )}

      {invoiceModal && (
        <InvoiceModal
          card={invoiceModal}
          onClose={() => setInvoiceModal(null)}
          onSave={(inv) => {
            persistInvoices([...invoices, { ...inv, id: uid(), cardId: invoiceModal.id, status: "pendente" }]);
            setInvoiceModal(null);
          }}
        />
      )}

      {importInvoiceCard && (
        <ImportInvoiceModal
          card={importInvoiceCard}
          onClose={() => setImportInvoiceCard(null)}
          onSave={(inv) => {
            persistInvoices([...invoices, { ...inv, id: uid(), cardId: importInvoiceCard.id, status: "pendente" }]);
            setImportInvoiceCard(null);
          }}
        />
      )}

      {confirmPay && (
        <Modal title="Pagar fatura" onClose={() => setConfirmPay(null)} width={380}>
          <p style={{ fontFamily: fontBody, fontSize: 14, color: COLORS.slate, marginBottom: 18 }}>
            Confirmar pagamento de <strong style={{ color: COLORS.ink }}>{brl(confirmPay.amount)}</strong>? Isso cria uma despesa na conta vinculada ao cartão.
          </p>
          <div className="flex gap-2 justify-end">
            <GhostBtn onClick={() => setConfirmPay(null)}>Cancelar</GhostBtn>
            <PrimaryBtn
              onClick={() => {
                onPay(confirmPay);
                setConfirmPay(null);
              }}
            >
              Confirmar pagamento
            </PrimaryBtn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function CreditCardModal({ initial, accounts, onClose, onSave }) {
  const [name, setName] = useState(initial?.name || "");
  const [limit, setLimit] = useState(initial?.limit?.toString() || "");
  const [dueDay, setDueDay] = useState(initial?.dueDay?.toString() || "10");
  const [accountId, setAccountId] = useState(initial?.accountId || accounts?.[0]?.id || "");
  const [color, setColor] = useState(initial?.color || ACCOUNT_PALETTE[0]);

  return (
    <Modal title={initial ? "Editar cartão" : "Novo cartão de crédito"} onClose={onClose}>
      <Field label="Nome do cartão">
        <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Nubank Ultravioleta" />
      </Field>

      <Field label="Dia de vencimento (padrão)" hint="Usado para sugerir a data ao registrar uma nova fatura.">
        <input style={inputStyle} type="number" min="1" max="31" value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
      </Field>

      <Field label="Limite (opcional)">
        <input style={inputStyle} type="number" step="0.01" min="0" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="0,00" />
      </Field>

      {accounts?.length > 0 && (
        <Field label="Conta de onde sai o pagamento" hint="Ao pagar a fatura, a despesa é lançada nessa conta.">
          <select style={inputStyle} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Field>
      )}

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
            if (!name.trim()) return;
            onSave({
              id: initial?.id, name: name.trim(), color,
              limit: parseFloat(limit) || 0, dueDay: parseInt(dueDay, 10) || 10,
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

function InvoiceModal({ card, onClose, onSave }) {
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(suggestInvoiceDate(card));

  return (
    <Modal title={`Registrar fatura — ${card.name}`} onClose={onClose} width={400}>
      <Field label="Valor da fatura">
        <input style={inputStyle} type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" autoFocus />
      </Field>
      <Field label="Vencimento">
        <input style={inputStyle} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </Field>
      <div className="flex gap-2 justify-end mt-5">
        <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
        <PrimaryBtn
          onClick={() => {
            if (!(parseFloat(amount) > 0) || !dueDate) return;
            onSave({ amount: parseFloat(amount), dueDate });
          }}
        >
          Salvar
        </PrimaryBtn>
      </div>
    </Modal>
  );
}

function ImportInvoiceModal({ card, onClose, onSave }) {
  const [fileType, setFileType] = useState(null); // "csv" | "ofx" | null
  const [rows, setRows] = useState([]);
  const [ofxTx, setOfxTx] = useState([]);
  const [hasHeader, setHasHeader] = useState(true);
  const [dateCol, setDateCol] = useState(0);
  const [descCol, setDescCol] = useState(1);
  const [amountCol, setAmountCol] = useState(2);
  const [dueDate, setDueDate] = useState(suggestInvoiceDate(card));

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isOfx = /\.ofx$/i.test(file.name);
    setFileType(isOfx ? "ofx" : "csv");
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (isOfx) {
        setOfxTx(parseOFX(ev.target.result));
      } else {
        const { rows: parsed } = parseCSV(ev.target.result);
        setRows(parsed);
      }
    };
    reader.readAsText(file, "utf-8");
  };

  const headerRow = rows[0] || [];
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const colOptions = Array.from({ length: headerRow.length }, (_, i) => ({
    value: i.toString(),
    label: hasHeader && headerRow[i] ? headerRow[i] : `Coluna ${i + 1}`,
  }));

  const csvTx = useMemo(() => {
    return dataRows
      .map((r) => ({
        date: parseDateFlexible(r[dateCol] || ""),
        description: (r[descCol] || "").trim(),
        amount: parseAmountFlexible(r[amountCol] || ""),
      }))
      .filter((t) => t.amount !== null);
  }, [dataRows, dateCol, descCol, amountCol]);

  const parsedTx = fileType === "ofx" ? ofxTx : csvTx;
  const total = parsedTx.reduce((a, t) => a + Math.abs(t.amount), 0);

  return (
    <Modal title={`Importar fatura — ${card.name}`} onClose={onClose} width={620}>
      {fileType === null ? (
        <Field label="Arquivo da fatura" hint="Aceita .csv ou .ofx com as compras do cartão. O total é somado automaticamente pra virar o valor da fatura.">
          <input type="file" accept=".csv,.ofx,text/csv" onChange={handleFile} style={inputStyle} />
        </Field>
      ) : (
        <>
          {fileType === "csv" && (
            <>
              <label className="flex items-center gap-2 mb-3 cursor-pointer">
                <input type="checkbox" checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} />
                <span style={{ fontFamily: fontBody, fontSize: 13, color: COLORS.ink }}>A primeira linha é cabeçalho</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="Coluna da data">
                  <select style={inputStyle} value={dateCol} onChange={(e) => setDateCol(Number(e.target.value))}>
                    {colOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>
                <Field label="Coluna da descrição">
                  <select style={inputStyle} value={descCol} onChange={(e) => setDescCol(Number(e.target.value))}>
                    {colOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>
                <Field label="Coluna do valor">
                  <select style={inputStyle} value={amountCol} onChange={(e) => setAmountCol(Number(e.target.value))}>
                    {colOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>
              </div>
            </>
          )}

          {fileType === "ofx" && (
            <div className="rounded-md p-2.5 mb-3" style={{ background: COLORS.paperDim, fontFamily: fontBody, fontSize: 12, color: COLORS.slate }}>
              Arquivo OFX reconhecido — data, descrição e valor já vêm prontos do cartão.
            </div>
          )}

          <Field label="Vencimento da fatura">
            <input style={inputStyle} type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>

          <div className="rounded-md overflow-hidden mb-3" style={{ border: `1px solid ${COLORS.line}` }}>
            <div className="px-3 py-2 flex items-center justify-between" style={{ background: COLORS.paperDim }}>
              <span style={{ fontFamily: fontBody, fontSize: 12, fontWeight: 600, color: COLORS.slate }}>{parsedTx.length} compras encontradas</span>
              <span style={{ fontFamily: fontMono, fontSize: 13, fontWeight: 700, color: COLORS.ink }}>{brl(total)}</span>
            </div>
            {parsedTx.slice(0, 5).map((t, i) => (
              <div key={i} className="flex items-center justify-between px-3 py-2 gap-2" style={{ borderTop: i === 0 ? "none" : `1px dashed ${COLORS.line}` }}>
                <span style={{ fontFamily: fontBody, fontSize: 12, color: COLORS.ink }} className="truncate">
                  {t.date || "?"} · {t.description.slice(0, 34) || "sem descrição"}
                </span>
                <span style={{ fontFamily: fontMono, fontSize: 12, color: COLORS.slate, flexShrink: 0 }}>{brl(Math.abs(t.amount))}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-2 justify-end mt-5">
            <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
            <PrimaryBtn
              onClick={() => {
                if (parsedTx.length === 0 || !dueDate) return;
                onSave({ amount: total, dueDate });
              }}
            >
              Registrar fatura de {brl(total)}
            </PrimaryBtn>
          </div>
        </>
      )}
    </Modal>
  );
}
