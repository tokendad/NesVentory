# Phase 2: Core Inventory Features

**Status:** Not Started
**Depends On:** Phase 1 (Navigation, Auth, API Client, Zustand Stores)
**Estimated Effort:** 12–16 developer-days
**Priority:** Critical — this phase delivers the primary value of the app

---

## Executive Summary

Phase 2 converts the heart of NesVentory — items, locations, and tags — from the React web
implementation to Expo + React Native. The web app uses state-based view switching (`type View =
"inventory" | "media" | ...` in `App.tsx`) and large monolithic components. The mobile app must
decompose these into navigable screens, adopt native list primitives (`FlatList`, `SectionList`),
and introduce offline-first patterns with Zustand stores and AsyncStorage caching.

### Key Challenges

| Challenge | Web Approach | Mobile Solution |
|-----------|-------------|-----------------|
| Item list rendering | Plain `div` grid with re-render on every search keystroke | `FlatList` with `keyExtractor`, `getItemLayout`, `initialNumToRender` |
| ItemForm.tsx (2,437 lines) | Single monolithic component with 30+ `useState` hooks | 7 extracted sub-section components with shared form context |
| Modal stacking | Nested CSS overlays with `stopPropagation` | React Navigation modal stack + bottom sheets |
| Autocomplete dropdowns | CSS absolute-positioned lists | `@gorhom/bottom-sheet` pickers |
| Search filtering | Inline filter — no memoization, runs every render | `useMemo` + debounced text input (300ms) |
| Photo capture | `<input type="file" capture="environment">` | `expo-image-picker` with camera/gallery modes |
| Bulk selection | Checkbox column in table | Long-press to enter multi-select mode |

---

## 2.1 Items List Screen — `InventoryScreen`

**Maps from:** `InventoryPage.tsx` (1,609 lines), `ItemsTable.tsx` (428 lines)
**Estimated Effort:** 3–4 days

### 2.1.1 Screen Architecture

```
InventoryScreen/
├── InventoryScreen.tsx          # Main screen container
├── components/
│   ├── SearchFilterBar.tsx      # Search input + filter chips
│   ├── ItemCard.tsx             # Individual item card
│   ├── ItemCardGrid.tsx         # 2-column grid variant
│   ├── BulkActionBar.tsx        # Floating bar for bulk ops
│   ├── FilterModal.tsx          # Full filter bottom sheet
│   └── SortPicker.tsx           # Sort option selector
└── hooks/
    ├── useItemSearch.ts         # Search + filter logic
    └── useMultiSelect.ts        # Multi-select state machine
```

### 2.1.2 FlatList Implementation

The web currently filters without memoization (re-runs on every render). The mobile
implementation must use `useMemo` and debounced search:

```typescript
// hooks/useItemSearch.ts
import { useMemo, useState, useCallback } from 'react';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import type { Item } from '../../../types/api';

interface FilterState {
  locationId: string | null;
  tagIds: string[];
  sortBy: 'name' | 'value' | 'created_at' | 'updated_at';
  sortOrder: 'asc' | 'desc';
  valueRange: { min: number | null; max: number | null };
}

const DEFAULT_FILTERS: FilterState = {
  locationId: null,
  tagIds: [],
  sortBy: 'name',
  sortOrder: 'asc',
  valueRange: { min: null, max: null },
};

export function useItemSearch(items: Item[]) {
  const [searchText, setSearchText] = useState('');
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  // Debounce search input — 300ms is responsive without excess re-renders
  const debouncedQuery = useDebouncedValue(searchText, 300);

  const filteredItems = useMemo(() => {
    let result = items;

    // Text search — matches web logic from App.tsx lines 302-323
    if (debouncedQuery.trim()) {
      const query = debouncedQuery.toLowerCase().trim();
      result = result.filter((item) => {
        const searchableFields = [
          item.name,
          item.description,
          item.brand,
          item.model_number,
          item.serial_number,
          item.retailer,
          item.upc,
        ];
        const fieldMatch = searchableFields.some(
          (field) => field && field.toLowerCase().includes(query)
        );
        const tagMatch = item.tags?.some(
          (tag) => tag.name.toLowerCase().includes(query)
        );
        return fieldMatch || tagMatch;
      });
    }

    // Location filter
    if (filters.locationId) {
      result = result.filter((item) =>
        String(item.location_id) === filters.locationId
      );
    }

    // Tag filter — item must have ALL selected tags
    if (filters.tagIds.length > 0) {
      result = result.filter((item) =>
        filters.tagIds.every((tagId) =>
          item.tags?.some((tag) => String(tag.id) === tagId)
        )
      );
    }

    // Value range filter
    if (filters.valueRange.min !== null) {
      result = result.filter(
        (item) => (item.estimated_value ?? 0) >= filters.valueRange.min!
      );
    }
    if (filters.valueRange.max !== null) {
      result = result.filter(
        (item) => (item.estimated_value ?? 0) <= filters.valueRange.max!
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (filters.sortBy) {
        case 'name':
          cmp = (a.name ?? '').localeCompare(b.name ?? '');
          break;
        case 'value':
          cmp = (a.estimated_value ?? 0) - (b.estimated_value ?? 0);
          break;
        case 'created_at':
          cmp = (a.created_at ?? '').localeCompare(b.created_at ?? '');
          break;
        case 'updated_at':
          cmp = (a.updated_at ?? '').localeCompare(b.updated_at ?? '');
          break;
      }
      return filters.sortOrder === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [items, debouncedQuery, filters]);

  return {
    searchText,
    setSearchText,
    filters,
    setFilters,
    filteredItems,
    resultCount: filteredItems.length,
    totalCount: items.length,
  };
}
```

### 2.1.3 Main Screen Component

```typescript
// InventoryScreen.tsx
import React, { useCallback, useState } from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  StyleSheet,
  ListRenderItem,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { FAB } from 'react-native-paper';
import { useItemsStore } from '../../stores/itemsStore';
import { useItemSearch } from './hooks/useItemSearch';
import { useMultiSelect } from './hooks/useMultiSelect';
import { SearchFilterBar } from './components/SearchFilterBar';
import { ItemCard } from './components/ItemCard';
import { BulkActionBar } from './components/BulkActionBar';
import { EmptyState } from '../../components/EmptyState';
import type { Item } from '../../types/api';

const ITEM_HEIGHT = 100; // Fixed height for getItemLayout optimization

export function InventoryScreen() {
  const navigation = useNavigation();
  const { items, loading, error, fetchItems } = useItemsStore();
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const {
    searchText,
    setSearchText,
    filters,
    setFilters,
    filteredItems,
    resultCount,
    totalCount,
  } = useItemSearch(items);

  const {
    selectedIds,
    isSelecting,
    toggle,
    selectAll,
    clearSelection,
    enterSelectMode,
  } = useMultiSelect();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchItems();
    } finally {
      setRefreshing(false);
    }
  }, [fetchItems]);

  const handleItemPress = useCallback(
    (item: Item) => {
      if (isSelecting) {
        toggle(String(item.id));
      } else {
        navigation.navigate('ItemDetail', { itemId: String(item.id) });
      }
    },
    [isSelecting, toggle, navigation]
  );

  const handleItemLongPress = useCallback(
    (item: Item) => {
      if (!isSelecting) {
        enterSelectMode(String(item.id));
      }
    },
    [isSelecting, enterSelectMode]
  );

  const renderItem: ListRenderItem<Item> = useCallback(
    ({ item }) => (
      <ItemCard
        item={item}
        selected={selectedIds.has(String(item.id))}
        selecting={isSelecting}
        onPress={() => handleItemPress(item)}
        onLongPress={() => handleItemLongPress(item)}
      />
    ),
    [selectedIds, isSelecting, handleItemPress, handleItemLongPress]
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  const keyExtractor = useCallback((item: Item) => String(item.id), []);

  return (
    <View style={styles.container}>
      <SearchFilterBar
        searchText={searchText}
        onSearchChange={setSearchText}
        filters={filters}
        onFiltersChange={setFilters}
        resultCount={resultCount}
        totalCount={totalCount}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={viewMode === 'list' ? getItemLayout : undefined}
        numColumns={viewMode === 'grid' ? 2 : 1}
        key={viewMode} // Force remount on layout change
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" style={styles.loader} />
          ) : (
            <EmptyState
              icon="package-variant"
              title="No items found"
              subtitle={
                searchText
                  ? 'Try adjusting your search or filters'
                  : 'Tap + to add your first item'
              }
            />
          )
        }
        contentContainerStyle={
          filteredItems.length === 0 ? styles.emptyContainer : undefined
        }
      />

      {isSelecting && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          onSelectAll={() => selectAll(filteredItems.map((i) => String(i.id)))}
          onClearSelection={clearSelection}
          onBulkDelete={() => { /* see §2.7 */ }}
          onBulkTag={() => { /* see §2.7 */ }}
          onBulkMove={() => { /* see §2.7 */ }}
        />
      )}

      {!isSelecting && (
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={() => navigation.navigate('ItemForm', { mode: 'create' })}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loader: { marginTop: 48 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center' },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});
```

