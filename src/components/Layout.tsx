import React, { useState } from "react";
import { useIsMobile } from "../lib/useMobile";

interface LayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  onLogout: () => void;
  userEmail?: string;
  userName?: string;
  onUserClick?: () => void;
  onLocaleClick?: () => void;
}

export { useIsMobile };

const Layout: React.FC<LayoutProps> = ({ sidebar, children, onLogout, userEmail, userName, onUserClick, onLocaleClick }) => {
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-left">
          {isMobile && (
            <button 
              className="mobile-menu-toggle" 
              onClick={handleMobileMenuToggle}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              <span className={`hamburger-icon ${mobileMenuOpen ? 'open' : ''}`}>
                <span></span>
                <span></span>
                <span></span>
              </span>
            </button>
          )}
          <span className="logo-dot" />
          <span className="app-title">NesVentory</span>
        </div>
        <div className="app-header-right">
          {onLocaleClick && (
            <button 
              className="btn-outline" 
              onClick={onLocaleClick}
              title="Locale & Currency Settings"
            >
              🌐
            </button>
          )}
          {!isMobile && (userName || userEmail) && (
            <span 
              className="user-email" 
              onClick={onUserClick}
              style={{ cursor: onUserClick ? "pointer" : "default" }}
              title="Click to edit profile"
            >
              {userName || userEmail}
            </span>
          )}
          {!isMobile && (
            <button className="btn-outline" onClick={onLogout}>
              Logout
            </button>
          )}
        </div>
      </header>
      <div className="app-body">
        {/* Mobile overlay */}
        {isMobile && mobileMenuOpen && (
          <div 
            className="mobile-menu-overlay" 
            onClick={closeMobileMenu}
            aria-hidden="true"
          />
        )}
        {/* Sidebar - always rendered but conditionally visible on mobile */}
        <aside 
          className={`app-sidebar ${isMobile ? 'mobile' : ''} ${mobileMenuOpen ? 'open' : ''}`}
          onClick={(e) => {
            // Close menu when clicking a nav link on mobile
            const target = e.target;
            if (isMobile && target instanceof HTMLElement && target.closest('.nav-link')) {
              closeMobileMenu();
            }
          }}
        >
          {sidebar}
        </aside>
        <main className="app-main">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
