# PART-3: COMPONENT ARCHITECTURE & SPECIFICATIONS

**Purpose:** Define all React components, their props, behavior, and integration points.

---

## COMPONENT HIERARCHY

```
<AppShell>
├── <Header>
│   ├── <Logo>
│   ├── <SearchBar>
│   └── <MainNav>
├── <SidebarNav> (desktop only)
│   ├── <NavItem> (x8 - one per category)
│   └── <NavGroup>
├── <MainContent>
│   ├── <HomePage>
│   │   ├── <FeaturedSection>
│   │   ├── <QuickSearchBox>
│   │   └── <CategoryGrid>
│   ├── <IndexPage>
│   │   ├── <AssetList>
│   │   └── <AssetCard> (repeating)
│   ├── <CategoryPage>
│   │   ├── <CategoryHeader>
│   │   ├── <FilterPanel>
│   │   ├── <AssetList>
│   │   └── <AssetCard> (repeating)
│   ├── <SearchPage>
│   │   ├── <SearchHeader>
│   │   ├── <FilterPanel>
│   │   ├── <ResultsList>
│   │   ├── <AssetCard> (repeating)
│   │   ├── <Pagination>
│   │   └── <EmptyState>
│   ├── <DetailPage>
│   │   ├── <BreadcrumbNav>
│   │   ├── <DetailHeader>
│   │   ├── <MetadataPanel>
│   │   ├── <DetailContent>
│   │   ├── <RelatedSection>
│   │   ├── <RelatedLinks>
│   │   └── <DetailFooter>
│   └── <NotFoundPage>
│       └── <ErrorMessage>
├── <Footer>
│   ├── <FooterLinks>
│   ├── <Copyright>
│   └── <VersionInfo>
└── <Toast> (notifications)
```

---

## SHELL COMPONENTS

### AppShell

**Purpose:** Root application container and layout wrapper

**Props:**
```typescript
interface AppShellProps {
  children: React.ReactNode;
  appVersion: string;
  onNavigate?: (path: string) => void;
}
```

**Features:**
- Persistent header and footer
- Responsive layout (mobile/tablet/desktop)
- Global error boundary
- Toast notification provider
- Accessibility landmarks

**File Location:** `src/components/layout/AppShell.tsx`

**Dependencies:** Header, Footer, Toast provider

---

### Header

**Purpose:** Application header with navigation and search

**Props:**
```typescript
interface HeaderProps {
  onSearch?: (query: string) => void;
  currentPage?: string;
}
```

**Structure:**
```
[Logo/Brand] [MainNav - desktop] [SearchBar] [MobileMenuIcon]
```

**Mobile Behavior:**
- Logo + mobile menu icon visible
- Search bar below header
- Nav menu slides in from left

**Accessibility:**
- Semantic `<header>` element
- Logo is clickable home link
- Search input labeled
- Nav menu ARIA landmarks

---

### Footer

**Purpose:** Application footer with links and metadata

**Props:**
```typescript
interface FooterProps {
  appVersion: string;
  lastUpdated?: string;
}
```

**Content:**
- Links: Home, Browse, About, Contact, Privacy
- Copyright notice
- Application version
- Last data update timestamp

---

## NAVIGATION COMPONENTS

### BreadcrumbNav

**Purpose:** Show current location and enable quick navigation up

**Props:**
```typescript
interface BreadcrumbNavProps {
  items: Array<{
    label: string;
    path?: string;
  }>;
  onNavigate: (path: string) => void;
}
```

**Example:**
```
Home > Standards > Security > Authentication
```

**Behavior:**
- Clickable links except current page
- Separator between items
- Last item not clickable

**Accessibility:**
- `<nav aria-label="Breadcrumb">`
- Current page marked with aria-current

---

### MainNav

**Purpose:** Primary navigation menu (8 categories)

**Props:**
```typescript
interface MainNavProps {
  items: Array<{
    id: string;
    label: string;
    icon?: React.ReactNode;
    count?: number;
  }>;
  active?: string;
  onNavigate: (category: string) => void;
}
```

**Items:**
1. Standards
2. Best Practices
3. Playbooks
4. Runbooks
5. Lessons Learned
6. ADRs
7. Glossary
8. Documentation

**Responsive:**
- Desktop: Horizontal menu in header
- Mobile: Vertical menu in sidebar (hamburger toggle)

---

## SEARCH & FILTER COMPONENTS

### SearchBar

**Purpose:** Query input with autocomplete and advanced search

**Props:**
```typescript
interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  suggestions?: string[];
  isLoading?: boolean;
  category?: string;
  onCategoryChange?: (category: string) => void;
}
```

**Features:**
- Real-time suggestions as user types
- Debounce API calls (300ms)
- Search within category (dropdown)
- Clear button
- Search history (optional)

