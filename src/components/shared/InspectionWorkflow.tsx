import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CalendarDays,
  Clock,
  ClipboardCheck,
  FileText,
  CheckCircle2,
  Plus,
  Trash2,
  Send,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toast';
import { formatCurrency, formatDate } from '@/lib/format';
import { generateMilestones } from '@/lib/pricing';
import { Spinner } from '@/components/ui';
import type { JobRequest, EstimateBreakdown, EstimateLineItem } from '@/lib/types';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface InspectionWorkflowProps {
  job: JobRequest;
  isClient: boolean;
  contractorId: string | null;
  onJobUpdate: (job: JobRequest) => void;
}

type LineCategory = EstimateLineItem['category'];

const STEPS = [
  'inspection_scheduled',
  'inspection_confirmed',
  'final_quote_pending',
  'final_quote_approved',
] as const;

const TIME_SLOTS = [
  { value: 'morning', labelEn: 'Morning (8 AM – 12 PM)', labelEs: 'Mañana (8 AM – 12 PM)' },
  { value: 'afternoon', labelEn: 'Afternoon (12 – 5 PM)', labelEs: 'Tarde (12 – 5 PM)' },
  { value: 'evening', labelEn: 'Evening (5 – 8 PM)', labelEs: 'Noche (5 – 8 PM)' },
];

