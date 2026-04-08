from __future__ import annotations

import io
import logging
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from sqlalchemy.orm import Session

from .. import models, schemas, auth
from ..deps import get_db
from ..storage import get_storage

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/collections", tags=["collections"])

MAX_COVER_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB
ALLOWED_IMAGE_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


# ─── Helpers ────────────────────────────────────────────────────────────────

def _get_collection_or_404(db: Session, collection_id: UUID) -> models.Collection:
    col = db.query(models.Collection).filter(models.Collection.id == collection_id).first()
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found")
    return col


def _check_editor(current_user: models.User):
    if current_user.role not in ("admin", "editor"):
        raise HTTPException(status_code=403, detail="Editor or admin role required")


def _check_admin(current_user: models.User):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")


def _compute_counts(db: Session, collection: models.Collection) -> dict:
    """Compute item_count and sub_collection_count for a collection."""
    col_items_table = models.collection_items
    item_count = len(db.execute(
        col_items_table.select().where(col_items_table.c.collection_id == collection.id)
    ).fetchall())
    sub_count = db.query(models.Collection).filter(models.Collection.parent_id == collection.id).count()
    return {"item_count": item_count, "sub_collection_count": sub_count}


def _collection_to_summary(db: Session, col: models.Collection) -> schemas.CollectionSummary:
    counts = _compute_counts(db, col)
    return schemas.CollectionSummary(
        id=col.id,
        name=col.name,
        description=col.description,
        parent_id=col.parent_id,
        color=col.color,
        icon=col.icon,
        cover_image_path=col.cover_image_path,
        item_count=counts["item_count"],
        sub_collection_count=counts["sub_collection_count"],
        created_at=col.created_at,
        updated_at=col.updated_at,
    )


def _collection_to_detail(db: Session, col: models.Collection) -> schemas.CollectionDetail:
    counts = _compute_counts(db, col)
    parent_summary = None
    if col.parent_id:
        parent = db.query(models.Collection).filter(models.Collection.id == col.parent_id).first()
        if parent:
            parent_summary = _collection_to_summary(db, parent)
    children = db.query(models.Collection).filter(models.Collection.parent_id == col.id).all()
    children_summaries = [_collection_to_summary(db, c) for c in children]
    return schemas.CollectionDetail(
        id=col.id,
        name=col.name,
        description=col.description,
        parent_id=col.parent_id,
        color=col.color,
        icon=col.icon,
        cover_image_path=col.cover_image_path,
        shared_properties=col.shared_properties,
        item_count=counts["item_count"],
        sub_collection_count=counts["sub_collection_count"],
        created_at=col.created_at,
        updated_at=col.updated_at,
        parent=parent_summary,
        children=children_summaries,
        created_by=col.created_by,
    )


def _ancestor_walk(db: Session, start_id: UUID, target_id: UUID, max_depth: int = 10) -> bool:
    """Return True if target_id is an ancestor of start_id (circular reference detected)."""
    current_id = start_id
    for _ in range(max_depth):
        col = db.query(models.Collection).filter(models.Collection.id == current_id).first()
        if not col or col.parent_id is None:
            return False
        if col.parent_id == target_id:
            return True
        current_id = col.parent_id
    return False


def _get_descendant_ids(db: Session, collection_id: UUID) -> List[UUID]:
    """Return all descendant collection IDs via BFS using adjacency list (SQLite-safe)."""
    all_cols = db.query(models.Collection.id, models.Collection.parent_id).all()
    parent_to_children: dict = {}
    for cid, pid in all_cols:
        if pid is not None:
            parent_to_children.setdefault(pid, []).append(cid)

    result: List[UUID] = []
    queue = [collection_id]
    while queue:
        current = queue.pop()
        for child_id in parent_to_children.get(current, []):
            result.append(child_id)
            queue.append(child_id)
    return result


def _check_user_item_access(current_user: models.User, item: models.Item) -> bool:
    """Return True if the current user has access to the item."""
    if current_user.role == "admin":
        return True
    allowed_location_ids = [loc.id for loc in current_user.allowed_locations] if current_user.allowed_locations else []
    return (
        item.location_id in allowed_location_ids
        or item.associated_user_id == current_user.id
    )


# ─── Collection CRUD Endpoints ────────────────────────────────────────────────

