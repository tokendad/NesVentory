import React, { useEffect, useState } from 'react'
import { getHealth, getItems } from '../api/client'

export default function Dashboard() {
  const [status, setStatus] = useState('Checking...')
  const [items, setItems] = useState([])

  useEffect(() => {
    getHealth()
      .then(() => setStatus('Online'))
      .catch(() => setStatus('Offline'))

    getItems()
      .then(setItems)
      .catch(() => setItems([]))
  }, [])

  const totalValue = items.reduce((sum, i) => sum + (Number(i.value) || 0), 0)

  return (
    <div className="page">
      <h2>Overview</h2>
      <div className="card-grid">
        <div className="card">
          <div className="card-label">API Status</div>
          <div className="card-value">{status}</div>
        </div>
        <div className="card">
          <div className="card-label">Total Items</div>
          <div className="card-value">{items.length}</div>
        </div>
        <div className="card">
          <div className="card-label">Total Value</div>
          <div className="card-value">${totalValue.toLocaleString()}</div>
        </div>
      </div>
    </div>
  )
}
