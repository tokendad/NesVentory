import React, { useState, useEffect } from "react";
import { fetchUsers, updateUser, fetchLocations, updateUserLocationAccess, type User, type Location } from "../lib/api";

interface AdminPageProps {
  onClose: () => void;
}

const AdminPage: React.FC<AdminPageProps> = ({ onClose }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingLocationUserId, setEditingLocationUserId] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<string>("");
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [updateError, setUpdateError] = useState<string | null>(null);

  async function loadUsers() {
    setLoading(true);
    setError(null);
    try {
      const [usersData, locationsData] = await Promise.all([
        fetchUsers(),
        fetchLocations()
      ]);
      setUsers(usersData);
      setLocations(locationsData);
    } catch (err: any) {
      setError(err.message || "Failed to load data");
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

  async function handleLocationAccessChange(userId: string) {
    setUpdateError(null);
    try {
      const updatedUser = await updateUserLocationAccess(userId, selectedLocations);
      setUsers(users.map(u => u.id === userId ? updatedUser : u));
      setEditingLocationUserId(null);
      setSelectedLocations([]);
    } catch (err: any) {
      setUpdateError(`Failed to update location access: ${err.message}`);
    }
  }

  function startEditRole(userId: string, currentRole: string) {
    setEditingUserId(userId);
    setNewRole(currentRole);
    setEditingLocationUserId(null);
  }

  function startEditLocations(userId: string, currentLocationIds: string[] | null | undefined) {
    setEditingLocationUserId(userId);
    setSelectedLocations(currentLocationIds || []);
    setEditingUserId(null);
  }

  function cancelEdit() {
    setEditingUserId(null);
    setEditingLocationUserId(null);
    setNewRole("");
    setSelectedLocations([]);
  }

  function handleLocationToggle(locationId: string) {
    if (selectedLocations.includes(locationId)) {
      setSelectedLocations(selectedLocations.filter(id => id !== locationId));
    } else {
      setSelectedLocations([...selectedLocations, locationId]);
    }
  }

  // Filter to only show primary/main locations for access control
  const primaryLocations = locations.filter(loc => 
    loc.is_primary_location || !loc.parent_id
  );

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "1000px" }}>
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
                  <th>Location Access</th>
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
                    <td>
                      {editingLocationUserId === user.id ? (
                        <div style={{ maxHeight: "150px", overflowY: "auto", padding: "0.5rem", border: "1px solid #ccc", borderRadius: "4px" }}>
                          {primaryLocations.length === 0 ? (
                            <p style={{ margin: 0, fontSize: "0.875rem", color: "#666" }}>No locations available</p>
                          ) : (
                            primaryLocations.map(loc => (
                              <label key={loc.id.toString()} style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                                <input
                                  type="checkbox"
                                  checked={selectedLocations.includes(loc.id.toString())}
                                  onChange={() => handleLocationToggle(loc.id.toString())}
                                />
                                <span style={{ fontSize: "0.875rem" }}>{loc.friendly_name || loc.name}</span>
                              </label>
                            ))
                          )}
                          <p style={{ margin: "0.5rem 0 0", fontSize: "0.75rem", color: "#666" }}>
                            Empty = access to all locations
                          </p>
                        </div>
                      ) : (
                        <span style={{ fontSize: "0.875rem" }}>
                          {user.allowed_location_ids && user.allowed_location_ids.length > 0 
                            ? `${user.allowed_location_ids.length} location(s)` 
                            : "All locations"}
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
                      ) : editingLocationUserId === user.id ? (
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button
                            className="btn-primary"
                            onClick={() => handleLocationAccessChange(user.id)}
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
                        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                          <button
                            className="btn-outline"
                            onClick={() => startEditRole(user.id, user.role)}
                            style={{ fontSize: "0.875rem", padding: "0.25rem 0.5rem" }}
                          >
                            Change Role
                          </button>
                          <button
                            className="btn-outline"
                            onClick={() => startEditLocations(user.id, user.allowed_location_ids)}
                            style={{ fontSize: "0.875rem", padding: "0.25rem 0.5rem" }}
                          >
                            Edit Access
                          </button>
                        </div>
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
