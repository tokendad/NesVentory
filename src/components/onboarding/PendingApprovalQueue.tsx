import { useEffect, useState } from "react";
import { getPendingUsers, approveUser, rejectUser, type User } from "../../lib/api";

interface Props {
  onClose: () => void;
  onCountChange: (count: number) => void;
}

export default function PendingApprovalQueue({ onClose, onCountChange }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await getPendingUsers();
      setUsers(data);
      onCountChange(data.length);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load pending users.");
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(userId: string) {
    setProcessing(userId);
    try {
      await approveUser(userId);
      const remaining = users.filter((u) => u.id !== userId);
      setUsers(remaining);
      onCountChange(remaining.length);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to approve user.");
    } finally {
      setProcessing(null);
    }
  }

  async function handleReject(userId: string) {
    setProcessing(userId);
    try {
      await rejectUser(userId);
      const remaining = users.filter((u) => u.id !== userId);
      setUsers(remaining);
      onCountChange(remaining.length);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to reject user.");
    } finally {
      setProcessing(null);
    }
  }

  return (
    <div className="wizard-overlay" onClick={onClose}>
      <div
        className="wizard-card"
        style={{ maxWidth: "540px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="wizard-header">
          <h2>Pending Approvals</h2>
          <p>Review new user registrations awaiting your approval.</p>
        </div>

        <div className="wizard-body">
          {loading && (
            <p style={{ textAlign: "center", color: "var(--muted)", margin: 0 }}>
              Loading…
            </p>
          )}

          {!loading && error && <div className="error-banner">{error}</div>}

          {!loading && !error && users.length === 0 && (
            <p style={{ textAlign: "center", color: "var(--muted)", margin: 0 }}>
              ✅ No pending registrations.
            </p>
          )}

          {!loading && users.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {users.map((user) => (
                <div
                  key={user.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "1rem",
                    padding: "0.75rem 1rem",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.5rem",
                  }}
                >
                  <div style={{ overflow: "hidden" }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: "0.95rem",
                        color: "var(--text)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {user.full_name || "—"}
                    </div>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--muted)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {user.email}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                    <button
                      className="btn btn-primary"
                      style={{ padding: "0.35rem 0.75rem", fontSize: "0.85rem" }}
                      disabled={processing === user.id}
                      onClick={() => handleApprove(user.id)}
                    >
                      Approve
                    </button>
                    <button
                      className="btn btn-ghost"
                      style={{ padding: "0.35rem 0.75rem", fontSize: "0.85rem" }}
                      disabled={processing === user.id}
                      onClick={() => handleReject(user.id)}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="wizard-footer">
          <span />
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
