# Study Set Pages Implementation

## Goal
Implement the "Study Set" pages (List & Detail) with high visual fidelity to the provided mockups, ensuring they integrate correctly with the new "Mobile Stack" navigation.

## Mockup Analysis
1.  **Desktop Split View**:
    *   **Left**: Source Material (PDF/Notes) with AI actions.
    *   **Right**: Tools & Chat (Stats, Quiz controls, AI Chat tab).
2.  **Mobile Tab View (Slab)**:
    *   **Header**: Fixed behind the slab ("Cellular Biology", "BIO-101").
    *   **Slab Content**: Sticky tabs ("Material", "Cards", "Stats").
    *   **Features**: AI Summary card, Source list, Floating Play button.

## Proposed Changes

### 1. Components
*   `src/components/study/mobile-study-header.tsx`: The specific header for this page logic.
*   `src/components/study/study-slab.tsx`: The specific slab content with Tabs (Material, Cards, Stats).
*   `src/components/study/desktop-study-layout.tsx`: The Split View layout for desktop.

### 2. Page Structure
*   `src/app/(app)/study/[id]/page.tsx`: The main entry point.
	*   **Mobile**: Renders `MobileStudyHeader` (portal/fixed) + `StudySlab`.
	*   **Desktop**: Renders `DesktopStudyLayout`.

### 3. Verification
*   **Mobile Stack**: Verify that navigating to `/study/123` slides this specific slab up while keeping the Dashboard in the background.
*   **Visual Check**: Match colors, gradients, and fonts to the `html` mockups.

## Implementation Details

#### Mobile Header
Needs to be rendered *outside* the slab but *inside* the background layer check?
*   Actually, for the "2-Layer System", if we are on `/study/123`:
    *   Dashboard is background (Layer 0).
    *   Study Page is Foreground (Layer 1).
    *   The `StudyPage` component itself needs to respond to the layout?
    *   **Correction**: The `StudyPage` IS content of Layer 1.
    *   **But**: The mockup shows a header *behind* the slab.
    *   **Solution**: The `StudyPage` will render a `fixed` header (z-0 relative to the slab container) and the Slab content (z-10).

#### Database
*   Table `StudySet` (id, title, course, progress).
*   Table `Source` (id, title, type, url).
