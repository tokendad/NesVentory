import React, { useState } from "react";
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

function getLocationTypeLabel(locationType: string | null | undefined): string | null {
  if (!locationType) return null;
  const typeLabels: Record<string, string> = {
    'residential': 'Residential',
    'commercial': 'Commercial',
    'retail': 'Retail',
    'industrial': 'Industrial',
    'apartment_complex': 'Apartment Complex',
    'condo': 'Condo',
    'multi_family': 'Multi-Family',
    'other': 'Other'
  };
  return typeLabels[locationType] || locationType;
}

interface LocationNodeProps {
  loc: Location;
  expandedIds: Set<string | number>;
  onToggle: (id: string | number) => void;
}

const LocationNode: React.FC<LocationNodeProps> = ({ loc, expandedIds, onToggle }) => {
  const children = loc.children || [];
  const hasChildren = children.length > 0;
  const isExpanded = expandedIds.has(loc.id);
  const hasLandlord = loc.landlord_info && Object.keys(loc.landlord_info).length > 0;
  const hasTenant = loc.tenant_info && Object.keys(loc.tenant_info).length > 0;
  const isPrimary = loc.is_primary_location;
  const locationType = getLocationTypeLabel(loc.location_type);
  
  const handleClick = () => {
    if (hasChildren) {
      onToggle(loc.id);
    }
  };
  
  return (
    <li>
      <span 
        style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: "0.25rem",
          cursor: hasChildren ? "pointer" : "default"
        }}
        onClick={handleClick}
      >
        {hasChildren && (
          <span style={{ 
            width: "1rem", 
            textAlign: "center",
            flexShrink: 0,
            transition: "transform 0.2s ease"
          }}>
            {isExpanded ? "▼" : "▶"}
          </span>
        )}
        {!hasChildren && (
          <span style={{ width: "1rem", flexShrink: 0 }}></span>
        )}
        {loc.friendly_name || loc.name}
        {hasChildren && (
          <span style={{ 
            fontSize: "0.6rem", 
            color: "var(--muted)", 
            marginLeft: "0.25rem" 
          }}>
            ({children.length})
          </span>
        )}
        {isPrimary && (
          <span title="Primary Location" style={{ 
            fontSize: "0.625rem", 
            backgroundColor: "#4ecdc4", 
            color: "#fff", 
            padding: "0.125rem 0.25rem", 
            borderRadius: "3px",
            marginLeft: "0.25rem"
          }}>
            HOME
          </span>
        )}
        {hasLandlord && (
          <span title={`Landlord: ${loc.landlord_info?.name || 'Info available'}`} style={{ 
            fontSize: "0.625rem", 
            backgroundColor: "#ff6b6b", 
            color: "#fff", 
            padding: "0.125rem 0.25rem", 
            borderRadius: "3px",
            marginLeft: "0.25rem"
          }}>
            LANDLORD
          </span>
        )}
        {hasTenant && (
          <span title={`Tenant: ${loc.tenant_info?.name || 'Info available'}`} style={{ 
            fontSize: "0.625rem", 
            backgroundColor: "#95e1d3", 
            color: "#333", 
            padding: "0.125rem 0.25rem", 
            borderRadius: "3px",
            marginLeft: "0.25rem"
          }}>
            TENANT
          </span>
        )}
        {locationType && (
          <span title={locationType} style={{ 
            fontSize: "0.625rem", 
            backgroundColor: "#888", 
            color: "#fff", 
            padding: "0.125rem 0.25rem", 
            borderRadius: "3px",
            marginLeft: "0.25rem"
          }}>
            {locationType}
          </span>
        )}
      </span>
      {hasChildren && isExpanded && (
        <ul>
          {children.map((child) => (
            <LocationNode 
              key={child.id} 
              loc={child} 
              expandedIds={expandedIds}
              onToggle={onToggle}
            />
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
  const [expandedIds, setExpandedIds] = useState<Set<string | number>>(new Set());
  
  let tree: Location[] = [];
  let parseError: string | null = null;

  try {
    tree = buildTree(locations);
  } catch (e) {
    parseError = `Failed to build location tree: ${e instanceof Error ? e.message : 'Unknown error'}`;
  }
  
  const handleToggle = (id: string | number) => {
    setExpandedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <div className="locations-panel">
      <div className="panel-header small">
        <h3>Locations</h3>
      </div>
      {loading && <p className="muted small">Loading locations…</p>}
      {error && (
        <div className="error-banner">
          <strong>API Error:</strong> {error}
          <br />
          <small>Unable to fetch locations from server. Check network connection and API status.</small>
        </div>
      )}
      {parseError && (
        <div className="error-banner">
          <strong>Data Error:</strong> {parseError}
          <br />
          <small>Received invalid location data. Contact support if this persists.</small>
        </div>
      )}
      {!loading && !error && !parseError && tree.length === 0 && (
        <p className="muted small">
          No locations yet. These will be created automatically when you import
          from Encircle or add items via the API.
        </p>
      )}
      {!error && !parseError && tree.length > 0 && (
        <ul className="locations-tree">
          {tree.map((loc) => (
            <LocationNode 
              key={loc.id} 
              loc={loc} 
              expandedIds={expandedIds}
              onToggle={handleToggle}
            />
          ))}
        </ul>
      )}
    </div>
  );
};

export default LocationsTree;
