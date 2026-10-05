import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth';
import { useWalletTransactions } from '@/lib/hooks';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { useToast } from '@/lib/toast';
import { Spinner } from '@/components/ui';
import {
  Wallet, Shield, TrendingUp, History, CreditCard,
  ArrowDownToLine, ShieldAlert, DollarSign, ArrowUpRight,
  ArrowDownLeft, RefreshCw,
} from 'lucide-react';
import type { WalletTransaction } from '@/lib/types';

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-connect`;

export function ContractorWalletPro() {
  const { i18n } = useTranslation();
  const isEs = i18n.language === 'es';
  const { profile, session } = useAuth();
  const { showToast } = useToast();
  const { transactions, loading } = useWalletTransactions(profile?.id);
  const [connecting, setConnecting] = useState(false);
  const [tab, setTab] = useState<'all' | 'earnings' | 'escrow'>('all');

  const inEscrow = transactions
    .filter((tx) => tx.type === 'escrow_hold')
    .reduce((sum, tx) => sum + tx.gross_amount, 0);
  const available = transactions
    .filter((tx) => tx.type === 'milestone_release' || tx.type === 'change_order_release')
    .reduce((sum, tx) => sum + tx.net_amount, 0);
  const totalEarned = transactions
    .filter((tx) => tx.type === 'milestone_release' || tx.type === 'change_order_release')
    .reduce((sum, tx) => sum + tx.gross_amount, 0);
  const totalCommission = transactions
    .filter((tx) => tx.type === 'commission')
    .reduce((sum, tx) => sum + tx.commission_amount, 0);

  const filteredTx = transactions.filter((tx) => {
    if (tab === 'earnings') return tx.type === 'milestone_release' || tx.type === 'change_order_release';
    if (tab === 'escrow') return tx.type === 'escrow_hold';
    return true;
  });

  const handleConnectStripe = async () => {
    if (!session) return;
    setConnecting(true);
    try {
      const res = await fetch(`${EDGE_FUNCTION_URL}?action=create-account`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.url) {
        showToast(isEs ? 'Redirigiendo a Stripe...' : 'Redirecting to Stripe...', 'info');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed', 'error');
    }
    setConnecting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="text-emerald-400" size={24} />
      </div>
    );
  }

  return (
    <div className="animate-fade-in px-4 py-5">
      <h1 className="text-xl font-bold text-white mb-5">{isEs ? 'Mi Cartera' : 'My Wallet'}</h1>

      {/* Stripe connect */}
      {!profile?.stripe_account_id ? (
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 mb-5">
          <div className="flex items-center gap-3 mb-3">
            <CreditCard size={24} className="text-amber-400" />
            <div>
              <p className="font-semibold text-white text-sm">{isEs ? 'Conectar Stripe' : 'Connect Stripe'}</p>
              <p className="text-xs text-amber-400/70">{isEs ? 'Requerido para recibir pagos' : 'Required to receive payouts'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleConnectStripe}
            disabled={connecting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold bg-amber-500 text-slate-900 hover:bg-amber-400 transition-all"
          >
            {connecting ? <Spinner size={16} /> : (isEs ? 'Conectar Ahora' : 'Connect Now')}
          </button>
        </div>
      ) : (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 mb-5 flex items-center gap-2">
          <CreditCard size={16} className="text-emerald-400" />
          <span className="text-sm font-medium text-emerald-400">{isEs ? 'Stripe conectado' : 'Stripe connected'}</span>
        </div>
      )}

      {/* Balance cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 border border-emerald-500/20 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <TrendingUp size={16} className="text-emerald-400" />
            </div>
          </div>
          <p className="text-[10px] font-semibold text-emerald-400/70 uppercase tracking-wider mb-1">
            {isEs ? 'Disponible' : 'Available'}
          </p>
          <p className="text-2xl font-bold text-emerald-400">{formatCurrency(available)}</p>
          <p className="text-[10px] text-slate-500 mt-1">
            {isEs ? 'Listo para retiro' : 'Ready for withdrawal'}
          </p>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Shield size={16} className="text-amber-400" />
            </div>
          </div>
          <p className="text-[10px] font-semibold text-amber-400/70 uppercase tracking-wider mb-1">
            {isEs ? 'En Garantia' : 'In Escrow'}
          </p>
          <p className="text-2xl font-bold text-amber-400">{formatCurrency(inEscrow)}</p>
          <p className="text-[10px] text-slate-500 mt-1">
            {isEs ? 'Pendiente de liberacion' : 'Pending release'}
          </p>
        </div>
      </div>

      {/* Totals row */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="rounded-xl bg-slate-800/60 border border-slate-700/40 p-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">{isEs ? 'Total Ganado' : 'Total Earned'}</p>
            <p className="text-lg font-bold text-white">{formatCurrency(totalEarned)}</p>
          </div>
          <DollarSign size={20} className="text-slate-600" />
        </div>
        <div className="rounded-xl bg-slate-800/60 border border-slate-700/40 p-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-wide">{isEs ? 'Comisiones' : 'Commissions'}</p>
            <p className="text-lg font-bold text-slate-400">{formatCurrency(totalCommission)}</p>
          </div>
          <RefreshCw size={20} className="text-slate-600" />
        </div>
      </div>

      {/* Withdraw */}
      {available > 0 && (
        profile?.verification_status === 'verified' ? (
          <button className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 transition-all mb-5">
            <ArrowDownToLine size={18} />
            {isEs ? 'Retirar' : 'Withdraw'} {formatCurrency(available)}
          </button>
        ) : (
          <div className="rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 p-4 mb-5 text-center">
            <ShieldAlert size={24} className="text-amber-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-white mb-1">
              {isEs ? 'Verificacion requerida' : 'Verification required'}
            </p>
            <p className="text-xs text-slate-400">
              {isEs ? 'Verifica tu cuenta para retirar fondos.' : 'Verify your account to withdraw funds.'}
            </p>
          </div>
        )
      )}

      {/* Transaction history */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <History size={18} className="text-slate-500" />
            {isEs ? 'Historial' : 'History'}
          </h2>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-3">
          {[
            { key: 'all' as const, label: isEs ? 'Todo' : 'All' },
            { key: 'earnings' as const, label: isEs ? 'Ingresos' : 'Earnings' },
            { key: 'escrow' as const, label: isEs ? 'Garantia' : 'Escrow' },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                tab === t.key
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                  : 'text-slate-400 bg-slate-800/60 border border-slate-700/40 hover:text-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {filteredTx.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Wallet size={40} className="text-slate-600 mb-3" />
            <p className="text-sm text-slate-400">{isEs ? 'Sin transacciones' : 'No transactions yet'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTx.map((tx) => (
              <TxRowPro key={tx.id} tx={tx} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TxRowPro({ tx }: { tx: WalletTransaction }) {
  const { i18n } = useTranslation();
  const isEs = i18n.language === 'es';
  const isRelease = tx.type === 'milestone_release' || tx.type === 'change_order_release';

  const config: Record<string, { label: string; icon: ReactNode; color: string }> = {
    escrow_hold: {
      label: isEs ? 'Deposito en Garantia' : 'Escrow Hold',
      icon: <Shield size={16} />,
      color: 'text-amber-400',
    },
    milestone_release: {
      label: isEs ? 'Pago Liberado' : 'Milestone Payout',
      icon: <ArrowDownLeft size={16} />,
      color: 'text-emerald-400',
    },
    change_order_release: {
      label: isEs ? 'Pago Extra' : 'Change Order Payout',
      icon: <ArrowDownLeft size={16} />,
      color: 'text-emerald-400',
    },
    commission: {
      label: isEs ? 'Comision' : 'Commission',
      icon: <ArrowUpRight size={16} />,
      color: 'text-red-400',
    },
    withdrawal: {
      label: isEs ? 'Retiro' : 'Withdrawal',
      icon: <ArrowDownToLine size={16} />,
      color: 'text-slate-300',
    },
    refund: {
      label: isEs ? 'Reembolso' : 'Refund',
      icon: <RefreshCw size={16} />,
      color: 'text-slate-300',
    },
  };

  const c = config[tx.type] || { label: tx.type, icon: <DollarSign size={16} />, color: 'text-slate-400' };

  return (
    <div className="rounded-xl bg-slate-800/80 border border-slate-700/50 p-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center ${c.color}`}>
          {c.icon}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-200">{c.label}</p>
          <p className="text-[11px] text-slate-500">{formatDateTime(tx.created_at)}</p>
        </div>
      </div>
      <div className="text-right">
        {isRelease && (
          <>
            <p className="text-sm font-bold text-emerald-400">+{formatCurrency(tx.net_amount)}</p>
            {tx.commission_amount > 0 && (
              <p className="text-[10px] text-slate-500">{formatCurrency(tx.commission_amount)} fee</p>
            )}
          </>
        )}
        {tx.type === 'commission' && (
          <p className="text-sm font-bold text-red-400">-{formatCurrency(tx.commission_amount)}</p>
        )}
        {tx.type === 'escrow_hold' && (
          <p className="text-sm font-bold text-amber-400">{formatCurrency(tx.gross_amount)}</p>
        )}
        {(tx.type === 'withdrawal' || tx.type === 'refund') && (
          <p className="text-sm font-bold text-slate-300">-{formatCurrency(tx.gross_amount)}</p>
        )}
      </div>
    </div>
  );
}

type ReactNode = import('react').ReactNode;