const CATEGORY_OPTIONS: { value: LineCategory; labelEn: string; labelEs: string }[] = [
  { value: 'labor', labelEn: 'Labor', labelEs: 'Mano de obra' },
  { value: 'materials', labelEn: 'Materials', labelEs: 'Materiales' },
  { value: 'equipment', labelEn: 'Equipment', labelEs: 'Equipo' },
  { value: 'permits', labelEn: 'Permits', labelEs: 'Permisos' },
  { value: 'other', labelEn: 'Other', labelEs: 'Otro' },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function emptyLine(): EstimateLineItem {
  return { category: 'labor', description: '', quantity: 1, unit_price: 0, total: 0 };
}

function bi(es: boolean, spanish: string, english: string) {
  return es ? spanish : english;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function InspectionWorkflow({ job, isClient, contractorId, onJobUpdate }: InspectionWorkflowProps) {
  const { i18n } = useTranslation();
  const { showToast } = useToast();
  const es = i18n.language === 'es';

  const [loading, setLoading] = useState(false);

  // Step 1 state
  const [inspDate, setInspDate] = useState(job.inspection_date ?? '');
  const [inspSlot, setInspSlot] = useState(job.inspection_time_slot ?? '');

  // Step 3 state
  const existingBreakdown = job.final_quote_breakdown;
  const [lineItems, setLineItems] = useState<EstimateLineItem[]>(
    existingBreakdown?.line_items?.length ? existingBreakdown.line_items : [emptyLine()],
  );
  const [overheadPct, setOverheadPct] = useState(existingBreakdown?.overhead_pct ?? 10);
  const [paymentTerms, setPaymentTerms] = useState(existingBreakdown?.payment_terms ?? '');
  const [warranty, setWarranty] = useState(existingBreakdown?.warranty ?? '');

  const currentIdx = STEPS.indexOf(job.status as (typeof STEPS)[number]);

  /* ---------- derived totals ---------- */
  const { subtotal, overheadAmount, grandTotal } = useMemo(() => {
    const sub = lineItems.reduce((s, li) => s + li.quantity * li.unit_price, 0);
    const oh = Math.round(sub * (overheadPct / 100) * 100) / 100;
    return { subtotal: sub, overheadAmount: oh, grandTotal: Math.round((sub + oh) * 100) / 100 };
  }, [lineItems, overheadPct]);

  /* ---------- line-item helpers ---------- */
  function updateLine(idx: number, field: keyof EstimateLineItem, value: string | number) {
    setLineItems((prev) => prev.map((li, i) => {
      if (i !== idx) return li;
      const next = { ...li, [field]: value };
      next.total = Math.round(next.quantity * next.unit_price * 100) / 100;
      return next;
    }));
  }

  /* ---------------------------------------------------------------- */
  /*  Actions                                                          */
  /* ---------------------------------------------------------------- */

  async function submitInspectionDate() {
    if (!inspDate || !inspSlot) {
      showToast(bi(es, 'Selecciona fecha y horario', 'Select a date and time slot'), 'error');
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from('job_requests')
      .update({ inspection_date: inspDate, inspection_time_slot: inspSlot, status: 'inspection_confirmed' })
      .eq('id', job.id);
    setLoading(false);
    if (error) { showToast(error.message, 'error'); return; }
    onJobUpdate({ ...job, inspection_date: inspDate, inspection_time_slot: inspSlot, status: 'inspection_confirmed' });
    showToast(bi(es, 'Inspección confirmada', 'Inspection confirmed'), 'success');
  }

  async function completeInspection() {
    setLoading(true);
    const { error } = await supabase
      .from('job_requests')
      .update({ status: 'final_quote_pending' })
      .eq('id', job.id);
    setLoading(false);
    if (error) { showToast(error.message, 'error'); return; }
    onJobUpdate({ ...job, status: 'final_quote_pending' });
    showToast(bi(es, 'Cotización final pendiente', 'Final quote pending'), 'success');
  }

  async function submitFinalQuote() {
    if (lineItems.some((li) => !li.description.trim())) {
      showToast(bi(es, 'Completa la descripción de cada línea', 'Fill in every line description'), 'error');
      return;
    }
    if (grandTotal <= 0) {
      showToast(bi(es, 'El total debe ser mayor a 0', 'Total must be greater than 0'), 'error');
      return;
    }
    const breakdown: EstimateBreakdown = {
      line_items: lineItems.map((li) => ({ ...li, total: Math.round(li.quantity * li.unit_price * 100) / 100 })),
      subtotal,
      overhead_pct: overheadPct,
      overhead_amount: overheadAmount,
      grand_total: grandTotal,
      warranty,
      payment_terms: paymentTerms,
      estimated_weeks: null,
    };
    setLoading(true);
    const { error } = await supabase
      .from('job_requests')
      .update({ final_quote_amount: grandTotal, final_quote_breakdown: breakdown, final_quote_status: 'submitted' })
      .eq('id', job.id);
    setLoading(false);
    if (error) { showToast(error.message, 'error'); return; }
    onJobUpdate({ ...job, final_quote_amount: grandTotal, final_quote_breakdown: breakdown, final_quote_status: 'submitted' });
    showToast(bi(es, 'Cotización enviada', 'Quote submitted'), 'success');
  }

  async function approveFinalQuote() {
    setLoading(true);
    const amount = job.final_quote_amount ?? 0;
    const phases = generateMilestones(amount);
    const milestones = phases.map((p) => ({
      project_id: job.id,
      phase_number: p.phase_number,
      label: p.label,
      percentage: p.percentage,
      amount: p.amount,
      status: 'pending_deposit',
    }));

    const { error: msErr } = await supabase.from('milestones').insert(milestones);
    if (msErr) { setLoading(false); showToast(msErr.message, 'error'); return; }

    const { error } = await supabase
      .from('job_requests')
      .update({ status: 'in_progress', final_quote_status: 'approved' })
      .eq('id', job.id);
    setLoading(false);
    if (error) { showToast(error.message, 'error'); return; }
    onJobUpdate({ ...job, status: 'in_progress', final_quote_status: 'approved' });
    showToast(bi(es, 'Proyecto aprobado — fondos en depósito', 'Project approved — funds deposited'), 'success');
  }

  /* ---------------------------------------------------------------- */
  /*  Progress Stepper                                                 */
  /* ---------------------------------------------------------------- */

  const stepLabels = [
    { icon: CalendarDays, en: 'Schedule', es: 'Agendar' },
    { icon: ClipboardCheck, en: 'Inspect', es: 'Inspección' },
    { icon: FileText, en: 'Final Quote', es: 'Cotización' },
    { icon: CheckCircle2, en: 'Approve', es: 'Aprobar' },
  ];

  function Stepper() {
    return (
      <div className="flex items-center justify-between mb-6">
        {stepLabels.map((step, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          const Icon = step.icon;
          return (
            <div key={i} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                    done ? 'bg-accent-500 text-white' : active ? 'bg-pixio-500 text-white' : 'bg-ink-100 text-ink-400'
                  }`}
                >
                  {done ? <CheckCircle2 size={18} /> : <Icon size={18} />}
                </div>
                <span className={`text-[10px] font-medium text-center leading-tight ${active ? 'text-pixio-600' : done ? 'text-accent-600' : 'text-ink-400'}`}>
                  {es ? step.es : step.en}
                </span>
              </div>
              {i < stepLabels.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 rounded ${i < currentIdx ? 'bg-accent-400' : 'bg-ink-200'}`} />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Step Renderers                                                   */
  /* ---------------------------------------------------------------- */

  function Step1() {
    if (!isClient) {
      return (
        <div className="rounded-lg bg-pixio-50 p-4 flex items-start gap-3">
          <Info size={18} className="text-pixio-600 mt-0.5 shrink-0" />
          <p className="text-sm text-pixio-700">{bi(es, 'Esperando que el cliente seleccione fecha de inspección.', 'Waiting for the client to select an inspection date.')}</p>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-ink-800">{bi(es, 'Programar inspección', 'Schedule Inspection')}</h3>
        <div>
          <label className="label">{bi(es, 'Fecha', 'Date')}</label>
          <input
            type="date"
            className="input"
            value={inspDate}
            min={new Date().toISOString().split('T')[0]}
            onChange={(e) => setInspDate(e.target.value)}
          />
        </div>
        <div>
          <label className="label">{bi(es, 'Horario', 'Time Slot')}</label>
          <div className="grid grid-cols-1 gap-2">
            {TIME_SLOTS.map((slot) => (
              <button
                key={slot.value}
                type="button"
                onClick={() => setInspSlot(slot.value)}
                className={`p-3 rounded-xl border text-sm font-medium text-left transition-colors ${
                  inspSlot === slot.value
                    ? 'border-pixio-500 bg-pixio-50 text-pixio-700'
                    : 'border-ink-200 text-ink-600 hover:border-ink-300'
                }`}
              >
                <Clock size={14} className="inline mr-2" />
                {es ? slot.labelEs : slot.labelEn}
              </button>
            ))}
          </div>
        </div>
        <button className="btn-primary w-full" disabled={loading} onClick={submitInspectionDate}>
          {loading ? <Spinner className="text-white" /> : bi(es, 'Confirmar inspección', 'Confirm Inspection')}
        </button>
      </div>
    );
  }

  function Step2() {
    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-pixio-50 border border-pixio-200 p-4 space-y-2">
          <h3 className="text-sm font-semibold text-pixio-700 flex items-center gap-2">
            <CalendarDays size={16} />
            {bi(es, 'Inspección confirmada', 'Inspection Confirmed')}
          </h3>
          <div className="flex items-center gap-4 text-sm text-pixio-600">
            <span className="flex items-center gap-1.5">
              <CalendarDays size={14} />
              {job.inspection_date ? formatDate(job.inspection_date) : '—'}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={14} />
              {TIME_SLOTS.find((s) => s.value === job.inspection_time_slot)?.[es ? 'labelEs' : 'labelEn'] ?? job.inspection_time_slot}
            </span>
          </div>
        </div>

        {!isClient && (
          <button className="btn-primary w-full" disabled={loading} onClick={completeInspection}>
            {loading ? <Spinner className="text-white" /> : bi(es, 'Completar Inspección y Enviar Cotización Final', 'Complete Inspection & Submit Final Quote')}
          </button>
        )}
        {isClient && (
          <div className="rounded-lg bg-ink-50 p-3 flex items-start gap-2">
            <Info size={16} className="text-ink-400 mt-0.5 shrink-0" />
            <p className="text-xs text-ink-500">{bi(es, 'El contratista realizará la inspección y luego enviará la cotización final.', 'The contractor will perform the inspection and then submit the final quote.')}</p>
          </div>
        )}
      </div>
    );
  }

  function Step3Contractor() {
    return (
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-ink-800">{bi(es, 'Cotización final', 'Final Quote')}</h3>

        {/* Line items */}
        <div className="space-y-3">
          {lineItems.map((li, idx) => (
            <div key={idx} className="card p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-ink-500">#{idx + 1}</span>
                {lineItems.length > 1 && (
                  <button type="button" onClick={() => setLineItems((p) => p.filter((_, i) => i !== idx))} className="p-1 rounded-lg hover:bg-danger-50 text-danger-500">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <select
                className="input text-sm"
                value={li.category}
                onChange={(e) => updateLine(idx, 'category', e.target.value as LineCategory)}
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>{es ? c.labelEs : c.labelEn}</option>
                ))}
              </select>
              <input
                className="input text-sm"
                placeholder={bi(es, 'Descripción', 'Description')}
                value={li.description}
                onChange={(e) => updateLine(idx, 'description', e.target.value)}
              />
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-ink-400">{bi(es, 'Cant.', 'Qty')}</label>
                  <input type="number" min={1} className="input text-sm" value={li.quantity} onChange={(e) => updateLine(idx, 'quantity', Math.max(1, Number(e.target.value)))} />
                </div>
                <div>
                  <label className="text-[10px] text-ink-400">{bi(es, 'Precio unit.', 'Unit Price')}</label>
                  <input type="number" min={0} step={0.01} className="input text-sm" value={li.unit_price} onChange={(e) => updateLine(idx, 'unit_price', Math.max(0, Number(e.target.value)))} />
                </div>
                <div>
                  <label className="text-[10px] text-ink-400">Total</label>
                  <div className="input text-sm bg-ink-50 text-ink-600">{formatCurrency(li.quantity * li.unit_price)}</div>
                </div>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setLineItems((p) => [...p, emptyLine()])} className="btn-secondary w-full flex items-center justify-center gap-1.5 text-sm">
            <Plus size={14} /> {bi(es, 'Agregar línea', 'Add Line')}
          </button>
        </div>

        {/* Overhead */}
        <div>
          <label className="label">{bi(es, 'Overhead %', 'Overhead %')}</label>
          <input type="number" min={0} max={100} className="input" value={overheadPct} onChange={(e) => setOverheadPct(Math.max(0, Number(e.target.value)))} />
        </div>

        {/* Totals */}
        <div className="card p-4 space-y-2 text-sm">
          <div className="flex justify-between text-ink-600"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
          <div className="flex justify-between text-ink-600"><span>Overhead ({overheadPct}%)</span><span>{formatCurrency(overheadAmount)}</span></div>
          <div className="flex justify-between text-ink-800 font-bold text-base border-t border-ink-100 pt-2">
            <span>Total</span><span>{formatCurrency(grandTotal)}</span>
          </div>
        </div>

        {/* Payment terms & warranty */}
        <div>
          <label className="label">{bi(es, 'Términos de pago', 'Payment Terms')}</label>
          <textarea className="input min-h-[60px]" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
        </div>
        <div>
          <label className="label">{bi(es, 'Garantía', 'Warranty')}</label>
          <textarea className="input min-h-[60px]" value={warranty} onChange={(e) => setWarranty(e.target.value)} />
        </div>

        <button className="btn-primary w-full flex items-center justify-center gap-2" disabled={loading} onClick={submitFinalQuote}>
          {loading ? <Spinner className="text-white" /> : <><Send size={16} /> {bi(es, 'Enviar cotización final', 'Submit Final Quote')}</>}
        </button>
      </div>
    );
  }

  function Step3Client() {
    const bd = job.final_quote_breakdown;
    if (!bd || job.final_quote_status !== 'submitted') {
      return (
        <div className="rounded-lg bg-pixio-50 p-4 flex items-start gap-3">
          <Info size={18} className="text-pixio-600 mt-0.5 shrink-0" />
          <p className="text-sm text-pixio-700">{bi(es, 'El contratista está preparando la cotización final.', 'The contractor is preparing the final quote.')}</p>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-ink-800">{bi(es, 'Cotización final recibida', 'Final Quote Received')}</h3>

        {bd.line_items.map((li, idx) => (
          <div key={idx} className="card p-3 flex items-center justify-between text-sm">
            <div>
              <span className="font-medium text-ink-700">{li.description}</span>
              <span className="ml-2 text-ink-400 text-xs">{CATEGORY_OPTIONS.find((c) => c.value === li.category)?.[es ? 'labelEs' : 'labelEn']}</span>
            </div>
            <span className="font-medium text-ink-800">{li.quantity} × {formatCurrency(li.unit_price)}</span>
          </div>
        ))}

        <div className="card p-4 space-y-2 text-sm">
          <div className="flex justify-between text-ink-600"><span>Subtotal</span><span>{formatCurrency(bd.subtotal)}</span></div>
          <div className="flex justify-between text-ink-600"><span>Overhead ({bd.overhead_pct}%)</span><span>{formatCurrency(bd.overhead_amount)}</span></div>
          <div className="flex justify-between text-ink-800 font-bold text-base border-t border-ink-100 pt-2">
            <span>Total</span><span>{formatCurrency(bd.grand_total)}</span>
          </div>
        </div>

        {bd.payment_terms && (
          <div className="text-sm"><span className="font-medium text-ink-700">{bi(es, 'Términos: ', 'Terms: ')}</span><span className="text-ink-600">{bd.payment_terms}</span></div>
        )}
        {bd.warranty && (
          <div className="text-sm"><span className="font-medium text-ink-700">{bi(es, 'Garantía: ', 'Warranty: ')}</span><span className="text-ink-600">{bd.warranty}</span></div>
        )}

        <button className="btn-primary w-full flex items-center justify-center gap-2" disabled={loading} onClick={approveFinalQuote}>
          {loading ? <Spinner className="text-white" /> : <><ShieldCheck size={16} /> {bi(es, 'Aprobar Cotización Final y Depositar Fondos', 'Approve Final Quote & Deposit Funds')}</>}
        </button>
      </div>
    );
  }

  function Step3() {
    return isClient ? <Step3Client /> : <Step3Contractor />;
  }

  function Step4() {
    return (
      <div className="flex flex-col items-center text-center py-6 space-y-3 animate-fade-in">
        <div className="w-14 h-14 rounded-2xl bg-accent-50 flex items-center justify-center">
          <CheckCircle2 size={28} className="text-accent-500" />
        </div>
        <h3 className="text-lg font-semibold text-ink-800">{bi(es, '¡Proyecto en marcha!', 'Project In Progress!')}</h3>
        <p className="text-sm text-ink-500 max-w-xs">
          {bi(es, 'La cotización fue aprobada y los fondos fueron depositados. El trabajo puede comenzar.', 'The quote was approved and funds deposited. Work can begin.')}
        </p>
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  if (currentIdx === -1) return null;

  return (
    <div className="card p-5 space-y-4 animate-fade-in">
      <Stepper />
      {job.status === 'inspection_scheduled' && <Step1 />}
      {job.status === 'inspection_confirmed' && <Step2 />}
      {job.status === 'final_quote_pending' && <Step3 />}
      {job.status === 'final_quote_approved' && <Step4 />}
    </div>
  );
}
