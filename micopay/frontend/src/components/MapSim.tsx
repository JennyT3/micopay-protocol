interface MapSimProps {
    type?: 'cashout' | 'deposit';
}

const MapSim = ({ type = 'cashout' }: MapSimProps) => {
    return (
        <div className="relative w-full h-48 bg-surface-container-low rounded-[28px] overflow-hidden border border-surface-variant/50 shadow-sm bg-[linear-gradient(135deg,#f0f7f4_0%,#e0ece6_100%)]">
            {/* Fuzzy Location Area */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-emerald-horizon/10 rounded-full blur-2xl"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border-2 border-emerald-horizon/20 rounded-full"></div>
            
            {/* Map UI Elements (Simulated grid) */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#1D9E75 0.5px, transparent 0.5px)', backgroundSize: '20px 20px' }}></div>
            
            {/* Agent Pins */}
            {type === 'cashout' ? (
                <>
                    {/* Pin 1: Farmacia Guadalupe */}
                    <div className="absolute top-1/3 left-1/4 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                        <div className="bg-emerald-horizon text-white p-1.5 rounded-full shadow-lg">
                            <span className="material-symbols-outlined text-xs block" style={{ fontVariationSettings: '"FILL" 1' }}>storefront</span>
                        </div>
                        <div className="bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-md mt-1 shadow-sm">
                            <p className="text-[8px] font-bold text-on-surface whitespace-nowrap">Farmacia G.</p>
                        </div>
                    </div>

                    {/* Pin 2: Carlos_g */}
                    <div className="absolute top-2/3 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                        <div className="bg-emerald-horizon text-white p-1.5 rounded-full shadow-lg scale-110 ring-4 ring-emerald-horizon/20">
                            <span className="material-symbols-outlined text-xs block" style={{ fontVariationSettings: '"FILL" 1' }}>person</span>
                        </div>
                        <div className="bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-md mt-1 shadow-sm">
                            <p className="text-[8px] font-bold text-on-surface whitespace-nowrap">@carlos_g</p>
                        </div>
                    </div>

                    {/* Pin 3: Lavandería El Sol */}
                    <div className="absolute top-1/4 right-1/4 translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                        <div className="bg-emerald-horizon text-white p-1.5 rounded-full shadow-lg">
                            <span className="material-symbols-outlined text-xs block" style={{ fontVariationSettings: '"FILL" 1' }}>laundry</span>
                        </div>
                        <div className="bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-md mt-1 shadow-sm">
                            <p className="text-[8px] font-bold text-on-surface whitespace-nowrap">Lavandería</p>
                        </div>
                    </div>
                </>
            ) : (
                <>
                    {/* Pin 1: Tienda Don Pepe */}
                    <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                        <div className="bg-primary text-white p-1.5 rounded-full shadow-lg">
                            <span className="material-symbols-outlined text-xs block" style={{ fontVariationSettings: '"FILL" 1' }}>storefront</span>
                        </div>
                        <div className="bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-md mt-1 shadow-sm">
                            <p className="text-[8px] font-bold text-on-surface whitespace-nowrap">Don Pepe</p>
                        </div>
                    </div>

                    {/* Pin 2: @ana_m */}
                    <div className="absolute top-1/2 right-1/4 translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                        <div className="bg-primary text-white p-1.5 rounded-full shadow-lg">
                            <span className="material-symbols-outlined text-xs block" style={{ fontVariationSettings: '"FILL" 1' }}>person</span>
                        </div>
                        <div className="bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-md mt-1 shadow-sm">
                            <p className="text-[8px] font-bold text-on-surface whitespace-nowrap">@ana_m</p>
                        </div>
                    </div>

                    {/* Pin 3: Café del Parque */}
                    <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                        <div className="bg-primary text-white p-1.5 rounded-full shadow-lg">
                            <span className="material-symbols-outlined text-xs block" style={{ fontVariationSettings: '"FILL" 1' }}>coffee</span>
                        </div>
                        <div className="bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-md mt-1 shadow-sm">
                            <p className="text-[8px] font-bold text-on-surface whitespace-nowrap">Café Parque</p>
                        </div>
                    </div>
                </>
            )}

            {/* Floating Badge */}
            <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-surface-variant/30 flex items-center gap-2 shadow-sm">
                <div className="w-2 h-2 bg-emerald-horizon rounded-full animate-pulse"></div>
                <p className="text-[10px] font-bold text-on-surface uppercase tracking-wider">Zona Centro</p>
            </div>
        </div>
    );
};

export default MapSim;
