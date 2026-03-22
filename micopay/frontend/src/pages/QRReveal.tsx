import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { getSecret, completeTrade, TradeData } from '../services/api';

interface QRRevealProps {
    activeTrade: TradeData | null;
    sellerToken: string | null;
    buyerToken: string | null;
    amount: number;
    onBack: () => void;
    onChat: () => void;
    onSuccess: () => void;
}

const QRReveal = ({ activeTrade, sellerToken, buyerToken, amount, onBack, onChat, onSuccess }: QRRevealProps) => {
    const [pin, setPin] = useState<string>('');
    const [isConfirming, setIsConfirming] = useState(false);
    const [qrPayload, setQrPayload] = useState<string>('MICOPAY:DEMO:mock_secret_for_ui_preview');
    const [secretLoaded, setSecretLoaded] = useState(false);

    // Fetch real HTLC secret from backend
    useEffect(() => {
        if (!activeTrade || !sellerToken) return;

        getSecret(activeTrade.id, sellerToken)
            .then(({ qr_payload }) => {
                setQrPayload(qr_payload);
                setSecretLoaded(true);
                console.log('✅ Secret fetched for trade', activeTrade.id);
            })
            .catch((e) => {
                console.warn('Could not fetch secret, using demo QR', e);
            });
    }, [activeTrade, sellerToken]);

    const handlePinClick = (num: string) => {
        if (isConfirming) return;
        if (pin.length < 4) {
            const newPin = pin + num;
            setPin(newPin);
            if (newPin.length === 4) {
                setIsConfirming(true);
                completePurchase();
            }
        }
    };

    const completePurchase = async () => {
        try {
            if (activeTrade && buyerToken) {
                await completeTrade(activeTrade.id, buyerToken);
                console.log('✅ Trade completed on-chain');
            }
        } catch (e) {
            console.warn('Could not complete trade on backend, proceeding as demo', e);
        } finally {
            setTimeout(() => onSuccess(), 1500);
        }
    };

    const handleBackspace = () => {
        if (!isConfirming) setPin(pin.slice(0, -1));
    };

    return (
        <div className="bg-white font-body text-on-surface min-h-screen">
            {/* Top Navigation */}
            <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 py-4 backdrop-blur-md bg-white/80 border-b border-surface-container-low">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="p-2 hover:bg-surface-container-low rounded-full transition-colors">
                        <span className="material-symbols-outlined text-primary">arrow_back</span>
                    </button>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <h1 className="font-headline font-bold text-lg text-on-surface">Farmacia Guadalupe</h1>
                            <span className="bg-secondary-container text-secondary text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Verificado</span>
                        </div>
                    </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary">more_vert</span>
                </div>
            </header>

            <main className="pt-24 pb-12 px-6 max-w-md mx-auto">
                {/* Status Banner */}
                <div className="mb-8">
                    <div className="inline-flex items-center gap-2 bg-primary-container/10 border border-primary-container/20 px-4 py-2 rounded-full">
                        <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: '"FILL" 1' }}>check_circle</span>
                        <span className="text-primary font-semibold text-sm">
                            {secretLoaded ? '✓ Escrow on-chain · Fondos bloqueados' : '✓ Oferta aceptada · Saldo bloqueado'}
                        </span>
                    </div>
                </div>

                {/* Chat Preview Section */}
                <section className="mb-10">
                    <div className="bg-surface-container-lowest border border-surface-container-low p-4 rounded-2xl shadow-sm">
                        <div className="flex gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-surface-container-high flex-shrink-0 flex items-center justify-center overflow-hidden">
                                <img
                                    className="w-full h-full object-cover"
                                    alt="Pharmacist"
                                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBKVHp5dyl0kxM83DVzGyzATg7Y2rWOd2uBB75zzCKjwdx5XBJ1hm2cpi0EmKLMdkS2b7KqgqNnQAO-bISXYa8IukOGxVY7WxThGBL_y_Mh2mQIdpi7A4P4yQFSg89545NSeRagiTRwjV-R0x8HVCIMo_BzpCAriGHdw3jgs8Wtw-D-3iFQYRhj1_1yo_b2o8RrrHMvwhxouUN3a-9SHvBQKrguCmQQV5tKNj1I70aK59bJHEhfMvqnNOvKg6gU9Tc834bGs8Xah50H"
                                />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-on-surface-variant">
                                    <span className="font-bold text-on-surface">Farmacia:</span>&nbsp;Estamos en Av. Juárez 34, a un costado del banco.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={onChat}
                                className="flex-1 py-2 px-4 rounded-lg border border-primary text-primary font-bold text-sm hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-sm">chat</span>
                                Abrir chat
                            </button>
                            <button className="flex-1 py-2 px-4 rounded-lg border border-primary text-primary font-bold text-sm hover:bg-primary/5 transition-colors flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-sm">location_on</span>
                                Ubicación
                            </button>
                        </div>
                    </div>
                </section>

                {/* QR Section */}
                <section className="mb-10 text-center">
                    <h2 className="text-[11px] font-bold text-outline uppercase tracking-[0.2em] mb-6">TU CÓDIGO DE INTERCAMBIO</h2>
                    <div className="bg-[#F6F7F8] p-8 rounded-[32px] inline-block mx-auto mb-6">
                        {/* Real QR generated from HTLC secret */}
                        <QRCodeSVG
                            value={qrPayload}
                            size={224}
                            bgColor="#F6F7F8"
                            fgColor="#1A2830"
                            level="M"
                            style={{ borderRadius: '12px' }}
                        />
                        <div className="mt-6">
                            <h3 className="font-headline font-extrabold text-xl text-on-surface">Juan Pérez</h3>
                            <p className="text-primary font-bold text-sm">@juanp</p>
                            <p className="mt-2 font-headline font-black text-2xl text-on-surface">${amount} MXN</p>
                            {secretLoaded && (
                                <p className="text-[10px] text-primary mt-1 font-mono opacity-70">
                                    Soroban HTLC · Testnet
                                </p>
                            )}
                        </div>
                    </div>
                </section>

                {/* PIN Section */}
                <section className="mb-10 text-center">
                    <label className="text-[11px] font-bold text-outline uppercase tracking-[0.2em] mb-6 block">Ingresa tu PIN para confirmar</label>
                    <div className="flex justify-center gap-6 mb-10">
                        {[0, 1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                                    pin.length > i ? 'bg-[#00694C] scale-125 shadow-[0_0_12px_rgba(0,105,76,0.3)]' : 'bg-[#D2E5F1]'
                                }`}
                            />
                        ))}
                    </div>

                    {!isConfirming ? (
                        <div className="grid grid-cols-3 gap-y-4 gap-x-8 max-w-[280px] mx-auto">
                            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                                <button
                                    key={num}
                                    onClick={() => handlePinClick(num)}
                                    className="h-16 w-16 flex items-center justify-center text-2xl font-bold text-on-surface hover:bg-surface-container-low rounded-full transition-all active:scale-90"
                                >
                                    {num}
                                </button>
                            ))}
                            <div className="h-16 w-16"></div>
                            <button
                                onClick={() => handlePinClick('0')}
                                className="h-16 w-16 flex items-center justify-center text-2xl font-bold text-on-surface hover:bg-surface-container-low rounded-full transition-all active:scale-90"
                            >
                                0
                            </button>
                            <button
                                onClick={handleBackspace}
                                className="h-16 w-16 flex items-center justify-center text-on-surface hover:bg-surface-container-low rounded-full transition-all active:scale-90"
                            >
                                <span className="material-symbols-outlined text-2xl">backspace</span>
                            </button>
                        </div>
                    ) : (
                        <div className="mt-10 flex flex-col items-center gap-3">
                            <div className="relative w-8 h-8">
                                <div className="absolute inset-0 border-4 border-surface-container-high rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                            </div>
                            <p className="text-sm font-medium text-outline">Confirmando en Soroban...</p>
                        </div>
                    )}
                </section>

                <footer className="mt-12 text-center pb-10">
                    <p className="text-xs text-outline leading-relaxed px-4">
                        Si no se confirma en 30 min, la operación se cancelará automáticamente y tus fondos serán liberados.
                    </p>
                </footer>
            </main>
        </div>
    );
};

export default QRReveal;