### 2.1.4 Multi-Select Hook

```typescript
// hooks/useMultiSelect.ts
import { useState, useCallback } from 'react';

export function useMultiSelect() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelecting, setIsSelecting] = useState(false);

  const enterSelectMode = useCallback((initialId: string) => {
    setIsSelecting(true);
    setSelectedIds(new Set([initialId]));
  }, []);

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        // Exit select mode when nothing is selected
        if (next.size === 0) setIsSelecting(false);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setIsSelecting(false);
  }, []);

  return { selectedIds, isSelecting, enterSelectMode, toggle, selectAll, clearSelection };
}
```

### 2.1.5 ItemCard Component

```typescript
// components/ItemCard.tsx
import React, { memo } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Item } from '../../../types/api';
import { formatCurrency } from '../../../utils/format';

interface ItemCardProps {
  item: Item;
  selected: boolean;
  selecting: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

export const ItemCard = memo(function ItemCard({
  item,
  selected,
  selecting,
  onPress,
  onLongPress,
}: ItemCardProps) {
  const primaryPhoto = item.photos?.find((p) => p.is_primary) ?? item.photos?.[0];
  const thumbnailUri = primaryPhoto
    ? `${API_BASE_URL}/api/items/${item.id}/photos/${primaryPhoto.id}/thumbnail`
    : null;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
      style={[styles.card, selected && styles.cardSelected]}
    >
      {selecting && (
        <View style={styles.checkbox}>
          <MaterialCommunityIcons
            name={selected ? 'checkbox-marked' : 'checkbox-blank-outline'}
            size={24}
            color={selected ? '#2196F3' : '#9e9e9e'}
          />
        </View>
      )}

      <View style={styles.thumbnail}>
        {thumbnailUri ? (
          <Image source={{ uri: thumbnailUri }} style={styles.image} />
        ) : (
          <MaterialCommunityIcons name="package-variant" size={32} color="#bdbdbd" />
        )}
      </View>

      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        {item.brand && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {item.brand} {item.model_number ? `· ${item.model_number}` : ''}
          </Text>
        )}
        <View style={styles.meta}>
          {item.estimated_value != null && (
            <Text style={styles.value}>
              {formatCurrency(item.estimated_value)}
            </Text>
          )}
          {item.tags && item.tags.length > 0 && (
            <View style={styles.tags}>
              {item.tags.slice(0, 2).map((tag) => (
                <View key={tag.id} style={styles.tagChip}>
                  <Text style={styles.tagText}>{tag.name}</Text>
                </View>
              ))}
              {item.tags.length > 2 && (
                <Text style={styles.moreTag}>+{item.tags.length - 2}</Text>
              )}
            </View>
          )}
        </View>
      </View>

      <MaterialCommunityIcons
        name="chevron-right"
        size={20}
        color="#bdbdbd"
        style={styles.chevron}
      />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginVertical: 4,
    padding: 12,
    borderRadius: 12,
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    // Android elevation
    elevation: 2,
  },
  cardSelected: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196F3',
    borderWidth: 1,
  },
  checkbox: { marginRight: 8 },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: { width: 56, height: 56 },
  content: { flex: 1, marginLeft: 12 },
  name: { fontSize: 16, fontWeight: '600', color: '#212121' },
  subtitle: { fontSize: 13, color: '#757575', marginTop: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
  value: { fontSize: 14, fontWeight: '600', color: '#2e7d32' },
  tags: { flexDirection: 'row', gap: 4 },
  tagChip: {
    backgroundColor: '#e8eaf6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  tagText: { fontSize: 11, color: '#3f51b5' },
  moreTag: { fontSize: 11, color: '#9e9e9e', alignSelf: 'center' },
  chevron: { marginLeft: 4 },
});
```

---

## 2.2 Item Detail Screen — `ItemDetailScreen`

**Maps from:** `ItemDetails.tsx` (760 lines)
**Estimated Effort:** 2–3 days

### 2.2.1 Screen Architecture

```
ItemDetailScreen/
├── ItemDetailScreen.tsx           # ScrollView container + header actions
├── sections/
│   ├── OverviewSection.tsx        # Name, brand, model, serial, value
│   ├── LivingItemSection.tsx      # Birthdate, relationship, contact info
│   ├── PurchaseInfoSection.tsx    # Purchase date, price, retailer
│   ├── PhotoGallerySection.tsx    # Horizontal scroll photos
│   ├── DocumentsSection.tsx       # Attached documents list
│   ├── MaintenanceSection.tsx     # Tasks list (from MaintenanceTab.tsx)
│   ├── CustomFieldsSection.tsx    # DynamicField[] key-value display
│   ├── WarrantySection.tsx        # Warranty cards
│   └── EnrichmentSection.tsx      # AI enrichment data display
└── components/
    ├── DetailRow.tsx              # Label + value row
    ├── SectionCard.tsx            # Collapsible section wrapper
    └── PhotoViewer.tsx            # Fullscreen image viewer modal
```

### 2.2.2 Screen Component

