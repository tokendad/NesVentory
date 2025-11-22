import React, { useState, useEffect } from "react";
import {
  getAllUsers,
  updateUser,
  deleteUser,
  getSystemHealth,
  getDatabaseSize,
  type User,
  type UserUpdate,
  type SystemHealth,
  type DatabaseSize,
} from "../lib/api";

interface AdminPanelProps {
  onClose: () => void;
}

type Tab = "users" | "health" | "database";

const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<Tab>("users");
  const [users, setUsers] = useState<User[]>([]);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [dbSize, setDbSize] = useState<DatabaseSize | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState("");

  async function loadUsers() {
    setLoading(true);
    setError(null);
    try {
      const data = await getAllUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  async function loadHealth() {
    setLoading(true);
    setError(null);
    try {
      const data = await getSystemHealth();
      setHealth(data);
    } catch (err: any) {
      setError(err.message || "Failed to load health information");
    } finally {
      setLoading(false);
    }
  }

  async function loadDatabaseSize() {
    setLoading(true);
    setError(null);
    try {
      const data = await getDatabaseSize();
      setDbSize(data);
    } catch (err: any) {
      setError(err.message || "Failed to load database size");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === "users") {
      loadUsers();
    } else if (activeTab === "health") {
      loadHealth();
    } else if (activeTab === "database") {
      loadDatabaseSize();
    }
  }, [activeTab]);

  async function handleUpdateUserRole(userId: string) {
    setError(null);
    try {
      const update: UserUpdate = { role: editRole };
      await updateUser(userId, update);
      setEditingUserId(null);
      await loadUsers();
    } catch (err: any) {
      setError(err.message || "Failed to update user");
    }
  }

  async function handleDeleteUser(userId: string) {
    if (!confirm("Are you sure you want to delete this user?")) return;
    setError(null);
    try {
      await deleteUser(userId);
      await loadUsers();
    } catch (err: any) {
      setError(err.message || "Failed to delete user");
    }
  }

  function startEditing(user: User) {
    setEditingUserId(user.id);
    setEditRole(user.role);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content xlarge" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Admin Panel</h2>
          <button className="btn-icon" onClick={onClose} title="Close">
            ✕
          </button>
        </div>

        <div className="admin-tabs">
          <button
            className={activeTab === "users" ? "tab active" : "tab"}
            onClick={() => setActiveTab("users")}
          >
            User Management
          </button>
          <button
            className={activeTab === "health" ? "tab active" : "tab"}
            onClick={() => setActiveTab("health")}
          >
            System Health
          </button>
          <button
            className={activeTab === "database" ? "tab active" : "tab"}
            onClick={() => setActiveTab("database")}
          >
            Database Size
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="alert alert-error">{error}</div>}

          {activeTab === "users" && (
            <div>
              <h3>Manage Users</h3>
              {loading ? (
                <p>Loading users...</p>
              ) : (
                <div className="table-wrapper">
                  <table className="items-table">
                    <thead>
                      <tr>
                        <th>Email</th>
                        <th>Full Name</th>
                        <th>Role</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id}>
                          <td>{user.email}</td>
                          <td>{user.full_name || "—"}</td>
                          <td>
                            {editingUserId === user.id ? (
                              <select
                                value={editRole}
                                onChange={(e) => setEditRole(e.target.value)}
                              >
                                <option value="admin">Admin</option>
                                <option value="editor">Editor</option>
                                <option value="viewer">Viewer</option>
                              </select>
                            ) : (
                              <span className={`role-badge ${user.role}`}>
                                {user.role}
                              </span>
                            )}
                          </td>
                          <td>
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                          <td>
                            {editingUserId === user.id ? (
                              <>
                                <button
                                  className="btn-small btn-primary"
                                  onClick={() => handleUpdateUserRole(user.id)}
                                >
                                  Save
                                </button>
                                <button
                                  className="btn-small"
                                  onClick={() => setEditingUserId(null)}
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  className="btn-small"
                                  onClick={() => startEditing(user)}
                                >
                                  Edit Role
                                </button>
                                <button
                                  className="btn-small btn-danger"
                                  onClick={() => handleDeleteUser(user.id)}
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === "health" && (
            <div>
              <h3>System Health</h3>
              {loading ? (
                <p>Loading health information...</p>
              ) : health ? (
                <div className="health-info">
                  <div className="health-card">
                    <h4>Overall Status</h4>
                    <p className={`status ${health.status}`}>
                      {health.status.toUpperCase()}
                    </p>
                  </div>
                  <div className="health-card">
                    <h4>Database</h4>
                    <p className={`status ${health.database === "healthy" ? "healthy" : "unhealthy"}`}>
                      {health.database}
                    </p>
                  </div>
                  <div className="health-card">
                    <h4>Statistics</h4>
                    <ul>
                      <li>Users: {health.counts.users}</li>
                      <li>Items: {health.counts.items}</li>
                      <li>Locations: {health.counts.locations}</li>
                    </ul>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {activeTab === "database" && (
            <div>
              <h3>Database Size</h3>
              {loading ? (
                <p>Loading database size information...</p>
              ) : dbSize ? (
                <div>
                  <div className="db-summary">
                    <h4>Total Database Size: {dbSize.total_size_pretty}</h4>
                  </div>
                  
                  <h4 style={{ marginTop: "1.5rem" }}>Table Sizes</h4>
                  <div className="table-wrapper">
                    <table className="items-table">
                      <thead>
                        <tr>
                          <th>Table</th>
                          <th>Size</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dbSize.tables.map((table) => (
                          <tr key={table.table}>
                            <td>{table.table}</td>
                            <td>{table.size}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="media-info" style={{ marginTop: "1.5rem" }}>
                    <h4>Media Files</h4>
                    <p>Photos: {dbSize.media.photos}</p>
                    <p>Documents: {dbSize.media.documents}</p>
                    <p className="note">{dbSize.media.note}</p>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
