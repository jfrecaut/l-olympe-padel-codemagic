import { Zap, List, User } from 'lucide-react';
import { Profile } from '../../types';

interface WelcomeScreenProps {
  profile: Profile;
  upcomingBookingsCount: number;
  videoUrl: string | null;
  videoMobileUrl: string | null;
  logoUrl: string | null;
  onNewBooking: () => void;
  onViewBookings: () => void;
  onOpenSettings: () => void;
}

export function WelcomeScreen({
  profile,
  upcomingBookingsCount,
  videoUrl,
  videoMobileUrl,
  logoUrl,
  onNewBooking,
  onViewBookings,
  onOpenSettings,
}: WelcomeScreenProps) {
  const isMobile = window.innerWidth < 768;
  const selectedVideoUrl = isMobile && videoMobileUrl ? videoMobileUrl : videoUrl;

  return (
    <div className="h-screen bg-black flex flex-col overflow-hidden">
      <div className="relative w-full h-[45vh] md:h-[50vh] overflow-hidden flex-shrink-0">
        {selectedVideoUrl ? (
          <>
            <video
              src={selectedVideoUrl}
              className="absolute inset-0 w-full h-full object-cover"
              autoPlay
              loop
              muted
              playsInline
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 to-black" />
        )}

        <div className="relative h-full flex items-center justify-center px-6">
          <div className="text-center">
            {logoUrl && (
              <div className="mb-6 flex justify-center">
                <img
                  src={logoUrl}
                  alt="Logo"
                  className="h-16 md:h-20 lg:h-24 w-auto drop-shadow-2xl"
                />
              </div>
            )}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-2 drop-shadow-lg">
              Bienvenue
            </h1>
            <p className="text-2xl md:text-3xl lg:text-4xl font-light text-white/95 drop-shadow-lg">
              {profile.first_name} {profile.last_name}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 md:py-12 gap-4 md:gap-6 overflow-y-auto">
        <button
          onClick={onNewBooking}
          className="w-full max-w-md bg-gradient-to-r from-[#866733] via-[#c4ab63] to-[#ecd88e] text-black py-6 px-8 rounded-2xl font-semibold text-xl shadow-2xl shadow-[#866733]/60 hover:shadow-[0_20px_60px_rgba(134,103,51,0.8)] hover:from-[#6b5229] hover:via-[#866733] hover:to-[#c4ab63] transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-4 active:scale-95 ring-2 ring-[#866733]/30 hover:ring-[#c4ab63]/50"
        >
          <Zap className="w-8 h-8 drop-shadow-md" />
          <span>Nouvelle réservation</span>
        </button>

        <button
          onClick={onViewBookings}
          className="w-full max-w-md bg-white/10 backdrop-blur-sm text-white py-6 px-8 rounded-2xl font-semibold text-xl border-2 border-white/20 hover:bg-white/20 hover:border-white/30 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-4 active:scale-95"
        >
          <List className="w-8 h-8" />
          <span>
            Mes réservations
            {upcomingBookingsCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-8 h-8 text-sm font-bold bg-gradient-to-br from-[#866733] to-[#c4ab63] text-white rounded-full shadow-lg shadow-[#866733]/50 ring-2 ring-[#c4ab63]/30">
                {upcomingBookingsCount}
              </span>
            )}
          </span>
        </button>

        <button
          onClick={onOpenSettings}
          className="w-full max-w-md bg-white/10 backdrop-blur-sm text-white py-6 px-8 rounded-2xl font-semibold text-xl border-2 border-white/20 hover:bg-white/20 hover:border-white/30 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-4 active:scale-95"
        >
          <User className="w-8 h-8" />
          <span>Mes informations</span>
        </button>
      </div>
    </div>
  );
}
