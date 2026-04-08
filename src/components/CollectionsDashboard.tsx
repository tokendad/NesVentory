import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchCollectionTree,
  createCollection,
  updateCollection,
  deleteCollection,
  fetchCollectionItems,
  removeItemFromCollection,
  type Collection,
  type CollectionTreeNode,
  type CollectionCreate,
  type CollectionUpdate,
  type User,
} from '../lib/api';

interface CollectionsDashboardProps {
  currentUser: User | null;
}

// 12 color swatches for collections
const COLLECTION_COLORS = [
  '#E63946', '#F4A261', '#2A9D8F', '#457B9D',
  '#6D6875', '#F72585', '#4CC9F0', '#4361EE',
  '#3A0CA3', '#7209B7', '#06D6A0', '#FFB703',
];

// ─── CollectionCreateEditModal ────────────────────────────────────────────────

interface ModalProps {
  collection?: CollectionTreeNode | null;
  allCollections: CollectionTreeNode[];
  onSave: (data: CollectionCreate | CollectionUpdate) => Promise<void>;
  onClose: () => void;
}

function CollectionCreateEditModal({ collection, allCollections, onSave, onClose }: ModalProps) {
  const [name, setName] = useState(collection?.name ?? '');
  const [description, setDescription] = useState(collection?.description ?? '');
  const [parentId, setParentId] = useState<string>(collection?.parent_id ?? '');
  const [color, setColor] = useState(collection?.color ?? '#457B9D');
  const [icon, setIcon] = useState(collection?.icon ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [nameError, setNameError] = useState('');

  // Flatten tree for parent dropdown, excluding self and own descendants
  function flattenExcluding(nodes: CollectionTreeNode[], excludeId?: string): CollectionTreeNode[] {
    const result: CollectionTreeNode[] = [];
    function walk(n: CollectionTreeNode, depth: number) {
      if (n.id === excludeId) return;
      result.push({ ...n, name: '\u00A0'.repeat(depth * 2) + n.name } as CollectionTreeNode);
      for (const child of n.children) walk(child, depth + 1);
    }
    for (const n of nodes) walk(n, 0);
    return result;
  }

  const parentOptions = flattenExcluding(allCollections, collection?.id);

  const validateName = () => {
    if (!name.trim()) {
      setNameError('Name is required');
      return false;
    }
    if (name.length > 255) {
      setNameError('Name must be 255 characters or fewer');
      return false;
    }
    setNameError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateName()) return;
    setSaving(true);
    setError('');
    try {
      const data: CollectionCreate | CollectionUpdate = {
        name: name.trim(),
        description: description.trim() || undefined,
        parent_id: parentId || null,
        color: color || undefined,
        icon: icon.trim() || undefined,
      };
      await onSave(data);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save collection');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <h2>{collection ? 'Edit Collection' : 'New Collection'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          {error && <div className="error-banner" style={{ marginBottom: 12 }}>{error}</div>}

          <div className="form-group">
            <label htmlFor="col-name">Name *</label>
            <input
              id="col-name"
              type="text"
              className={`form-input${nameError ? ' input-error' : ''}`}
              value={name}
              onChange={e => setName(e.target.value)}
              onBlur={validateName}
              maxLength={255}
              placeholder="e.g. Department 56 Christmas Village"
              autoFocus
            />
            {nameError && <span className="field-error">{nameError}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="col-description">Description</label>
            <textarea
              id="col-description"
              className="form-input"
              value={description}
              onChange={e => setDescription(e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="Optional description"
            />
          </div>

          <div className="form-group">
            <label htmlFor="col-parent">Parent Collection</label>
            <select
              id="col-parent"
              className="form-input"
              value={parentId}
              onChange={e => setParentId(e.target.value)}
            >
              <option value="">— None (root collection) —</option>
              {parentOptions.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="col-icon">Icon (emoji, max 1–4 chars)</label>
            <input
              id="col-icon"
              type="text"
              className="form-input"
              value={icon}
              onChange={e => setIcon(e.target.value.slice(0, 4))}
              placeholder="📦"
              style={{ width: 80 }}
            />
          </div>

          <div className="form-group">
            <label>Color</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
              {COLLECTION_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: c,
                    border: color === c ? '3px solid #fff' : '2px solid transparent',
                    outline: color === c ? `2px solid ${c}` : 'none',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                  title={c}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                title="Custom color"
                style={{ width: 28, height: 28, padding: 0, border: 'none', cursor: 'pointer', borderRadius: '50%' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <div style={{ width: 20, height: 20, borderRadius: 4, background: color }} />
              <span style={{ fontSize: 12, color: '#666' }}>{color}</span>
            </div>
          </div>

          <div className="collection-modal-footer">
            <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : (collection ? 'Save Changes' : 'Create Collection')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── CollectionCard ───────────────────────────────────────────────────────────

interface CardProps {
  collection: CollectionTreeNode;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: (c: CollectionTreeNode) => void;
  onDelete: (c: CollectionTreeNode) => void;
  onClick: (c: CollectionTreeNode) => void;
}

function CollectionCard({ collection, canEdit, canDelete, onEdit, onDelete, onClick }: CardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const color = collection.color ?? '#457B9D';
  const icon = collection.icon ?? '🗂️';

  const coverStyle: React.CSSProperties = collection.cover_image_path
    ? {
        backgroundImage: `url(/uploads/${collection.cover_image_path})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : {
        background: `linear-gradient(135deg, ${color}33, ${color}88)`,
      };

  return (
    <div
      className="collection-card"
      style={{ borderLeft: `3px solid ${color}` }}
      onClick={() => onClick(collection)}
      tabIndex={0}
      role="button"
      onKeyDown={e => e.key === 'Enter' && onClick(collection)}
    >
      <div className="collection-card-cover" style={{ ...coverStyle, height: 100, position: 'relative' }}>
        <span style={{ position: 'absolute', bottom: 6, left: 8, fontSize: 24, lineHeight: 1 }}>
          {icon}
        </span>
        {(canEdit || canDelete) && (
          <div style={{ position: 'absolute', top: 6, right: 6 }}>
            <button
              className="btn-icon"
              onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
              title="Options"
              aria-label={`Options for ${collection.name}`}
            >
              ⋯
            </button>
            {menuOpen && (
              <div className="collection-context-menu">
                {canEdit && (
                  <button
                    className="collection-context-menu-item"
                    onClick={e => { e.stopPropagation(); setMenuOpen(false); onEdit(collection); }}
                  >
                    ✏️ Edit
                  </button>
                )}
                {canDelete && (
                  <button
                    className="collection-context-menu-item collection-context-menu-item--danger"
                    onClick={e => { e.stopPropagation(); setMenuOpen(false); onDelete(collection); }}
                  >
                    🗑️ Delete
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ padding: '8px 12px 10px' }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {collection.name}
        </div>
        {collection.description && (
          <div style={{ fontSize: 12, color: '#666', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
            {collection.description}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 6, fontSize: 11, color: '#888' }}>
          <span>📦 {collection.total_item_count} item{collection.total_item_count !== 1 ? 's' : ''}</span>
          {collection.sub_collection_count > 0 && (
            <span>📂 {collection.sub_collection_count} sub-group{collection.sub_collection_count !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Ghost Create Card ────────────────────────────────────────────────────────

function GhostCreateCard({ onClick }: { onClick: () => void }) {
  return (
    <div
      className="collection-card collection-card--ghost"
      onClick={onClick}
      tabIndex={0}
      role="button"
      onKeyDown={e => e.key === 'Enter' && onClick()}
    >
      <div style={{ fontSize: 32 }}>+</div>
      <div style={{ fontSize: 13 }}>Create Collection</div>
    </div>
  );
}

// ─── CollectionDetailView ─────────────────────────────────────────────────────

interface DetailViewProps {
  collection: CollectionTreeNode;
  currentUser: User | null;
  onBack: () => void;
  onNavigate: (c: CollectionTreeNode) => void;
  onEditFromDetail: (c: CollectionTreeNode) => void;
}

function CollectionDetailView({ collection, currentUser, onBack, onNavigate, onEditFromDetail }: DetailViewProps) {
  const [items, setItems] = useState<{ id: string; name: string; location?: { name: string } | null }[]>([]);
  const [total, setTotal] = useState(0);
  const [recursive, setRecursive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchCollectionItems(collection.id, recursive);
      setItems(result.items as { id: string; name: string; location?: { name: string } | null }[]);
      setTotal(result.total);
    } catch {
      // ignore — items just won't show
    } finally {
      setLoading(false);
    }
  }, [collection.id, recursive]);

  useEffect(() => { loadItems(); }, [loadItems]);

  const handleRemoveItem = async (itemId: string) => {
    setRemoving(itemId);
    try {
      await removeItemFromCollection(collection.id, itemId);
      setItems(prev => prev.filter(i => i.id !== itemId));
      setTotal(prev => prev - 1);
    } catch {
      // ignore
    } finally {
      setRemoving(null);
    }
  };

  const color = collection.color ?? '#457B9D';
  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'editor';

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#666', marginBottom: 16 }}>
        <button className="btn-outline" style={{ padding: '2px 8px', fontSize: 13 }} onClick={onBack}>🗂️ Collections</button>
        {collection.parent_id && (
          <>
            <span>›</span>
            <span style={{ color: '#999' }}>…</span>
          </>
        )}
        <span>›</span>
        <span style={{ fontWeight: 600, color: '#333' }}>{collection.name}</span>
      </div>

      {/* Header banner */}
      <div style={{
        borderRadius: 8,
        padding: '24px 24px 20px',
        marginBottom: 24,
        background: `linear-gradient(135deg, ${color}22, ${color}55)`,
        borderLeft: `4px solid ${color}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 32 }}>{collection.icon ?? '🗂️'}</span>
          <div>
            <h2 style={{ margin: 0, fontSize: 22 }}>{collection.name}</h2>
            {collection.description && (
              <p style={{ margin: '4px 0 0', color: '#555', fontSize: 14 }}>{collection.description}</p>
            )}
          </div>
          {canEdit && (
            <button
              className="btn-outline"
              onClick={() => onEditFromDetail(collection)}
              style={{ marginLeft: 'auto' }}
            >
              ✏️ Edit
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#666' }}>
          <span>📦 {collection.total_item_count} total items</span>
          <span>📂 {collection.sub_collection_count} sub-groups</span>
        </div>
      </div>

      {/* Sub-collections strip */}
      {collection.children.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 10, fontSize: 15 }}>Sub-Groups</h3>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
            {collection.children.map(child => (
              <div
                key={child.id}
                onClick={() => onNavigate(child as CollectionTreeNode)}
                style={{
                  cursor: 'pointer',
                  borderRadius: 8,
                  padding: '8px 14px',
                  background: `${child.color ?? color}22`,
                  borderLeft: `3px solid ${child.color ?? color}`,
                  minWidth: 120,
                  whiteSpace: 'nowrap',
                  fontSize: 13,
                }}
              >
                <div style={{ fontWeight: 600 }}>{child.icon ?? '📂'} {child.name}</div>
                <div style={{ fontSize: 11, color: '#888' }}>{child.item_count} items</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Items section */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 15, flex: 1 }}>Items ({total})</h3>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={recursive}
              onChange={e => setRecursive(e.target.checked)}
            />
            Include sub-groups
          </label>
        </div>

        {loading ? (
          <div style={{ color: '#888', padding: 20, textAlign: 'center' }}>Loading items…</div>
        ) : items.length === 0 ? (
          <div style={{ color: '#888', padding: 20, textAlign: 'center' }}>
            No items in this collection yet.
          </div>
        ) : (
          <div>
            {items.map(item => (
              <div
                key={item.id}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}
              >
                <div style={{ flex: 1, fontSize: 14 }}>
                  <div style={{ fontWeight: 500 }}>{item.name}</div>
                  {item.location && (
                    <div style={{ fontSize: 12, color: '#888' }}>{item.location.name}</div>
                  )}
                </div>
                {canEdit && (
                  <button
                    className="btn-outline"
                    style={{ fontSize: 12, padding: '2px 8px', color: '#c0392b', borderColor: '#c0392b' }}
                    onClick={() => handleRemoveItem(item.id)}
                    disabled={removing === item.id}
                    title={`Remove ${item.name} from collection`}
                  >
                    {removing === item.id ? '…' : '× Remove'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── CollectionsDashboard ─────────────────────────────────────────────────────

export default function CollectionsDashboard({ currentUser }: CollectionsDashboardProps) {
  const [tree, setTree] = useState<CollectionTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCollection, setEditingCollection] = useState<CollectionTreeNode | null>(null);
  const [deletingCollection, setDeletingCollection] = useState<CollectionTreeNode | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [activeCollection, setActiveCollection] = useState<CollectionTreeNode | null>(null);
  const [navStack, setNavStack] = useState<CollectionTreeNode[]>([]);

  const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'editor';
  const canDelete = currentUser?.role === 'admin';

  const loadTree = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchCollectionTree();
      setTree(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load collections');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTree(); }, [loadTree]);

  function countAll(nodes: CollectionTreeNode[]): { total: number; totalItems: number } {
    let total = 0;
    let totalItems = 0;
    function walk(n: CollectionTreeNode) {
      total++;
      totalItems += n.item_count;
      n.children.forEach(walk);
    }
    nodes.forEach(walk);
    return { total, totalItems };
  }
  const { total: totalCollections, totalItems } = countAll(tree);
  const masterGroups = tree.length;

  function flattenTree(nodes: CollectionTreeNode[]): CollectionTreeNode[] {
    const result: CollectionTreeNode[] = [];
    function walk(n: CollectionTreeNode) { result.push(n); n.children.forEach(walk); }
    nodes.forEach(walk);
    return result;
  }
  const allFlat = flattenTree(tree);

  function findNode(nodes: CollectionTreeNode[], id: string): CollectionTreeNode | null {
    for (const n of nodes) {
      if (n.id === id) return n;
      const found = findNode(n.children, id);
      if (found) return found;
    }
    return null;
  }

  const handleSave = async (data: CollectionCreate | CollectionUpdate) => {
    if (editingCollection) {
      await updateCollection(editingCollection.id, data as CollectionUpdate);
    } else {
      await createCollection(data as CollectionCreate);
    }
    await loadTree();
  };

  const handleDelete = async (cascade: boolean) => {
    if (!deletingCollection) return;
    setDeleteError('');
    try {
      await deleteCollection(deletingCollection.id, cascade);
      setDeletingCollection(null);
      await loadTree();
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : 'Failed to delete');
    }
  };

  const handleNavigate = (col: CollectionTreeNode) => {
    setNavStack(prev => activeCollection ? [...prev, activeCollection] : prev);
    setActiveCollection(col);
  };

  const handleBack = () => {
    if (navStack.length > 0) {
      const prev = navStack[navStack.length - 1];
      setNavStack(stack => stack.slice(0, -1));
      setActiveCollection(prev);
    } else {
      setActiveCollection(null);
    }
  };

  // Filter root collections by search
  const filteredTree = search
    ? allFlat.filter(n => n.name.toLowerCase().includes(search.toLowerCase()) && !n.parent_id)
    : tree;

  if (activeCollection) {
    const freshCol = findNode(tree, activeCollection.id) ?? activeCollection;
    return (
      <div className="collections-dashboard">
        <CollectionDetailView
          collection={freshCol}
          currentUser={currentUser}
          onBack={handleBack}
          onNavigate={handleNavigate}
          onEditFromDetail={(col) => { setEditingCollection(col); setShowModal(true); }}
        />
        {showModal && (
          <CollectionCreateEditModal
            collection={editingCollection}
            allCollections={tree}
            onSave={async (data) => { await handleSave(data); setEditingCollection(null); }}
            onClose={() => { setShowModal(false); setEditingCollection(null); }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="collections-dashboard">
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>🗂️ Collections</h1>
        {canEdit && (
          <button
            className="btn-primary"
            onClick={() => { setEditingCollection(null); setShowModal(true); }}
            style={{ marginLeft: 'auto' }}
          >
            + New Collection
          </button>
        )}
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Collections', value: totalCollections },
          { label: 'Items in Collections', value: totalItems },
          { label: 'Master Groups', value: masterGroups },
        ].map(stat => (
          <div
            key={stat.label}
            style={{
              flex: 1,
              background: 'var(--bg-elevated, #f8f9fa)',
              borderRadius: 8,
              padding: '14px 18px',
              border: '1px solid var(--border-panel, #e0e0e0)',
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 700 }}>{stat.value}</div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Search toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <input
          type="text"
          className="form-input"
          placeholder="Search collections…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, maxWidth: 320 }}
        />
        {search && (
          <button className="btn-outline" onClick={() => setSearch('')}>Clear</button>
        )}
      </div>

      {/* Error */}
      {error && <div className="error-banner">{error}</div>}

      {/* Loading skeletons */}
      {loading && (
        <div className="collection-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="collection-skeleton" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredTree.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#888' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🗂️</div>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No collections yet</div>
          <div style={{ marginBottom: 20 }}>Create your first collection to start organizing your items.</div>
          {canEdit && (
            <button className="btn-primary" onClick={() => { setEditingCollection(null); setShowModal(true); }}>
              + Create Collection
            </button>
          )}
        </div>
      )}

      {/* Collection grid */}
      {!loading && filteredTree.length > 0 && (
        <div className="collection-grid">
          {filteredTree.map(col => (
            <CollectionCard
              key={col.id}
              collection={col}
              canEdit={canEdit}
              canDelete={canDelete}
              onEdit={c => { setEditingCollection(c); setShowModal(true); }}
              onDelete={c => { setDeletingCollection(c); setDeleteError(''); }}
              onClick={handleNavigate}
            />
          ))}
          {canEdit && (
            <GhostCreateCard onClick={() => { setEditingCollection(null); setShowModal(true); }} />
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <CollectionCreateEditModal
          collection={editingCollection}
          allCollections={tree}
          onSave={async (data) => { await handleSave(data); setEditingCollection(null); }}
          onClose={() => { setShowModal(false); setEditingCollection(null); }}
        />
      )}

      {/* Delete confirmation modal */}
      {deletingCollection && (
        <div className="modal-overlay" onClick={() => { setDeletingCollection(null); setDeleteError(''); }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h2>Delete Collection</h2>
              <button className="modal-close" onClick={() => { setDeletingCollection(null); setDeleteError(''); }}>×</button>
            </div>
            <div style={{ padding: '1rem 0' }}>
              <p>Delete <strong>"{deletingCollection.name}"</strong>?</p>
              {deletingCollection.sub_collection_count > 0 && (
                <p style={{ color: '#e85a4f' }}>
                  ⚠️ This collection has {deletingCollection.sub_collection_count} sub-group(s). Deleting with cascade will also delete them.
                </p>
              )}
              <p style={{ fontSize: 13, color: '#666' }}>Items will not be deleted — only their collection membership will be removed.</p>
              {deleteError && <div className="error-banner">{deleteError}</div>}
            </div>
            <div className="collection-modal-footer">
              <button className="btn-outline" onClick={() => { setDeletingCollection(null); setDeleteError(''); }}>Cancel</button>
              {deletingCollection.sub_collection_count > 0 && (
                <button className="btn-danger" onClick={() => handleDelete(true)}>Delete with Sub-Groups</button>
              )}
              <button
                className="btn-danger"
                onClick={() => handleDelete(false)}
                disabled={deletingCollection.sub_collection_count > 0}
                title={deletingCollection.sub_collection_count > 0 ? 'Must cascade or delete sub-groups first' : ''}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
