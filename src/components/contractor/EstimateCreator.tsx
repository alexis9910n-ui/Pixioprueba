import { useState, useEffect, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import { fetchJobById, useCategories } from '@/lib/hooks';
import { getCategoryName } from '@/lib/categories';
import { formatCurrency } from '@/lib/format';
import { useToast } from '@/lib/toast';
import { supabase } from '@/lib/supabase';
import { Spinner } from '@/components/ui';
import {
  ArrowLeft, Plus, Trash2, Clock, ShieldCheck,
  CreditCard, ChevronDown, ChevronUp,
} from 'lucide-react';
import { getIcon } from '@/lib/icons';
import { VerificationGate } from '@/components/shared/VerifiedBadge';
import { PhotoGallery } from '@/components/shared/Lightbox';
import { AudioPlayer } from '@/components/shared/VoiceRecorder';
import type { JobRequest, EstimateLineItem, EstimateBreakdown } from '@/lib/types';

type LineCategory = EstimateLineItem['category'];

const CATEGORIES: { value: LineCategory; labelEs: string; labelEn: string }[] = [
  { value: 'labor', labelEs: 'Mano de Obra', labelEn: 'Labor' },
  { value: 'materials', labelEs: 'Materiales', labelEn: 'Materials' },
  { value: 'equipment', labelEs: 'Equipos', labelEn: 'Equipment' },
  { value: 'permits', labelEs: 'Permisos', labelEn: 'Permits' },
  { value: 'other', labelEs: 'Otros', labelEn: 'Other' },
];

const WARRANTY_OPTIONS = [
  { value: '30 days', labelEs: '30 dias', labelEn: '30 days' },
  { value: '90 days', labelEs: '90 dias', labelEn: '90 days' },
  { value: '6 months', labelEs: '6 meses', labelEn: '6 months' },
  { value: '1 year', labelEs: '1 ano', labelEn: '1 year' },
  { value: '2 years', labelEs: '2 anos', labelEn: '2 years' },
];

const PAYMENT_OPTIONS = [
  { value: '50/50', labelEs: '50% Deposito, 50% al completar', labelEn: '50% Deposit, 50% on completion' },
  { value: '30/30/40', labelEs: '30% Inicio, 30% Avance, 40% Final', labelEn: '30% Start, 30% Progress, 40% Final' },
  { value: '100_complete', labelEs: '100% al completar', labelEn: '100% on completion' },
];

function emptyLine(): EstimateLineItem {
  return { category: 'labor', description: '', quantity: 1, unit_price: 0, total: 0 };
}

function catLabel(cat: LineCategory, isEs: boolean) {
  return CATEGORIES.find((c) => c.value === cat)?.[isEs ? 'labelEs' : 'labelEn'] || cat;
}

export function EstimateCreator({ projectId }: { projectId: string }) {
  const { i18n } = useTranslation();
  const isEs = i18n.language === 'es';
  const { navigate, goBack } = useNavigate();
  const { profile } = useAuth();
  const { showToast } = useToast();
  const { categories } = useCategories();

  const [project, setProject] = useState<JobRequest | null>(null);
  const [lines, setLines] = useState<EstimateLineItem[]>([emptyLine()]);
  const [overheadPct, setOverheadPct] = useState('0');
  const [estimatedWeeks, setEstimatedWeeks] = useState('');
  const [warranty, setWarranty] = useState('90 days');
  const [paymentTerms, setPaymentTerms] = useState('50/50');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchJobById(projectId).then((p) => { if (!cancelled) setProject(p); });
    return () => { cancelled = true; };
  }, [projectId]);

  const updateLine = (idx: number, field: keyof EstimateLineItem, value: string | number) => {
    setLines((prev) => prev.map((line, i) => {
      if (i !== idx) return line;
      const updated = { ...line, [field]: value };
      if (field === 'quantity' || field === 'unit_price') {
        updated.total = (Number(updated.quantity) || 0) * (Number(updated.unit_price) || 0);
      }
      return updated;
    }));
  };

  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (idx: number) => {
    if (lines.length <= 1) return;
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const subtotal = lines.reduce((sum, l) => sum + (l.total || 0), 0);
  const overhead = parseFloat(overheadPct) || 0;
  const overheadAmount = subtotal * (overhead / 100);
  const grandTotal = subtotal + overheadAmount;
  const slotsLeft = project ? 5 - project.quotes_count : 0;

  const laborTotal = lines.filter((l) => l.category === 'labor').reduce((s, l) => s + l.total, 0);
  const materialsTotal = lines.filter((l) => l.category === 'materials').reduce((s, l) => s + l.total, 0);
  const otherTotal = subtotal - laborTotal - materialsTotal;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile || !project) return;

    const validLines = lines.filter((l) => l.description.trim() && l.total > 0);
    if (validLines.length === 0) {
      showToast(isEs ? 'Agrega al menos un concepto con descripcion y monto' : 'Add at least one line item with description and amount', 'error');
      return;
    }
    if (slotsLeft <= 0) {
      showToast(isEs ? 'Limite de cotizaciones alcanzado' : 'Quote limit reached', 'error');
      return;
    }

    const { data: existing } = await supabase
      .from('job_quotes')
      .select('id')
      .eq('job_id', projectId)
      .eq('contractor_id', profile.id)
      .maybeSingle();
    if (existing) {
      showToast(isEs ? 'Ya enviaste una cotizacion para este trabajo' : 'You already submitted a quote for this job', 'error');
      return;
    }

    const breakdown: EstimateBreakdown = {
      line_items: validLines,
      subtotal,
      overhead_pct: overhead,
      overhead_amount: overheadAmount,
      grand_total: grandTotal,
      warranty,
      payment_terms: paymentTerms,
      estimated_weeks: estimatedWeeks ? parseFloat(estimatedWeeks) : null,
    };

    setLoading(true);
    const { error } = await supabase.from('job_quotes').insert({
      job_id: projectId,
      contractor_id: profile.id,
      proposed_amount: grandTotal,
      estimated_days: estimatedWeeks ? Math.round(parseFloat(estimatedWeeks) * 7) : null,
      notes: message.trim(),
      breakdown,
      status: 'pending',
    });

    if (error) {
      showToast(error.message, 'error');
      setLoading(false);
      return;
    }

    // Check if this was the 5th quote — lock the job
    const { count } = await supabase
      .from('job_quotes')
      .select('id', { count: 'exact', head: true })
      .eq('job_id', projectId);
    if (count && count >= 5) {
      await supabase.from('job_requests').update({ status: 'quote_limit_reached' }).eq('id', projectId).eq('status', 'open');
    }

    setLoading(false);
    showToast(isEs ? 'Cotizacion profesional enviada' : 'Professional estimate submitted', 'success');
    navigate('feed');
  };

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 bg-slate-950 min-h-screen">
        <Spinner className="text-emerald-400" size={24} />
        <button type="button" onClick={goBack} className="text-sm text-emerald-400 font-medium hover:underline mt-4">
          {isEs ? 'Volver' : 'Go back'}
        </button>
      </div>
    );
  }

  const cat = categories.find((c) => c.slug === project.category);
  const Icon = cat ? getIcon(cat.icon) : getIcon('Hammer');

  return (
    <div className="animate-fade-in min-h-screen bg-slate-950">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-700/50 px-4 py-3 flex items-center gap-3">
        <button type="button" onClick={goBack} className="p-1.5 rounded-lg hover:bg-slate-800">
          <ArrowLeft size={20} className="text-slate-400" />
        </button>
        <h1 className="font-semibold text-white text-sm">
          {isEs ? 'Hoja de Cotizacion Profesional' : 'Professional Estimate'}
        </h1>
        <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/25 rounded-md px-2 py-0.5 uppercase">
          Pro
        </span>
      </div>

      <div className="px-4 py-4 max-w-2xl mx-auto space-y-4 pb-24">
        {/* Project summary */}
        <div className="rounded-2xl bg-slate-800/80 border border-slate-700/50 p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <Icon size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white text-sm truncate">{project.title}</h3>
              {cat && <p className="text-xs text-slate-400">{getCategoryName(cat, i18n.language)}</p>}
            </div>
            <div className="text-right">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${slotsLeft > 2 ? 'bg-emerald-500/15 text-emerald-400' : slotsLeft > 0 ? 'bg-amber-500/15 text-amber-400' : 'bg-red-500/15 text-red-400'}`}>
                {slotsLeft} {isEs ? 'cupos' : 'slots'}
              </span>
            </div>
          </div>
          <p className="text-sm text-slate-300 mb-3">{project.description}</p>
          {project.image_urls && project.image_urls.length > 0 && (
            <div className="mb-3"><PhotoGallery urls={project.image_urls} /></div>
          )}
          {project.audio_note_url && (
            <div className="mb-3"><AudioPlayer url={project.audio_note_url} /></div>
          )}
        </div>

        <VerificationGate status={profile?.verification_status || 'unverified'}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Line items spreadsheet */}
            <div className="rounded-2xl bg-slate-800/80 border border-slate-700/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
                <h3 className="font-semibold text-white text-sm">
                  {isEs ? 'Desglose de Conceptos' : 'Line Item Breakdown'}
                </h3>
                <button type="button" onClick={addLine} className="flex items-center gap-1 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
                  <Plus size={14} /> {isEs ? 'Agregar' : 'Add'}
                </button>
              </div>

              {/* Column headers */}
              <div className="hidden sm:grid grid-cols-[120px_1fr_70px_90px_80px_32px] gap-2 px-4 py-2 bg-slate-900/50 text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                <span>{isEs ? 'Categoria' : 'Category'}</span>
                <span>{isEs ? 'Descripcion' : 'Description'}</span>
                <span>{isEs ? 'Cant.' : 'Qty'}</span>
                <span>{isEs ? 'P. Unit.' : 'Unit $'}</span>
                <span>{isEs ? 'Total' : 'Total'}</span>
                <span />
              </div>

              <div className="divide-y divide-slate-700/30">
                {lines.map((line, idx) => (
                  <div key={idx} className="px-4 py-3">
                    {/* Mobile layout */}
                    <div className="sm:hidden space-y-2">
                      <div className="flex gap-2">
                        <select
                          value={line.category}
                          onChange={(e) => updateLine(idx, 'category', e.target.value as LineCategory)}
                          className="flex-1 rounded-lg border border-slate-600 bg-slate-900 px-2 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c.value} value={c.value}>{isEs ? c.labelEs : c.labelEn}</option>
                          ))}
                        </select>
                        {lines.length > 1 && (
                          <button type="button" onClick={() => removeLine(idx)} className="p-2 text-slate-500 hover:text-red-400 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      <input
                        value={line.description}
                        onChange={(e) => updateLine(idx, 'description', e.target.value)}
                        placeholder={isEs ? 'Descripcion del concepto...' : 'Item description...'}
                        className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-slate-500 mb-0.5 block">{isEs ? 'Cant.' : 'Qty'}</label>
                          <input
                            type="number"
                            value={line.quantity || ''}
                            onChange={(e) => updateLine(idx, 'quantity', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.5"
                            className="w-full rounded-lg border border-slate-600 bg-slate-900 px-2 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 mb-0.5 block">{isEs ? 'P. Unit.' : 'Unit $'}</label>
                          <input
                            type="number"
                            value={line.unit_price || ''}
                            onChange={(e) => updateLine(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            className="w-full rounded-lg border border-slate-600 bg-slate-900 px-2 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 mb-0.5 block">Total</label>
                          <div className="rounded-lg bg-slate-900/60 border border-slate-700/50 px-2 py-2 text-sm font-semibold text-emerald-400">
                            {formatCurrency(line.total)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Desktop layout */}
                    <div className="hidden sm:grid grid-cols-[120px_1fr_70px_90px_80px_32px] gap-2 items-center">
                      <select
                        value={line.category}
                        onChange={(e) => updateLine(idx, 'category', e.target.value as LineCategory)}
                        className="rounded-lg border border-slate-600 bg-slate-900 px-2 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                      >
                        {CATEGORIES.map((c) => (
                          <option key={c.value} value={c.value}>{isEs ? c.labelEs : c.labelEn}</option>
                        ))}
                      </select>
                      <input
                        value={line.description}
                        onChange={(e) => updateLine(idx, 'description', e.target.value)}
                        placeholder={isEs ? 'Descripcion...' : 'Description...'}
                        className="rounded-lg border border-slate-600 bg-slate-900 px-2 py-1.5 text-xs text-white placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none"
                      />
                      <input
                        type="number"
                        value={line.quantity || ''}
                        onChange={(e) => updateLine(idx, 'quantity', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.5"
                        className="rounded-lg border border-slate-600 bg-slate-900 px-2 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                      />
                      <input
                        type="number"
                        value={line.unit_price || ''}
                        onChange={(e) => updateLine(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        className="rounded-lg border border-slate-600 bg-slate-900 px-2 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                      />
                      <span className="text-xs font-semibold text-emerald-400 text-right">{formatCurrency(line.total)}</span>
                      {lines.length > 1 ? (
                        <button type="button" onClick={() => removeLine(idx)} className="p-1 text-slate-500 hover:text-red-400 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      ) : <span />}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add row button (bottom) */}
              <button
                type="button"
                onClick={addLine}
                className="w-full px-4 py-2.5 border-t border-slate-700/30 text-xs font-medium text-slate-400 hover:text-emerald-400 hover:bg-slate-800/50 transition-colors flex items-center justify-center gap-1"
              >
                <Plus size={14} /> {isEs ? 'Agregar concepto' : 'Add line item'}
              </button>
            </div>

            {/* Totals summary */}
            <div className="rounded-2xl bg-slate-800/80 border border-slate-700/50 p-4 space-y-3">
              <h3 className="font-semibold text-white text-sm mb-2">{isEs ? 'Resumen' : 'Summary'}</h3>

              {/* Category breakdown */}
              <div className="space-y-1.5">
                {laborTotal > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">{isEs ? 'Mano de Obra' : 'Labor'}</span>
                    <span className="text-slate-300">{formatCurrency(laborTotal)}</span>
                  </div>
                )}
                {materialsTotal > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">{isEs ? 'Materiales' : 'Materials'}</span>
                    <span className="text-slate-300">{formatCurrency(materialsTotal)}</span>
                  </div>
                )}
                {otherTotal > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">{isEs ? 'Equipos/Permisos/Otros' : 'Equipment/Permits/Other'}</span>
                    <span className="text-slate-300">{formatCurrency(otherTotal)}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-700/50 pt-2 flex justify-between text-sm">
                <span className="text-slate-300 font-medium">Subtotal</span>
                <span className="text-white font-semibold">{formatCurrency(subtotal)}</span>
              </div>

              {/* Overhead / Tax */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 whitespace-nowrap">{isEs ? 'Impuestos / Overhead' : 'Tax / Overhead'}</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={overheadPct}
                    onChange={(e) => setOverheadPct(e.target.value)}
                    min="0"
                    max="50"
                    step="1"
                    className="w-16 rounded-lg border border-slate-600 bg-slate-900 px-2 py-1.5 text-xs text-white text-right focus:border-emerald-500 focus:outline-none"
                  />
                  <span className="text-xs text-slate-500">%</span>
                </div>
                <span className="ml-auto text-xs text-slate-300">{formatCurrency(overheadAmount)}</span>
              </div>

              <div className="border-t border-emerald-500/30 pt-3 flex justify-between items-center">
                <span className="text-sm font-bold text-emerald-300">{isEs ? 'TOTAL COTIZACION' : 'GRAND TOTAL'}</span>
                <span className="text-xl font-bold text-emerald-400">{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            {/* Duration, Warranty, Payment Terms */}
            <div className="rounded-2xl bg-slate-800/80 border border-slate-700/50 p-4 space-y-4">
              <button
                type="button"
                onClick={() => setShowTerms(!showTerms)}
                className="w-full flex items-center justify-between"
              >
                <h3 className="font-semibold text-white text-sm">
                  {isEs ? 'Plazo, Garantia y Pagos' : 'Duration, Warranty & Terms'}
                </h3>
                {showTerms ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
              </button>

              {showTerms && (
                <div className="space-y-4 pt-1">
                  <div>
                    <label className="text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <Clock size={14} className="text-slate-500" />
                      {isEs ? 'Tiempo Estimado (semanas)' : 'Estimated Time (weeks)'}
                    </label>
                    <input
                      type="number"
                      value={estimatedWeeks}
                      onChange={(e) => setEstimatedWeeks(e.target.value)}
                      placeholder={isEs ? 'Ej: 2' : 'e.g. 2'}
                      min="0.5"
                      step="0.5"
                      className="w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-slate-500" />
                      {isEs ? 'Garantia del Trabajo' : 'Work Warranty'}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {WARRANTY_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setWarranty(opt.value)}
                          className={`rounded-lg border px-2.5 py-2 text-xs font-medium transition-all ${
                            warranty === opt.value
                              ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400'
                              : 'border-slate-600 bg-slate-900 text-slate-400 hover:border-slate-500'
                          }`}
                        >
                          {isEs ? opt.labelEs : opt.labelEn}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                      <CreditCard size={14} className="text-slate-500" />
                      {isEs ? 'Forma de Pago / Hitos' : 'Payment Milestones'}
                    </label>
                    <div className="space-y-2">
                      {PAYMENT_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setPaymentTerms(opt.value)}
                          className={`w-full rounded-lg border px-3 py-2.5 text-xs font-medium text-left transition-all ${
                            paymentTerms === opt.value
                              ? 'border-emerald-500 bg-emerald-500/15 text-emerald-400'
                              : 'border-slate-600 bg-slate-900 text-slate-400 hover:border-slate-500'
                          }`}
                        >
                          {isEs ? opt.labelEs : opt.labelEn}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Message */}
            <div>
              <label className="text-xs font-medium text-slate-300 mb-1.5 block">
                {isEs ? 'Mensaje al Cliente' : 'Message to Client'}
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-xl border border-slate-600 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none resize-y min-h-[60px]"
                placeholder={isEs ? 'Describe tu propuesta...' : 'Describe your proposal...'}
              />
            </div>

            <button
              type="submit"
              disabled={loading || slotsLeft <= 0 || grandTotal <= 0}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold transition-all bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {loading ? <Spinner size={18} /> : (
                <>
                  {isEs ? 'Enviar Cotizacion' : 'Submit Estimate'} — {formatCurrency(grandTotal)}
                </>
              )}
            </button>
          </form>
        </VerificationGate>
      </div>
    </div>
  );
}

// Reusable breakdown viewer for the client side
export function EstimateBreakdownView({ breakdown, isEs }: { breakdown: EstimateBreakdown; isEs: boolean }) {
  const laborItems = breakdown.line_items.filter((l) => l.category === 'labor');
  const materialItems = breakdown.line_items.filter((l) => l.category === 'materials');
  const otherItems = breakdown.line_items.filter((l) => l.category !== 'labor' && l.category !== 'materials');

  const renderSection = (title: string, items: EstimateLineItem[]) => {
    if (items.length === 0) return null;
    return (
      <div>
        <p className="text-[10px] font-bold text-ink-400 uppercase tracking-wide mb-1.5">{title}</p>
        <div className="space-y-1">
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-ink-600 flex-1 min-w-0 truncate pr-2">{item.description}</span>
              <span className="text-ink-400 whitespace-nowrap">{item.quantity} x {formatCurrency(item.unit_price)}</span>
              <span className="font-semibold text-ink-700 ml-3 w-20 text-right">{formatCurrency(item.total)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-ink-200 bg-white overflow-hidden">
      <div className="px-3 py-2 bg-ink-50 border-b border-ink-200">
        <p className="text-xs font-bold text-ink-700">{isEs ? 'Desglose de Cotizacion' : 'Estimate Breakdown'}</p>
      </div>
      <div className="p-3 space-y-3">
        {renderSection(isEs ? 'Mano de Obra' : 'Labor', laborItems)}
        {renderSection(isEs ? 'Materiales' : 'Materials', materialItems)}
        {renderSection(isEs ? 'Equipos / Permisos / Otros' : 'Equipment / Permits / Other', otherItems)}

        <div className="border-t border-ink-100 pt-2 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-ink-500">Subtotal</span>
            <span className="font-medium text-ink-700">{formatCurrency(breakdown.subtotal)}</span>
          </div>
          {breakdown.overhead_pct > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-ink-500">{isEs ? 'Impuestos/Overhead' : 'Tax/Overhead'} ({breakdown.overhead_pct}%)</span>
              <span className="font-medium text-ink-700">{formatCurrency(breakdown.overhead_amount)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-bold pt-1 border-t border-ink-100">
            <span className="text-ink-800">Total</span>
            <span className="text-pixio-700">{formatCurrency(breakdown.grand_total)}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {breakdown.warranty && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-ink-500 bg-ink-50 rounded-full px-2 py-0.5">
              <ShieldCheck size={10} /> {isEs ? 'Garantia' : 'Warranty'}: {breakdown.warranty}
            </span>
          )}
          {breakdown.estimated_weeks && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-ink-500 bg-ink-50 rounded-full px-2 py-0.5">
              <Clock size={10} /> {breakdown.estimated_weeks} {isEs ? 'semanas' : 'weeks'}
            </span>
          )}
          {breakdown.payment_terms && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-ink-500 bg-ink-50 rounded-full px-2 py-0.5">
              <CreditCard size={10} /> {breakdown.payment_terms === '50/50'
                ? (isEs ? '50/50 Deposito' : '50/50 Deposit')
                : breakdown.payment_terms === '30/30/40'
                ? '30/30/40'
                : (isEs ? '100% al final' : '100% on completion')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