**Behavior:**
- On Enter: submit search
- On Escape: close suggestions
- Arrow keys: navigate suggestions
- Click suggestion: submit that query

**Accessibility:**
- Labeled input
- ARIA listbox for suggestions
- ARIA live region for counts
- Keyboard navigation

---

### FilterPanel

**Purpose:** Faceted filtering interface

**Props:**
```typescript
interface FilterPanelProps {
  filters: {
    categories?: FilterOption[];
    statuses?: FilterOption[];
    dateRange?: { min: Date; max: Date };
    owners?: FilterOption[];
  };
  activeFilters?: {
    categories?: string[];
    status?: string;
    dateRange?: { start: Date; end: Date };
    owner?: string;
  };
  assetCounts?: Record<string, number>;
  onFilterChange: (filters: ActiveFilters) => void;
  onClearAll?: () => void;
}
```

**Filter Types:**
- Categories (checkboxes)
- Status (radio/select)
- Date Range (date picker)
- Owner (select)

**Features:**
- Show asset count per filter
- Multiple selections allowed (except status)
- Clear all button
- Mobile: expandable/collapsible

---

## DISPLAY COMPONENTS

### AssetCard

**Purpose:** Compact display of knowledge asset

**Props:**
```typescript
interface AssetCardProps {
  id: string;
  title: string;
  category: string;
  status: 'draft' | 'approved' | 'deprecated';
  summary: string;
  owner?: string;
  lastUpdated?: Date;
  highlightedTerms?: string[];
  onClick: (id: string) => void;
}
```

**Layout:**
```
┌────────────────────────────┐
│ Title          [Status]    │
│ Category  Owner  •  Date   │
│                            │
│ Summary text truncated...  │
└────────────────────────────┘
```

**Hover State:**
- Subtle shadow
- Cursor pointer
- Slight background change

**Responsive:**
- Full width on mobile
- 2-column grid on tablet
- 3-column grid on desktop

---

### DetailViewer

**Purpose:** Full-page content display

**Props:**
```typescript
interface DetailViewerProps {
  asset: {
    id: string;
    title: string;
    category: string;
    status: string;
    owner?: string;
    content: string;
    createdDate?: Date;
    lastUpdatedDate?: Date;
    lastUpdatedBy?: string;
    version?: string;
    relatedAssets?: RelatedAsset[];
  };
  loading?: boolean;
  error?: Error;
  onNavigate?: (assetId: string) => void;
  highlightedTerms?: string[];
}
```

**Sections:**
1. Header (title, breadcrumb, status)
2. Metadata panel (owner, dates, version)
3. Content area (formatted markdown)
4. Related knowledge section
5. Navigation footer (prev/next)

**Features:**
- Syntax highlighting for code blocks
- Table of contents (if long)
- Smooth scrolling navigation
- Print-friendly styling

---

### MetadataPanel

**Purpose:** Sidebar showing asset metadata

**Props:**
```typescript
interface MetadataPanelProps {
  owner?: string;
  ownerEmail?: string;
  createdDate?: Date;
  lastUpdatedDate?: Date;
  lastUpdatedBy?: string;
  status: 'draft' | 'approved' | 'deprecated';
  category?: string;
  version?: string;
  viewCount?: number;
}
```

**Content:**
- Owner name and email (clickable)
- Created date
- Last updated date and user
- Status badge
- Category tag
- Version number
- View counter (optional)

**Responsive:**
- Desktop: Sidebar
- Mobile: Collapsible section

---

### StatusBadge

**Purpose:** Color-coded status indicator

**Props:**
```typescript
interface StatusBadgeProps {
  status: 'draft' | 'approved' | 'deprecated';
  size?: 'small' | 'medium' | 'large';
  clickable?: boolean;
  onClick?: () => void;
}
```

