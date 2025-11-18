import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    const ok = await login(email, password)
    if (!ok) {
      setError('Invalid credentials')
      return
    }
    navigate('/')
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">Nesventory Login</h1>
        <form onSubmit={handleSubmit} className="login-form">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          {error && <div className="error-text">{error}</div>}
          <button type="submit" className="btn primary full-width">
            Sign In
          </button>
        </form>
        <p className="login-hint">
          Any email/password works in this stub. Hook to real JWT auth later.
        </p>
      </div>
    </div>
  )
}
