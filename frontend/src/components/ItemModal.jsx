import React, { useState, useEffect } from 'react'

export default function ItemModal({ open, item, onClose, onSave }) {
  const [form, setForm] = useState(item || {})

  useEffect(() => {
    setForm(item || {})
  }, [item])

  if (!open) return null

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave?.(form)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>{item ? 'Edit Item' : 'Add Item'}</h2>
        <form onSubmit={handleSubmit} className="modal-form">
          <label>
            Name
            <input name="name" value={form.name || ''} onChange={handleChange} required />
          </label>
          <label>
            Location
            <input name="location" value={form.location || ''} onChange={handleChange} />
          </label>
          <label>
            Category
            <input name="category" value={form.category || ''} onChange={handleChange} />
          </label>
          <label>
            Value ($)
            <input
              name="value"
              type="number"
              value={form.value || ''}
              onChange={handleChange}
              min="0"
            />
          </label>
          <div className="modal-actions">
            <button type="button" className="btn ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn primary">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
