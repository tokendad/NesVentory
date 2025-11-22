import React, { useState } from "react";
import {
  updateCurrentUser,
  updatePassword,
  type User,
  type UserUpdate,
  type PasswordUpdate,
} from "../lib/api";

interface UserSettingsProps {
  user: User;
  onClose: () => void;
  onUpdate: (user: User) => void;
}

const UserSettings: React.FC<UserSettingsProps> = ({ user, onClose, onUpdate }) => {
  const [email, setEmail] = useState(user.email);
  const [fullName, setFullName] = useState(user.full_name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const update: UserUpdate = {
        email,
        full_name: fullName || null,
      };
      const updatedUser = await updateCurrentUser(update);
      onUpdate(updatedUser);
      setSuccess("Profile updated successfully");
      localStorage.setItem("NesVentory_user_email", updatedUser.email);
    } catch (err: any) {
      setError(err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters");
      setLoading(false);
      return;
    }

    try {
      const passwordUpdate: PasswordUpdate = {
        current_password: currentPassword,
        new_password: newPassword,
      };
      await updatePassword(passwordUpdate);
      setSuccess("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err.message || "Failed to change password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>User Settings</h2>
          <button className="btn-icon" onClick={onClose} title="Close">
            ✕
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <section className="settings-section">
            <h3>Profile Information</h3>
            <form onSubmit={handleUpdateProfile}>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="fullName">Full Name</label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label>Role</label>
                <input type="text" value={user.role} disabled />
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Updating..." : "Update Profile"}
              </button>
            </form>
          </section>

          <hr style={{ margin: "2rem 0" }} />

          <section className="settings-section">
            <h3>Change Password</h3>
            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label htmlFor="currentPassword">Current Password</label>
                <input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={6}
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={6}
                />
              </div>

              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Changing..." : "Change Password"}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
};

export default UserSettings;
