import { ShoppingCart, Fish, Menu, X, User, LogIn, LogOut, Clock, Phone, History } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getSavedProfile, signOut } from '@/lib/auth';
import { getVenueConfig } from '@/lib/venueConfig';
import { usePublishedPages } from '@/hooks/useSitePages';
import { toast } from 'sonner';

interface HeaderProps {
  itemCount: number;
  onCartOpen: () => void;
  onSignInClick?: () => void;
}

export default function Header({ itemCount, onCartOpen, onSignInClick }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const profile = getSavedProfile();
  const venue = getVenueConfig();
  const { pages: cmsPages } = usePublishedPages();
  const navPages = cmsPages.filter(p => p.showInNav).sort((a, b) => a.navOrder - b.navOrder);

  const handleSignOut = async () => {
    await signOut();
    setShowAccountMenu(false);
    toast.success('Signed out');
    navigate(0);
  };

  return (
    <header className="sticky top-0 z-50 bg-[var(--brand-accent)] shadow-lg border-b border-[var(--brand-primary)]/20">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-full bg-[var(--brand-primary)] flex items-center justify-center overflow-hidden flex-shrink-0">
            {venue.logoUrl ? (
              <img src={venue.logoUrl} alt={venue.businessName} className="w-full h-full object-cover" />
            ) : (
              <Fish className="w-5 h-5 text-[var(--brand-accent)]" />
            )}
          </div>
          <div>
            <p className="text-white font-bold text-base leading-tight">{venue.businessName}</p>
            <p className="text-[var(--brand-primary)] text-[10px] leading-tight">{venue.city}{venue.postcode ? ` • ${venue.postcode}` : ''}{venue.collectionOnly ? ' • Collections' : ''}</p>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm text-white/70">
          <Link to="/menu" className={`hover:text-[var(--brand-primary)] transition-colors ${location.pathname === '/menu' ? 'text-[var(--brand-primary)] font-semibold' : ''}`}>
            Menu
          </Link>
          {navPages.map(p => (
            <Link key={p.id} to={`/p/${p.slug}`}
              className={`hover:text-[var(--brand-primary)] transition-colors ${location.pathname === `/p/${p.slug}` ? 'text-[var(--brand-primary)] font-semibold' : ''}`}>
              {p.navLabel || p.title}
            </Link>
          ))}
          {venue.phone && (
            <a href={`tel:${venue.phone.replace(/\s/g, '')}`} className="hover:text-[var(--brand-primary)] transition-colors flex items-center gap-1">
              <Phone className="w-3.5 h-3.5" /> {venue.phone}
            </a>
          )}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Account button */}
          {profile ? (
            <div className="relative">
              <button
                onClick={() => setShowAccountMenu(v => !v)}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-full transition-all text-sm font-semibold"
              >
                <User className="w-4 h-4 text-[var(--brand-primary)]" />
                <span className="hidden sm:inline max-w-[100px] truncate">{profile.name.split(' ')[0]}</span>
              </button>
              {showAccountMenu && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
                  <div className="bg-[var(--brand-accent)] px-4 py-3">
                    <p className="text-white font-bold text-sm truncate">{profile.name}</p>
                    <p className="text-white/50 text-xs truncate">{profile.email}</p>
                  </div>
                  <div className="p-2">
                    <Link
                      to="/orders"
                      onClick={() => setShowAccountMenu(false)}
                      className="flex items-center gap-2 px-3 py-2.5 text-[var(--brand-accent)] hover:bg-[var(--brand-primary)]/10 rounded-xl text-sm font-semibold transition-colors"
                    >
                      <History className="w-4 h-4 text-[var(--brand-primary)]" /> My Orders
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-xl text-sm font-semibold transition-colors"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onSignInClick}
              className="hidden sm:flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-full transition-all text-sm font-semibold"
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In
            </button>
          )}

          {/* Cart button */}
          {location.pathname !== '/checkout' && (
            <button
              onClick={onCartOpen}
              className="relative flex items-center gap-2 bg-[var(--brand-primary)] hover:opacity-90 text-[var(--brand-accent)] font-bold px-4 py-2 rounded-full transition-all active:scale-95"
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="text-sm hidden sm:inline">View Order</span>
              {itemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </button>
          )}

          <button
            className="md:hidden text-white p-1"
            onClick={() => setMobileMenuOpen(v => !v)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[var(--brand-accent)] border-t border-white/10 px-4 py-3 flex flex-col gap-3 text-sm">
          <Link to="/menu" onClick={() => setMobileMenuOpen(false)} className="text-white hover:text-[var(--brand-primary)]">
            Menu
          </Link>
          {navPages.map(p => (
            <Link key={p.id} to={`/p/${p.slug}`} onClick={() => setMobileMenuOpen(false)}
              className="text-white hover:text-[var(--brand-primary)]">
              {p.navLabel || p.title}
            </Link>
          ))}
          {venue.phone && <a href={`tel:${venue.phone.replace(/\s/g, '')}`} className="text-white hover:text-[var(--brand-primary)] flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {venue.phone}</a>}
          {profile ? (
            <>
              <Link to="/orders" onClick={() => setMobileMenuOpen(false)} className="text-white hover:text-[var(--brand-primary)] flex items-center gap-2">
                <History className="w-4 h-4" /> My Orders
              </Link>
              <button onClick={handleSignOut} className="text-left text-red-400 hover:text-red-300 flex items-center gap-2">
                <LogOut className="w-4 h-4" /> Sign Out ({profile.name})
              </button>
            </>
          ) : (
            <button onClick={() => { onSignInClick?.(); setMobileMenuOpen(false); }} className="text-left text-[var(--brand-primary)] font-semibold flex items-center gap-2">
              <LogIn className="w-4 h-4" /> Sign In / Create Account
            </button>
          )}
          <div className="flex items-center gap-1.5 text-white/40 text-xs">
            <Clock className="w-3 h-3" /> {venue.paymentInfo}
          </div>
        </div>
      )}

      {/* Close account menu on outside click */}
      {showAccountMenu && (
        <div className="fixed inset-0 z-40" onClick={() => setShowAccountMenu(false)} />
      )}
    </header>
  );
}
