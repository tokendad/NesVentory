import React from 'react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'

export default function HeaderBar() {
  const { theme, toggleTheme } = useTheme()
  const { user, logout } = useAuth()

  return (
    <header className="header">
      <div className="header-left">
        <h1 className="header-title">Home Inventory Dashboard</h1>
      </div>
      <div className="header-right">
        <button className="btn ghost" onClick={toggleTheme}>
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
        {user && (
          <>
            <span className="user-pill">{user.email}</span>
            <button className="btn" onClick={logout}>Logout</button>
          </>
        )}
      </div>
    </header>
  )
}
