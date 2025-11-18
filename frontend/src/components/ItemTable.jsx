import React from 'react'

export default function ItemTable({ items, onSelect }) {
  return (
    <table className="table">
      <thead>
        <tr>
          <th>Item</th>
          <th>Location</th>
          <th>Category</th>
          <th style={{ textAlign: 'right' }}>Value ($)</th>
        </tr>
      </thead>
      <tbody>
        {items.map(item => (
          <tr key={item.id} onClick={() => onSelect?.(item)} className="table-row">
            <td>{item.name}</td>
            <td>{item.location}</td>
            <td>{item.category}</td>
            <td style={{ textAlign: 'right' }}>{item.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
