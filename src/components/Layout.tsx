import React from "react";

interface LayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  onLogout: () => void;
  userEmail?: string;
}

const Layout: React.FC<LayoutProps> = ({ sidebar, children, onLogout, userEmail }) => {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-left">
          <span className="logo-dot" />
          <span className="app-title">InvenTree</span>
        </div>
        <div className="app-header-right">
          {userEmail && <span className="user-email">{userEmail}</span>}
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