```typescript
// ItemDetailScreen.tsx
import React, { useLayoutEffect, useCallback, useState } from 'react';
import { ScrollView, View, Alert, StyleSheet } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useItemsStore } from '../../stores/itemsStore';
import { useLocationsStore } from '../../stores/locationsStore';
import { deleteItem } from '../../services/api';
import { OverviewSection } from './sections/OverviewSection';
import { PhotoGallerySection } from './sections/PhotoGallerySection';
import { LivingItemSection } from './sections/LivingItemSection';
import { PurchaseInfoSection } from './sections/PurchaseInfoSection';
import { WarrantySection } from './sections/WarrantySection';
import { DocumentsSection } from './sections/DocumentsSection';
import { CustomFieldsSection } from './sections/CustomFieldsSection';
import { MaintenanceSection } from './sections/MaintenanceSection';

export function ItemDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { itemId } = route.params as { itemId: string };

  const item = useItemsStore((s) => s.items.find((i) => String(i.id) === itemId));
  const locations = useLocationsStore((s) => s.locations);
  const fetchItems = useItemsStore((s) => s.fetchItems);
  const [deleting, setDeleting] = useState(false);

  const location = locations.find((l) => String(l.id) === String(item?.location_id));
  const isLiving = item?.tags?.some((t) => t.name.toLowerCase() === 'living');

  // Header actions: Edit + Delete
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <HeaderButton
            icon="pencil"
            onPress={() =>
              navigation.navigate('ItemForm', { mode: 'edit', itemId })
            }
          />
          <HeaderButton
            icon="delete"
            color="#d32f2f"
            onPress={confirmDelete}
          />
        </View>
      ),
    });
  }, [navigation, itemId]);

  const confirmDelete = useCallback(() => {
    Alert.alert(
      'Delete Item',
      `Are you sure you want to delete "${item?.name}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteItem(itemId);
              await fetchItems();
              navigation.goBack();
            } catch (err: any) {
              Alert.alert('Error', err.message ?? 'Failed to delete item');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  }, [item, itemId, fetchItems, navigation]);

  if (!item) return <EmptyState title="Item not found" />;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* Photos at the top — hero-style horizontal gallery */}
      {item.photos && item.photos.length > 0 && (
        <PhotoGallerySection photos={item.photos} itemId={itemId} />
      )}

      <OverviewSection item={item} location={location} />

      {isLiving && <LivingItemSection item={item} />}

      <PurchaseInfoSection item={item} />

      {item.warranties && item.warranties.length > 0 && (
        <WarrantySection warranties={item.warranties} />
      )}

      {item.additional_info && item.additional_info.length > 0 && (
        <CustomFieldsSection fields={item.additional_info} />
      )}

      {item.documents && item.documents.length > 0 && (
        <DocumentsSection documents={item.documents} />
      )}

      <MaintenanceSection itemId={itemId} tasks={item.maintenance_tasks} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { paddingBottom: 32 },
});
```

### 2.2.3 Photo Gallery with Fullscreen Viewer

```typescript
// sections/PhotoGallerySection.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  FlatList,
  Image,
  Pressable,
  Dimensions,
  Modal,
  StyleSheet,
} from 'react-native';
import ImageViewer from 'react-native-image-zoom-viewer';
import type { Photo } from '../../../types/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_SIZE = SCREEN_WIDTH * 0.85;

interface Props {
  photos: Photo[];
  itemId: string;
}

export function PhotoGallerySection({ photos, itemId }: Props) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const imageUrls = photos.map((p) => ({
    url: `${API_BASE_URL}/api/items/${itemId}/photos/${p.id}`,
  }));

  const renderPhoto = useCallback(
    ({ item, index }: { item: Photo; index: number }) => (
      <Pressable onPress={() => setViewerIndex(index)}>
        <Image
          source={{
            uri: `${API_BASE_URL}/api/items/${itemId}/photos/${item.id}/thumbnail`,
          }}
          style={styles.photo}
          resizeMode="cover"
        />
      </Pressable>
    ),
    [itemId]
  );

  return (
    <View>
      <FlatList
        data={photos}
        renderItem={renderPhoto}
        keyExtractor={(p) => String(p.id)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={PHOTO_SIZE + 12}
        decelerationRate="fast"
        contentContainerStyle={styles.gallery}
      />

      <Modal visible={viewerIndex !== null} transparent>
        <ImageViewer
          imageUrls={imageUrls}
          index={viewerIndex ?? 0}
          onCancel={() => setViewerIndex(null)}
          enableSwipeDown
          onSwipeDown={() => setViewerIndex(null)}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  gallery: { paddingHorizontal: 12, paddingVertical: 16, gap: 12 },
  photo: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE * 0.75,
    borderRadius: 12,
    backgroundColor: '#e0e0e0',
  },
});
```

---

## 2.3 Item Create/Edit Form — `ItemFormScreen`

**Maps from:** `ItemForm.tsx` (2,437 lines)
**Estimated Effort:** 4–5 days — **the largest component in the conversion**

### 2.3.1 Decomposition Strategy

The web `ItemForm.tsx` has **30+ `useState` hooks** and handles everything in one file.
The mobile version must decompose this into independent sections that share form state
through React Context. Each section is a self-contained component that can be developed,
tested, and loaded independently.

```
ItemFormScreen/
├── ItemFormScreen.tsx              # ScrollView wrapper + submit logic
├── context/
│   └── ItemFormContext.tsx          # Shared form state (React Context + useReducer)
├── sections/
│   ├── BasicInfoSection.tsx        # Name*, description, brand, model, serial, UPC
│   ├── LivingItemSection.tsx       # Birthdate, relationship, contact (conditional)
│   ├── PurchaseInfoSection.tsx     # Price, date, retailer (autocomplete), receipt
│   ├── LocationTagSection.tsx      # Location picker + tag multi-select
│   ├── PhotosSection.tsx           # Camera capture, gallery pick, photo type
│   ├── DocumentsSection.tsx        # File picker, URL input
│   ├── WarrantySection.tsx         # Add/edit/remove warranties
│   └── CustomFieldsSection.tsx     # Dynamic key-value pairs with presets
├── components/
│   ├── AutocompleteInput.tsx       # Bottom-sheet autocomplete
│   ├── LocationPickerSheet.tsx     # Location hierarchy picker (bottom sheet)
│   ├── TagPickerSheet.tsx          # Tag selection bottom sheet
│   ├── PhotoTypeModal.tsx          # Photo type assignment modal
│   └── FormField.tsx               # Reusable labeled input
└── hooks/
    ├── useAutoSaveDraft.ts         # Draft persistence to AsyncStorage
    └── useFormValidation.ts        # Validation rules
```

### 2.3.2 Form Context

Using `useReducer` instead of 30+ individual `useState` calls reduces re-renders
and makes state changes more predictable:

```typescript
// context/ItemFormContext.tsx
import React, { createContext, useContext, useReducer, useCallback } from 'react';
import type { ItemCreate, Warranty, DynamicField } from '../../../types/api';

interface FormState {
  data: ItemCreate;
  warranties: Warranty[];
  photos: PhotoUpload[];
  documents: DocumentUpload[];
  loading: boolean;
  error: string | null;
  isDirty: boolean;
}

type FormAction =
  | { type: 'SET_FIELD'; field: keyof ItemCreate; value: any }
  | { type: 'SET_DATA'; data: Partial<ItemCreate> }
  | { type: 'ADD_WARRANTY'; warranty: Warranty }
  | { type: 'REMOVE_WARRANTY'; index: number }
  | { type: 'UPDATE_WARRANTY'; index: number; warranty: Warranty }
  | { type: 'ADD_PHOTO'; photo: PhotoUpload }
  | { type: 'REMOVE_PHOTO'; index: number }
  | { type: 'ADD_DOCUMENT'; doc: DocumentUpload }
  | { type: 'REMOVE_DOCUMENT'; index: number }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'RESET'; state: FormState };

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_FIELD':
      return {
        ...state,
        isDirty: true,
        data: { ...state.data, [action.field]: action.value },
      };
    case 'SET_DATA':
      return {
        ...state,
        isDirty: true,
        data: { ...state.data, ...action.data },
      };
    case 'ADD_WARRANTY':
      return {
        ...state,
        isDirty: true,
        warranties: [...state.warranties, action.warranty],
      };
    case 'REMOVE_WARRANTY':
      return {
        ...state,
        isDirty: true,
        warranties: state.warranties.filter((_, i) => i !== action.index),
      };
    case 'UPDATE_WARRANTY':
      return {
        ...state,
        isDirty: true,
        warranties: state.warranties.map((w, i) =>
          i === action.index ? action.warranty : w
        ),
      };
    case 'ADD_PHOTO':
      return { ...state, isDirty: true, photos: [...state.photos, action.photo] };
    case 'REMOVE_PHOTO':
      return {
        ...state,
        isDirty: true,
        photos: state.photos.filter((_, i) => i !== action.index),
      };
    case 'ADD_DOCUMENT':
      return { ...state, isDirty: true, documents: [...state.documents, action.doc] };
    case 'REMOVE_DOCUMENT':
      return {
        ...state,
        isDirty: true,
        documents: state.documents.filter((_, i) => i !== action.index),
      };
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'RESET':
      return action.state;
    default:
      return state;
  }
}

