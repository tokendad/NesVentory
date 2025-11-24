import React from "react";

interface LayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  onLogout: () => void;
  userEmail?: string;
  userName?: string;
  onUserClick?: () => void;
  onLocaleClick?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ sidebar, children, onLogout, userEmail, userName, onUserClick, onLocaleClick }) => {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-left">
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
          {(userName || userEmail) && (
            <span 
              className="user-email" 
              onClick={onUserClick}
              style={{ cursor: onUserClick ? "pointer" : "default" }}
              title="Click to edit profile"
            >
              {userName || userEmail}
            </span>
          )}
          <button className="btn-outline" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>
      <div className="app-body">
        <aside className="app-sidebar">{sidebar}</aside>
        <main className="app-main">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
