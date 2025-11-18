import React from "react";

interface DashboardCardsProps {
  totalItems: number;
  totalLocations: number;
}

const DashboardCards: React.FC<DashboardCardsProps> = ({
  totalItems,
  totalLocations,
}) => {
  return (
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
  );
};

export default DashboardCards;