const ItemFormContext = createContext<{
  state: FormState;
  dispatch: React.Dispatch<FormAction>;
  setField: (field: keyof ItemCreate, value: any) => void;
} | null>(null);

export function ItemFormProvider({
  initialData,
  children,
}: {
  initialData?: Partial<FormState>;
  children: React.ReactNode;
}) {
  const defaultState: FormState = {
    data: { name: '' },
    warranties: [],
    photos: [],
    documents: [],
    loading: false,
    error: null,
    isDirty: false,
    ...initialData,
  };

  const [state, dispatch] = useReducer(formReducer, defaultState);

  const setField = useCallback(
    (field: keyof ItemCreate, value: any) => {
      dispatch({ type: 'SET_FIELD', field, value });
    },
    [dispatch]
  );

  return (
    <ItemFormContext.Provider value={{ state, dispatch, setField }}>
      {children}
    </ItemFormContext.Provider>
  );
}

export function useItemForm() {
  const ctx = useContext(ItemFormContext);
  if (!ctx) throw new Error('useItemForm must be used within ItemFormProvider');
  return ctx;
}
```

### 2.3.3 Main Form Screen

```typescript
// ItemFormScreen.tsx
import React, { useCallback, useEffect } from 'react';
import {
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Button } from 'react-native-paper';
import { ItemFormProvider, useItemForm } from './context/ItemFormContext';
import { useItemsStore } from '../../stores/itemsStore';
import { useAutoSaveDraft } from './hooks/useAutoSaveDraft';
import { createItem, updateItem, uploadPhoto } from '../../services/api';
import { BasicInfoSection } from './sections/BasicInfoSection';
import { PurchaseInfoSection } from './sections/PurchaseInfoSection';
import { LocationTagSection } from './sections/LocationTagSection';
import { PhotosSection } from './sections/PhotosSection';
import { DocumentsSection } from './sections/DocumentsSection';
import { WarrantySection } from './sections/WarrantySection';
import { CustomFieldsSection } from './sections/CustomFieldsSection';
import { LivingItemSection } from './sections/LivingItemSection';

function ItemFormContent() {
  const navigation = useNavigation();
  const route = useRoute();
  const { mode, itemId } = route.params as {
    mode: 'create' | 'edit';
    itemId?: string;
  };

  const { state, dispatch } = useItemForm();
  const fetchItems = useItemsStore((s) => s.fetchItems);

  // Auto-save drafts every 10 seconds if dirty
  useAutoSaveDraft(state, mode === 'create' ? 'new-item-draft' : `edit-${itemId}`);

  // Warn on unsaved changes when navigating away
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!state.isDirty) return;
      e.preventDefault();
      Alert.alert(
        'Discard changes?',
        'You have unsaved changes. Discard them and leave?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
        ]
      );
    });
    return unsubscribe;
  }, [navigation, state.isDirty]);

  const handleSubmit = useCallback(async () => {
    // Validate required fields
    if (!state.data.name?.trim()) {
      dispatch({ type: 'SET_ERROR', error: 'Item name is required' });
      return;
    }

    dispatch({ type: 'SET_LOADING', loading: true });
    dispatch({ type: 'SET_ERROR', error: null });

    try {
      // Sanitize data — matches web pattern from ItemForm.tsx:413-449
      const sanitized = {
        ...state.data,
        purchase_date: state.data.purchase_date === '' ? null : state.data.purchase_date,
        birthdate: state.data.birthdate === '' ? null : state.data.birthdate,
        location_id: state.data.location_id === '' ? null : state.data.location_id,
        associated_user_id:
          state.data.associated_user_id === '' ? null : state.data.associated_user_id,
        warranties: state.warranties.length > 0 ? state.warranties : undefined,
      };

      let savedItem;
      if (mode === 'create') {
        savedItem = await createItem(sanitized);
      } else {
        savedItem = await updateItem(itemId!, sanitized);
      }

      // Upload photos sequentially (server doesn't support batch)
      for (const photo of state.photos) {
        if (photo.file) {
          await uploadPhoto(
            String(savedItem.id),
            photo.file,
            photo.type,
            photo.isPrimary ?? false,
            photo.isDataTag ?? false
          );
        }
      }

      await fetchItems();
      navigation.goBack();
    } catch (err: any) {
      dispatch({
        type: 'SET_ERROR',
        error: err.message ?? 'Failed to save item',
      });
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false });
    }
  }, [state, mode, itemId, fetchItems, navigation, dispatch]);

  const isLiving = state.data.is_living ?? false;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <BasicInfoSection />
        {isLiving && <LivingItemSection />}
        <PurchaseInfoSection />
        <LocationTagSection />
        <PhotosSection />
        <DocumentsSection />
        <WarrantySection />
        <CustomFieldsSection />

        {state.error && <ErrorBanner message={state.error} />}

        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={state.loading}
          disabled={state.loading}
          style={styles.submitButton}
        >
          {mode === 'create' ? 'Create Item' : 'Save Changes'}
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function ItemFormScreen() {
  return (
    <ItemFormProvider>
      <ItemFormContent />
    </ItemFormProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16, paddingBottom: 48 },
  submitButton: { marginTop: 24 },
});
```

### 2.3.4 Auto-Save Drafts Hook

```typescript
// hooks/useAutoSaveDraft.ts
import { useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DRAFT_PREFIX = 'item-draft:';
const SAVE_INTERVAL = 10_000; // 10 seconds

export function useAutoSaveDraft(state: any, draftKey: string) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!state.isDirty) return;

    timerRef.current = setInterval(async () => {
      try {
        const serialized = JSON.stringify({
          data: state.data,
          warranties: state.warranties,
          savedAt: new Date().toISOString(),
        });
        await AsyncStorage.setItem(`${DRAFT_PREFIX}${draftKey}`, serialized);
      } catch {
        // Fail silently — drafts are best-effort
      }
    }, SAVE_INTERVAL);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.isDirty, state.data, state.warranties, draftKey]);
}

