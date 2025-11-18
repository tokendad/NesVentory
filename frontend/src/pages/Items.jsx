import React, { useEffect, useState } from 'react'
import { getItems } from '../api/client'
import ItemTable from '../components/ItemTable'
import ItemModal from '../components/ItemModal'

export default function Items() {
  const [items, setItems] = useState([])
  const [selected, setSelected] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    getItems()
      .then(setItems)
      .catch(() => setItems([]))
  }, [])

  const handleAdd = () => {
    setSelected(null)
    setModalOpen(true)
  }

  const handleEdit = (item) => {
    setSelected(item)
    setModalOpen(true)
  }

  const handleSave = (item) => {
    if (item.id) {
      setItems(prev => prev.map(i => (i.id === item.id ? item : i)))
    } else {
      const newItem = { ...item, id: Date.now() }
      setItems(prev => [...prev, newItem])
    }
    setModalOpen(false)
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>Items</h2>
        <button className="btn primary" onClick={handleAdd}>
          + Add Item
        </button>
      </div>
      <ItemTable items={items} onSelect={handleEdit} />
      <ItemModal
        open={modalOpen}
        item={selected}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  )
}
