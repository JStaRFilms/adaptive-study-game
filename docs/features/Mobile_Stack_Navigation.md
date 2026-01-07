# Mobile Navigation System: "The Card Stack"

## Concept
Instead of standard web routing (which replaces the whole page), the mobile app behaves like a native iOS app using a "Stack" of cards.

## Technical Implementation (URL-Driven)

### 1. The Strategy: "The 2-Layer System"
We simplify to just two layers to avoid complex history management while keeping the "premium feel".

*   **Layer 0 (Base)**: **Dashboard**. It is *always* active in the background.
*   **Layer 1 (Slab)**: **The Active Task** (Analytics, Study Set, Creator, etc.).

**Behavior**:
*   **Navigating Home (`/dashboard`)**: The Slab slides **DOWN**.
*   **Navigating Elsewhere (`/anything-else`)**: The Slab slides **UP** with the new content.
*   **Swapping**: If you are on `/analytics` and click "Study Sets", the Slab stays up and just swaps content (cross-fade).

This gives 90% of the "iOS Stack" feel with 10% of the complexity. No infinite history management.

## Final Architecture: The "2-Layer" System

After iteration, we established a **2-Layer** navigation model that balances "Native App Feel" with standard Web Routing.

### 1. The Rules
1.  **Home Base (Layer 0)**: The Dashboard is *always* mounted in the background.
    *   It responds to `usePathname()`. If path != `/dashboard`, it scales down (`scale: 0.95`, `blur: 2px`).
    *   **Dashboard Scrolling**: The Dashboard has a split layout. The `MobileHeader` is fixed, and the `StatsGrid` scrolls independently underneath it.
2.  **The Slab (Layer 1)**: Any other page (`/study/*`, `/analytics`) is a **Slab**.
    *   It "slides up" over the Dashboard.
    *   It contains its own header, content, and dismiss logic.
    *   **Dismissal**: Clicking "Back" or "Minimize" calls `router.back()`, ensuring correct history traversal.

### 2. Developer Guide: Adding a New Mobile Page
To add a new feature (e.g., "Profile Page") that fits this system:

1.  **Create the Page**: `src/app/(app)/profile/page.tsx`
2.  **Use the Slab Template**:
    ```tsx
    // src/components/profile/mobile-profile-slab.tsx
    'use client';
    import { useRouter } from 'next/navigation';
    import { ChevronDown } from 'lucide-react';

    export function MobileProfileSlab() {
      const router = useRouter();
      
      return (
        // 1. Container: Fixed z-10, sliding logic handled by Layout/Animation or standard entrance
        <div className="flex flex-col flex-1 mt-32 bg-[#141820]/95 backdrop-blur-3xl rounded-t-[2.5rem] relative z-10">
           
           {/* 2. Dismiss Handle */}
           <button onClick={() => router.back()} className="w-full flex flex-col items-center pt-3 pb-2">
              <div className="w-12 h-1 bg-white/20 rounded-full mb-2" />
              <ChevronDown className="w-5 h-5 text-gray-400" />
           </button>

           {/* 3. Content */}
           <div className="flex-1 overflow-y-auto p-6">
             {/* ... */}
           </div>
        </div>
      );
    }
    ```
3.  **Ensure Desktop/Mobile Split**: Use `hidden md:block` for desktop layout and `md:hidden` for this slab.

### 3. Key Components
*   **`MobileStackManager.tsx`**: The layout wrapper that handles the "Background scaling" effect.
*   **`DashboardContent.tsx`**: The reference implementation of the "Base Layer" with independent scrolling.
