import React from "react";
import type { Location } from "../lib/api";

interface LocationsTreeProps {
  locations: Location[];
  loading: boolean;
  error?: string | null;
}

function buildTree(locations: Location[]): Location[] {
  const byId = new Map<string | number, Location & { children: Location[] }>();
  locations.forEach((loc) =>
    byId.set(loc.id, { ...loc, children: loc.children || [] })
  );
  const roots: Location[] = [];
  byId.forEach((loc) => {
    if (loc.parent_id != null && byId.has(loc.parent_id)) {
      byId.get(loc.parent_id)!.children!.push(loc);
    } else {
      roots.push(loc);
    }
  });
  return roots;
}

const LocationNode: React.FC<{ loc: Location }> = ({ loc }) => {
  const children = loc.children || [];
  return (
    <li>
      <span>{loc.name}</span>
      {children.length > 0 && (
        <ul>
          {children.map((child) => (
            <LocationNode key={child.id} loc={child} />
          ))}
        </ul>
      )}
    </li>
  );
};

const LocationsTree: React.FC<LocationsTreeProps> = ({
  locations,
  loading,
  error,
}) => {
  const tree = buildTree(locations);

  return (
    <div className="locations-panel">
      <div className="panel-header small">
        <h3>Locations</h3>
      </div>
      {loading && <p className="muted small">Loading locations…</p>}
      {error && <div className="error-banner">{error}</div>}
      {!loading && tree.length === 0 && !error && (
        <p className="muted small">
          No locations yet. These will be created automatically when you import
          from Encircle or add items via the API.
        </p>
      )}
      {tree.length > 0 && (
        <ul className="locations-tree">
          {tree.map((loc) => (
            <LocationNode key={loc.id} loc={loc} />
          ))}
        </ul>
      )}
    </div>
  );
};

export default LocationsTree;
