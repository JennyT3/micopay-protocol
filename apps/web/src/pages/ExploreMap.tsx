import MapSim from "../components/MapSim";
import MerchantCard, {
  type MerchantCardData,
} from "../components/MerchantCard";

interface ExploreMapProps {
  onBack: () => void;
  onSelectOffer: (offerId: string) => void;
  amount?: number;
  loading?: boolean;
}

// ─── fixtures ────────────────────────────────────────────────────────────────
// Three representative merchants covering the full badge spectrum.
// In production these come from GET /api/v1/cash/agents.

function buildMerchants(amount: number): MerchantCardData[] {
  const fee1 = 0.01;
  const fee2 = 0.02;
  const fee3 = 0.015;

  return [
    {
      id: "offer_1",
      name: "Farmacia Guadalupe",
      type: "farmacia",
      address: "Orizaba 45, Col. Roma Norte, CDMX",
      distance_km: 0.18,
      payout_mxn: parseFloat((amount * (1 - fee1)).toFixed(2)),
      fee_pct: fee1 * 100,
      hours: "8:00 – 22:00",
      completion_rate: 0.98,
      trades_completed: 312,
      avg_time_minutes: 4,
      tier: "maestro",
      online: true,
      verification: "verified",
    },
    {
      id: "offer_2",
      name: "Tienda Don Pepe",
      type: "tienda",
      address: "Av. Álvaro Obregón 120, Col. Roma Norte",
      distance_km: 0.54,
      payout_mxn: parseFloat((amount * (1 - fee2)).toFixed(2)),
      fee_pct: fee2 * 100,
      hours: "9:00 – 20:00",
      completion_rate: 0.93,
      trades_completed: 8,
      avg_time_minutes: 7,
      tier: "espora",
      online: true,
      verification: "new",
    },
    {
      id: "offer_3",
      name: "Papelería La Central",
      type: "papeleria",
      address: "Col. Condesa, CDMX",
      distance_km: 1.1,
      payout_mxn: parseFloat((amount * (1 - fee3)).toFixed(2)),
      fee_pct: fee3 * 100,
      hours: "10:00 – 18:00",
      completion_rate: 0.88,
      trades_completed: 45,
      avg_time_minutes: 5,
      tier: "activo",
      online: false,
      verification: "paused",
    },
  ];
}

// ─── component ───────────────────────────────────────────────────────────────

const ExploreMap = ({
  onBack,
  onSelectOffer,
  amount = 500,
  loading = false,
}: ExploreMapProps) => {
  const merchants = buildMerchants(amount);

  return (
    <div className="bg-surface-container-lowest text-on-surface font-body min-h-screen pb-24">
      {/* Top Navigation */}
      <header className="fixed top-0 left-0 w-full z-50 flex items-center px-6 py-4 bg-white/80 backdrop-blur-md shadow-sm">
        <button
          onClick={onBack}
          className="flex items-center justify-center p-2 rounded-full hover:bg-surface-container-low transition-colors duration-200"
          aria-label="Volver"
        >
          <span className="material-symbols-outlined text-primary">
            arrow_back
          </span>
        </button>
        <h1 className="ml-4 font-headline font-bold text-xl text-primary tracking-tight">
          Convertir a efectivo
        </h1>
      </header>

      <main className="pt-24 px-6 max-w-2xl mx-auto">
        {/* Map Section */}
        <section className="mb-10">
          <MapSim />
        </section>

        {/* Results Header */}
        <div className="mb-6">
          <h2 className="font-headline font-bold text-2xl text-on-surface">
            {merchants.filter((m) => m.online).length} ofertas para ${amount}{" "}
            MXN
          </h2>
          <div className="flex items-center gap-1 mt-1">
            <span className="material-symbols-outlined text-primary text-sm">
              location_on
            </span>
            <p className="text-sm text-outline font-medium">Zona Centro</p>
          </div>
        </div>

        {/* Merchant Cards */}
        <div className="space-y-4">
          {merchants.map((merchant, index) => (
            <MerchantCard
              key={merchant.id}
              merchant={merchant}
              isBestOffer={index === 0}
              onSelect={onSelectOffer}
              loading={loading}
            />
          ))}
        </div>

        {/* Footer Note */}
        <footer className="mt-10 mb-8 p-6 text-center">
          <p className="text-[12px] leading-relaxed text-outline font-medium">
            Tu saldo se bloquea en garantía hasta que confirmes la recepción del
            efectivo. Operación segura y protegida por MicoPay Smart Escrow.
          </p>
        </footer>
      </main>
    </div>
  );
};

export default ExploreMap;
