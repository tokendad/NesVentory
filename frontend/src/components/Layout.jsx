import React from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import HeaderBar from './HeaderBar'

export default function Layout() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <HeaderBar />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
