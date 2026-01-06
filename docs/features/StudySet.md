# Feature: Study Set Management (FR-001)

## Goal
Enable users to create, view, update, and delete study sets. This includes handling various input types (Text, PDF, Images) and storing the processed content in the database.

## Components
### Server
- `app/api/study-sets/route.ts`: Create (POST) and List (GET) study sets.
- `app/api/study-sets/[id]/route.ts`: Get (GET), Update (PUT), Delete (DELETE).
- `lib/actions/study-sets.ts`: Server actions for file processing and creation.

### Client
- `app/(app)/dashboard/page.tsx`: The main dashboard showing recent sets (matches mockups).
- `app/(app)/study/new/page.tsx`: Creation wizard.
- `components/study/study-set-list.tsx`: Grid/List view component.
- `components/study/create-set-form.tsx`: Multi-step form for input.
- `components/study/file-uploader.tsx`: Dropzone for files.

## Database Changes
(Already implemented in `prisma/schema.prisma`)
- `StudySet`: Title, Description.
- `StudyMaterial`: Content, Type (text/pdf/image/url).

## Implementation Steps

### 1. Dashboard Scaffold (Visuals)
- [ ] **Layout**: `app/(app)/layout.tsx` (Sidebar + Main Content wrapper).
- [ ] **Components**:
  - `components/layout/sidebar.tsx`: Navigation & User Profile.
  - `components/layout/top-nav.tsx`: Greeting, Search, "New Set" button.
  - `components/dashboard/stats-grid.tsx`: 4-card row (Streak, XP, etc).
  - `components/dashboard/recent-activity.tsx`: Main feed with Feature Card.
  - `components/dashboard/ai-sidebar.tsx`: Right column (AI Coach, Due Reviews).
- [ ] **Page**: `app/(app)/dashboard/page.tsx` assembling the above.

### 2. Validation & Actions
- [ ] Create `lib/schemas/study-set.ts` (Zod schemas).
- [ ] Implement `createStudySet` server action with input validation.

### 3. Creation UI
- [ ] Build `CreateSetForm` (Title, Description).
- [ ] Implement Manual Text Input tab.
- [ ] Implement File Upload tab (UI only initially).

### 4. File Processing (The "Liquid" Part)
- [ ] Implement PDF text extraction (using `pdf-parse` or Gemini).
- [ ] Implement Image analysis (using Gemini 2.5 Flash).
- [ ] Save extracted content to `StudyMaterial` table.

### 5. Integration
- [ ] Connect Form -> Server Action -> DB.
- [ ] Verify Study Set appears on Dashboard.

## Dependencies
- `pdf-parse` (for local PDF text extraction).
- `react-dropzone` (for drag-and-drop).
