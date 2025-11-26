import React from "react";

interface DashboardCardsProps {
  totalItems: number;
  totalLocations: number;
  isMobile?: boolean;
  userName?: string;
  userEmail?: string;
  onUserClick?: () => void;
  onLogout?: () => void;
}

const DashboardCards: React.FC<DashboardCardsProps> = ({
  totalItems,
  totalLocations,
  isMobile,
  userName,
  userEmail,
  onUserClick,
  onLogout,
}) => {
  return (
    <>
      {/* Mobile user section - shown only on mobile */}
      {isMobile && (userName || userEmail) && (
        <div className="mobile-user-card">
          <div className="mobile-user-info">
            <span className="mobile-user-label">Logged in as</span>
            <span 
              className="mobile-user-name"
              onClick={onUserClick}
              style={{ cursor: onUserClick ? "pointer" : "default" }}
            >
              {userName || userEmail}
            </span>
          </div>
          <div className="mobile-user-actions">
            {onUserClick && (
              <button className="btn-outline" onClick={onUserClick}>
                Settings
              </button>
            )}
            {onLogout && (
              <button className="btn-outline btn-logout-mobile" onClick={onLogout}>
                Logout
              </button>
            )}
          </div>
        </div>
      )}
      <div className="cards-grid">
        <div className="card">
          <div className="card-label">Total Items</div>
          <div className="card-value">{totalItems}</div>
          <div className="card-footnote">All tracked possessions</div>
        </div>
        <div className="card">
          <div className="card-label">Locations</div>
          <div className="card-value">{totalLocations}</div>
          <div className="card-footnote">Homes, rooms, shelves</div>
        </div>
        <div className="card">
          <div className="card-label">Status</div>
          <div className="card-value status-ok">Healthy</div>
          <div className="card-footnote">API reachable</div>
        </div>
      </div>
    </>
  );
};

export default DashboardCards;
