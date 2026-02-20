import { useState, useEffect } from 'react';
import { LogOut, Home, Menu, X, Zap, List, User } from 'lucide-react';

interface PlayerHeaderProps {
  username: string;
  bannerUrl: string | null;
  bannerMobileUrl: string | null;
  logoUrl: string | null;
  onSignOut: () => void;
  onBackToHome?: () => void;
  onNewBooking?: () => void;
  onMyBookings?: () => void;
  onMyInfo?: () => void;
}

export function PlayerHeader({ username, bannerUrl, bannerMobileUrl, logoUrl, onSignOut, onBackToHome, onNewBooking, onMyBookings, onMyInfo }: PlayerHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isMobile = window.innerWidth < 768;
  const selectedBannerUrl = isMobile && bannerMobileUrl ? bannerMobileUrl : bannerUrl;

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [menuOpen]);

  return (
    <>
      <header className="relative bg-neutral-900 shadow-lg border-b border-neutral-800">
        {selectedBannerUrl && (
          <div className="relative w-full h-40 md:h-48 overflow-hidden">
            <img
              src={selectedBannerUrl}
              alt="Bannière"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-neutral-900" />
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="h-12 w-auto"
                />
              )}
              <div>
                <h1 className="hidden md:block text-2xl font-bold text-white">Réservation Padel</h1>
                <p className="hidden md:block text-sm text-neutral-400 mt-1">Bienvenue, {username}</p>
              </div>
            </div>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 text-neutral-300 hover:bg-neutral-800 rounded-lg transition"
              aria-label="Menu"
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setMenuOpen(false)}>
          <div
            className="absolute right-0 top-0 h-full w-64 bg-neutral-900 shadow-xl border-l border-neutral-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-neutral-800">
              <h2 className="text-lg font-semibold text-white">Menu</h2>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-2 text-neutral-300 hover:bg-neutral-800 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            <nav className="p-4 space-y-2">
              {onBackToHome && (
                <button
                  onClick={() => {
                    onBackToHome();
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-neutral-300 hover:bg-neutral-800 rounded-lg transition text-left"
                >
                  <Home size={20} />
                  <span>Accueil</span>
                </button>
              )}

              {onNewBooking && (
                <button
                  onClick={() => {
                    onNewBooking();
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[#866733]/20 to-[#c4ab63]/20 text-[#ecd88e] hover:from-[#866733]/30 hover:to-[#c4ab63]/30 border border-[#866733]/30 rounded-lg transition text-left shadow-lg shadow-[#866733]/10"
                >
                  <Zap size={20} className="drop-shadow-[0_0_4px_rgba(236,216,142,0.6)]" />
                  <span className="font-semibold">Nouvelle réservation</span>
                </button>
              )}

              {onMyBookings && (
                <button
                  onClick={() => {
                    onMyBookings();
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-neutral-300 hover:bg-neutral-800 rounded-lg transition text-left"
                >
                  <List size={20} />
                  <span>Mes réservations</span>
                </button>
              )}

              {onMyInfo && (
                <button
                  onClick={() => {
                    onMyInfo();
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-neutral-300 hover:bg-neutral-800 rounded-lg transition text-left"
                >
                  <User size={20} />
                  <span>Mes informations</span>
                </button>
              )}

              <div className="border-t border-neutral-800 my-2"></div>

              <button
                onClick={() => {
                  onSignOut();
                  setMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-neutral-800 rounded-lg transition text-left"
              >
                <LogOut size={20} />
                <span>Déconnexion</span>
              </button>
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
