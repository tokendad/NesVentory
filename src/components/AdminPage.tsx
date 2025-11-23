import React, { useState, useEffect } from "react";
import { fetchUsers, updateUser, type User } from "../lib/api";

interface AdminPageProps {
  onClose: () => void;
}

const AdminPage: React.FC<AdminPageProps> = ({ onClose }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<string>("");
  const [updateError, setUpdateError] = useState<string | null>(null);

  async function loadUsers() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleRoleChange(userId: string, role: string) {
    setUpdateError(null);
    try {
      const updatedUser = await updateUser(userId, { role });
      setUsers(users.map(u => u.id === userId ? updatedUser : u));
      setEditingUserId(null);
      setNewRole("");
    } catch (err: any) {
      setUpdateError(`Failed to update role: ${err.message}`);
    }
  }

  function startEditRole(userId: string, currentRole: string) {
    setEditingUserId(userId);
    setNewRole(currentRole);
  }

  function cancelEdit() {
    setEditingUserId(null);
    setNewRole("");
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "800px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2>Admin - User Management</h2>
          <button className="btn-outline" onClick={onClose}>
            Close
          </button>
        </div>
        {loading && <p>Loading users...</p>}
        {error && <p className="error-message">{error}</p>}
        {updateError && <p className="error-message">{updateError}</p>}
        {!loading && !error && (
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
                          value={newRole}
                          onChange={(e) => setNewRole(e.target.value)}
                          style={{ padding: "0.25rem" }}
                        >
                          <option value="admin">Admin</option>
                          <option value="editor">Editor</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      ) : (
                        <span style={{ 
                          padding: "0.25rem 0.5rem",
                          borderRadius: "4px",
                          backgroundColor: user.role === "admin" ? "#ff6b6b" : user.role === "editor" ? "#4ecdc4" : "#95e1d3",
                          color: "#fff",
                          fontSize: "0.875rem",
                          fontWeight: "500"
                        }}>
                          {user.role}
                        </span>
                      )}
                    </td>
                    <td>{new Date(user.created_at).toLocaleDateString()}</td>
                    <td>
                      {editingUserId === user.id ? (
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button
                            className="btn-primary"
                            onClick={() => handleRoleChange(user.id, newRole)}
                            style={{ fontSize: "0.875rem", padding: "0.25rem 0.5rem" }}
                          >
                            Save
                          </button>
                          <button
                            className="btn-outline"
                            onClick={cancelEdit}
                            style={{ fontSize: "0.875rem", padding: "0.25rem 0.5rem" }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          className="btn-outline"
                          onClick={() => startEditRole(user.id, user.role)}
                          style={{ fontSize: "0.875rem", padding: "0.25rem 0.5rem" }}
                        >
                          Change Role
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
