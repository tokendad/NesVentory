import React, { useState, useEffect } from "react";
import { 
  fetchUsers, 
  updateUser, 
  fetchLocations, 
  updateUserLocationAccess, 
  adminCreateUser, 
  getLogSettings,
  updateLogSettings,
  deleteLogFiles,
  rotateLogsNow,
  getLogContent,
  getIssueReportData,
  type User, 
  type Location, 
  type AdminUserCreate,
  type LogSettings,
  type LogFile,
  type IssueReportData
} from "../lib/api";

interface AdminPageProps {
  onClose: () => void;
}

type MainTabType = 'users' | 'logs';
type UserSubTabType = 'all' | 'pending' | 'create';

const AdminPage: React.FC<AdminPageProps> = ({ onClose }) => {
  // Main tab state
  const [mainTab, setMainTab] = useState<MainTabType>('users');
  
  // User management states
  const [users, setUsers] = useState<User[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingLocationUserId, setEditingLocationUserId] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<string>("");
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [updateError, setUpdateError] = useState<string | null>(null);
  
  // User sub-tab state
  const [userSubTab, setUserSubTab] = useState<UserSubTabType>("all");
  
  // Create user form state
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createFullName, setCreateFullName] = useState("");
  const [createRole, setCreateRole] = useState("viewer");
  const [createApproved, setCreateApproved] = useState(true);
  const [createLoading, setCreateLoading] = useState(false);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  
  // Pending user approval role selections (userId -> role)
  const [pendingRoles, setPendingRoles] = useState<Record<string, string>>({});

  // Log settings states
  const [logSettings, setLogSettings] = useState<LogSettings>({
    rotation_type: "schedule",
    rotation_schedule_hours: 24,
    rotation_size_mb: 10,
    log_level: "warn_error",
    retention_days: 30,
    auto_delete_enabled: false
  });
  const [logFiles, setLogFiles] = useState<LogFile[]>([]);
  const [logLoading, setLogLoading] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [logSuccess, setLogSuccess] = useState<string | null>(null);
  const [logSaving, setLogSaving] = useState(false);
  const [selectedLogFiles, setSelectedLogFiles] = useState<string[]>([]);
  
  // Issue report states
  const [issueReportLoading, setIssueReportLoading] = useState(false);
  const [viewingLogContent, setViewingLogContent] = useState<string | null>(null);
  const [logContentData, setLogContentData] = useState<string>("");
  const [logContentLoading, setLogContentLoading] = useState(false);

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
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load data";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function loadLogSettings() {
    setLogLoading(true);
    setLogError(null);
    try {
      const response = await getLogSettings();
      setLogSettings(response.settings);
      setLogFiles(response.log_files);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load log settings";
      setLogError(errorMessage);
    } finally {
      setLogLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (mainTab === 'logs') {
      loadLogSettings();
    }
  }, [mainTab]);

  async function handleRoleChange(userId: string, role: string) {
    setUpdateError(null);
    try {
      const updatedUser = await updateUser(userId, { role });
      setUsers(users.map(u => u.id === userId ? updatedUser : u));
      setEditingUserId(null);
      setNewRole("");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setUpdateError(`Failed to update role: ${errorMessage}`);
    }
  }

  async function handleLocationAccessChange(userId: string) {
    setUpdateError(null);
    try {
      const updatedUser = await updateUserLocationAccess(userId, selectedLocations);
      setUsers(users.map(u => u.id === userId ? updatedUser : u));
      setEditingLocationUserId(null);
      setSelectedLocations([]);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setUpdateError(`Failed to update location access: ${errorMessage}`);
    }
  }

  async function handleApproveUser(userId: string, role: string) {
    setUpdateError(null);
    try {
      const updatedUser = await updateUser(userId, { is_approved: true, role });
      setUsers(users.map(u => u.id === userId ? updatedUser : u));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setUpdateError(`Failed to approve user: ${errorMessage}`);
    }
  }

  async function handleRejectUser(userId: string) {
    setUpdateError(null);
    try {
      // For now, we'll just leave them unapproved. In the future, you might want to delete the user.
      const updatedUser = await updateUser(userId, { is_approved: false });
      setUsers(users.map(u => u.id === userId ? updatedUser : u));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setUpdateError(`Failed to update user: ${errorMessage}`);
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
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setUpdateError(`Failed to create user: ${errorMessage}`);
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

  // Log settings handlers
  async function handleSaveLogSettings() {
    setLogSaving(true);
    setLogError(null);
    setLogSuccess(null);
    try {
      const response = await updateLogSettings(logSettings);
      setLogSettings(response.settings);
      setLogFiles(response.log_files);
      setLogSuccess("Log settings saved successfully!");
      setTimeout(() => setLogSuccess(null), 3000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save log settings";
      setLogError(errorMessage);
    } finally {
      setLogSaving(false);
    }
  }

  async function handleDeleteSelectedLogs() {
    if (selectedLogFiles.length === 0) return;
    
    if (!window.confirm(`Are you sure you want to delete ${selectedLogFiles.length} log file(s)? This cannot be undone.`)) {
      return;
    }
    
    setLogError(null);
    setLogSuccess(null);
    try {
      const response = await deleteLogFiles(selectedLogFiles);
      setLogSuccess(response.message);
      setSelectedLogFiles([]);
      await loadLogSettings();
      setTimeout(() => setLogSuccess(null), 3000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete log files";
      setLogError(errorMessage);
    }
  }

  async function handleRotateLogs() {
    setLogError(null);
    setLogSuccess(null);
    try {
      const response = await rotateLogsNow();
      setLogSuccess(response.message);
      await loadLogSettings();
      setTimeout(() => setLogSuccess(null), 3000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to rotate logs";
      setLogError(errorMessage);
    }
  }

  function handleLogFileToggle(fileName: string) {
    if (selectedLogFiles.includes(fileName)) {
      setSelectedLogFiles(selectedLogFiles.filter(f => f !== fileName));
    } else {
      setSelectedLogFiles([...selectedLogFiles, fileName]);
    }
  }

  function handleSelectAllLogFiles() {
    if (selectedLogFiles.length === logFiles.length) {
      setSelectedLogFiles([]);
    } else {
      setSelectedLogFiles(logFiles.map(f => f.name));
    }
  }

  // Issue report handlers
  async function handleOpenGitHubIssue() {
    setIssueReportLoading(true);
    setLogError(null);
    try {
      const reportData = await getIssueReportData();
      // Open GitHub issue in new tab
      window.open(reportData.github_issue_url, '_blank', 'noopener,noreferrer');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to generate issue report";
      setLogError(errorMessage);
    } finally {
      setIssueReportLoading(false);
    }
  }

  async function handleViewLogContent(fileName: string) {
    setLogContentLoading(true);
    setLogError(null);
    try {
      const response = await getLogContent(fileName, 200);
      setLogContentData(response.content);
      setViewingLogContent(fileName);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to load log content";
      setLogError(errorMessage);
    } finally {
      setLogContentLoading(false);
    }
  }

  function handleCloseLogContent() {
    setViewingLogContent(null);
    setLogContentData("");
  }

  // Clear errors on tab change
  function handleMainTabChange(tab: MainTabType) {
    setError(null);
    setUpdateError(null);
    setLogError(null);
    setLogSuccess(null);
    setMainTab(tab);
  }

  // Filter to only show primary/main locations for access control
  const primaryLocations = locations.filter(loc => 
    loc.is_primary_location || !loc.parent_id
  );

  // Filter users by approval status
  const approvedUsers = users.filter(u => u.is_approved);
  const pendingUsers = users.filter(u => !u.is_approved);

  // Render user admin tab content
  const renderUserAdminTab = () => (
    <>
      {/* User Sub-Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "0.5rem" }}>
        <button
          className={userSubTab === "all" ? "btn-primary" : "btn-outline"}
          onClick={() => setUserSubTab("all")}
          style={{ fontSize: "0.875rem" }}
        >
          All Users ({approvedUsers.length})
        </button>
        <button
          className={userSubTab === "pending" ? "btn-primary" : "btn-outline"}
          onClick={() => setUserSubTab("pending")}
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
          className={userSubTab === "create" ? "btn-primary" : "btn-outline"}
          onClick={() => setUserSubTab("create")}
          style={{ fontSize: "0.875rem" }}
        >
          Create User
        </button>
      </div>
      
      {loading && <p>Loading users...</p>}
      {error && <p className="error-message">{error}</p>}
      {updateError && <p className="error-message">{updateError}</p>}
      {createSuccess && <p style={{ color: "var(--success)", marginBottom: "1rem" }}>{createSuccess}</p>}
      
      {/* Create User Sub-Tab */}
      {!loading && !error && userSubTab === "create" && (
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
      
      {/* Pending Users Sub-Tab */}
      {!loading && !error && userSubTab === "pending" && (
        <div className="table-wrapper">
          {pendingUsers.length === 0 ? (
            <p style={{ textAlign: "center", padding: "2rem", color: "var(--muted)" }}>
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
                          value={pendingRoles[user.id] || "viewer"}
                          onChange={(e) => setPendingRoles({ ...pendingRoles, [user.id]: e.target.value })}
                          style={{ padding: "0.25rem" }}
                        >
                          <option value="viewer">Viewer</option>
                          <option value="editor">Editor</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button
                          className="btn-primary"
                          onClick={() => handleApproveUser(user.id, pendingRoles[user.id] || "viewer")}
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
      
      {/* All Users Sub-Tab */}
      {!loading && !error && userSubTab === "all" && (
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
                      <div style={{ maxHeight: "150px", overflowY: "auto", padding: "0.5rem", border: "1px solid var(--border-subtle)", borderRadius: "4px" }}>
                        {primaryLocations.length === 0 ? (
                          <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--muted)" }}>No locations available</p>
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
                        <p style={{ margin: "0.5rem 0 0", fontSize: "0.75rem", color: "var(--muted)" }}>
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
    </>
  );

  // Render log settings tab content
  const renderLogSettingsTab = () => (
    <div className="tab-content">
      {logLoading && <p>Loading log settings...</p>}
      {logError && <p className="error-message">{logError}</p>}
      {logSuccess && <p style={{ color: "var(--success)", marginBottom: "1rem" }}>{logSuccess}</p>}
      
      {!logLoading && (
        <>
          {/* Log Rotation Settings */}
          <div className="form-group" style={{ paddingBottom: "1rem", marginBottom: "1rem", borderBottom: "1px solid var(--border-subtle)" }}>
            <label>🔄 Log Rotation</label>
            <small style={{ color: "var(--muted)", fontSize: "0.875rem", display: "block", marginBottom: "0.75rem" }}>
              Configure how log files are rotated. Default is 24-hour schedule rotation.
            </small>
            
            <div style={{ marginBottom: "0.75rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <input
                  type="radio"
                  name="rotation_type"
                  value="schedule"
                  checked={logSettings.rotation_type === "schedule"}
                  onChange={() => setLogSettings({ ...logSettings, rotation_type: "schedule" })}
                />
                <span>Rotate by schedule</span>
              </label>
              {logSettings.rotation_type === "schedule" && (
                <div style={{ marginLeft: "1.5rem", marginBottom: "0.5rem" }}>
                  <label htmlFor="rotation_schedule_hours" style={{ fontSize: "0.85rem", marginRight: "0.5rem" }}>
                    Rotate every:
                  </label>
                  <select
                    id="rotation_schedule_hours"
                    value={logSettings.rotation_schedule_hours}
                    onChange={(e) => setLogSettings({ ...logSettings, rotation_schedule_hours: parseInt(e.target.value) })}
                    style={{ padding: "0.25rem" }}
                  >
                    <option value={12}>12 hours</option>
                    <option value={24}>24 hours (default)</option>
                    <option value={48}>48 hours</option>
                    <option value={168}>7 days</option>
                  </select>
                </div>
              )}
              
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="radio"
                  name="rotation_type"
                  value="size"
                  checked={logSettings.rotation_type === "size"}
                  onChange={() => setLogSettings({ ...logSettings, rotation_type: "size" })}
                />
                <span>Rotate by size</span>
              </label>
              {logSettings.rotation_type === "size" && (
                <div style={{ marginLeft: "1.5rem", marginTop: "0.5rem" }}>
                  <label htmlFor="rotation_size_mb" style={{ fontSize: "0.85rem", marginRight: "0.5rem" }}>
                    Rotate when file exceeds:
                  </label>
                  <select
                    id="rotation_size_mb"
                    value={logSettings.rotation_size_mb}
                    onChange={(e) => setLogSettings({ ...logSettings, rotation_size_mb: parseInt(e.target.value) })}
                    style={{ padding: "0.25rem" }}
                  >
                    <option value={5}>5 MB</option>
                    <option value={10}>10 MB (default)</option>
                    <option value={25}>25 MB</option>
                    <option value={50}>50 MB</option>
                    <option value={100}>100 MB</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Log Level Settings */}
          <div className="form-group" style={{ paddingBottom: "1rem", marginBottom: "1rem", borderBottom: "1px solid var(--border-subtle)" }}>
            <label>📊 Log Level</label>
            <small style={{ color: "var(--muted)", fontSize: "0.875rem", display: "block", marginBottom: "0.75rem" }}>
              Set the logging verbosity level. Higher levels include more detailed information.
            </small>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="radio"
                  name="log_level"
                  value="warn_error"
                  checked={logSettings.log_level === "warn_error"}
                  onChange={() => setLogSettings({ ...logSettings, log_level: "warn_error" })}
                />
                <span><strong>Warn/Error</strong> - Warnings and errors only (recommended for production)</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="radio"
                  name="log_level"
                  value="debug"
                  checked={logSettings.log_level === "debug"}
                  onChange={() => setLogSettings({ ...logSettings, log_level: "debug" })}
                />
                <span><strong>Debug</strong> - Includes debug information for troubleshooting</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="radio"
                  name="log_level"
                  value="trace"
                  checked={logSettings.log_level === "trace"}
                  onChange={() => setLogSettings({ ...logSettings, log_level: "trace" })}
                />
                <span><strong>Trace</strong> - Most verbose, includes all operations (development only)</span>
              </label>
            </div>
          </div>

          {/* Log Retention Settings */}
          <div className="form-group" style={{ paddingBottom: "1rem", marginBottom: "1rem", borderBottom: "1px solid var(--border-subtle)" }}>
            <label>🗑️ Log Retention</label>
            <small style={{ color: "var(--muted)", fontSize: "0.875rem", display: "block", marginBottom: "0.75rem" }}>
              Configure automatic deletion of old rotated log files.
            </small>
            
            <div style={{ marginBottom: "0.75rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <input
                  type="checkbox"
                  checked={logSettings.auto_delete_enabled}
                  onChange={(e) => setLogSettings({ ...logSettings, auto_delete_enabled: e.target.checked })}
                />
                <span>Enable automatic deletion of old log files</span>
              </label>
              
              {logSettings.auto_delete_enabled && (
                <div style={{ marginLeft: "1.5rem" }}>
                  <label htmlFor="retention_days" style={{ fontSize: "0.85rem", marginRight: "0.5rem" }}>
                    Delete logs older than:
                  </label>
                  <select
                    id="retention_days"
                    value={logSettings.retention_days}
                    onChange={(e) => setLogSettings({ ...logSettings, retention_days: parseInt(e.target.value) })}
                    style={{ padding: "0.25rem" }}
                  >
                    <option value={7}>7 days</option>
                    <option value={14}>14 days</option>
                    <option value={30}>30 days (default)</option>
                    <option value={60}>60 days</option>
                    <option value={90}>90 days</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Save Settings Button */}
          <div style={{ marginBottom: "1.5rem" }}>
            <button
              className="btn-primary"
              onClick={handleSaveLogSettings}
              disabled={logSaving}
              style={{ width: "100%" }}
            >
              {logSaving ? "Saving..." : "💾 Save Log Settings"}
            </button>
          </div>

          {/* Log Files Management */}
          <div className="form-group">
            <label>📁 Log Files</label>
            <small style={{ color: "var(--muted)", fontSize: "0.875rem", display: "block", marginBottom: "0.75rem" }}>
              Manage existing log files. Log files are stored in /app/data/logs.
            </small>
            
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <button
                className="btn-outline"
                onClick={handleRotateLogs}
                style={{ fontSize: "0.85rem" }}
              >
                🔄 Rotate Now
              </button>
              <button
                className="btn-outline"
                onClick={loadLogSettings}
                style={{ fontSize: "0.85rem" }}
              >
                ↻ Refresh
              </button>
              {selectedLogFiles.length > 0 && (
                <button
                  className="btn-outline"
                  onClick={handleDeleteSelectedLogs}
                  style={{ fontSize: "0.85rem", color: "var(--danger)", borderColor: "var(--danger)" }}
                >
                  🗑️ Delete Selected ({selectedLogFiles.length})
                </button>
              )}
            </div>
            
            {logFiles.length === 0 ? (
              <div style={{ 
                backgroundColor: "var(--bg-elevated-softer)", 
                border: "1px solid var(--border-subtle)", 
                borderRadius: "4px", 
                padding: "1rem",
                textAlign: "center",
                color: "var(--muted)"
              }}>
                No log files found. Log files will appear here once generated.
              </div>
            ) : (
              <div className="table-wrapper" style={{ maxHeight: "250px" }}>
                <table className="items-table compact">
                  <thead>
                    <tr>
                      <th style={{ width: "40px" }}>
                        <input
                          type="checkbox"
                          checked={selectedLogFiles.length === logFiles.length && logFiles.length > 0}
                          onChange={handleSelectAllLogFiles}
                        />
                      </th>
                      <th>File Name</th>
                      <th>Type</th>
                      <th>Size</th>
                      <th>Modified</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logFiles.map((file) => (
                      <tr key={file.name}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedLogFiles.includes(file.name)}
                            onChange={() => handleLogFileToggle(file.name)}
                          />
                        </td>
                        <td style={{ fontFamily: "monospace", fontSize: "0.8rem" }}>{file.name}</td>
                        <td>
                          <span style={{ 
                            padding: "0.15rem 0.4rem",
                            borderRadius: "4px",
                            backgroundColor: file.log_type === "current" ? "#4ecdc4" : 
                                            file.log_type === "debug" ? "#f59e0b" : 
                                            file.log_type === "trace" ? "#8b5cf6" : "#6b7280",
                            color: "#fff",
                            fontSize: "0.75rem",
                            fontWeight: "500"
                          }}>
                            {file.log_type}
                          </span>
                        </td>
                        <td style={{ fontSize: "0.85rem" }}>{file.size_display}</td>
                        <td style={{ fontSize: "0.85rem" }}>{new Date(file.modified_at).toLocaleString()}</td>
                        <td>
                          <button
                            className="btn-outline"
                            onClick={() => handleViewLogContent(file.name)}
                            style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}
                            disabled={logContentLoading}
                          >
                            👁️ View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Log file naming convention info */}
            <div style={{ 
              marginTop: "1rem",
              padding: "0.75rem",
              backgroundColor: "var(--bg-elevated-softer)",
              borderRadius: "0.5rem",
              fontSize: "0.8rem",
              color: "var(--muted)"
            }}>
              <strong>Log file naming convention:</strong>
              <ul style={{ margin: "0.25rem 0 0 1rem", padding: 0 }}>
                <li><code>nesventory.log</code> - Current active log</li>
                <li><code>nesventory.log.[date]</code> - Rotated log</li>
                <li><code>nesventory.log.debug</code> - Debug log</li>
                <li><code>nesventory.log.trace</code> - Trace log</li>
              </ul>
            </div>
          </div>

          {/* Report Issue to GitHub */}
          <div className="form-group" style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border-subtle)" }}>
            <label>🐛 Report Issue to GitHub</label>
            <small style={{ color: "var(--muted)", fontSize: "0.875rem", display: "block", marginBottom: "0.75rem" }}>
              If you encounter errors or issues, you can quickly create a GitHub issue with system details and logs automatically included.
            </small>
            
            <div style={{ 
              backgroundColor: "var(--bg-elevated-softer)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "0.5rem",
              padding: "1rem"
            }}>
              <p style={{ margin: "0 0 0.75rem 0", fontSize: "0.85rem" }}>
                This will open a new GitHub issue on the NesVentory repository with:
              </p>
              <ul style={{ margin: "0 0 1rem 1rem", padding: 0, fontSize: "0.85rem" }}>
                <li>System information (app version, database type, platform)</li>
                <li>Current log settings configuration</li>
                <li>Recent error logs (last 50 lines)</li>
              </ul>
              <button
                className="btn-primary"
                onClick={handleOpenGitHubIssue}
                disabled={issueReportLoading}
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                {issueReportLoading ? "Generating..." : "🐙 Open GitHub Issue"}
              </button>
            </div>
          </div>

          {/* Log Content Viewer Modal */}
          {viewingLogContent && (
            <div className="modal-overlay" style={{ zIndex: 1100 }}>
              <div className="modal-content" style={{ maxWidth: "800px", maxHeight: "80vh" }}>
                <div className="modal-header">
                  <h2>📄 {viewingLogContent}</h2>
                  <button className="modal-close" onClick={handleCloseLogContent}>×</button>
                </div>
                {logContentLoading ? (
                  <p>Loading log content...</p>
                ) : (
                  <>
                    <div style={{
                      backgroundColor: "#0d1117",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "0.5rem",
                      padding: "1rem",
                      maxHeight: "400px",
                      overflowY: "auto",
                      fontFamily: "monospace",
                      fontSize: "0.75rem",
                      lineHeight: "1.5",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-all",
                      color: "#c9d1d9"
                    }}>
                      {logContentData || "No content available"}
                    </div>
                    <div className="modal-actions">
                      <button
                        className="btn-outline"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(logContentData);
                            setLogSuccess("Log content copied to clipboard!");
                            setTimeout(() => setLogSuccess(null), 3000);
                          } catch {
                            setLogError("Failed to copy to clipboard. Please select and copy manually.");
                            setTimeout(() => setLogError(null), 3000);
                          }
                        }}
                      >
                        📋 Copy to Clipboard
                      </button>
                      <button className="btn-outline" onClick={handleCloseLogContent}>
                        Close
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "1100px", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2>Admin Panel</h2>
          <button className="btn-outline" onClick={onClose}>
            Close
          </button>
        </div>
        
        {/* Main Tab Navigation */}
        <div className="tab-navigation">
          <button
            type="button"
            className={`tab-button ${mainTab === 'users' ? 'active' : ''}`}
            onClick={() => handleMainTabChange('users')}
          >
            👥 User Admin
          </button>
          <button
            type="button"
            className={`tab-button ${mainTab === 'logs' ? 'active' : ''}`}
            onClick={() => handleMainTabChange('logs')}
          >
            📋 Log Settings
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-panels">
          {mainTab === 'users' && renderUserAdminTab()}
          {mainTab === 'logs' && renderLogSettingsTab()}
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
