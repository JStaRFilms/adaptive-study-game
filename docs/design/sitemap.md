# Visual Sitemap: Adaptive Study Game v2

> **URL**: https://study.jstarstudios.com
> **Design Philosophy**: "Liquid Glass" - Clean, gamified, productive. responsive but distinct experiences for Mobile vs Desktop.

## Core Structure

| Page | Route | Purpose | Desktop View (Productivity) | Mobile View (Focus) |
| :--- | :--- | :--- | :--- | :--- |
| **Landing** | `/` | Marketing & Entry | Immersive hero, grid features, pricing cards | Vertical scroll, sticky CTA, simplified anims |
| **Auth** | `/login` | Authentication | Centered glass panel, background effects | Full screen form |
| **Dashboard** | `/dashboard` | User Hub | **"Command Center"**: 3-col layout. Sidebar + Stats + Active Set | **"Stack"**: Single feed of Study Sets. Pull-to-refresh. |
| **Study Set** | `/study/[id]` | Set Details | Split View: Content (PDF/Text) Left \| Actions Right | Tabbed View: Details \| Content \| Actions |
| **Quiz Mode** | `/quiz/[id]` | Gameplay | **"Arena"**: Centered game board, side chat/stats | **"Card"**: Full screen question card. Bottom controls. |
| **Reading Canvas** | `/canvas/[id]` | Mind Map | Full-screen infinite canvas, floating toolbars | Pan/Zoom interface, bottom sheet tools |
| **Analysis** | `/stats` | Analytics | Detailed Dashboard: Charts, Heatmaps, Trends | Summary Cards, Swipeable charts |

## Feature Flows

### 1. Creation Flow
- **Desktop**: Drag & Drop Zone + Text Editor side-by-side.
- **Mobile**: "Add" FAB -> Bottom Sheet options (Camera, Upload, Paste).

### 2. Study Flow
- **Desktop**: "Focus Mode" can toggle sidebar. Hotkeys enabled.
- **Mobile**: Gestures (Swipe to answer, Tap to flip).
