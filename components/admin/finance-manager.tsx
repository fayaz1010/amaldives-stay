'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import {
  TrendingUp, TrendingDown, DollarSign, Clock, CheckCircle2,
  Plus, RefreshCw, Loader2, ArrowRight, ChevronLeft, ChevronRight,
  AlertCircle, Banknote, Users, BarChart3, Receipt,
} from 'lucide-react';
import Link from 'next/link';

// ---- Types ----
interface Summary {
  totalRevenue: number; totalReceived: number; totalReceivable: number;
  totalExpenses: number; netPosition: number; expensePending: number;
  revenueBySource: { label: string; value: number }[];
  expenseByCategory: { label: string; value: number }[];
  paymentMethods: { method: string; amount: number }[];
  breakdown: Record<string, number>;
}

interface TxRow {
  id: string; type: 'INCOME' | 'EXPENSE'; category: string;
  description: string; amount: number; currency: string;
  status: string; method: string | null; date: string; link: string;
}

interface Expense {
  id: string; category: string; title: string; description?: string;
  amount: number; currency: string; status: string;
  dueDate?: string; paidAt?: string; notes?: string; receiptUrl?: string;
  createdAt: string;
}

interface PayrollEntry {
  id: string; period: string; baseSalary: number; hoursWorked: number;
  overtimePay: number; deductions: number; netPay: number;
  currency: string; status: string; paidAt?: string; notes?: string;
  staff: { id: string; department: string; position: string; employeeId?: string; user: { name?: string; email?: string } };
}

// ---- Constants ----
const PERIODS = [
  { label: 'Today',      value: 'today' },
  { label: 'This Week',  value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'This Year',  value: 'year' },
];

const EXPENSE_CATEGORIES = [
  'LOGISTICS','MAINTENANCE','SALARY','TRANSPORT','UTILITIES','SUPPLIES','MARKETING','OTHER',
];

const STATUS_COLORS: Record<string, string> = {
  RECEIVED:   'text-green-600 bg-green-50',
  RECEIVABLE: 'text-yellow-600 bg-yellow-50',
  PARTIAL:    'text-orange-600 bg-orange-50',
  PAID:       'text-green-600 bg-green-50',
  PENDING:    'text-yellow-600 bg-yellow-50',
  APPROVED:   'text-blue-600 bg-blue-50',
  OVERDUE:    'text-red-600 bg-red-50',
  CANCELLED:  'text-gray-400 bg-gray-50',
  DRAFT:      'text-gray-500 bg-gray-50',
};

const CATEGORY_COLORS: Record<string, string> = {
  LOGISTICS:'bg-yellow-400', MAINTENANCE:'bg-orange-400', SALARY:'bg-purple-400',
  TRANSPORT:'bg-blue-400', UTILITIES:'bg-teal-400', SUPPLIES:'bg-green-400',
  MARKETING:'bg-pink-400', OTHER:'bg-gray-400',
  Bookings:'bg-teal-500', 'F&B':'bg-orange-500', 'Mini Bar':'bg-purple-500', Services:'bg-blue-500',
};

