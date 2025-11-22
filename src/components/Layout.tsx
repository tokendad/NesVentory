import React from "react";
import { User } from "../lib/api";

interface LayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  onLogout: () => void;
  user?: User | null;
  onUserClick?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ sidebar, children, onLogout, user, onUserClick }) => {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-left">
          <span className="logo-dot" />
          <span className="app-title">NesVentory</span>
        </div>
        <div className="app-header-right">
          {user && (
            <button 
              className="user-email clickable" 
              onClick={onUserClick}
              title="User Settings"
            >
              {user.email}
            </button>
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