export async function loadDraft(draftKey: string) {
  try {
    const raw = await AsyncStorage.getItem(`${DRAFT_PREFIX}${draftKey}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function clearDraft(draftKey: string) {
  await AsyncStorage.removeItem(`${DRAFT_PREFIX}${draftKey}`);
}
```

### 2.3.5 Autocomplete Input (Retailer/Brand)

The web uses CSS absolute-positioned dropdowns with click-outside handlers. Mobile
uses a bottom sheet:

```typescript
// components/AutocompleteInput.tsx
import React, { useState, useMemo, useCallback, useRef } from 'react';
import { View, TextInput, FlatList, Pressable, Text, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetFlatList } from '@gorhom/bottom-sheet';

interface Props {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  suggestions: string[];  // RETAILERS (102 entries) or BRANDS (100 entries)
  placeholder?: string;
}

export function AutocompleteInput({
  label,
  value,
  onChangeText,
  suggestions,
  placeholder,
}: Props) {
  const [showSheet, setShowSheet] = useState(false);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['40%', '70%'], []);

  const filtered = useMemo(() => {
    if (!value.trim()) return suggestions;
    const query = value.toLowerCase();
    return suggestions.filter((s) => s.toLowerCase().includes(query));
  }, [value, suggestions]);

  const handleSelect = useCallback(
    (item: string) => {
      onChangeText(item);
      bottomSheetRef.current?.close();
      setShowSheet(false);
    },
    [onChangeText]
  );

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setShowSheet(true)}
        placeholder={placeholder}
      />

      {showSheet && (
        <BottomSheet
          ref={bottomSheetRef}
          snapPoints={snapPoints}
          onClose={() => setShowSheet(false)}
          enablePanDownToClose
        >
          <BottomSheetFlatList
            data={filtered}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <Pressable style={styles.suggestion} onPress={() => handleSelect(item)}>
                <Text>{item}</Text>
              </Pressable>
            )}
          />
        </BottomSheet>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '600', color: '#424242', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  suggestion: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
});
```

### 2.3.6 Photo Capture with expo-image-picker

```typescript
// sections/PhotosSection.tsx
import React, { useCallback } from 'react';
import { View, Alert, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useItemForm } from '../context/ItemFormContext';
import { PHOTO_TYPES, ALLOWED_PHOTO_MIME_TYPES } from '../../../lib/constants';

export function PhotosSection() {
  const { state, dispatch } = useItemForm();

  const pickFromCamera = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera access is needed to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      dispatch({
        type: 'ADD_PHOTO',
        photo: {
          uri: asset.uri,
          type: PHOTO_TYPES.DEFAULT,
          isPrimary: state.photos.length === 0, // First photo is primary
          fileName: asset.fileName ?? `photo_${Date.now()}.jpg`,
          mimeType: asset.mimeType ?? 'image/jpeg',
        },
      });
    }
  }, [dispatch, state.photos.length]);

  const pickFromGallery = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Photo library access is needed.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsMultipleSelection: true,
      selectionLimit: 10,
    });

    if (!result.canceled) {
      result.assets.forEach((asset, index) => {
        dispatch({
          type: 'ADD_PHOTO',
          photo: {
            uri: asset.uri,
            type: PHOTO_TYPES.OPTIONAL,
            isPrimary: state.photos.length === 0 && index === 0,
            fileName: asset.fileName ?? `photo_${Date.now()}_${index}.jpg`,
            mimeType: asset.mimeType ?? 'image/jpeg',
          },
        });
      });
    }
  }, [dispatch, state.photos.length]);

  // ... render photo thumbnails grid with remove buttons
  // ... photo type assignment on long-press
}
```

---

## 2.4 Locations Screen — `LocationsScreen`

**Maps from:** `LocationsPage.tsx` (926 lines)
**Estimated Effort:** 2–3 days

### 2.4.1 Screen Architecture

```
LocationsScreen/
├── LocationsScreen.tsx               # SectionList with parent grouping
├── components/
│   ├── LocationCard.tsx              # Location card with stats
│   ├── LocationBreadcrumb.tsx        # Navigation breadcrumb trail
│   └── AddLocationSheet.tsx          # Bottom sheet for new location
└── hooks/
    └── useLocationTree.ts            # Hierarchy computation
```

### 2.4.2 Location Tree Hook

The web uses breadcrumb-based navigation through the location hierarchy. Mobile
replicates this with a `SectionList` grouped by parent:

```typescript
// hooks/useLocationTree.ts
import { useMemo } from 'react';
import type { Location } from '../../../types/api';

interface LocationNode {
  location: Location;
  childCount: number;
  itemCount: number;
  totalValue: number;
}

export function useLocationTree(
  locations: Location[],
  items: any[],
  parentId: string | null
) {
  return useMemo(() => {
    // Locations at current level
    const current = locations.filter(
      (l) => String(l.parent_id ?? '') === String(parentId ?? '')
    );

    // Count items per location
    const itemCounts = new Map<string, number>();
    const valueSums = new Map<string, number>();
    items.forEach((item) => {
      const locId = String(item.location_id ?? '');
      itemCounts.set(locId, (itemCounts.get(locId) ?? 0) + 1);
      valueSums.set(
        locId,
        (valueSums.get(locId) ?? 0) + (item.estimated_value ?? 0)
      );
    });

    // Count children per location
    const childCounts = new Map<string, number>();
    locations.forEach((l) => {
      if (l.parent_id != null) {
        const pid = String(l.parent_id);
        childCounts.set(pid, (childCounts.get(pid) ?? 0) + 1);
      }
    });

    const nodes: LocationNode[] = current.map((location) => ({
      location,
      childCount: childCounts.get(String(location.id)) ?? 0,
      itemCount: itemCounts.get(String(location.id)) ?? 0,
      totalValue: valueSums.get(String(location.id)) ?? 0,
    }));

    // Build breadcrumb path
    const breadcrumb: Location[] = [];
    let currentParent = parentId;
    while (currentParent) {
      const parent = locations.find((l) => String(l.id) === currentParent);
      if (parent) {
        breadcrumb.unshift(parent);
        currentParent = parent.parent_id ? String(parent.parent_id) : null;
      } else {
        break;
      }
    }

    return { nodes, breadcrumb };
  }, [locations, items, parentId]);
}
```

### 2.4.3 Locations Screen

```typescript
// LocationsScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { FAB } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useLocationsStore } from '../../stores/locationsStore';
import { useItemsStore } from '../../stores/itemsStore';
import { useLocationTree } from './hooks/useLocationTree';
import { LocationCard } from './components/LocationCard';
import { LocationBreadcrumb } from './components/LocationBreadcrumb';
import { EmptyState } from '../../components/EmptyState';

export function LocationsScreen() {
  const navigation = useNavigation();
  const { locations, fetchLocations } = useLocationsStore();
  const { items } = useItemsStore();

  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const { nodes, breadcrumb } = useLocationTree(locations, items, currentParentId);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchLocations();
    } finally {
      setRefreshing(false);
    }
  }, [fetchLocations]);

  const handleLocationPress = useCallback(
    (locationId: string, hasChildren: boolean) => {
      if (hasChildren) {
        // Navigate into the hierarchy
        setCurrentParentId(locationId);
      } else {
        // Navigate to detail screen
        navigation.navigate('LocationDetail', { locationId });
      }
    },
    [navigation]
  );

  const handleBreadcrumbPress = useCallback((locationId: string | null) => {
    setCurrentParentId(locationId);
  }, []);

  return (
    <View style={styles.container}>
      {breadcrumb.length > 0 && (
        <LocationBreadcrumb
          path={breadcrumb}
          onPress={handleBreadcrumbPress}
        />
      )}

      <FlatList
        data={nodes}
        keyExtractor={(node) => String(node.location.id)}
        renderItem={({ item: node }) => (
          <LocationCard
            location={node.location}
            itemCount={node.itemCount}
            childCount={node.childCount}
            totalValue={node.totalValue}
            onPress={() =>
              handleLocationPress(
                String(node.location.id),
                node.childCount > 0
              )
            }
            onLongPress={() =>
              navigation.navigate('LocationDetail', {
                locationId: String(node.location.id),
              })
            }
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <EmptyState
            icon="map-marker-outline"
            title="No locations"
            subtitle={
              currentParentId
                ? 'No sub-locations here'
                : 'Tap + to create your first location'
            }
          />
        }
        contentContainerStyle={nodes.length === 0 ? styles.emptyFlex : undefined}
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() =>
          navigation.navigate('LocationDetail', {
            mode: 'create',
            parentId: currentParentId,
          })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  emptyFlex: { flexGrow: 1, justifyContent: 'center' },
  fab: { position: 'absolute', right: 16, bottom: 16 },
});
```

### 2.4.4 Circular Reference Prevention

When selecting a parent location during creation or editing, the web prevents circular
references by filtering out the location itself and all its descendants. The mobile
version must replicate this:

```typescript
// utils/locationHelpers.ts

/** Collect all descendant IDs for a given location (recursive). */
export function getDescendantIds(
  locationId: string,
  locations: Location[]
): Set<string> {
  const descendants = new Set<string>();
  const queue = [locationId];

  while (queue.length > 0) {
    const current = queue.pop()!;
    locations
      .filter((l) => String(l.parent_id) === current)
      .forEach((child) => {
        const childId = String(child.id);
        if (!descendants.has(childId)) {
          descendants.add(childId);
          queue.push(childId);
        }
      });
  }

  return descendants;
}

/** Return locations that are valid parent options (excludes self + descendants). */
export function getValidParentOptions(
  locationId: string | null,
  locations: Location[]
): Location[] {
  if (!locationId) return locations;

  const excluded = getDescendantIds(locationId, locations);
  excluded.add(locationId);

  return locations.filter((l) => !excluded.has(String(l.id)));
}
```

---

## 2.5 Location Detail Screen — `LocationDetailScreen`

**Maps from:** `LocationDetailsModal.tsx` (432 lines) + `InsuranceTab.tsx` (806 lines)
**Estimated Effort:** 2 days

### 2.5.1 Screen Architecture

```
LocationDetailScreen/
├── LocationDetailScreen.tsx          # Tab navigator wrapper
├── tabs/
│   ├── LocationDetailsTab.tsx        # Editable location fields
│   ├── LocationMediaTab.tsx          # Photos + videos
│   └── LocationInsuranceTab.tsx      # Insurance info (from InsuranceTab.tsx)
└── components/
    ├── LocationForm.tsx              # Reusable form fields
    ├── LocationItemsList.tsx         # Items at this location
    └── CategoryPicker.tsx            # Location category selector
```

### 2.5.2 Location Form Fields

The web `LocationCreate` interface defines these fields — all must be editable on mobile:

| Field Group | Fields | Mobile Input Type |
|------------|--------|-------------------|
| **Basic** | `name`*, `friendly_name`, `description` | TextInput |
| **Classification** | `location_category`, `location_type`, `is_primary_location`, `is_container` | Picker / Switch |
| **Hierarchy** | `parent_id` | LocationPickerSheet (bottom sheet with tree) |
| **Address** | `address` (JSON: street, city, state, zip, country) | Multi-field section |
| **Value** | `estimated_property_value`, `estimated_value_with_items` | Numeric TextInput |
| **People** | `owner_info`, `landlord_info`, `tenant_info` (JSON objects) | Expandable sections |
| **Insurance** | `insurance_info` (JSON: provider, policy, coverage, dates) | Dedicated tab |

### 2.5.3 Category-Driven Conditional Rendering

The web shows address and location-type fields only for "Primary" category locations.
The mobile version should mirror this:

```typescript
// Conditional rendering based on location_category
const isPrimary = formData.location_category === 'Primary'
  || formData.is_primary_location;

return (
  <ScrollView>
    <BasicFieldsSection formData={formData} onChange={updateField} />
    <CategoryPicker
      value={formData.location_category}
      categories={locationCategories}
      onChange={(cat) => updateField('location_category', cat)}
    />
    <ParentPicker
      value={formData.parent_id}
      locations={validParents}
      onChange={(id) => updateField('parent_id', id)}
    />

    {isPrimary && (
      <>
        <AddressSection formData={formData} onChange={updateField} />
        <LocationTypePicker
          value={formData.location_type}
          onChange={(type) => updateField('location_type', type)}
        />
      </>
    )}

    <DescriptionField
      value={formData.description}
      onChange={(text) => updateField('description', text)}
    />
  </ScrollView>
);
```

---

## 2.6 Tags Management

**Maps from:** Tag operations in `ItemsTable.tsx` and `api.ts`
**Estimated Effort:** 1 day

### 2.6.1 Tag Types

```typescript
// types/api.ts — from web codebase
interface Tag {
  id: string;
  name: string;
  is_predefined: boolean;
  created_at: string;
  updated_at: string;
}
```

### 2.6.2 Tags Screen

Tags can be a simple screen within a settings or management area, or integrated inline
into the inventory filter and item form flows. Recommended approach:

```typescript
// screens/Tags/TagsScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  FlatList,
  Alert,
  TextInput,
  StyleSheet,
} from 'react-native';
import { useTagsStore } from '../../stores/tagsStore';
import { createTag, deleteTag } from '../../services/api';

export function TagsScreen() {
  const { tags, fetchTags } = useTagsStore();
  const [newTagName, setNewTagName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = useCallback(async () => {
    const name = newTagName.trim();
    if (!name) return;
    if (tags.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
      Alert.alert('Duplicate', 'A tag with this name already exists.');
      return;
    }

    setCreating(true);
    try {
      await createTag(name);
      setNewTagName('');
      await fetchTags();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to create tag');
    } finally {
      setCreating(false);
    }
  }, [newTagName, tags, fetchTags]);

  const handleDelete = useCallback(
    (tag: Tag) => {
      Alert.alert(
        'Delete Tag',
        `Delete "${tag.name}"? This will remove it from all items.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteTag(tag.id);
                await fetchTags();
              } catch (err: any) {
                Alert.alert('Error', err.message ?? 'Failed to delete tag');
              }
            },
          },
        ]
      );
    },
    [fetchTags]
  );

  return (
    <View style={styles.container}>
      {/* Create new tag input */}
      <View style={styles.createRow}>
        <TextInput
          style={styles.input}
          value={newTagName}
          onChangeText={setNewTagName}
          placeholder="New tag name..."
          onSubmitEditing={handleCreate}
          returnKeyType="done"
        />
        <Button
          title="Add"
          onPress={handleCreate}
          disabled={!newTagName.trim() || creating}
        />
      </View>

      <FlatList
        data={tags}
        keyExtractor={(tag) => tag.id}
        renderItem={({ item: tag }) => (
          <TagRow
            tag={tag}
            itemCount={/* compute from items store */}
            onDelete={() => handleDelete(tag)}
          />
        )}
      />
    </View>
  );
}
```

### 2.6.3 Tag Picker (for Forms and Bulk Ops)

Reusable bottom sheet for selecting tags — used by both `ItemFormScreen` and bulk
tag assignment:

```typescript
// components/TagPickerSheet.tsx

