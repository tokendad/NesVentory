import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Items from './pages/Items'
import Login from './pages/Login'
import Settings from './pages/Settings'
import { useAuth } from './context/AuthContext'

function PrivateRoute({ children }) {
  const { user } = useAuth()
  if (!user) {
    return <Navigate to="/login" replace />
  }
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="items" element={<Items />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}
