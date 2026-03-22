import { useState, useEffect } from 'react'
import Home from './pages/Home'
import CashoutRequest from './pages/CashoutRequest'
import DepositRequest from './pages/DepositRequest'
import ExploreMap from './pages/ExploreMap'
import DepositMap from './pages/DepositMap'
import ChatRoom from './pages/ChatRoom'
import DepositChat from './pages/DepositChat'
import QRReveal from './pages/QRReveal'
import DepositQR from './pages/DepositQR'
import SuccessScreen from './pages/SuccessScreen'
import BottomNav from './components/BottomNav'
import { registerUser, createTrade, lockTrade, revealTrade, UserData, TradeData } from './services/api'

function App() {
  const [currentPage, setCurrentPage] = useState('home')
  const [flow, setFlow] = useState<'cashout' | 'deposit' | null>(null)

  // API state
  const [buyerUser, setBuyerUser] = useState<UserData | null>(null)
  const [sellerUser, setSellerUser] = useState<UserData | null>(null)
  const [activeTrade, setActiveTrade] = useState<TradeData | null>(null)
  const [activeAmount, setActiveAmount] = useState(500)
  const [tradeLoading, setTradeLoading] = useState(false)

  // Auto-register buyer + mock seller on startup
  useEffect(() => {
    const initUsers = async () => {
      try {
        const ts = Date.now() % 100000
        const [buyer, seller] = await Promise.all([
          registerUser(`juan_${ts}`),
          registerUser(`farmacia_${ts}`),
        ])
        setBuyerUser(buyer)
        setSellerUser(seller)
        console.log('✅ Users registered:', buyer.username, seller.username)
      } catch (e) {
        console.warn('⚠️ Backend not available, running in UI-only mode', e)
      }
    }
    initUsers()
  }, [])

  const handleNavigate = (page: string) => {
    setCurrentPage(page)
  }

  const startCashout = () => {
    setFlow('cashout')
    setCurrentPage('cashout')
  }

  const startDeposit = () => {
    setFlow('deposit')
    setCurrentPage('deposit')
  }

  // Called when user selects an offer on the map
  // Creates trade, simulates agent locking + revealing, then navigates to chat
  const handleOfferSelected = async (offerId: string) => {
    if (!buyerUser || !sellerUser) {
      // Backend unavailable — go straight to chat (UI-only demo)
      setCurrentPage('chat')
      return
    }
    setTradeLoading(true)
    try {
      const trade = await createTrade(sellerUser.id, activeAmount, buyerUser.token)
      await lockTrade(trade.id, sellerUser.token)
      await revealTrade(trade.id, sellerUser.token)
      setActiveTrade(trade)
      console.log('✅ Trade ready:', trade.id)
    } catch (e) {
      console.error('Trade flow failed, continuing as demo', e)
    } finally {
      setTradeLoading(false)
      setCurrentPage('chat')
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F4FAFF]">
      {currentPage === 'home' && (
        <Home onNavigateCashout={startCashout} onNavigateDeposit={startDeposit} />
      )}

      {/* Cashout Flow */}
      {currentPage === 'cashout' && (
        <CashoutRequest
          onBack={() => setCurrentPage('home')}
          onSearch={(amount) => {
            setActiveAmount(amount)
            setCurrentPage('map')
          }}
        />
      )}

      {/* Deposit Flow */}
      {currentPage === 'deposit' && (
        <DepositRequest
          onBack={() => setCurrentPage('home')}
          onSearch={(amount) => {
            setActiveAmount(Number(amount) || 500)
            setCurrentPage('map_deposit')
          }}
        />
      )}

      {currentPage === 'map_deposit' && (
        <DepositMap
          onBack={() => setCurrentPage('deposit')}
          onSelectOffer={(offerId) => {
            console.log('Selected deposit offer:', offerId)
            setCurrentPage('chat_deposit')
          }}
        />
      )}

      {currentPage === 'map' && (
        <ExploreMap
          amount={activeAmount}
          loading={tradeLoading}
          onBack={() => setCurrentPage('cashout')}
          onSelectOffer={handleOfferSelected}
        />
      )}

      {currentPage === 'chat' && (
        <ChatRoom
          onBack={() => setCurrentPage('map')}
          onViewQR={() => {
            setCurrentPage('qr_reveal')
          }}
        />
      )}

      {currentPage === 'chat_deposit' && (
        <DepositChat
          onBack={() => setCurrentPage('map_deposit')}
          onViewQR={() => {
            setCurrentPage('qr_deposit')
          }}
        />
      )}

      {currentPage === 'qr_reveal' && (
        <QRReveal
          activeTrade={activeTrade}
          sellerToken={sellerUser?.token ?? null}
          buyerToken={buyerUser?.token ?? null}
          amount={activeAmount}
          onBack={() => setCurrentPage('chat')}
          onChat={() => setCurrentPage('chat')}
          onSuccess={() => {
            setCurrentPage('success')
          }}
        />
      )}

      {currentPage === 'qr_deposit' && (
        <DepositQR
          onBack={() => setCurrentPage('chat_deposit')}
          onChat={() => setCurrentPage('chat_deposit')}
          onSuccess={() => {
            setCurrentPage('success')
          }}
        />
      )}

      {currentPage === 'success' && (
        <SuccessScreen
          type={flow === 'cashout' ? 'cashout' : 'deposit'}
          amount={activeAmount.toFixed(2)}
          commission={flow === 'cashout' ? (activeAmount * 0.01).toFixed(2) : (activeAmount * 0.008).toFixed(2)}
          received={
            flow === 'cashout'
              ? `$${(activeAmount * 0.99).toFixed(2)} MXN`
              : `${(activeAmount * 0.992).toFixed(0)} MXN`
          }
          agentName={flow === 'cashout' ? 'Farmacia Guadalupe' : 'Tienda Don Pepe'}
          tradeId={activeTrade?.id}
          onHome={() => {
            setFlow(null)
            setActiveTrade(null)
            setCurrentPage('home')
          }}
        />
      )}

      {!['chat', 'chat_deposit', 'qr_reveal', 'qr_deposit', 'success'].includes(currentPage) && (
        <BottomNav currentPage={currentPage} onNavigate={handleNavigate} />
      )}
    </div>
  )
}

export default App
