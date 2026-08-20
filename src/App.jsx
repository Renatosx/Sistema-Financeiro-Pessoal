import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";
import {
  LayoutDashboard, Receipt, FolderTree, Target, Plus, Trash2, Pencil,
  TrendingUp, TrendingDown, Wallet, X, ChevronLeft, ChevronRight,
  PiggyBank, AlertTriangle, Check, ChevronDown, Landmark,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Tokens                                                             */
/* ------------------------------------------------------------------ */
const COLORS = {
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
const CATEGORY_PALETTE = [
  "#2F6B4F", "#A8472F", "#B8912B", "#3D5A80", "#7B4B94",
  "#5B6B63", "#4A6FA5", "#8B5E34", "#6B7F45", "#9A4C6B",
];
const ACCOUNT_PALETTE = [
  "#3D5A80", "#7B4B94", "#2F6B4F", "#B8912B", "#5B6B63", "#A8472F",
];

const fontDisplay = "'Fraunces', Georgia, serif";
const fontBody = "'Inter', system-ui, sans-serif";
const fontMono = "'IBM Plex Mono', ui-monospace, monospace";

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const brl = (n) =>
  (n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const monthKey = (d) => d.slice(0, 7); // "YYYY-MM"
const todayISO = () => new Date().toISOString().slice(0, 10);
const monthLabel = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
};
const shiftMonth = (ym, delta) => {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const DEFAULT_CATEGORIES = [
  { id: uid(), name: "Salário", type: "receita", color: CATEGORY_PALETTE[0], budget: 0, subcategories: [] },
  { id: uid(), name: "Freelance", type: "receita", color: CATEGORY_PALETTE[3], budget: 0, subcategories: [] },
  { id: uid(), name: "Investimentos", type: "receita", color: CATEGORY_PALETTE[4], budget: 0, subcategories: [] },
  {
    id: uid(), name: "Moradia", type: "despesa", color: CATEGORY_PALETTE[1], budget: 1500,
    subcategories: [{ id: uid(), name: "Aluguel" }, { id: uid(), name: "Condomínio" }, { id: uid(), name: "Energia" }, { id: uid(), name: "Água" }, { id: uid(), name: "Internet" }],
  },
  {
    id: uid(), name: "Alimentação", type: "despesa", color: CATEGORY_PALETTE[2], budget: 900,
    subcategories: [{ id: uid(), name: "Supermercado" }, { id: uid(), name: "Restaurante" }],
  },
  {
    id: uid(), name: "Transporte", type: "despesa", color: CATEGORY_PALETTE[5], budget: 400,
    subcategories: [{ id: uid(), name: "Combustível" }, { id: uid(), name: "App / Transporte público" }, { id: uid(), name: "Manutenção" }],
  },
  {
    id: uid(), name: "Saúde", type: "despesa", color: CATEGORY_PALETTE[6], budget: 350,
    subcategories: [{ id: uid(), name: "Plano de saúde" }, { id: uid(), name: "Farmácia" }],
  },
  { id: uid(), name: "Lazer", type: "despesa", color: CATEGORY_PALETTE[7], budget: 250, subcategories: [] },
  { id: uid(), name: "Educação", type: "despesa", color: CATEGORY_PALETTE[8], budget: 200, subcategories: [] },
  { id: uid(), name: "Outros", type: "despesa", color: COLORS.slate, budget: 150, subcategories: [] },
];

const DEFAULT_ACCOUNTS = [
  { id: uid(), name: "Carteira", color: ACCOUNT_PALETTE[4], initialBalance: 0 },
];

/* ------------------------------------------------------------------ */
/*  Storage                                                             */
/* ------------------------------------------------------------------ */
const K_TX = "pf-transactions";
const K_CAT = "pf-categories";
const K_GOALS = "pf-goals";
const K_ACC = "pf-accounts";

import { loadKey, saveKey } from "./storage.js";

/* ------------------------------------------------------------------ */
/*  Small UI atoms                                                      */
/* ------------------------------------------------------------------ */
function Stamp({ positive }) {
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
      {positive ? "Superávit" : "Déficit"}
    </span>
  );
}

function IconBtn({ onClick, title, children, color }) {
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

function Modal({ title, onClose, children, width = 460 }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(28,43,36,0.45)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full rounded-md shadow-xl overflow-hidden"
        style={{ maxWidth: width, background: COLORS.white, border: `1px solid ${COLORS.line}` }}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: `1px solid ${COLORS.line}` }}
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

function Field({ label, children }) {
  return (
    <label className="block mb-3">
      <span
        style={{ fontFamily: fontBody, fontSize: 12, color: COLORS.slate, fontWeight: 600, letterSpacing: "0.03em" }}
        className="uppercase block mb-1"
      >
        {label}
      </span>
      {children}
    </label>
  );
}

const inputStyle = {
  width: "100%",
  fontFamily: fontBody,
  fontSize: 14,
  padding: "9px 11px",
  border: `1px solid ${COLORS.line}`,
  borderRadius: 5,
  background: COLORS.white,
  color: COLORS.ink,
  outline: "none",
};

function PrimaryBtn({ children, onClick, type = "button", full }) {
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
function GhostBtn({ children, onClick, full }) {
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

/* ------------------------------------------------------------------ */
/*  App                                                                  */
/* ------------------------------------------------------------------ */
export default function App() {
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState("dashboard");
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [goals, setGoals] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [month, setMonth] = useState(monthKey(todayISO()));

  const [txModal, setTxModal] = useState(null); // null | {editing?:tx}
  const [catModal, setCatModal] = useState(null);
  const [subFor, setSubFor] = useState(null); // category id
  const [goalModal, setGoalModal] = useState(null);
  const [contribGoal, setContribGoal] = useState(null);
  const [accModal, setAccModal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // {type,id,label}

  useEffect(() => {
    (async () => {
      const [tx, cat, gl, acc] = await Promise.all([
        loadKey(K_TX, []),
        loadKey(K_CAT, null),
        loadKey(K_GOALS, []),
        loadKey(K_ACC, null),
      ]);
      let finalCat = cat;
      if (!finalCat || finalCat.length === 0) {
        finalCat = DEFAULT_CATEGORIES;
        await saveKey(K_CAT, finalCat);
      }
      let finalAcc = acc;
      if (!finalAcc || finalAcc.length === 0) {
        finalAcc = DEFAULT_ACCOUNTS;
        await saveKey(K_ACC, finalAcc);
      }
      setTransactions(tx);
      setCategories(finalCat);
      setGoals(gl);
      setAccounts(finalAcc);
      setReady(true);
    })();
  }, []);

  const persistTx = useCallback((next) => { setTransactions(next); saveKey(K_TX, next); }, []);
  const persistCat = useCallback((next) => { setCategories(next); saveKey(K_CAT, next); }, []);
  const persistGoals = useCallback((next) => { setGoals(next); saveKey(K_GOALS, next); }, []);
  const persistAcc = useCallback((next) => { setAccounts(next); saveKey(K_ACC, next); }, []);

  const catById = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);
  const accountById = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a])), [accounts]);

  const accountBalances = useMemo(() => {
    return accounts.map((a) => {
      const net = transactions
        .filter((t) => t.accountId === a.id)
        .reduce((acc, t) => acc + (t.type === "receita" ? t.amount : -t.amount), 0);
      return { ...a, balance: (a.initialBalance || 0) + net };
    });
  }, [accounts, transactions]);

  const monthTx = useMemo(
    () => transactions.filter((t) => monthKey(t.date) === month),
    [transactions, month]
  );
  const totals = useMemo(() => {
    let income = 0, expense = 0;
    monthTx.forEach((t) => (t.type === "receita" ? (income += t.amount) : (expense += t.amount)));
    return { income, expense, balance: income - expense };
  }, [monthTx]);
  const totalBalanceAllTime = useMemo(
    () =>
      transactions.reduce((acc, t) => acc + (t.type === "receita" ? t.amount : -t.amount), 0),
    [transactions]
  );

  const expenseByCategory = useMemo(() => {
    const map = {};
    monthTx
      .filter((t) => t.type === "despesa")
      .forEach((t) => {
        map[t.categoryId] = (map[t.categoryId] || 0) + t.amount;
      });
    return Object.entries(map)
      .map(([id, value]) => ({ id, name: catById[id]?.name || "Sem categoria", value, color: catById[id]?.color || COLORS.slate }))
      .sort((a, b) => b.value - a.value);
  }, [monthTx, catById]);

  const budgetData = useMemo(() => {
    return categories
      .filter((c) => c.type === "despesa" && c.budget > 0)
      .map((c) => {
        const spent = monthTx.filter((t) => t.categoryId === c.id).reduce((a, t) => a + t.amount, 0);
        return { name: c.name, Orçado: c.budget, Realizado: spent, over: spent > c.budget, color: c.color };
      });
  }, [categories, monthTx]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: COLORS.paper, fontFamily: fontBody, color: COLORS.slate }}>
        Carregando…
      </div>
    );
  }

  return (
    <div style={{ background: COLORS.paper, minHeight: "100vh", fontFamily: fontBody, color: COLORS.ink }}>
      <div className="flex flex-col md:flex-row min-h-screen">
        {/* Sidebar */}
        <aside
          className="md:w-56 w-full flex md:flex-col justify-between md:justify-start shrink-0"
          style={{ background: COLORS.ink, color: COLORS.paper }}
        >
          <div className="px-5 pt-6 pb-4 hidden md:block">
            <div style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 700, lineHeight: 1.1 }}>
              Livro-Caixa
            </div>
            <div style={{ fontFamily: fontMono, fontSize: 11, letterSpacing: "0.08em", color: "#9BAFA4", marginTop: 4 }}>
              CONTROLE PESSOAL
            </div>
          </div>
          <nav className="flex md:flex-col w-full md:mt-4">
            {[
              { id: "dashboard", label: "Painel", icon: LayoutDashboard },
              { id: "transactions", label: "Lançamentos", icon: Receipt },
              { id: "categories", label: "Categorias", icon: FolderTree },
              { id: "accounts", label: "Bancos", icon: Landmark },
              { id: "goals", label: "Metas", icon: Target },
            ].map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className="flex-1 md:flex-none flex items-center gap-2.5 md:px-5 px-2 py-3.5 md:py-2.5 justify-center md:justify-start transition-colors"
                  style={{
                    background: active ? "rgba(244,241,232,0.10)" : "transparent",
                    borderLeft: active ? `3px solid ${COLORS.gold}` : "3px solid transparent",
                    fontFamily: fontBody,
                    fontWeight: 500,
                    fontSize: 14,
                  }}
                >
                  <Icon size={17} />
                  <span className="hidden md:inline">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main */}
        <main className="flex-1 px-4 md:px-10 py-6 md:py-8 max-w-6xl">
          {tab === "dashboard" && (
            <Dashboard
              month={month} setMonth={setMonth}
              totals={totals} totalBalanceAllTime={totalBalanceAllTime}
              expenseByCategory={expenseByCategory} budgetData={budgetData}
              goals={goals} accountBalances={accountBalances}
            />
          )}
          {tab === "transactions" && (
            <Transactions
              transactions={transactions} categories={categories} catById={catById}
              accounts={accounts} accountById={accountById}
              onAdd={() => setTxModal({})}
              onEdit={(t) => setTxModal({ editing: t })}
              onDelete={(t) => setConfirmDelete({ type: "tx", id: t.id, label: t.description || catById[t.categoryId]?.name })}
            />
          )}
          {tab === "accounts" && (
            <Accounts
              accountBalances={accountBalances}
              onAdd={() => setAccModal({})}
              onEdit={(a) => setAccModal({ editing: a })}
              onDelete={(a) => setConfirmDelete({ type: "acc", id: a.id, label: a.name })}
            />
          )}
          {tab === "categories" && (
            <Categories
              categories={categories}
              onAdd={() => setCatModal({})}
              onEdit={(c) => setCatModal({ editing: c })}
              onDelete={(c) => setConfirmDelete({ type: "cat", id: c.id, label: c.name })}
              onAddSub={(c) => setSubFor(c.id)}
              onDeleteSub={(catId, subId) => {
                const next = categories.map((c) =>
                  c.id === catId ? { ...c, subcategories: c.subcategories.filter((s) => s.id !== subId) } : c
                );
                persistCat(next);
              }}
            />
          )}
          {tab === "goals" && (
            <Goals
              goals={goals}
              onAdd={() => setGoalModal({})}
              onEdit={(g) => setGoalModal({ editing: g })}
              onDelete={(g) => setConfirmDelete({ type: "goal", id: g.id, label: g.name })}
              onContribute={(g) => setContribGoal(g)}
            />
          )}
        </main>
      </div>

      {/* ---------------- Modals ---------------- */}
      {txModal && (
        <TransactionModal
          initial={txModal.editing}
          categories={categories}
          accounts={accounts}
          onClose={() => setTxModal(null)}
          onSave={(tx) => {
            if (txModal.editing) {
              persistTx(transactions.map((t) => (t.id === tx.id ? tx : t)));
            } else {
              persistTx([{ ...tx, id: uid() }, ...transactions]);
            }
            setTxModal(null);
          }}
        />
      )}

      {catModal && (
        <CategoryModal
          initial={catModal.editing}
          onClose={() => setCatModal(null)}
          onSave={(cat) => {
            if (catModal.editing) {
              persistCat(categories.map((c) => (c.id === cat.id ? cat : c)));
            } else {
              persistCat([...categories, { ...cat, id: uid(), subcategories: [] }]);
            }
            setCatModal(null);
          }}
        />
      )}

      {subFor && (
        <SubcategoryModal
          category={categories.find((c) => c.id === subFor)}
          onClose={() => setSubFor(null)}
          onAdd={(name) => {
            const next = categories.map((c) =>
              c.id === subFor ? { ...c, subcategories: [...c.subcategories, { id: uid(), name }] } : c
            );
            persistCat(next);
          }}
        />
      )}

      {accModal && (
        <AccountModal
          initial={accModal.editing}
          onClose={() => setAccModal(null)}
          onSave={(a) => {
            if (accModal.editing) {
              persistAcc(accounts.map((x) => (x.id === a.id ? a : x)));
            } else {
              persistAcc([...accounts, { ...a, id: uid() }]);
            }
            setAccModal(null);
          }}
        />
      )}

      {goalModal && (
        <GoalModal
          initial={goalModal.editing}
          onClose={() => setGoalModal(null)}
          onSave={(g) => {
            if (goalModal.editing) {
              persistGoals(goals.map((x) => (x.id === g.id ? g : x)));
            } else {
              persistGoals([...goals, { ...g, id: uid(), currentAmount: 0 }]);
            }
            setGoalModal(null);
          }}
        />
      )}

      {contribGoal && (
        <ContributeModal
          goal={contribGoal}
          onClose={() => setContribGoal(null)}
          onConfirm={(amount) => {
            persistGoals(
              goals.map((g) => (g.id === contribGoal.id ? { ...g, currentAmount: g.currentAmount + amount } : g))
            );
            setContribGoal(null);
          }}
        />
      )}

      {confirmDelete && (
        <Modal title="Confirmar exclusão" onClose={() => setConfirmDelete(null)} width={380}>
          <p style={{ fontFamily: fontBody, fontSize: 14, color: COLORS.slate, marginBottom: 18 }}>
            Excluir <strong style={{ color: COLORS.ink }}>{confirmDelete.label || "este item"}</strong>? Essa ação não pode ser desfeita.
          </p>
          <div className="flex gap-2 justify-end">
            <GhostBtn onClick={() => setConfirmDelete(null)}>Cancelar</GhostBtn>
            <button
              onClick={() => {
                if (confirmDelete.type === "tx") persistTx(transactions.filter((t) => t.id !== confirmDelete.id));
                if (confirmDelete.type === "cat") persistCat(categories.filter((c) => c.id !== confirmDelete.id));
                if (confirmDelete.type === "goal") persistGoals(goals.filter((g) => g.id !== confirmDelete.id));
                if (confirmDelete.type === "acc") persistAcc(accounts.filter((a) => a.id !== confirmDelete.id));
                setConfirmDelete(null);
              }}
              className="rounded-md"
              style={{ fontFamily: fontBody, fontWeight: 600, fontSize: 14, padding: "10px 16px", background: COLORS.rust, color: COLORS.white }}
            >
              Excluir
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Dashboard                                                           */
/* ------------------------------------------------------------------ */
function Dashboard({ month, setMonth, totals, totalBalanceAllTime, expenseByCategory, budgetData, goals, accountBalances }) {
  return (
    <div>
      <Header
        title="Painel"
        subtitle="Visão geral do mês selecionado"
        right={<MonthSwitcher month={month} setMonth={setMonth} />}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        <SummaryCard label="Receitas do mês" value={totals.income} icon={TrendingUp} tone={COLORS.green} />
        <SummaryCard label="Despesas do mês" value={totals.expense} icon={TrendingDown} tone={COLORS.rust} />
        <SummaryCard label="Saldo do mês" value={totals.balance} icon={Wallet} tone={COLORS.ink} stamp />
      </div>

      <div
        className="mt-4 rounded-md px-5 py-3 flex items-center justify-between"
        style={{ background: COLORS.white, border: `1px solid ${COLORS.line}` }}
      >
        <span style={{ fontFamily: fontBody, fontSize: 13, color: COLORS.slate }}>Saldo acumulado (todos os lançamentos)</span>
        <span style={{ fontFamily: fontMono, fontSize: 16, fontWeight: 600, color: totalBalanceAllTime >= 0 ? COLORS.green : COLORS.rust }}>
          {brl(totalBalanceAllTime)}
        </span>
      </div>

      {accountBalances.length > 0 && (
        <div className="mt-5">
          <Panel title="Saldo por banco">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {accountBalances.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-md px-4 py-3" style={{ background: COLORS.paperDim }}>
                  <div className="flex items-center gap-2 min-w-0">
                    <Landmark size={15} style={{ color: a.color }} />
                    <span style={{ fontFamily: fontBody, fontSize: 13.5, fontWeight: 600, color: COLORS.ink }} className="truncate">{a.name}</span>
                  </div>
                  <span style={{ fontFamily: fontMono, fontSize: 14, fontWeight: 600, color: a.balance >= 0 ? COLORS.green : COLORS.rust }}>
                    {brl(a.balance)}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-8">
        <Panel title="Gastos por categoria">
          {expenseByCategory.length === 0 ? (
            <EmptyHint text="Nenhuma despesa lançada neste mês." />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={expenseByCategory} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
                  {expenseByCategory.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke={COLORS.white} strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => brl(v)} contentStyle={{ fontFamily: fontBody, fontSize: 13, borderRadius: 6, border: `1px solid ${COLORS.line}` }} />
                <Legend wrapperStyle={{ fontFamily: fontBody, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Panel>

        <Panel title="Orçado × Realizado">
          {budgetData.length === 0 ? (
            <EmptyHint text="Defina orçamentos por categoria na aba Categorias." />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={budgetData} margin={{ left: -10 }}>
                <CartesianGrid stroke={COLORS.line} vertical={false} />
                <XAxis dataKey="name" tick={{ fontFamily: fontBody, fontSize: 11, fill: COLORS.slate }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontFamily: fontMono, fontSize: 10, fill: COLORS.slate }} />
                <Tooltip formatter={(v) => brl(v)} contentStyle={{ fontFamily: fontBody, fontSize: 13, borderRadius: 6, border: `1px solid ${COLORS.line}` }} />
                <Legend wrapperStyle={{ fontFamily: fontBody, fontSize: 12 }} />
                <Bar dataKey="Orçado" fill={COLORS.slate} radius={[3, 3, 0, 0]} />
                <Bar dataKey="Realizado" radius={[3, 3, 0, 0]}>
                  {budgetData.map((d, i) => (
                    <Cell key={i} fill={d.over ? COLORS.rust : COLORS.green} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          {budgetData.some((d) => d.over) && (
            <div className="flex items-center gap-2 mt-2" style={{ color: COLORS.rust, fontFamily: fontBody, fontSize: 12.5 }}>
              <AlertTriangle size={14} /> Categorias acima do orçamento este mês.
            </div>
          )}
        </Panel>
      </div>

      {goals.length > 0 && (
        <div className="mt-8">
          <Panel title="Progresso das metas">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {goals.map((g) => (
                <GoalMini key={g.id} goal={g} />
              ))}
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}

function GoalMini({ goal }) {
  const pct = Math.min(100, (goal.currentAmount / (goal.targetAmount || 1)) * 100);
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1">
        <span style={{ fontFamily: fontBody, fontSize: 13.5, fontWeight: 600, color: COLORS.ink }}>{goal.name}</span>
        <span style={{ fontFamily: fontMono, fontSize: 12, color: COLORS.slate }}>{pct.toFixed(0)}%</span>
      </div>
      <div style={{ height: 7, borderRadius: 4, background: COLORS.paperDim, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: COLORS.gold }} />
      </div>
      <div style={{ fontFamily: fontMono, fontSize: 11.5, color: COLORS.slate, marginTop: 4 }}>
        {brl(goal.currentAmount)} de {brl(goal.targetAmount)}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, tone, stamp }) {
  return (
    <div className="rounded-md p-5" style={{ background: COLORS.white, border: `1px solid ${COLORS.line}` }}>
      <div className="flex items-center justify-between mb-3">
        <span style={{ fontFamily: fontBody, fontSize: 12.5, color: COLORS.slate, fontWeight: 600 }}>{label}</span>
        <Icon size={16} style={{ color: tone }} />
      </div>
      <div style={{ fontFamily: fontMono, fontSize: 24, fontWeight: 600, color: tone }}>{brl(value)}</div>
      {stamp && <div className="mt-2"><Stamp positive={value >= 0} /></div>}
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div className="rounded-md p-5" style={{ background: COLORS.white, border: `1px solid ${COLORS.line}` }}>
      <h3 style={{ fontFamily: fontDisplay, fontSize: 17, fontWeight: 600, color: COLORS.ink, marginBottom: 12 }}>{title}</h3>
      {children}
    </div>
  );
}

function EmptyHint({ text }) {
  return (
    <div className="flex items-center justify-center py-16" style={{ fontFamily: fontBody, fontSize: 13.5, color: COLORS.slate }}>
      {text}
    </div>
  );
}

function Header({ title, subtitle, right }) {
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

function MonthSwitcher({ month, setMonth }) {
  return (
    <div className="flex items-center gap-1 rounded-md" style={{ border: `1px solid ${COLORS.line}`, background: COLORS.white }}>
      <IconBtn onClick={() => setMonth(shiftMonth(month, -1))} title="Mês anterior"><ChevronLeft size={16} /></IconBtn>
      <span style={{ fontFamily: fontMono, fontSize: 13, minWidth: 130, textAlign: "center", textTransform: "capitalize" }}>
        {monthLabel(month)}
      </span>
      <IconBtn onClick={() => setMonth(shiftMonth(month, 1))} title="Próximo mês"><ChevronRight size={16} /></IconBtn>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Transactions                                                        */
/* ------------------------------------------------------------------ */
function Transactions({ transactions, categories, catById, accounts, accountById, onAdd, onEdit, onDelete }) {
  const [filterType, setFilterType] = useState("todos");
  const [filterCat, setFilterCat] = useState("todas");

  const list = useMemo(() => {
    return transactions
      .filter((t) => (filterType === "todos" ? true : t.type === filterType))
      .filter((t) => (filterCat === "todas" ? true : t.categoryId === filterCat))
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [transactions, filterType, filterCat]);

  return (
    <div>
      <Header
        title="Lançamentos"
        subtitle="Receitas e despesas registradas"
        right={
          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 rounded-md"
            style={{ fontFamily: fontBody, fontWeight: 600, fontSize: 14, padding: "9px 14px", background: COLORS.ink, color: COLORS.white }}
          >
            <Plus size={15} /> Novo lançamento
          </button>
        }
      />

      <div className="flex flex-wrap gap-2 mt-5">
        <Select value={filterType} onChange={setFilterType} options={[
          { value: "todos", label: "Todos os tipos" },
          { value: "receita", label: "Receitas" },
          { value: "despesa", label: "Despesas" },
        ]} />
        <Select value={filterCat} onChange={setFilterCat} options={[
          { value: "todas", label: "Todas as categorias" },
          ...categories.map((c) => ({ value: c.id, label: c.name })),
        ]} />
      </div>

      <div className="mt-5 rounded-md overflow-hidden" style={{ border: `1px solid ${COLORS.line}`, background: COLORS.white }}>
        {list.length === 0 ? (
          <EmptyHint text="Nenhum lançamento encontrado." />
        ) : (
          list.map((t, i) => {
            const cat = catById[t.categoryId];
            const sub = cat?.subcategories?.find((s) => s.id === t.subcategoryId);
            return (
              <div
                key={t.id}
                className="flex items-center justify-between px-4 md:px-5 py-3 gap-3"
                style={{ borderTop: i === 0 ? "none" : `1px dashed ${COLORS.line}` }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span style={{ width: 9, height: 9, borderRadius: 9, background: cat?.color || COLORS.slate, flexShrink: 0 }} />
                  <div className="min-w-0">
                    <div style={{ fontFamily: fontBody, fontSize: 14, fontWeight: 600, color: COLORS.ink }} className="truncate">
                      {t.description || cat?.name || "Sem descrição"}
                    </div>
                    <div style={{ fontFamily: fontBody, fontSize: 12, color: COLORS.slate }}>
                      {cat?.name}{sub ? ` › ${sub.name}` : ""} · {accountById[t.accountId]?.name || "sem conta"} · {new Date(t.date + "T00:00:00").toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    style={{
                      fontFamily: fontMono, fontSize: 15, fontWeight: 600,
                      color: t.type === "receita" ? COLORS.green : COLORS.rust,
                    }}
                  >
                    {t.type === "receita" ? "+" : "−"} {brl(t.amount)}
                  </span>
                  <IconBtn onClick={() => onEdit(t)} title="Editar"><Pencil size={14} /></IconBtn>
                  <IconBtn onClick={() => onDelete(t)} title="Excluir" color={COLORS.rust}><Trash2 size={14} /></IconBtn>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function Select({ value, onChange, options }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-md pr-8 pl-3 py-2"
        style={{ fontFamily: fontBody, fontSize: 13, border: `1px solid ${COLORS.line}`, background: COLORS.white, color: COLORS.ink }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown size={14} style={{ position: "absolute", right: 8, top: 9, color: COLORS.slate, pointerEvents: "none" }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Categories                                                          */
/* ------------------------------------------------------------------ */
function Categories({ categories, onAdd, onEdit, onDelete, onAddSub, onDeleteSub }) {
  const receitas = categories.filter((c) => c.type === "receita");
  const despesas = categories.filter((c) => c.type === "despesa");

  return (
    <div>
      <Header
        title="Categorias"
        subtitle="Organize receitas e despesas em categorias e subcategorias"
        right={
          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 rounded-md"
            style={{ fontFamily: fontBody, fontWeight: 600, fontSize: 14, padding: "9px 14px", background: COLORS.ink, color: COLORS.white }}
          >
            <Plus size={15} /> Nova categoria
          </button>
        }
      />

      <CategoryGroup title="Receitas" items={receitas} onEdit={onEdit} onDelete={onDelete} onAddSub={onAddSub} onDeleteSub={onDeleteSub} />
      <CategoryGroup title="Despesas" items={despesas} onEdit={onEdit} onDelete={onDelete} onAddSub={onAddSub} onDeleteSub={onDeleteSub} showBudget />
    </div>
  );
}

function CategoryGroup({ title, items, onEdit, onDelete, onAddSub, onDeleteSub, showBudget }) {
  return (
    <div className="mt-7">
      <h3 style={{ fontFamily: fontDisplay, fontSize: 17, fontWeight: 600, color: COLORS.ink, marginBottom: 10 }}>{title}</h3>
      {items.length === 0 ? (
        <EmptyHint text="Nenhuma categoria cadastrada." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((c) => (
            <div key={c.id} className="rounded-md p-4" style={{ background: COLORS.white, border: `1px solid ${COLORS.line}` }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span style={{ width: 11, height: 11, borderRadius: 11, background: c.color, flexShrink: 0 }} />
                  <span style={{ fontFamily: fontBody, fontSize: 14.5, fontWeight: 600, color: COLORS.ink }} className="truncate">{c.name}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <IconBtn onClick={() => onEdit(c)} title="Editar"><Pencil size={13} /></IconBtn>
                  <IconBtn onClick={() => onDelete(c)} title="Excluir" color={COLORS.rust}><Trash2 size={13} /></IconBtn>
                </div>
              </div>

              {showBudget && (
                <div style={{ fontFamily: fontMono, fontSize: 12.5, color: COLORS.slate, marginTop: 6 }}>
                  Orçamento mensal: <strong style={{ color: COLORS.ink }}>{c.budget > 0 ? brl(c.budget) : "não definido"}</strong>
                </div>
              )}

              <div className="mt-3 flex flex-wrap gap-1.5">
                {c.subcategories.map((s) => (
                  <span
                    key={s.id}
                    className="flex items-center gap-1 rounded-full pl-2.5 pr-1.5 py-0.5"
                    style={{ background: COLORS.paperDim, fontFamily: fontBody, fontSize: 12, color: COLORS.ink }}
                  >
                    {s.name}
                    <button onClick={() => onDeleteSub(c.id, s.id)} style={{ color: COLORS.slate }}>
                      <X size={11} />
                    </button>
                  </span>
                ))}
                <button
                  onClick={() => onAddSub(c)}
                  className="flex items-center gap-1 rounded-full px-2.5 py-0.5"
                  style={{ border: `1px dashed ${COLORS.line}`, fontFamily: fontBody, fontSize: 12, color: COLORS.slate }}
                >
                  <Plus size={11} /> subcategoria
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Accounts (Bancos)                                                   */
/* ------------------------------------------------------------------ */
function Accounts({ accountBalances, onAdd, onEdit, onDelete }) {
  const total = accountBalances.reduce((a, b) => a + b.balance, 0);
  return (
    <div>
      <Header
        title="Bancos"
        subtitle="Contas, carteiras e onde seu dinheiro está"
        right={
          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 rounded-md"
            style={{ fontFamily: fontBody, fontWeight: 600, fontSize: 14, padding: "9px 14px", background: COLORS.ink, color: COLORS.white }}
          >
            <Plus size={15} /> Novo banco
          </button>
        }
      />

      <div
        className="mt-5 rounded-md px-5 py-3 flex items-center justify-between"
        style={{ background: COLORS.white, border: `1px solid ${COLORS.line}` }}
      >
        <span style={{ fontFamily: fontBody, fontSize: 13, color: COLORS.slate }}>Total em todas as contas</span>
        <span style={{ fontFamily: fontMono, fontSize: 16, fontWeight: 600, color: total >= 0 ? COLORS.green : COLORS.rust }}>
          {brl(total)}
        </span>
      </div>

      {accountBalances.length === 0 ? (
        <div className="mt-8"><EmptyHint text="Nenhum banco cadastrado ainda." /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
          {accountBalances.map((a) => (
            <div key={a.id} className="rounded-md p-4" style={{ background: COLORS.white, border: `1px solid ${COLORS.line}` }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="flex items-center justify-center rounded-md"
                    style={{ width: 30, height: 30, background: `${a.color}1A`, color: a.color, flexShrink: 0 }}
                  >
                    <Landmark size={15} />
                  </span>
                  <span style={{ fontFamily: fontBody, fontSize: 14.5, fontWeight: 600, color: COLORS.ink }} className="truncate">{a.name}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <IconBtn onClick={() => onEdit(a)} title="Editar"><Pencil size={13} /></IconBtn>
                  <IconBtn onClick={() => onDelete(a)} title="Excluir" color={COLORS.rust}><Trash2 size={13} /></IconBtn>
                </div>
              </div>
              <div style={{ fontFamily: fontMono, fontSize: 20, fontWeight: 600, color: a.balance >= 0 ? COLORS.green : COLORS.rust, marginTop: 12 }}>
                {brl(a.balance)}
              </div>
              <div style={{ fontFamily: fontBody, fontSize: 12, color: COLORS.slate, marginTop: 2 }}>
                Saldo inicial: {brl(a.initialBalance || 0)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Goals                                                                */
/* ------------------------------------------------------------------ */
function Goals({ goals, onAdd, onEdit, onDelete, onContribute }) {
  return (
    <div>
      <Header
        title="Metas"
        subtitle="Objetivos financeiros e reservas"
        right={
          <button
            onClick={onAdd}
            className="flex items-center gap-1.5 rounded-md"
            style={{ fontFamily: fontBody, fontWeight: 600, fontSize: 14, padding: "9px 14px", background: COLORS.ink, color: COLORS.white }}
          >
            <Plus size={15} /> Nova meta
          </button>
        }
      />

      {goals.length === 0 ? (
        <div className="mt-8"><EmptyHint text="Nenhuma meta cadastrada ainda." /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          {goals.map((g) => {
            const pct = Math.min(100, (g.currentAmount / (g.targetAmount || 1)) * 100);
            const done = g.currentAmount >= g.targetAmount;
            return (
              <div key={g.id} className="rounded-md p-5" style={{ background: COLORS.white, border: `1px solid ${COLORS.line}` }}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <PiggyBank size={17} style={{ color: COLORS.gold }} />
                    <span style={{ fontFamily: fontDisplay, fontSize: 17, fontWeight: 600, color: COLORS.ink }}>{g.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <IconBtn onClick={() => onEdit(g)} title="Editar"><Pencil size={13} /></IconBtn>
                    <IconBtn onClick={() => onDelete(g)} title="Excluir" color={COLORS.rust}><Trash2 size={13} /></IconBtn>
                  </div>
                </div>

                {g.deadline && (
                  <div style={{ fontFamily: fontBody, fontSize: 12, color: COLORS.slate, marginTop: 2 }}>
                    até {new Date(g.deadline + "T00:00:00").toLocaleDateString("pt-BR")}
                  </div>
                )}

                <div className="mt-4" style={{ height: 9, borderRadius: 5, background: COLORS.paperDim, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: done ? COLORS.green : COLORS.gold }} />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span style={{ fontFamily: fontMono, fontSize: 13, color: COLORS.ink }}>
                    {brl(g.currentAmount)} <span style={{ color: COLORS.slate }}>/ {brl(g.targetAmount)}</span>
                  </span>
                  <span style={{ fontFamily: fontMono, fontSize: 12.5, color: COLORS.slate }}>{pct.toFixed(0)}%</span>
                </div>

                {done ? (
                  <div className="mt-3 flex items-center gap-1.5" style={{ color: COLORS.green, fontFamily: fontBody, fontSize: 13, fontWeight: 600 }}>
                    <Check size={15} /> Meta concluída
                  </div>
                ) : (
                  <button
                    onClick={() => onContribute(g)}
                    className="mt-3 w-full rounded-md"
                    style={{ fontFamily: fontBody, fontWeight: 600, fontSize: 13, padding: "8px", border: `1px solid ${COLORS.line}`, color: COLORS.ink }}
                  >
                    + Adicionar aporte
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Modals: Transaction / Category / Subcategory / Goal / Contribute    */
/* ------------------------------------------------------------------ */
function TransactionModal({ initial, categories, accounts, onClose, onSave }) {
  const [type, setType] = useState(initial?.type || "despesa");
  const [categoryId, setCategoryId] = useState(initial?.categoryId || "");
  const [subcategoryId, setSubcategoryId] = useState(initial?.subcategoryId || "");
  const [accountId, setAccountId] = useState(initial?.accountId || accounts?.[0]?.id || "");
  const [amount, setAmount] = useState(initial?.amount?.toString() || "");
  const [date, setDate] = useState(initial?.date || todayISO());
  const [description, setDescription] = useState(initial?.description || "");

  const filteredCats = categories.filter((c) => c.type === type);
  const currentCat = categories.find((c) => c.id === categoryId);

  useEffect(() => {
    if (!filteredCats.find((c) => c.id === categoryId)) {
      setCategoryId(filteredCats[0]?.id || "");
      setSubcategoryId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const canSave = categoryId && parseFloat(amount) > 0 && date;

  return (
    <Modal title={initial ? "Editar lançamento" : "Novo lançamento"} onClose={onClose}>
      <div className="flex gap-2 mb-4">
        {["receita", "despesa"].map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className="flex-1 rounded-md py-2"
            style={{
              fontFamily: fontBody, fontWeight: 600, fontSize: 13.5,
              background: type === t ? (t === "receita" ? COLORS.green : COLORS.rust) : COLORS.paperDim,
              color: type === t ? COLORS.white : COLORS.slate,
            }}
          >
            {t === "receita" ? "Receita" : "Despesa"}
          </button>
        ))}
      </div>

      <Field label="Valor">
        <input style={inputStyle} type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" />
      </Field>

      <Field label="Categoria">
        <select style={inputStyle} value={categoryId} onChange={(e) => { setCategoryId(e.target.value); setSubcategoryId(""); }}>
          <option value="" disabled>Selecione</option>
          {filteredCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>

      {currentCat?.subcategories?.length > 0 && (
        <Field label="Subcategoria (opcional)">
          <select style={inputStyle} value={subcategoryId} onChange={(e) => setSubcategoryId(e.target.value)}>
            <option value="">Nenhuma</option>
            {currentCat.subcategories.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
      )}

      {accounts?.length > 0 && (
        <Field label="Banco / conta">
          <select style={inputStyle} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Field>
      )}

      <Field label="Data">
        <input style={inputStyle} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>

      <Field label="Descrição (opcional)">
        <input style={inputStyle} type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Mercado do mês" />
      </Field>

      <div className="flex gap-2 justify-end mt-5">
        <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
        <PrimaryBtn
          onClick={() => {
            if (!canSave) return;
            onSave({
              id: initial?.id, type, categoryId, subcategoryId: subcategoryId || null,
              accountId: accountId || null, amount: parseFloat(amount), date, description: description.trim(),
            });
          }}
        >
          Salvar
        </PrimaryBtn>
      </div>
    </Modal>
  );
}

function CategoryModal({ initial, onClose, onSave }) {
  const [name, setName] = useState(initial?.name || "");
  const [type, setType] = useState(initial?.type || "despesa");
  const [color, setColor] = useState(initial?.color || CATEGORY_PALETTE[0]);
  const [budget, setBudget] = useState(initial?.budget?.toString() || "");

  return (
    <Modal title={initial ? "Editar categoria" : "Nova categoria"} onClose={onClose}>
      <div className="flex gap-2 mb-4">
        {["receita", "despesa"].map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className="flex-1 rounded-md py-2"
            style={{
              fontFamily: fontBody, fontWeight: 600, fontSize: 13.5,
              background: type === t ? COLORS.ink : COLORS.paperDim,
              color: type === t ? COLORS.white : COLORS.slate,
            }}
          >
            {t === "receita" ? "Receita" : "Despesa"}
          </button>
        ))}
      </div>

      <Field label="Nome">
        <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Assinaturas" />
      </Field>

      <Field label="Cor">
        <div className="flex flex-wrap gap-2">
          {CATEGORY_PALETTE.map((c) => (
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

      {type === "despesa" && (
        <Field label="Orçamento mensal (opcional)">
          <input style={inputStyle} type="number" step="0.01" min="0" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="0,00" />
        </Field>
      )}

      <div className="flex gap-2 justify-end mt-5">
        <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
        <PrimaryBtn
          onClick={() => {
            if (!name.trim()) return;
            onSave({
              id: initial?.id, name: name.trim(), type, color,
              budget: parseFloat(budget) || 0, subcategories: initial?.subcategories || [],
            });
          }}
        >
          Salvar
        </PrimaryBtn>
      </div>
    </Modal>
  );
}

function SubcategoryModal({ category, onClose, onAdd }) {
  const [name, setName] = useState("");
  if (!category) return null;
  return (
    <Modal title={`Subcategoria em "${category.name}"`} onClose={onClose} width={380}>
      <Field label="Nome">
        <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Streaming" autoFocus />
      </Field>
      <div className="flex gap-2 justify-end mt-5">
        <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
        <PrimaryBtn onClick={() => { if (name.trim()) { onAdd(name.trim()); onClose(); } }}>Adicionar</PrimaryBtn>
      </div>
    </Modal>
  );
}

function GoalModal({ initial, onClose, onSave }) {
  const [name, setName] = useState(initial?.name || "");
  const [targetAmount, setTargetAmount] = useState(initial?.targetAmount?.toString() || "");
  const [deadline, setDeadline] = useState(initial?.deadline || "");

  return (
    <Modal title={initial ? "Editar meta" : "Nova meta"} onClose={onClose}>
      <Field label="Nome da meta">
        <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Reserva de emergência" />
      </Field>
      <Field label="Valor alvo">
        <input style={inputStyle} type="number" step="0.01" min="0" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} placeholder="0,00" />
      </Field>
      <Field label="Prazo (opcional)">
        <input style={inputStyle} type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      </Field>
      <div className="flex gap-2 justify-end mt-5">
        <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
        <PrimaryBtn
          onClick={() => {
            if (!name.trim() || !(parseFloat(targetAmount) > 0)) return;
            onSave({
              id: initial?.id, name: name.trim(), targetAmount: parseFloat(targetAmount),
              deadline: deadline || null, currentAmount: initial?.currentAmount || 0,
            });
          }}
        >
          Salvar
        </PrimaryBtn>
      </div>
    </Modal>
  );
}

function AccountModal({ initial, onClose, onSave }) {
  const [name, setName] = useState(initial?.name || "");
  const [color, setColor] = useState(initial?.color || ACCOUNT_PALETTE[0]);
  const [initialBalance, setInitialBalance] = useState(initial?.initialBalance?.toString() || "0");

  return (
    <Modal title={initial ? "Editar banco" : "Novo banco"} onClose={onClose} width={400}>
      <Field label="Nome">
        <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Nubank, Itaú, Carteira" autoFocus />
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

      <Field label="Saldo inicial">
        <input style={inputStyle} type="number" step="0.01" value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)} placeholder="0,00" />
      </Field>

      <div className="flex gap-2 justify-end mt-5">
        <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
        <PrimaryBtn
          onClick={() => {
            if (!name.trim()) return;
            onSave({ id: initial?.id, name: name.trim(), color, initialBalance: parseFloat(initialBalance) || 0 });
          }}
        >
          Salvar
        </PrimaryBtn>
      </div>
    </Modal>
  );
}

function ContributeModal({ goal, onClose, onConfirm }) {
  const [amount, setAmount] = useState("");
  return (
    <Modal title={`Aporte em "${goal.name}"`} onClose={onClose} width={380}>
      <Field label="Valor do aporte">
        <input style={inputStyle} type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" autoFocus />
      </Field>
      <div className="flex gap-2 justify-end mt-5">
        <GhostBtn onClick={onClose}>Cancelar</GhostBtn>
        <PrimaryBtn onClick={() => { if (parseFloat(amount) > 0) onConfirm(parseFloat(amount)); }}>Confirmar</PrimaryBtn>
      </div>
    </Modal>
  );
}
