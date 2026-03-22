import { Logo } from '../components/Logo';

interface HomeProps {
    onNavigateCashout: () => void;
    onNavigateDeposit: () => void;
}

const Home = ({ onNavigateCashout, onNavigateDeposit }: HomeProps) => {
    return (
        <div className="bg-surface-lowest text-on-surface font-body min-h-screen flex flex-col">
            {/* TopAppBar */}
            <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 py-4 backdrop-blur-md bg-white/80 dark:bg-slate-900/80">
                <Logo />
                <div className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-primary p-2 rounded-full hover:bg-surface-container-low transition-colors cursor-pointer">
                        notifications
                    </span>
                    <div className="w-10 h-10 rounded-full border-2 border-primary-container overflow-hidden">
                        <img 
                            alt="User Profile" 
                            className="w-full h-full object-cover" 
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuB67y-i20YKZ74EdUyBhPSynmndCKS-h3EA_TY5I4DqJOMVotSw1KNKnJkRorXphGGSC2O37IzK3Ne0ucqSrLTuM5yBABSXmcqkmRAyds2slhc0jFDuu8bya9fX1W0jjxuPpCDkellmiwXSghk0lbLSUG_ZS_wCQ2m2oeltlvvyv4kQarhZZ8l-AC3gUy-wtgF301WK7zIlo5utKmx_I6CTuAQ_zqkXyiN6Di4UFiRzq5ASwVi017MoYgq_LhBYMO_AEIf4ZAHp1Dh" 
                        />
                    </div>
                </div>
            </header>

            {/* Main Content Canvas */}
            <main className="flex-1 mt-20 px-6 pb-32">
                {/* Saludo */}
                <section className="mb-8">
                    <h1 className="font-headline font-extrabold text-3xl text-[#1A2830] leading-tight mb-1">
                        Hola, Juan 👋
                    </h1>
                    <p className="text-on-surface-variant font-medium opacity-70">
                        Domingo, 22 de Marzo
                    </p>
                </section>

                {/* Balance Card (The Signature Element) */}
                <div className="bg-surface-dark rounded-[18px] p-6 relative overflow-hidden mb-10 shadow-lg">
                    {/* Organic Node Watermark */}
                    <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
                        <svg fill="none" height="180" viewBox="0 0 24 24" width="180" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="7" cy="7" r="3" stroke="#D4E4EC" strokeWidth="1.5"></circle>
                            <circle cx="17" cy="17" r="3" stroke="#D4E4EC" strokeWidth="1.5"></circle>
                            <path d="M10 10L14 14" stroke="#D4E4EC" strokeWidth="1.5"></path>
                        </svg>
                    </div>
                    <div className="flex justify-between items-start relative z-10 mb-6">
                        <p className="text-[10px] font-bold tracking-[0.15em] text-[#D4E4EC]/60 uppercase">
                            SALDO MXN · STELLAR
                        </p>
                        <div className="flex items-center justify-center bg-white/10 rounded-full p-1">
                            <span className="material-symbols-outlined text-white text-sm">rocket_launch</span>
                        </div>
                    </div>
                    <div className="relative z-10 mb-4">
                        <h2 className="text-[32px] font-semibold text-[#D4E4EC] tracking-tight">
                            $1,240.00 MXN
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
                            <p className="text-accent text-sm font-medium">Wallet conectada · Testnet</p>
                        </div>
                    </div>
                </div>

                {/* Bento Style Feature Grid */}
                <div className="grid grid-cols-2 gap-4 mb-10">
                    <div className="bg-surface-container-low rounded-2xl p-5 flex flex-col justify-between aspect-square">
                        <span className="material-symbols-outlined text-primary text-3xl">account_balance_wallet</span>
                        <div>
                            <p className="font-headline font-bold text-[#1A2830]">Mis activos</p>
                            <p className="text-xs text-on-surface-variant">Ver portafolio</p>
                        </div>
                    </div>
                    <div className="bg-surface-container-low rounded-2xl p-5 flex flex-col justify-between aspect-square">
                        <span className="material-symbols-outlined text-primary text-3xl">swap_horiz</span>
                        <div>
                            <p className="font-headline font-bold text-[#1A2830]">Actividad</p>
                            <p className="text-xs text-on-surface-variant">2 transacciones hoy</p>
                        </div>
                    </div>
                </div>

                {/* Primary CTA Area */}
                <div className="flex flex-col items-center gap-4">
                    <button 
                        onClick={onNavigateCashout}
                        className="w-full h-[56px] bg-gradient-to-r from-primary to-primary-container text-white font-bold rounded-xl shadow-md active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined">payments</span>
                        Convertir a efectivo
                    </button>
                    <button 
                        onClick={onNavigateDeposit}
                        className="w-full h-[56px] bg-gradient-to-r from-[#1D9E75] to-[#14815F] text-white font-bold rounded-xl shadow-md active:scale-95 transition-all duration-200 flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined">add_circle</span>
                        Depositar efectivo
                    </button>
                    <p className="text-sm text-on-surface-variant font-medium opacity-60">
                        Encuentra a alguien cerca en minutos
                    </p>
                </div>
            </main>
        </div>
    );
};

export default Home;