@router.get("/", response_model=List[schemas.CollectionSummary])
def list_collections(
    parent_id: Optional[UUID] = Query(None, description="Filter to direct children of this parent; omit for root-level"),
    search: Optional[str] = Query(None, description="Partial name match"),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """List collections. Returns direct children of parent_id (or all roots if parent_id is None)."""
    query = db.query(models.Collection)
    if parent_id is not None:
        query = query.filter(models.Collection.parent_id == parent_id)
    else:
        query = query.filter(models.Collection.parent_id.is_(None))
    if search:
        query = query.filter(models.Collection.name.ilike(f"%{search}%"))
    cols = query.order_by(models.Collection.name).all()
    return [_collection_to_summary(db, c) for c in cols]


@router.get("/tree", response_model=List[schemas.CollectionTreeNode])
def get_collection_tree(
    root_id: Optional[UUID] = Query(None),
    include_item_counts: bool = Query(True),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    """Return full collection tree assembled in Python from a single bulk query (SQLite-safe)."""
    all_cols = db.query(models.Collection).all()

    item_count_map: dict = {}
    if include_item_counts:
        col_items_table = models.collection_items
        rows = db.execute(col_items_table.select()).fetchall()
        for row in rows:
            cid = row.collection_id
            item_count_map[cid] = item_count_map.get(cid, 0) + 1

    def build_node(col: models.Collection, depth: int = 0) -> Optional[schemas.CollectionTreeNode]:
        if depth > 10:
            return None
        children_models = [c for c in all_cols if c.parent_id == col.id]
        child_nodes = [n for c in children_models if (n := build_node(c, depth + 1)) is not None]
        direct_count = item_count_map.get(col.id, 0)
        total_count = direct_count + sum(n.total_item_count for n in child_nodes)
        return schemas.CollectionTreeNode(
            id=col.id,
            name=col.name,
            description=col.description,
            parent_id=col.parent_id,
            color=col.color,
            icon=col.icon,
            cover_image_path=col.cover_image_path,
            item_count=direct_count,
            sub_collection_count=len(children_models),
            created_at=col.created_at,
            updated_at=col.updated_at,
            children=child_nodes,
            total_item_count=total_count,
        )

    roots = [col for col in all_cols if (root_id is None and col.parent_id is None) or col.id == root_id]
    return [n for col in roots if (n := build_node(col)) is not None]


@router.post("/", response_model=schemas.CollectionDetail, status_code=status.HTTP_201_CREATED)
def create_collection(
    payload: schemas.CollectionCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    _check_editor(current_user)
    if payload.parent_id:
        parent = db.query(models.Collection).filter(models.Collection.id == payload.parent_id).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent collection not found")
    data = payload.model_dump()
    col = models.Collection(
        **{k: v for k, v in data.items() if k != "shared_properties"},
        shared_properties=data.get("shared_properties"),
        created_by=current_user.id,
    )
    db.add(col)
    db.commit()
    db.refresh(col)
    logger.info(f"Collection created: {col.name} (id={col.id}) by user {current_user.id}")
    return _collection_to_detail(db, col)


@router.get("/{collection_id}", response_model=schemas.CollectionDetail)
def get_collection(
    collection_id: UUID,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    col = _get_collection_or_404(db, collection_id)
    return _collection_to_detail(db, col)


@router.put("/{collection_id}", response_model=schemas.CollectionDetail)
def update_collection(
    collection_id: UUID,
    payload: schemas.CollectionUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    _check_editor(current_user)
    col = _get_collection_or_404(db, collection_id)
    data = payload.model_dump(exclude_unset=True)

    if "parent_id" in data and data["parent_id"] is not None:
        new_parent_id = data["parent_id"]
        if new_parent_id == collection_id:
            raise HTTPException(status_code=422, detail="A collection cannot be its own parent")
        if _ancestor_walk(db, new_parent_id, collection_id):
            raise HTTPException(
                status_code=422,
                detail="Circular reference: a collection cannot be its own ancestor"
            )
        parent = db.query(models.Collection).filter(models.Collection.id == new_parent_id).first()
        if not parent:
            raise HTTPException(status_code=404, detail="Parent collection not found")

    for key, value in data.items():
        setattr(col, key, value)

    db.commit()
    db.refresh(col)
    logger.info(f"Collection updated: {col.name} (id={col.id})")
    return _collection_to_detail(db, col)


@router.delete("/{collection_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_collection(
    collection_id: UUID,
    cascade: bool = Query(False, description="Cascade delete all descendant collections"),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    _check_admin(current_user)
    col = _get_collection_or_404(db, collection_id)

    children = db.query(models.Collection).filter(models.Collection.parent_id == collection_id).all()

    if children and not cascade:
        raise HTTPException(
            status_code=409,
            detail=f"Collection has {len(children)} child collection(s). Delete them first or use ?cascade=true"
        )

    if cascade and children:
        descendant_ids = _get_descendant_ids(db, collection_id)
        for did in descendant_ids:
            desc = db.query(models.Collection).filter(models.Collection.id == did).first()
            if desc:
                db.delete(desc)
        db.flush()

    if col.cover_image_path:
        try:
            get_storage().delete(col.cover_image_path)
        except Exception:
            pass  # Non-fatal

    db.delete(col)
    db.commit()
    logger.info(f"Collection deleted: {collection_id} (cascade={cascade})")


# ─── Collection Items Endpoints ───────────────────────────────────────────────

@router.get("/{collection_id}/items")
def get_collection_items(
    collection_id: UUID,
    recursive: bool = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    col = _get_collection_or_404(db, collection_id)

    if recursive:
        descendant_ids = _get_descendant_ids(db, collection_id)
        all_ids = [collection_id] + descendant_ids
    else:
        all_ids = [collection_id]

    col_items_table = models.collection_items
    item_id_rows = db.execute(
        col_items_table.select().where(col_items_table.c.collection_id.in_(all_ids))
    ).fetchall()
    item_ids = list({row.item_id for row in item_id_rows})

    items_query = db.query(models.Item).filter(models.Item.id.in_(item_ids))
    if current_user.role != "admin":
        allowed_location_ids = [loc.id for loc in current_user.allowed_locations] if current_user.allowed_locations else []
        items_query = items_query.filter(
            (models.Item.location_id.in_(allowed_location_ids)) |
            (models.Item.associated_user_id == current_user.id)
        )

    total = items_query.count()
    items = items_query.offset(skip).limit(limit).all()

    col_summary = _collection_to_summary(db, col)
    return {"collection": col_summary, "items": items, "total": total}


@router.post("/{collection_id}/items", response_model=schemas.CollectionMembershipResult, status_code=status.HTTP_201_CREATED)
def add_items_to_collection(
    collection_id: UUID,
    payload: schemas.CollectionItemsAdd,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    _check_editor(current_user)
    _get_collection_or_404(db, collection_id)

    col_items_table = models.collection_items
    existing_rows = db.execute(
        col_items_table.select().where(col_items_table.c.collection_id == collection_id)
    ).fetchall()
    existing_item_ids = {row.item_id for row in existing_rows}

    already_members = []
    added = 0

    for item_id in payload.item_ids:
        item = db.query(models.Item).filter(models.Item.id == item_id).first()
        if not item:
            raise HTTPException(status_code=404, detail=f"Item {item_id} not found")
        if not _check_user_item_access(current_user, item):
            raise HTTPException(status_code=403, detail=f"No access to item {item_id}")
        if item_id in existing_item_ids:
            already_members.append(item_id)
            continue
        db.execute(
            col_items_table.insert().values(
                collection_id=collection_id,
                item_id=item_id,
                added_at=datetime.utcnow(),
                added_by=current_user.id,
                sort_order=payload.sort_order or 0,
                notes=payload.notes,
            )
        )
        added += 1

    db.commit()
    return schemas.CollectionMembershipResult(added=added, already_members=already_members)


@router.delete("/{collection_id}/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_item_from_collection(
    collection_id: UUID,
    item_id: UUID,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    _check_editor(current_user)
    _get_collection_or_404(db, collection_id)

    col_items_table = models.collection_items
    row = db.execute(
        col_items_table.select().where(
            col_items_table.c.collection_id == collection_id,
            col_items_table.c.item_id == item_id,
        )
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Item is not a member of this collection")

    db.execute(
        col_items_table.delete().where(
            col_items_table.c.collection_id == collection_id,
            col_items_table.c.item_id == item_id,
        )
    )
    db.commit()


@router.post("/{collection_id}/cover-image", response_model=schemas.CollectionDetail)
async def upload_cover_image(
    collection_id: UUID,
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    _check_editor(current_user)
    col = _get_collection_or_404(db, collection_id)

    content = await file.read(MAX_COVER_IMAGE_BYTES + 1)
    if len(content) > MAX_COVER_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Cover image exceeds 5 MB limit")

    detected_mime = None
    try:
        import magic
        detected_mime = magic.from_buffer(content[:2048], mime=True)
    except ImportError:
        detected_mime = file.content_type

    if detected_mime not in ALLOWED_IMAGE_MIME_TYPES:
        raise HTTPException(status_code=415, detail=f"Unsupported image type: {detected_mime}")

    ext_map = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/gif": ".gif",
    }
    ext = ext_map.get(detected_mime, ".jpg")
    timestamp = int(datetime.utcnow().timestamp())
    relative_path = f"collections/{collection_id}_{timestamp}{ext}"

    if col.cover_image_path:
        try:
            get_storage().delete(col.cover_image_path)
        except Exception:
            pass

    get_storage().save(io.BytesIO(content), relative_path, content_type=detected_mime)

    col.cover_image_path = relative_path
    db.commit()
    db.refresh(col)
    return _collection_to_detail(db, col)
