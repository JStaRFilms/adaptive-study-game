# Feature: Study Set Creation (FR-001)

## Goals
Allow students to create new study sets from various sources (Files, Text, Topics) using a step-by-step wizard interface that works seamlessly on Mobile (Slab) and Desktop.

## User Flow
1.  **Entry**: User clicks "+" FAB on Dashboard or Navigation.
2.  **Step 1: Basics**:
    *   Enter "Title" (e.g., "Cellular Respiration").
    *   Enter "Subject/Course" (e.g., "BIO-101").
3.  **Step 2: Source**:
    *   **Upload File**: PDF, PPTX, Images (Drag & Drop).
    *   **Paste Text**: Raw text input.
    *   **Topic Mode**: Enter a topic like "History of Rome" (AI Generates content).
4.  **Step 3: Preview**:
    *   Show file summary / token count.
    *   "Generate" button.

## Architecture

### 1. Routes
*   `/study/new`: The main creation page.

### 2. Components
*   `src/app/(app)/study/new/page.tsx`: The route handler.
*   `src/components/creator/creator-layout.tsx`: Handles valid mobile/desktop split.
*   `src/components/creator/mobile-creator-slab.tsx`: The mobile UI (uses `StandardSlabLayout` or similar).
*   `src/components/creator/desktop-creator-form.tsx`: Centered card layout for desktop.
*   `src/components/creator/steps/`:
    *   `step-basics.tsx`
    *   `step-source.tsx`
    *   `step-preview.tsx`

### 3. State Management
*   Local state (or minor Zustand store) to hold form data across steps.

### 4. Server Actions
*   `createStudySet(data: StudySetInput)`: Handles the final submission.
*   `uploadFile(formData: FormData)`: Handles file uploads to local/cloud storage.

## UI/UX Details
*   **Mobile**: The "Slab" slides up over the dashboard. It has a "Back" chevron to dismiss.
*   **Desktop**: A clean, centered glassmorphic card.

## Implementation Steps
1.  **Scaffold Route**: Create `/study/new/page.tsx`.
2.  **Build Components**: Create the layouts and step components.
3.  **Wire Logic**: Connect state management for steps.
4.  **Backend Integration**: Connect to `createStudySet` action (Stub for now).
