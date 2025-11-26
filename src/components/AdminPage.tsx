import React, { useState, useEffect } from "react";
import { fetchUsers, updateUser, fetchLocations, updateUserLocationAccess, adminCreateUser, type User, type Location, type AdminUserCreate } from "../lib/api";

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
  
  // Tab state
  const [activeTab, setActiveTab] = useState<"users" | "pending" | "create">("users");
  
  // Create user form state
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createFullName, setCreateFullName] = useState("");
  const [createRole, setCreateRole] = useState("viewer");
  const [createApproved, setCreateApproved] = useState(true);
  const [createLoading, setCreateLoading] = useState(false);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

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

  async function handleApproveUser(userId: string, role: string) {
    setUpdateError(null);
    try {
      const updatedUser = await updateUser(userId, { is_approved: true, role });
      setUsers(users.map(u => u.id === userId ? updatedUser : u));
    } catch (err: any) {
      setUpdateError(`Failed to approve user: ${err.message}`);
    }
  }

  async function handleRejectUser(userId: string) {
    setUpdateError(null);
    try {
      // For now, we'll just leave them unapproved. In the future, you might want to delete the user.
      const updatedUser = await updateUser(userId, { is_approved: false });
      setUsers(users.map(u => u.id === userId ? updatedUser : u));
    } catch (err: any) {
      setUpdateError(`Failed to update user: ${err.message}`);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setUpdateError(null);
    setCreateSuccess(null);
    
    if (!createEmail || !createPassword) {
      setUpdateError("Email and password are required");
      return;
    }
    
    setCreateLoading(true);
    try {
      const newUser: AdminUserCreate = {
        email: createEmail,
        password: createPassword,
        full_name: createFullName || undefined,
        role: createRole,
        is_approved: createApproved,
      };
      const createdUser = await adminCreateUser(newUser);
      setUsers([...users, createdUser]);
      setCreateEmail("");
      setCreatePassword("");
      setCreateFullName("");
      setCreateRole("viewer");
      setCreateApproved(true);
      setCreateSuccess(`User "${createdUser.email}" created successfully!`);
    } catch (err: any) {
      setUpdateError(`Failed to create user: ${err.message}`);
    } finally {
      setCreateLoading(false);
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

  // Filter users by approval status
  const approvedUsers = users.filter(u => u.is_approved);
  const pendingUsers = users.filter(u => !u.is_approved);

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "1100px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2>Admin - User Management</h2>
          <button className="btn-outline" onClick={onClose}>
            Close
          </button>
        </div>
        
        {/* Tabs */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", borderBottom: "1px solid #ccc", paddingBottom: "0.5rem" }}>
          <button
            className={activeTab === "users" ? "btn-primary" : "btn-outline"}
            onClick={() => setActiveTab("users")}
            style={{ fontSize: "0.875rem" }}
          >
            All Users ({approvedUsers.length})
          </button>
          <button
            className={activeTab === "pending" ? "btn-primary" : "btn-outline"}
            onClick={() => setActiveTab("pending")}
            style={{ fontSize: "0.875rem", position: "relative" }}
          >
            Pending Approval ({pendingUsers.length})
            {pendingUsers.length > 0 && (
              <span style={{
                position: "absolute",
                top: "-8px",
                right: "-8px",
                backgroundColor: "#ff6b6b",
                color: "#fff",
                borderRadius: "50%",
                width: "20px",
                height: "20px",
                fontSize: "0.75rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                {pendingUsers.length}
              </span>
            )}
          </button>
          <button
            className={activeTab === "create" ? "btn-primary" : "btn-outline"}
            onClick={() => setActiveTab("create")}
            style={{ fontSize: "0.875rem" }}
          >
            Create User
          </button>
        </div>
        
        {loading && <p>Loading users...</p>}
        {error && <p className="error-message">{error}</p>}
        {updateError && <p className="error-message">{updateError}</p>}
        {createSuccess && <p style={{ color: "green", marginBottom: "1rem" }}>{createSuccess}</p>}
        
        {/* Create User Tab */}
        {!loading && !error && activeTab === "create" && (
          <form onSubmit={handleCreateUser} style={{ maxWidth: "500px" }}>
            <div className="form-group">
              <label htmlFor="create-email">Email *</label>
              <input
                id="create-email"
                type="email"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="form-group">
              <label htmlFor="create-password">Password *</label>
              <input
                id="create-password"
                type="password"
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                required
                autoComplete="new-password"
                minLength={6}
              />
            </div>
            <div className="form-group">
              <label htmlFor="create-fullname">Full Name</label>
              <input
                id="create-fullname"
                type="text"
                value={createFullName}
                onChange={(e) => setCreateFullName(e.target.value)}
                autoComplete="name"
              />
            </div>
            <div className="form-group">
              <label htmlFor="create-role">Role</label>
              <select
                id="create-role"
                value={createRole}
                onChange={(e) => setCreateRole(e.target.value)}
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="form-group">
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  checked={createApproved}
                  onChange={(e) => setCreateApproved(e.target.checked)}
                />
                Pre-approved (user can log in immediately)
              </label>
            </div>
            <button type="submit" className="btn-primary" disabled={createLoading}>
              {createLoading ? "Creating..." : "Create User"}
            </button>
          </form>
        )}
        
        {/* Pending Users Tab */}
        {!loading && !error && activeTab === "pending" && (
          <div className="table-wrapper">
            {pendingUsers.length === 0 ? (
              <p style={{ textAlign: "center", padding: "2rem", color: "#666" }}>
                No pending users to approve
              </p>
            ) : (
              <table className="items-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Full Name</th>
                    <th>Registered</th>
                    <th>Set Role & Approve</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingUsers.map((user) => (
                    <tr key={user.id}>
                      <td>{user.email}</td>
                      <td>{user.full_name || "—"}</td>
                      <td>{new Date(user.created_at).toLocaleDateString()}</td>
                      <td>
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                          <select
                            defaultValue="viewer"
                            id={`role-${user.id}`}
                            style={{ padding: "0.25rem" }}
                          >
                            <option value="viewer">Viewer</option>
                            <option value="editor">Editor</option>
                            <option value="admin">Admin</option>
                          </select>
                          <button
                            className="btn-primary"
                            onClick={() => {
                              const select = document.getElementById(`role-${user.id}`) as HTMLSelectElement;
                              handleApproveUser(user.id, select?.value || "viewer");
                            }}
                            style={{ fontSize: "0.875rem", padding: "0.25rem 0.5rem" }}
                          >
                            Approve
                          </button>
                          <button
                            className="btn-outline"
                            onClick={() => handleRejectUser(user.id)}
                            style={{ fontSize: "0.875rem", padding: "0.25rem 0.5rem", color: "#ff6b6b", borderColor: "#ff6b6b" }}
                          >
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
        
        {/* All Users Tab */}
        {!loading && !error && activeTab === "users" && (
          <div className="table-wrapper">
            <table className="items-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Full Name</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Location Access</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {approvedUsers.map((user) => (
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
                      <span style={{ 
                        padding: "0.25rem 0.5rem",
                        borderRadius: "4px",
                        backgroundColor: user.is_approved ? "#4ecdc4" : "#ffcc00",
                        color: user.is_approved ? "#fff" : "#333",
                        fontSize: "0.875rem",
                        fontWeight: "500"
                      }}>
                        {user.is_approved ? "Active" : "Pending"}
                      </span>
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