interface TagPickerSheetProps {
  visible: boolean;
  selectedTagIds: Set<string>;
  onToggle: (tagId: string) => void;
  onClose: () => void;
  mode?: 'replace' | 'add' | 'remove';  // For bulk operations
  onModeChange?: (mode: 'replace' | 'add' | 'remove') => void;
}

// Renders:
// - Mode selector (replace / add / remove) — only in bulk mode
// - Search input for filtering tags
// - Scrollable list of tags with checkboxes
// - "Create New Tag" button at bottom
// - Confirm / Cancel buttons
```

---

## 2.7 Bulk Operations

**Maps from:** `ItemsTable.tsx` bulk operations (lines 330–352) and `api.ts` (lines 575–619)
**Estimated Effort:** 1.5 days

### 2.7.1 Bulk Operation Flow

```
Long-press item → Enter select mode → Tap items to select
  ↓
Bulk action bar appears at bottom:
  [Select All] [Delete] [Tags] [Move] [Cancel]
  ↓
Tap action → Confirmation modal / picker sheet
  ↓
Execute API call → Refresh items → Exit select mode
```

### 2.7.2 Bulk Action Bar Component

```typescript
// components/BulkActionBar.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { bulkDeleteItems, bulkUpdateTags, bulkUpdateLocation } from '../../services/api';
import { useItemsStore } from '../../stores/itemsStore';

