import { useState, useEffect } from 'react';
import { getMerchantTrades, MerchantTradeItem } from '../services/api';

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending:   { label: 'Pendiente',    color: 'text-outline' },
  locked:    { label: 'Bloqueado',    color: 'text-primary' },
  revealing: { label: 'Revelando',    color: 'text-primary' },
  completed: { label: 'Completado',   color: 'text-[#1D9E75]' },
  cancelled: { label: 'Cancelado',    color: 'text-error' },
  expired:   { label: 'Expirado',     color: 'text-error' },
  refunded:  { label: 'Reembolsado',  color: 'text-outline' },
};

interface MerchantInboxProps {
  onBack: () => void;
  onSelectTrade: (tradeId: string) => void;
  token: string | null;
}

const MerchantInbox = ({ onBack, onSelectTrade, token }: MerchantInboxProps) => {
  const [trades, setTrades] = useState<MerchantTradeItem[]>([]);
  const [selectedState, setSelectedState] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    getMerchantTrades(token, selectedState)
      .then(setTrades)
      .catch(() => setTrades([]))
      .finally(() => setLoading(false));
  }, [token, selectedState]);

  const getTimeAgo = (createdAt: string): string => {
    const now = new Date();
    const created = new Date(createdAt);
    const seconds = Math.floor((now.getTime() - created.getTime()) / 1000);

    if (seconds < 60) return 'Ahora';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  const pendingCount = trades.filter(t => t.status === 'pending').length;

  return (
    <div className="bg-surface text-on-surface font-body min-h-screen flex flex-col">
      {/* TopAppBar */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 py-4 backdrop-blur-md bg-white/90">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-surface-container-low transition-colors rounded-full text-primary"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-headline font-extrabold text-xl text-on-surface">
            Bandeja de entrada
          </h1>
        </div>
        {pendingCount > 0 && (
          <div className="bg-error text-white rounded-full px-3 py-1 text-xs font-bold">
            {pendingCount}
          </div>
        )}
      </header>

      <main className="flex-1 mt-20 px-6 pb-32">
        {/* State Filter */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {['all', 'pending', 'locked', 'revealing', 'completed', 'expired', 'cancelled'].map((state) => (
            <button
              key={state}
              onClick={() => setSelectedState(state)}
              className={`px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-all ${
                selectedState === state
                  ? 'bg-primary text-white shadow-md'
                  : 'bg-surface-container-low text-on-surface-variant border border-outline-variant/20'
              }`}
            >
              {state === 'all' ? 'Todos' : STATUS_LABEL[state]?.label || state}
            </button>
          ))}
        </div>

        {/* Trades List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin">
              <span className="material-symbols-outlined text-primary text-3xl">refresh</span>
            </div>
          </div>
        ) : trades.length === 0 ? (
          <div className="bg-white rounded-[20px] border border-outline-variant/10 shadow-sm p-8 text-center">
            <span className="material-symbols-outlined text-outline-variant text-4xl mb-3 block">inbox</span>
            <p className="text-sm text-outline font-medium">
              {selectedState === 'pending'
                ? 'Sin operaciones pendientes'
                : 'Sin operaciones en este estado'}
            </p>
            <p className="text-xs text-outline-variant mt-1">
              {selectedState === 'all' && 'Tus operaciones aparecerán aquí'}
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-[20px] border border-outline-variant/10 shadow-sm divide-y divide-outline-variant/10">
            {trades.map((trade) => {
              const s = STATUS_LABEL[trade.status] ?? { label: trade.status, color: 'text-outline' };
              const timeAgo = getTimeAgo(trade.created_at);

              return (
                <button
                  key={trade.id}
                  onClick={() => onSelectTrade(trade.id)}
                  className="w-full p-4 text-left hover:bg-surface-container-low transition-colors active:scale-95"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <p className="font-bold text-on-surface text-sm">
                        {trade.buyer_handle}
                      </p>
                      <p className="text-[11px] text-outline-variant">
                        ${trade.amount_mxn.toLocaleString('es-MX')} MXN
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`text-[11px] font-bold ${s.color}`}>
                        {s.label}
                      </span>
                      <p className="text-[11px] text-outline-variant mt-0.5">
                        {timeAgo}
                      </p>
                    </div>
                  </div>

                  {/* Status indicator */}
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      trade.status === 'pending' ? 'bg-error animate-pulse' :
                      trade.status === 'completed' ? 'bg-[#1D9E75]' :
                      trade.status === 'cancelled' ? 'bg-outline' :
                      'bg-primary'
                    }`} />
                    <p className="text-[10px] text-outline-variant uppercase font-semibold tracking-wide">
                      {trade.status === 'pending' ? 'Requiere atención' : 'Tap para ver'}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default MerchantInbox;
