import React, { useEffect, useState } from "react";
import { fetchStatus, type SystemStatus } from "../lib/api";

const Status: React.FC = () => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadStatus() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStatus();
      setStatus(data);
    } catch (err: any) {
      setError(err.message || "Failed to load status");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  if (loading) {
    return (
      <section className="panel">
        <div className="panel-header">
          <h2>System Status</h2>
        </div>
        <p className="muted">Loading status...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="panel">
        <div className="panel-header">
          <h2>System Status</h2>
        </div>
        <div className="error-banner">{error}</div>
      </section>
    );
  }

  if (!status) {
    return null;
  }

  const { application, database } = status;

  return (
    <div>
      <section className="panel">
        <div className="panel-header">
          <h2>System Status</h2>
          <button
            className="btn-outline"
            onClick={loadStatus}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* Application Status Cards */}
        <div className="cards-grid">
          <div className="card">
            <div className="card-label">Application</div>
            <div className="card-value">{application.name}</div>
            <div className="card-footnote">v{application.version}</div>
          </div>
          <div className="card">
            <div className="card-label">Health</div>
            <div className="card-value status-ok">{application.status}</div>
            <div className="card-footnote">System operational</div>
          </div>
        </div>
      </section>

      {/* Database Status Panel */}
      <section className="panel">
        <div className="panel-header small">
          <h3>Database Information</h3>
        </div>

        <div className="cards-grid">
          <div className="card">
            <div className="card-label">Status</div>
            <div
              className={`card-value ${
                database.status === "healthy" ? "status-ok" : ""
              }`}
              style={
                database.status !== "healthy"
                  ? { color: "var(--danger)" }
                  : undefined
              }
            >
              {database.status}
            </div>
            {database.error && (
              <div className="card-footnote" style={{ color: "var(--danger)" }}>
                {database.error}
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-label">PostgreSQL Version</div>
            <div className="card-value">{database.version}</div>
            <div className="card-footnote">
              {database.is_version_current === true && (
                <span className="status-ok">✓ Up to date</span>
              )}
              {database.is_version_current === false && (
                <span style={{ color: "var(--danger)" }}>
                  Update available: {database.latest_version}
                </span>
              )}
              {database.is_version_current === null &&
                database.latest_version && (
                  <span className="muted">
                    Latest: {database.latest_version}
                  </span>
                )}
              {!database.latest_version && (
                <span className="muted">Version check unavailable</span>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-label">Database Size</div>
            <div className="card-value">{database.size}</div>
            <div className="card-footnote">
              {database.size_bytes.toLocaleString()} bytes
            </div>
          </div>

          <div className="card">
            <div className="card-label">Location</div>
            <div className="card-value" style={{ fontSize: "0.75rem", wordBreak: "break-all" }}>
              {database.location}
            </div>
          </div>
        </div>

        {/* Full Version Information */}
        {database.version_full && (
          <div style={{ marginTop: "1rem" }}>
            <div className="detail-label">Full Version Information</div>
            <div
              className="detail-value"
              style={{
                fontSize: "0.75rem",
                marginTop: "0.5rem",
                padding: "0.75rem",
                background: "rgba(15, 23, 42, 0.8)",
                borderRadius: "0.5rem",
                border: "1px solid rgba(30, 64, 175, 0.7)",
                fontFamily: "monospace",
                wordBreak: "break-all",
              }}
            >
              {database.version_full}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default Status;
