import { useState, useEffect } from 'react';
import { getTradeHistory, TradeHistoryItem } from '../services/api';

const EXPLORER = 'https://stellar.expert/explorer/testnet/tx';

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  completed: { label: 'Completado', color: 'text-[#1D9E75]' },
  locked:    { label: 'Bloqueado',  color: 'text-primary' },
  revealing: { label: 'Revelando',  color: 'text-primary' },
  pending:   { label: 'Pendiente',  color: 'text-outline' },
  cancelled: { label: 'Cancelado',  color: 'text-error' },
  refunded:  { label: 'Reembolsado',color: 'text-outline' },
};

interface HistoryProps {
  token: string | null;
  onStartCashout: () => void;
}

const History = ({ token, onStartCashout }: HistoryProps) => {
  const [trades, setTrades] = useState<TradeHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    getTradeHistory(token)
      .then(setTrades)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="bg-surface text-on-surface font-body min-h-screen flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-50 flex items-center px-6 py-4 backdrop-blur-md bg-white/90 border-b border-outline-variant/10">
        <h1 className="font-headline font-bold text-xl text-on-surface tracking-tight">Historial</h1>
      </header>

      <main className="flex-1 mt-20 px-6 pb-32 pt-4">
        <p className="text-[11px] font-bold text-outline-variant uppercase tracking-[0.15em] mb-6">
          Todos tus intercambios
        </p>

        {loading ? (
          /* Loading skeletons */
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="bg-white rounded-[20px] border border-outline-variant/10 p-4 animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-surface-container-high flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-surface-container-high rounded-full w-1/3" />
                    <div className="h-2.5 bg-surface-container-high rounded-full w-1/4" />
                  </div>
                  <div className="h-2.5 bg-surface-container-high rounded-full w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : trades.length === 0 ? (
          /* ── Empty state ── */
          <div className="flex flex-col items-center text-center py-16 px-4 gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/8 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-3xl">history</span>
            </div>
            <h2 className="font-headline font-bold text-xl text-on-surface">
              Sin intercambios aún
            </h2>
            <p className="text-sm text-outline leading-snug max-w-[272px]">
              Cada operación que completes quedará registrada aquí con su estado y comprobante en cadena.
            </p>
            <button
              onClick={onStartCashout}
              className="mt-2 h-[48px] px-8 bg-primary text-white font-bold rounded-xl active:scale-95 transition-all duration-200 flex items-center gap-2 shadow-sm shadow-primary/20"
            >
              <span className="material-symbols-outlined text-sm">payments</span>
              Hacer mi primer intercambio
            </button>
          </div>
        ) : (
          /* Trade list */
          <div className="bg-white rounded-[20px] border border-outline-variant/10 shadow-sm divide-y divide-outline-variant/10">
            {trades.map((trade) => {
              const s = STATUS_LABEL[trade.status] ?? { label: trade.status, color: 'text-outline' };
              const date = new Date(trade.created_at).toLocaleString('es-MX', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              });
              return (
                <div key={trade.id} className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-primary text-base">swap_horiz</span>
                      </div>
                      <div>
                        <p className="font-bold text-on-surface text-sm">
                          ${trade.amount_mxn.toLocaleString('es-MX')} MXN
                        </p>
                        <p className="text-[11px] text-outline">{date}</p>
                      </div>
                    </div>
                    <span className={`text-[11px] font-bold ${s.color}`}>{s.label}</span>
                  </div>

                  {/* TX links */}
                  <div className="flex flex-col gap-1 pl-12">
                    {trade.lock_tx_hash && !trade.lock_tx_hash.startsWith('mock') && (
                      <a
                        href={`${EXPLORER}/${trade.lock_tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-primary font-mono flex items-center gap-1 hover:underline"
                      >
                        <span className="material-symbols-outlined text-[12px]">lock</span>
                        lock · {trade.lock_tx_hash.substring(0, 14)}…
                      </a>
                    )}
                    {trade.release_tx_hash && !trade.release_tx_hash.startsWith('mock') && (
                      <a
                        href={`${EXPLORER}/${trade.release_tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-[#1D9E75] font-mono flex items-center gap-1 hover:underline"
                      >
                        <span className="material-symbols-outlined text-[12px]">lock_open</span>
                        release · {trade.release_tx_hash.substring(0, 14)}…
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default History;
