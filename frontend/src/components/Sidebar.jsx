import React from 'react'
import { NavLink } from 'react-router-dom'

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">Nesventory</div>
      <nav className="sidebar-nav">
        <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Dashboard
        </NavLink>
        <NavLink to="/items" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Items
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Settings
        </NavLink>
      </nav>
    </aside>
  )
}