interface Props {
  selectedIds: Set<string>;
  onClearSelection: () => void;
  onShowTagPicker: () => void;
  onShowLocationPicker: () => void;
}

export function BulkActionBar({
  selectedIds,
  onClearSelection,
  onShowTagPicker,
  onShowLocationPicker,
}: Props) {
  const fetchItems = useItemsStore((s) => s.fetchItems);
  const count = selectedIds.size;

  const handleBulkDelete = () => {
    Alert.alert(
      'Delete Items',
      `Permanently delete ${count} item${count !== 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await bulkDeleteItems(Array.from(selectedIds));
              await fetchItems();
              onClearSelection();
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.bar}>
      <Text style={styles.count}>{count} selected</Text>
      <View style={styles.actions}>
        <ActionButton icon="delete" label="Delete" onPress={handleBulkDelete} />
        <ActionButton icon="tag-multiple" label="Tags" onPress={onShowTagPicker} />
        <ActionButton icon="folder-move" label="Move" onPress={onShowLocationPicker} />
        <ActionButton icon="close" label="Cancel" onPress={onClearSelection} />
      </View>
    </View>
  );
}
```

### 2.7.3 API Payload Reference

These match the web implementation exactly:

| Operation | Endpoint | Payload |
|-----------|----------|---------|
| Bulk Delete | `POST /api/items/bulk-delete` | `{ "item_ids": ["id1", "id2"] }` |
| Bulk Tag Update | `POST /api/items/bulk-update-tags` | `{ "item_ids": [...], "tag_ids": [...], "mode": "replace" \| "add" \| "remove" }` |
| Bulk Location Move | `POST /api/items/bulk-update-location` | `{ "item_ids": [...], "location_id": "loc-id" \| null }` |

---

## 2.8 Search & Filter

**Estimated Effort:** 1 day (integrated into InventoryScreen)

### 2.8.1 Search Implementation

The web filters across these fields (from `App.tsx` lines 302–323):
- `name`
- `description`
- `brand`
- `model_number`
- `serial_number`
- `retailer`
- `upc`
- `tags[].name`

The mobile implementation is in `useItemSearch.ts` (§2.1.2 above). Additional
enhancements for mobile:

### 2.8.2 Filter Modal

```typescript
// components/FilterModal.tsx — Bottom sheet with filter options

interface FilterConfig {
  locationId: string | null;      // Single location picker
  tagIds: string[];               // Multi-select tags
  sortBy: SortField;              // name | value | created_at | updated_at
  sortOrder: 'asc' | 'desc';
  valueRange: {
    min: number | null;
    max: number | null;
  };
  dateRange: {                    // Purchase date range
    from: string | null;          // ISO date string
    to: string | null;
  };
}

// Renders as bottom sheet with:
// - Location picker (single select)
// - Tag chips (multi-select)
// - Sort dropdown
// - Value range slider
// - Date range pickers
// - "Apply" and "Clear All" buttons
// - Active filter count badge on trigger button
```

### 2.8.3 Search History

```typescript
// hooks/useSearchHistory.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const SEARCH_HISTORY_KEY = 'search-history';
const MAX_HISTORY = 20;

export async function addToSearchHistory(query: string) {
  const history = await getSearchHistory();
  const filtered = history.filter((h) => h !== query);
  const updated = [query, ...filtered].slice(0, MAX_HISTORY);
  await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
}

export async function getSearchHistory(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function clearSearchHistory() {
  await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
}
```

### 2.8.4 Filter Presets

```typescript
// hooks/useFilterPresets.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const PRESETS_KEY = 'filter-presets';

interface FilterPreset {
  id: string;
  name: string;
  filters: FilterConfig;
  createdAt: string;
}

export async function saveFilterPreset(name: string, filters: FilterConfig) {
  const presets = await getFilterPresets();
  const preset: FilterPreset = {
    id: Date.now().toString(),
    name,
    filters,
    createdAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(
    PRESETS_KEY,
    JSON.stringify([...presets, preset])
  );
  return preset;
}

export async function getFilterPresets(): Promise<FilterPreset[]> {
  const raw = await AsyncStorage.getItem(PRESETS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function deleteFilterPreset(id: string) {
  const presets = await getFilterPresets();
  await AsyncStorage.setItem(
    PRESETS_KEY,
    JSON.stringify(presets.filter((p) => p.id !== id))
  );
}
```

---

## 2.9 Offline Considerations

**Estimated Effort:** 2 days

### 2.9.1 Offline Architecture

```
┌──────────────────────────────────┐
│          Zustand Store           │
│  (single source of truth in UI) │
└─────────┬────────────────────────┘
          │
    ┌─────▼─────┐
    │ SyncEngine │  ← Coordinates online/offline behavior
    └──┬─────┬──┘
       │     │
 ┌─────▼──┐ ┌▼───────────┐
 │ API    │ │ AsyncStorage│
 │ Client │ │ Cache       │
 └────────┘ └─────────────┘
```

### 2.9.2 Network Status Hook

```typescript
// hooks/useNetworkStatus.ts
import { useState, useEffect } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsConnected(state.isConnected ?? true);
    });
    return unsubscribe;
  }, []);

  return { isConnected };
}
```

### 2.9.3 Offline Queue

```typescript
// services/offlineQueue.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'offline-queue';

interface QueuedOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE';
  payload?: any;
  createdAt: string;
  retryCount: number;
}

export async function enqueue(op: Omit<QueuedOperation, 'id' | 'createdAt' | 'retryCount'>) {
  const queue = await getQueue();
  queue.push({
    ...op,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    retryCount: 0,
  });
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function getQueue(): Promise<QueuedOperation[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function removeFromQueue(operationId: string) {
  const queue = await getQueue();
  await AsyncStorage.setItem(
    QUEUE_KEY,
    JSON.stringify(queue.filter((op) => op.id !== operationId))
  );
}

export async function processQueue(apiClient: any) {
  const queue = await getQueue();
  for (const op of queue) {
    try {
      await apiClient.request(op.method, op.endpoint, op.payload);
      await removeFromQueue(op.id);
    } catch (err) {
      // Increment retry count, leave in queue
      op.retryCount += 1;
      if (op.retryCount >= 5) {
        await removeFromQueue(op.id);  // Give up after 5 retries
      }
    }
  }
  // Persist updated retry counts
  const remaining = await getQueue();
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
}
```

### 2.9.4 Cache Strategy

| Data | Cache Location | TTL | Invalidation |
|------|---------------|-----|-------------|
| Items list | AsyncStorage (`items-cache`) | 30 min | On pull-to-refresh, after create/edit/delete |
| Locations list | AsyncStorage (`locations-cache`) | 1 hour | On pull-to-refresh, after location mutation |
| Tags list | AsyncStorage (`tags-cache`) | 1 hour | After tag create/delete |
| Item photos | `expo-file-system` cache dir | 7 days | LRU eviction at 200 MB |
| Search history | AsyncStorage (`search-history`) | Permanent | Manual clear |
| Form drafts | AsyncStorage (`item-draft:*`) | 7 days | Cleared after successful submit |
| Filter presets | AsyncStorage (`filter-presets`) | Permanent | Manual delete |

---

## Component Mapping Reference

| Web Component | Lines | Mobile Screen/Component | Key Differences |
|--------------|-------|------------------------|-----------------|
| `InventoryPage.tsx` | 1,609 | `InventoryScreen` + `SearchFilterBar` + `ItemCard` | `FlatList` with `getItemLayout` vs div grid; pull-to-refresh; FAB vs button |
| `ItemForm.tsx` | 2,437 | `ItemFormScreen` + `ItemFormContext` + 7 section components | `useReducer` context vs 30+ `useState`; `KeyboardAvoidingView`; `expo-image-picker` vs `<input>` |
| `ItemDetails.tsx` | 760 | `ItemDetailScreen` + 8 section components | `ScrollView` sections vs tabbed panel; native photo viewer; `Alert.alert` vs custom modal |
| `LocationsPage.tsx` | 926 | `LocationsScreen` + `LocationDetailScreen` | Breadcrumb navigation with state vs URL; `FlatList` vs table; separate detail screen vs inline modal |
| `LocationDetailsModal.tsx` | 432 | `LocationDetailScreen` (tabs) | Full screen with tab navigator vs modal overlay; native date pickers |
| `InsuranceTab.tsx` | 806 | `LocationInsuranceTab` | Same fields; report generation uses `expo-print` + `expo-sharing` instead of `window.print()` |
| `ItemsTable.tsx` | 428 | `ItemCard` + `useMultiSelect` hook | Card-based layout vs table rows; long-press select vs checkbox column |
| `AddItemModal.tsx` | 264 | `ItemFormScreen` (mode='create') | Same screen — no separate modal needed; AI photo detection same flow |

---

## Dependency Map

```
Phase 1 (must be complete)
    │
    ├── Navigation stack (React Navigation)
    ├── Auth context + secure token storage
    ├── API client with auth headers
    └── Zustand stores (items, locations, tags)
         │
         ▼
Phase 2 (this phase)
    │
    ├── §2.1 InventoryScreen ──────────────────┐
    │     requires: itemsStore, navigation      │
    │                                           │
    ├── §2.2 ItemDetailScreen ◄────────────────┤ navigation.navigate
    │     requires: itemsStore, locationsStore  │
    │                                           │
    ├── §2.3 ItemFormScreen ◄──────────────────┤ navigation.navigate
    │     requires: tagsStore, locationsStore   │
    │     depends: §2.6 (TagPickerSheet)        │
    │     depends: §2.4 (LocationPickerSheet)   │
    │                                           │
    ├── §2.4 LocationsScreen ──────────────────┤
    │     requires: locationsStore, itemsStore  │
    │                                           │
    ├── §2.5 LocationDetailScreen ◄────────────┘
    │     requires: locationsStore
    │     depends: InsuranceTab port
    │
    ├── §2.6 Tags (TagsScreen + TagPickerSheet)
    │     requires: tagsStore
    │     shared by: §2.3, §2.7
    │
    ├── §2.7 Bulk Operations (BulkActionBar)
    │     requires: §2.1 multi-select hook
    │     depends: §2.6 (TagPickerSheet)
    │
    ├── §2.8 Search & Filter
    │     integrated into §2.1
    │
    └── §2.9 Offline Support
          cross-cutting: all screens
```

---

## Acceptance Criteria

- [ ] Items list loads from `GET /api/items/` with pull-to-refresh
- [ ] Search filters items in real-time across name, description, brand, model, serial, retailer, UPC, tags
- [ ] Filter by location, tags, value range, sort order all functional
- [ ] Grid/list view toggle works with `FlatList` `numColumns` switch
- [ ] Item detail screen displays all item fields including living-item conditionals
- [ ] Photo gallery scrolls horizontally with tap-to-fullscreen viewer
- [ ] Create item form validates required fields (name) and submits to `POST /api/items/`
- [ ] Edit item form populates existing data and submits to `PUT /api/items/{id}`
- [ ] Photo capture works via camera and gallery using `expo-image-picker`
- [ ] Auto-save draft persists form data to AsyncStorage every 10 seconds
- [ ] Unsaved changes warning on back navigation from form
- [ ] Locations screen renders hierarchy with breadcrumb navigation
- [ ] Location detail screen edits all fields including address and nested JSON objects
- [ ] Circular reference prevented in parent location picker
- [ ] Tags CRUD: create, list with item counts, delete with confirmation
- [ ] Bulk select via long-press → tap to add/remove items
- [ ] Bulk delete calls `POST /api/items/bulk-delete` with confirmation
- [ ] Bulk tag update calls `POST /api/items/bulk-update-tags` with mode selection
- [ ] Bulk location move calls `POST /api/items/bulk-update-location`
- [ ] Navigation flows: list → detail → edit → back to list work smoothly
- [ ] Offline indicator shown when network disconnected
- [ ] Cached data displayed when offline
- [ ] Queued operations processed when connection restores

---

## Effort Summary

| Section | Scope | Estimate |
|---------|-------|----------|
| §2.1 Items List Screen | `InventoryScreen`, `ItemCard`, search hook, multi-select hook | 3–4 days |
| §2.2 Item Detail Screen | `ItemDetailScreen`, 8 section components, photo viewer | 2–3 days |
| §2.3 Item Form | `ItemFormScreen`, form context, 7 sections, autocomplete, photo capture, drafts | 4–5 days |
| §2.4 Locations Screen | `LocationsScreen`, tree hook, breadcrumb, location cards | 2–3 days |
| §2.5 Location Detail | `LocationDetailScreen`, tabs, insurance port, form fields | 2 days |
| §2.6 Tags Management | `TagsScreen`, `TagPickerSheet`, CRUD operations | 1 day |
| §2.7 Bulk Operations | `BulkActionBar`, picker integrations, API calls | 1.5 days |
| §2.8 Search & Filter | `FilterModal`, search history, filter presets | 1 day |
| §2.9 Offline Support | Network hook, offline queue, cache layer | 2 days |
| **Total** | | **12–16 days** |

---

## Third-Party Dependencies

| Package | Purpose | Used In |
|---------|---------|---------|
| `react-native-paper` | Material Design components (FAB, Button, Chip) | All screens |
| `@gorhom/bottom-sheet` | Bottom sheet modals for pickers, filters | Autocomplete, tag/location pickers, filters |
| `expo-image-picker` | Camera and gallery photo selection | §2.3 PhotosSection |
| `react-native-image-zoom-viewer` | Fullscreen pinch-to-zoom photo viewer | §2.2 PhotoGallerySection |
| `@react-native-async-storage/async-storage` | Persistent local storage for cache, drafts, history | §2.3, §2.8, §2.9 |
| `@react-native-community/netinfo` | Network connectivity monitoring | §2.9 |
| `expo-file-system` | Photo cache management | §2.9 |
| `react-native-reanimated` | Required by bottom-sheet and gesture handler | Implicit dependency |
| `react-native-gesture-handler` | Swipe actions, gesture detection | §2.1 swipe-to-delete |

---

## Testing Strategy

### Unit Tests
- `useItemSearch` — verify filtering logic matches web behavior across all searchable fields
- `useLocationTree` — verify hierarchy computation, breadcrumb path building
- `useMultiSelect` — verify enter/exit select mode, toggle, select all, clear
- `formReducer` — verify all action types produce correct state
- `getDescendantIds` / `getValidParentOptions` — verify circular reference prevention

### Integration Tests
- Item CRUD flow: create → verify in list → edit → verify changes → delete → verify removed
- Location hierarchy: create parent → create child → navigate into → navigate back
- Bulk operations: select multiple → delete → verify removed
- Offline queue: disconnect → create item → reconnect → verify synced

### Snapshot Tests
- `ItemCard` in list mode, grid mode, selected state, selecting state
- `LocationCard` with various item counts and child counts
- `BulkActionBar` with different selection counts
