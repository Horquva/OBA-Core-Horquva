# AI Experience Platform

**Owner:** Gulshan Kumar
**Branch:** platform/ai-experience
**Week:** 3
**Status:** completed

---

## About This Platform
This document outlines the completion of **Week 3** of the Castor Frontend Developer Internship. 
The objective was to stop building isolated pages and start building a **reusable, type-safe, accessible component library** that serves as the foundation for the Castor AI Experience platform.

All work is strictly confined to the assigned platform boundary:
`ecosystem/applications/castor/platforms/ai-experience/`

## Deliverables
### 1. Utility Function (`cn`)
- **Location**: `src/lib/utils.ts`
- **Description**: Created a `cn` utility using `clsx` and `tailwind-merge` to handle dynamic className merging elegantly. This replaces messy template literal concatenations.

### 2. Core UI Components (11 Total)
All components are built with **React**, **TypeScript**, and **Tailwind CSS**, located in `src/components/ui/`. They support variant systems, responsive design, and accessibility out-of-the-box.

| Component | File Name | Key Features |
| :--- | :--- | :--- |
| **Button** | `Button.tsx` | Variants (Primary, Secondary, Outline, Danger, Ghost), Sizes (sm/md/lg), Loading spinner state. |
| **Input** | `Input.tsx` | Standard HTML input with `error` prop for validation states and disabled styling. |
| **Textarea** | `Textarea.tsx` | Multi-line text input supporting `error` state and disabled styling. |
| **Card** | `Card.tsx` | Composite component with `Header`, `Title`, `Description`, `Content`, and `Footer` sub-components. |
| **Badge** | `Badge.tsx` | Status indicators with variants: Default, Success, Warning, Danger, Info. |
| **Modal** | `Modal.tsx` | Overlay dialog with Escape key support, focus trap, and `isOpen`/`onClose` control. |
| **Drawer** | `Drawer.tsx` | Slide-in panel supporting `right`, `left`, and `bottom` positions. |
| **Tabs** | `Tabs.tsx` | Uncontrolled tab system with `List`, `Trigger`, and `Content` components. |
| **Dropdown** | `Dropdown.tsx` | Dropdown menu with click-outside-to-close functionality. |
| **Toast** | `Toast.tsx` | Auto-dismissing alerts with `success`, `error`, `warning`, and `info` variants. Includes a `Toaster` container for managing multiple toasts. |
| **Skeleton** | `Skeleton.tsx` | Animated loading placeholder (pulse effect) for content loading states. |

## Folder Structure
The following folder structure was strictly adhered to:
ecosystem/applications/castor/platforms/ai-experience/
└── src/
├── components/
│ └── ui/
│ ├── Button.tsx
│ ├── Input.tsx
│ ├── Textarea.tsx
│ ├── Card.tsx
│ ├── Badge.tsx
│ ├── Modal.tsx
│ ├── Drawer.tsx
│ ├── Tabs.tsx
│ ├── Dropdown.tsx
│ ├── Toast.tsx
│ └── Skeleton.tsx
└── lib/
└── utils.ts


## Notes
1. **Folder Restructuring**: Initially, the `components` folder was accidentally created inside `lib` (`src/lib/components`). This was corrected using terminal commands (`Move-Item`) to place `components` directly under `src`. The folder structure is now fully compliant with the mandated repository standards.

2. **Import Paths**: All components use relative imports `../../lib/utils` to import the `cn` function, ensuring zero dependency on absolute path aliases (which simplifies environment configuration in the monorepo).

3. **No Architectural Overreach**: This deliverable strictly follows the constitutional boundary. No AI logic, backend APIs, or platform ownership logic was implemented—this is purely frontend UI infrastructure.

4. **Tech Stack**: React 18+ (Next.js compatible), TypeScript, Tailwind CSS, clsx, tailwind-merge.