// ---- Mini bar chart ----
function MiniBarChart({ data, colorKey }: { data: { label: string; value: number }[]; colorKey: 'category' | 'revenue' }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map(d => (
        <div key={d.label} className="flex items-center gap-2">
          <span className="text-xs text-gray-500 w-24 shrink-0 truncate">{d.label}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full ${CATEGORY_COLORS[d.label] ?? 'bg-teal-500'}`}
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
          <span className="text-xs font-medium text-gray-700 w-16 text-right shrink-0">
            ${d.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        </div>
      ))}
    </div>
  );
}

// ---- Summary card ----
function SummaryCard({ label, value, sub, icon, color, currency, rate }: {
  label: string; value: number; sub?: string; icon: React.ReactNode;
  color: string; currency: string; rate: number;
}) {
  const display = currency === 'MVR' ? value * rate : value;
  const sym = currency === 'MVR' ? 'MVR' : '$';
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {sym}{display.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </p>
          {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
        </div>
        <div className="p-2 rounded-lg bg-white/60">{icon}</div>
      </div>
    </div>
  );
}

// ---- Add Expense Dialog ----
function ExpenseDialog({
  open, onOpenChange, onSaved, initial,
}: {
  open: boolean; onOpenChange: (v: boolean) => void;
  onSaved: () => void; initial?: Expense | null;
}) {
  const [form, setForm] = useState<any>({
    category: 'OTHER', title: '', amount: '', currency: 'USD',
    status: 'PENDING', dueDate: '', notes: '', description: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(initial ? {
        ...initial,
        amount: String(initial.amount),
        dueDate: initial.dueDate ? initial.dueDate.split('T')[0] : '',
      } : { category: 'OTHER', title: '', amount: '', currency: 'USD', status: 'PENDING', dueDate: '', notes: '', description: '' });
    }
  }, [open, initial]);

  async function save() {
    if (!form.title || !form.amount) return;
    setSaving(true);
    try {
      const url = initial ? `/api/admin/finance/expenses/${initial.id}` : '/api/admin/finance/expenses';
      await fetch(url, {
        method: initial ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
      });
      onSaved();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  const set = (k: string, v: any) => setForm((p: any) => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Category</Label>
              <Select value={form.category} onValueChange={v => set('category', v)}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => set('status', v)}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['PENDING','APPROVED','PAID','OVERDUE','CANCELLED'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Title *</Label>
            <Input className="h-8 text-xs mt-1" value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Monthly electricity bill" />
          </div>
          <div>
            <Label className="text-xs">Description</Label>
            <Input className="h-8 text-xs mt-1" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Optional details" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Amount *</Label>
              <Input className="h-8 text-xs mt-1" type="number" min="0" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Currency</Label>
              <Select value={form.currency} onValueChange={v => set('currency', v)}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="MVR">MVR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Due Date</Label>
            <Input className="h-8 text-xs mt-1" type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea className="text-xs mt-1 min-h-[60px]" value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-teal-600 hover:bg-teal-700" onClick={save} disabled={saving || !form.title || !form.amount}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {initial ? 'Save' : 'Add Expense'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---- Transaction row ----
function TxRow({ row }: { row: TxRow }) {
  const isIncome = row.type === 'INCOME';
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b last:border-0 hover:bg-gray-50">
      <div className={`w-1.5 h-8 rounded-full shrink-0 ${isIncome ? 'bg-green-400' : 'bg-red-400'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{row.category}</p>
        <p className="text-xs text-gray-400 truncate">{row.description}</p>
      </div>
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[row.status] ?? 'bg-gray-100 text-gray-500'}`}>
        {row.status}
      </span>
      <span className={`text-sm font-bold shrink-0 ${isIncome ? 'text-green-700' : 'text-red-600'}`}>
        {isIncome ? '+' : '-'}${row.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </span>
      <span className="text-[11px] text-gray-400 shrink-0 hidden md:block">
        {new Date(row.date).toLocaleDateString()}
      </span>
      <Link href={row.link}>
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-gray-400"><ArrowRight className="h-3 w-3" /></Button>
      </Link>
    </div>
  );
}

// ---- Main component ----
export function FinanceManager({ exchangeRate = 15.4 }: { exchangeRate?: number }) {
  const [period, setPeriod] = useState('month');
  const [currency, setCurrency] = useState<'USD' | 'MVR'>('USD');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [sumLoading, setSumLoading] = useState(true);
  const [txRows, setTxRows] = useState<TxRow[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [txType, setTxType] = useState('ALL');
  const [txPage, setTxPage] = useState(1);
  const [txTotal, setTxTotal] = useState(0);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expLoading, setExpLoading] = useState(false);
  const [expenseDialog, setExpenseDialog] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [payroll, setPayroll] = useState<PayrollEntry[]>([]);
  const [payrollLoading, setPayrollLoading] = useState(false);
  const [payrollPeriod, setPayrollPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setSumLoading(true);
    try {
      const res = await fetch(`/api/admin/finance/summary?period=${period}`);
      const data = await res.json();
      setSummary(data);
    } finally { setSumLoading(false); }
  }, [period]);

  const loadTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const res = await fetch(`/api/admin/finance/transactions?type=${txType}&page=${txPage}`);
      const data = await res.json();
      setTxRows(data.rows ?? []);
      setTxTotal(data.total ?? 0);
    } finally { setTxLoading(false); }
  }, [txType, txPage]);

  const loadExpenses = useCallback(async () => {
    setExpLoading(true);
    try {
      const res = await fetch('/api/admin/finance/expenses');
      const data = await res.json();
      setExpenses(data.expenses ?? []);
    } finally { setExpLoading(false); }
  }, []);

  const loadPayroll = useCallback(async () => {
    setPayrollLoading(true);
    try {
      const res = await fetch(`/api/admin/finance/payroll?period=${payrollPeriod}`);
      const data = await res.json();
      setPayroll(data.entries ?? []);
    } finally { setPayrollLoading(false); }
  }, [payrollPeriod]);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  async function generatePayroll() {
    setGenerating(true); setGenResult(null);
    try {
      const res = await fetch('/api/admin/finance/payroll/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period: payrollPeriod }),
      });
      const data = await res.json();
      setGenResult(`Generated ${data.created} new + ${data.updated} updated entries for ${data.period}`);
      await loadPayroll();
    } finally { setGenerating(false); }
  }

  async function markPayrollPaid(id: string) {
    await fetch('/api/admin/finance/payroll/generate', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: 'PAID' }),
    });
    await loadPayroll();
  }

  async function deleteExpense(id: string) {
    if (!confirm('Delete this expense?')) return;
    await fetch(`/api/admin/finance/expenses/${id}`, { method: 'DELETE' });
    await loadExpenses();
  }

  const fmt = (v: number) => {
    const display = currency === 'MVR' ? v * exchangeRate : v;
    return `${currency === 'MVR' ? 'MVR' : '$'}${display.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance</h1>
          <p className="text-sm text-gray-500 mt-0.5">Revenue, expenses and payroll overview</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Currency toggle */}
          <div className="flex rounded-md border overflow-hidden text-xs">
            {(['USD', 'MVR'] as const).map(c => (
              <button key={c} onClick={() => setCurrency(c)}
                className={`px-3 py-1.5 font-medium ${currency === c ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                {c}
              </button>
            ))}
          </div>
          {/* Period picker */}
          <div className="flex rounded-md border overflow-hidden text-xs">
            {PERIODS.map(p => (
              <button key={p.value} onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 ${period === p.value ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                {p.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={loadSummary} disabled={sumLoading} className="h-8">
            {sumLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      {sumLoading ? (
        <div className="flex items-center justify-center h-32"><Loader2 className="h-8 w-8 animate-spin text-teal-600" /></div>
      ) : summary ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-5">
            <SummaryCard label="Total Revenue" value={summary.totalRevenue} icon={<TrendingUp className="h-5 w-5 text-teal-600" />} color="bg-teal-50 border-teal-100" currency={currency} rate={exchangeRate} />
            <SummaryCard label="Received" value={summary.totalReceived} sub="Payments collected" icon={<CheckCircle2 className="h-5 w-5 text-green-600" />} color="bg-green-50 border-green-100" currency={currency} rate={exchangeRate} />
            <SummaryCard label="Receivable" value={summary.totalReceivable} sub="Outstanding balances" icon={<Clock className="h-5 w-5 text-yellow-600" />} color="bg-yellow-50 border-yellow-100" currency={currency} rate={exchangeRate} />
            <SummaryCard label="Expenses" value={summary.totalExpenses} sub={`${fmt(summary.expensePending)} pending`} icon={<TrendingDown className="h-5 w-5 text-red-500" />} color="bg-red-50 border-red-100" currency={currency} rate={exchangeRate} />
            <SummaryCard label="Net Position" value={summary.netPosition} sub="Received − paid expenses" icon={<DollarSign className="h-5 w-5 text-indigo-600" />} color={`${summary.netPosition >= 0 ? 'bg-indigo-50 border-indigo-100' : 'bg-red-50 border-red-200'}`} currency={currency} rate={exchangeRate} />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <div className="rounded-xl border bg-white p-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-teal-600" />
                <h3 className="font-semibold text-sm text-gray-800">Revenue by Source</h3>
              </div>
              {summary.revenueBySource.length > 0
                ? <MiniBarChart data={summary.revenueBySource} colorKey="revenue" />
                : <p className="text-sm text-gray-400 text-center py-4">No revenue data</p>}
            </div>
            <div className="rounded-xl border bg-white p-4">
              <div className="flex items-center gap-2 mb-3">
                <Receipt className="h-4 w-4 text-red-500" />
                <h3 className="font-semibold text-sm text-gray-800">Expenses by Category</h3>
              </div>
              {summary.expenseByCategory.length > 0
                ? <MiniBarChart data={summary.expenseByCategory} colorKey="category" />
                : <p className="text-sm text-gray-400 text-center py-4">No expense data</p>}
            </div>
          </div>
        </>
      ) : null}

      {/* Tabs */}
      <Tabs defaultValue="receivables" className="bg-white rounded-xl border overflow-hidden">
        <TabsList className="w-full rounded-none border-b bg-gray-50 h-10">
          <TabsTrigger value="receivables" className="flex-1 text-xs" onClick={() => {}}>Receivables</TabsTrigger>
          <TabsTrigger value="received" className="flex-1 text-xs" onClick={() => { setTxType('INCOME'); setTxPage(1); loadTransactions(); }}>Received</TabsTrigger>
          <TabsTrigger value="expenses" className="flex-1 text-xs" onClick={loadExpenses}>Expenses</TabsTrigger>
          <TabsTrigger value="payroll" className="flex-1 text-xs" onClick={loadPayroll}>Payroll</TabsTrigger>
          <TabsTrigger value="ledger" className="flex-1 text-xs" onClick={() => { setTxType('ALL'); setTxPage(1); loadTransactions(); }}>Full Ledger</TabsTrigger>
        </TabsList>

        {/* Receivables */}
        <TabsContent value="receivables" className="m-0">
          <div className="p-4 border-b bg-yellow-50">
            <p className="text-sm text-yellow-800 font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Outstanding amounts owed to the property
            </p>
          </div>
          {summary && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
              {[
                { label: 'Booking Balances', value: summary.breakdown.bookingReceivable, desc: 'Confirmed & in-house', link: '/admin/reservations' },
                { label: 'F&B Open Bills',   value: summary.breakdown.fnbReceivable,     desc: 'Open & closed F&B bills', link: '/admin/fnb' },
                { label: 'Mini Bar Pending', value: summary.breakdown.minibarReceivable, desc: 'Pending charges', link: '/admin/minibar' },
                { label: 'Services',         value: summary.breakdown.serviceReceivable, desc: 'Uncompleted orders', link: '/admin/extra-services' },
              ].filter(r => r.value > 0).map(r => (
                <Link key={r.label} href={r.link}>
                  <div className="rounded-lg border p-4 hover:bg-gray-50 transition-colors cursor-pointer">
                    <p className="text-xs text-gray-500">{r.desc}</p>
                    <p className="font-semibold text-sm text-gray-800 mt-0.5">{r.label}</p>
                    <p className="text-xl font-bold text-yellow-700 mt-1">{fmt(r.value)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Received */}
        <TabsContent value="received" className="m-0">
          <div className="flex items-center justify-between px-4 py-2.5 border-b">
            <p className="text-xs text-gray-500">{txTotal} records</p>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={txPage <= 1} onClick={() => setTxPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-xs text-gray-500">Page {txPage}</span>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={txPage * 50 >= txTotal} onClick={() => setTxPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
          {txLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-teal-600" /></div>
          ) : (
            <div>
              {txRows.filter(r => r.type === 'INCOME' && r.status !== 'RECEIVABLE').length === 0
                ? <p className="text-sm text-gray-400 text-center py-10">No payments received yet</p>
                : txRows.filter(r => r.type === 'INCOME' && r.status !== 'RECEIVABLE').map(r => <TxRow key={r.id} row={r} />)}
            </div>
          )}
        </TabsContent>

        {/* Expenses */}
        <TabsContent value="expenses" className="m-0">
          <div className="flex items-center justify-between px-4 py-2.5 border-b">
            <p className="text-xs text-gray-500">{expenses.length} expenses</p>
            <Button size="sm" className="h-7 text-xs bg-teal-600 hover:bg-teal-700" onClick={() => { setEditExpense(null); setExpenseDialog(true); }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Expense
            </Button>
          </div>
          {expLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-teal-600" /></div>
          ) : (
            <div>
              {expenses.length === 0
                ? <p className="text-sm text-gray-400 text-center py-10">No expenses recorded</p>
                : expenses.map(e => (
                  <div key={e.id} className="flex items-center gap-3 px-4 py-2.5 border-b last:border-0 hover:bg-gray-50">
                    <div className={`w-2 h-2 rounded-full shrink-0 ${CATEGORY_COLORS[e.category] ?? 'bg-gray-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{e.title}</p>
                      <p className="text-xs text-gray-400">{e.category}{e.dueDate ? ` · Due ${new Date(e.dueDate).toLocaleDateString()}` : ''}</p>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[e.status] ?? ''}`}>{e.status}</span>
                    <span className="text-sm font-bold text-red-600 shrink-0">
                      -{e.currency === 'MVR' ? 'MVR' : '$'}{e.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {e.status !== 'PAID' && (
                        <Button size="sm" variant="outline" className="h-6 text-[11px] px-2" onClick={async () => {
                          await fetch(`/api/admin/finance/expenses/${e.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'PAID' }) });
                          loadExpenses();
                        }}>Paid</Button>
                      )}
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => { setEditExpense(e); setExpenseDialog(true); }}>Edit</Button>
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px] text-red-500" onClick={() => deleteExpense(e.id)}>Del</Button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </TabsContent>

        {/* Payroll */}
        <TabsContent value="payroll" className="m-0">
          <div className="flex items-center justify-between px-4 py-2.5 border-b flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Input
                type="month"
                value={payrollPeriod}
                onChange={e => setPayrollPeriod(e.target.value)}
                className="h-7 text-xs w-36"
              />
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={loadPayroll}>
                <RefreshCw className="h-3 w-3 mr-1" /> Load
              </Button>
            </div>
            <div className="flex items-center gap-2">
              {genResult && <span className="text-xs text-teal-700">{genResult}</span>}
              <Button size="sm" className="h-7 text-xs bg-teal-600 hover:bg-teal-700" onClick={generatePayroll} disabled={generating}>
                {generating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Users className="h-3.5 w-3.5 mr-1" />}
                Generate Payroll
              </Button>
            </div>
          </div>
          {payrollLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-teal-600" /></div>
          ) : payroll.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Banknote className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No payroll for {payrollPeriod}</p>
              <p className="text-xs mt-1">Click &quot;Generate Payroll&quot; to compute from clock records</p>
            </div>
          ) : (
            <div>
              {/* Header row */}
              <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 border-b text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
                <div className="w-40">Staff</div>
                <div className="w-24">Department</div>
                <div className="w-20 text-right">Base</div>
                <div className="w-16 text-right">Hours</div>
                <div className="w-20 text-right">Overtime</div>
                <div className="w-20 text-right">Deductions</div>
                <div className="w-20 text-right font-bold">Net Pay</div>
                <div className="w-20">Status</div>
                <div className="flex-1" />
              </div>
              {payroll.map(e => (
                <div key={e.id} className="flex items-center gap-3 px-4 py-2.5 border-b last:border-0 hover:bg-gray-50 text-sm">
                  <div className="w-40 truncate font-medium text-gray-800">{e.staff.user.name ?? e.staff.employeeId}</div>
                  <div className="w-24 text-xs text-gray-500 truncate">{e.staff.department}</div>
                  <div className="w-20 text-right text-xs text-gray-600">{fmt(e.baseSalary)}</div>
                  <div className="w-16 text-right text-xs text-gray-600">{e.hoursWorked.toFixed(1)}h</div>
                  <div className="w-20 text-right text-xs text-gray-600">{e.overtimePay > 0 ? `+${fmt(e.overtimePay)}` : '—'}</div>
                  <div className="w-20 text-right text-xs text-red-500">{e.deductions > 0 ? `-${fmt(e.deductions)}` : '—'}</div>
                  <div className="w-20 text-right font-bold text-gray-900">{fmt(e.netPay)}</div>
                  <div className="w-20">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[e.status] ?? ''}`}>{e.status}</span>
                  </div>
                  <div className="flex-1 flex justify-end">
                    {e.status !== 'PAID' && (
                      <Button size="sm" className="h-6 text-[11px] px-2 bg-green-600 hover:bg-green-700" onClick={() => markPayrollPaid(e.id)}>
                        Mark Paid
                      </Button>
                    )}
                    {e.paidAt && <span className="text-[10px] text-gray-400 ml-2">{new Date(e.paidAt).toLocaleDateString()}</span>}
                  </div>
                </div>
              ))}
              <div className="flex justify-end px-4 py-3 border-t bg-gray-50 text-sm font-bold text-gray-800">
                Total Payroll: {fmt(payroll.reduce((s, e) => s + e.netPay, 0))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Full Ledger */}
        <TabsContent value="ledger" className="m-0">
          <div className="flex items-center justify-between px-4 py-2.5 border-b flex-wrap gap-2">
            <div className="flex rounded-md border overflow-hidden text-xs">
              {[['ALL','All'],['INCOME','Income'],['EXPENSE','Expenses']].map(([v,l]) => (
                <button key={v} onClick={() => { setTxType(v); setTxPage(1); }}
                  className={`px-3 py-1.5 ${txType === v ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>{l}</button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={txPage <= 1} onClick={() => setTxPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-xs text-gray-500">{txTotal} records · Page {txPage}</span>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" disabled={txPage * 50 >= txTotal} onClick={() => setTxPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
          {txLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-teal-600" /></div>
          ) : txRows.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">No transactions found</p>
          ) : (
            <div>{txRows.map(r => <TxRow key={r.id} row={r} />)}</div>
          )}
        </TabsContent>
      </Tabs>

      <ExpenseDialog
        open={expenseDialog}
        onOpenChange={setExpenseDialog}
        onSaved={loadExpenses}
        initial={editExpense}
      />
    </div>
  );
}