**Colors:**
- Approved: Green (#10b981)
- Draft: Orange (#f59e0b)
- Deprecated: Red (#ef4444)

**Text:**
- "Approved" / "Draft" / "Deprecated"

---

## STATE & LOADING COMPONENTS

### LoadingState

**Purpose:** Show content is loading

**Props:**
```typescript
interface LoadingStateProps {
  type?: 'skeleton' | 'spinner' | 'pulse';
  message?: string;
}
```

**Variants:**
- Skeleton: Fake content shape (cards/text)
- Spinner: Centered loading spinner
- Pulse: Pulsing placeholder content

---

### EmptyState

**Purpose:** Show when no content available

**Props:**
```typescript
interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

**Scenarios:**
- No search results
- Empty category
- No assets in filter
- Content not found

---

### ErrorState

**Purpose:** Show when error occurs

**Props:**
```typescript
interface ErrorStateProps {
  title?: string;
  message: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

**Examples:**
- "Failed to load content"
- "Search unavailable"
- "Not found"

---

## RELATIONSHIP COMPONENTS

### RelatedLinks

**Purpose:** Display related knowledge items

**Props:**
```typescript
interface RelatedLinksProps {
  items: Array<{
    id: string;
    type: string; // 'standard', 'practice', 'playbook', etc.
    title: string;
    category?: string;
  }>;
  title?: string;
  onNavigate: (id: string) => void;
}
```

**Layout:**
```
Related Standards:
• Standard Title 1
• Standard Title 2

Related Best Practices:
• Practice Title 1
• Practice Title 2
```

**Grouping:** By asset type

---

## SHARED UI COMPONENTS

### Button

**Props:**
```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'tertiary';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}
```

**Variants:**
- Primary: Blue, filled
- Secondary: Gray, outlined
- Tertiary: Transparent, text-only

---

### Link

**Purpose:** Internal navigation link

**Props:**
```typescript
interface LinkProps {
  to: string;
  target?: '_self' | '_blank';
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
}
```

**Styling:**
- Blue color
- Underline on hover
- Visited state (darker blue)
- Focus ring

---

### Tag

**Purpose:** Category/status badge

**Props:**
```typescript
interface TagProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  dismissible?: boolean;
  onDismiss?: () => void;
}
```

---

### Modal

**Purpose:** Dialog overlay

**Props:**
```typescript
interface ModalProps {
  isOpen: boolean;
  title?: string;
  children: React.ReactNode;
  onClose: () => void;
  size?: 'small' | 'medium' | 'large';
  closeButton?: boolean;
}
```

**Behavior:**
- Escape key closes
- Click outside closes (if not prevented)
- Focus trapped inside
- Scroll locked on body

---

### Toast

**Purpose:** Notification message

**Props:**
```typescript
interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number; // milliseconds
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

**Auto-dismiss:** 5 seconds (configurable)

---

## PAGE COMPONENTS

### HomePage

**Purpose:** Landing page with quick access

**Sections:**
1. Welcome message
2. Quick search box
3. Featured assets carousel
4. Category cards (8 cards, one per category)
5. CTA buttons

---

### IndexPage

**Purpose:** Browse all knowledge assets

**Components:**
- Page title "Knowledge Index"
- Category selector (dropdown or tabs)
- AssetCard list (with sorting options)
- Pagination or infinite scroll
- LoadingState during fetch

---

### SearchPage

**Purpose:** Display search results with filters

**Layout:**
```
[SearchBar - centered]
[FilterPanel] [Results]
```

**Mobile:** Filters below search

**Features:**
- Result count and query
- Sort options (relevance, date, title)
- Pagination
- EmptyState if no results

---

### DetailPage

**Purpose:** Full asset view

**Layout:**
```
[BreadcrumbNav]
[Header with title and status]
[MetadataPanel] [Content Area]
[Related Links Section]
[Navigation Footer]
```

---

## INTEGRATION REQUIREMENTS

### API Integration Points

Each component that fetches data should:
1. Accept optional `data` prop (for testing)
2. Use custom hook `useAssetData()` if needed
3. Handle loading/error states
4. Implement error boundaries

### State Management

- Use Context API for global state (search results, filters)
- Use useState for component-local state
- Use useReducer for complex state logic
- Consider Redux for future scaling

### Routing

- Home: `/`
- Browse: `/browse/:category`
- Search: `/search?q=query&filters=...`
- Detail: `/asset/:id`
- 404: `/not-found`

---

## COMPONENT SPECIFICATIONS CHECKLIST

For each component, ensure:

- [ ] Props interface defined
- [ ] TypeScript types documented
- [ ] Behavior documented
- [ ] Accessibility features listed
- [ ] Responsive behavior specified
- [ ] Error handling defined
- [ ] Loading states shown
- [ ] Testing approach noted
- [ ] Dependencies listed
- [ ] Usage examples provided

---

## DEVELOPMENT PRIORITIES

**Phase 1 (Foundation):**
- AppShell, Header, Footer
- SearchBar, Button, Link
- AssetCard, DetailViewer
- LoadingState, EmptyState

**Phase 2 (Navigation):**
- BreadcrumbNav, MainNav
- FilterPanel, StatusBadge
- MetadataPanel, RelatedLinks

**Phase 3 (Pages):**
- HomePage, IndexPage
- SearchPage, DetailPage
- NotFoundPage

**Phase 4 (Enhancement):**
- Advanced search features
- Analytics/view tracking
- Print/export functionality
- Social sharing

---

**Status:** READY FOR IMPLEMENTATION  
**Last Updated:** 2026-01-15
