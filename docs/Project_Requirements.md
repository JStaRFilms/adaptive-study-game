# Adaptive Study Game v2 - Project Requirements Document

> **Project**: Adaptive Study Game
> **Version**: 2.0 (Next.js + Expo Migration)
> **Last Updated**: 2026-01-06

---

## Mission

Transform the existing Vite SPA into a **production-grade, multi-platform learning application** with:
- Web (Next.js App Router)
- Mobile (Expo/React Native) - Future Phase
- Shared core logic in a monorepo structure

---

## Core Architectural Decisions

### Multi-Provider AI Strategy

> [!IMPORTANT]
> **We use the right model for the right job.** Gemini is reserved for Gemini-native capabilities only.

| Provider | Use Cases | Rationale |
|----------|-----------|----------|
| **Gemini** | Google Search grounding, File Search (RAG), URL Context reading | Native capabilities unavailable elsewhere |
| **Groq** | Quiz generation, chat, real-time streaming, feedback analysis | Ultra-low latency (~100ms), FREE tier generous |
| **OpenRouter** | Grading, complex reasoning, fallback when Groq unavailable | Model diversity, fallback options |

### Database Strategy

| Environment | Provider | Notes |
|-------------|----------|-------|
| Development | Local PostgreSQL | Port 54321 |
| Production | Neon PostgreSQL | Serverless, auto-scaling |

### SDK

- **Vercel AI SDK** - Unified interface for all providers with streaming, tool calling, structured outputs

---

## Functional Requirements

| Requirement ID | Description | User Story | Expected Behavior / Outcome | Status |
| :--- | :--- | :--- | :--- | :--- |
| FR-001 | Multi-modal Study Set Creation | As a student, I want to upload PDFs, images, and paste text, so that I can create study materials from any source. | User uploads files → server processes → content stored in database | MUS |
| FR-002 | AI Quiz Generation | As a student, I want AI to generate quizzes from my notes, so that I can test my understanding. | User clicks "Generate Quiz" → OpenRouter streams questions → quiz displayed | MUS |
| FR-003 | Interactive Quiz Gameplay | As a student, I want to answer questions with immediate feedback, so that I learn from mistakes. | User answers → instant feedback shown → score updates → gamification elements trigger | MUS |
| FR-004 | Spaced Repetition System | As a student, I want the app to schedule reviews based on my performance, so that I retain information long-term. | App calculates next review date using SRS algorithm → notifies when due | MUS |
| FR-005 | AI Study Coach Chat | As a student, I want to chat with an AI tutor about my materials, so that I can get explanations and guidance. | User types question → Groq streams response with context from study materials | MUS |
| FR-006 | Personalized Feedback Report | As a student, I want AI to analyze my quiz performance, so that I know my strengths and weaknesses. | Quiz completes → OpenRouter generates analysis → streamed feedback displayed | MUS |
| FR-007 | Visual Reading Canvas | As a student, I want to explore concepts in a mind-map layout, so that I can understand relationships between topics. | User opens canvas → AI generates concept grid → interactive blocks allow exploration | MUS |
| FR-008 | Web Search Grounding | As a student, I want quiz questions grounded in current web sources, so that I get up-to-date information. | Quiz generation uses Gemini Google Search → sources cited in questions | MUS |
| FR-009 | Exam Mode (Timed, Open-Ended) | As a student, I want to simulate exam conditions, so that I can prepare for real tests. | User starts exam → timer runs → handwritten image upload → AI grades responses | MUS |
| FR-010 | Exam Prediction | As a student, I want AI to predict likely exam questions, so that I can focus my study. | User uploads past exams → AI analyzes patterns → predicted questions with study guides | Future |
| FR-011 | User Authentication | As a user, I want to log in with my account, so that my data syncs across devices. | User authenticates → session created → data fetched from cloud | MUS |
| FR-012 | Cloud Data Sync | As a user, I want my study sets and history saved in the cloud, so that I never lose my progress. | All data operations sync to PostgreSQL → available on any logged-in device | MUS |
| FR-013 | Voice Chat with AI Coach | As a student, I want to have a voice conversation with my AI tutor, so that I can study hands-free. | User activates voice → speech recognized → AI responds with voice synthesis | Future |
| FR-014 | Export Quiz Results | As a student, I want to export my results as PDF, so that I can share or print them. | User clicks export → server generates PDF → file downloaded | Future |
| FR-015 | Mobile App (iOS/Android) | As a user, I want a native mobile app, so that I can study on the go with a great experience. | Expo app with shared core → platform-specific UI → App Store distribution | Future |

---

## Non-Functional Requirements

| Requirement | Target | Notes |
|-------------|--------|-------|
| **Page Load (LCP)** | < 2.5s | Next.js SSR + code splitting |
| **AI Response Latency** | < 500ms first token | Groq for chat, streaming everywhere |
| **Mobile Performance** | 60 FPS animations | React Native Reanimated |
| **Offline Capability** | Core features work offline | Service worker + local cache |
| **Accessibility** | WCAG 2.1 AA | Keyboard nav, screen reader support |
| **SEO** | Full indexability | SSG for marketing pages |

---

## AI Provider Configuration

### Vercel AI SDK Integration

```typescript
// Example: Multi-provider setup
import { createGroq } from '@ai-sdk/groq';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

export const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

export const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export const gemini = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GEMINI_API_KEY,
});

// Model assignments by task
export const models = {
  // Groq - Primary provider (fast + free tier)
  chat: groq('llama-3.3-70b-versatile'),
  quizGeneration: groq('llama-3.3-70b-versatile'),
  feedbackAnalysis: groq('llama-3.3-70b-versatile'),
  
  // OpenRouter - Fallback for complex tasks
  examGrading: openrouter('anthropic/claude-3.5-sonnet'),
  
  // Gemini - Native features only
  webSearch: gemini('gemini-2.0-flash', { useSearchGrounding: true }),
  fileSearch: gemini('gemini-2.0-flash'), // with File Search tool
  urlContext: gemini('gemini-2.0-flash'), // with URL Context tool
};
```

---

## Tech Stack Summary

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 15 (App Router) |
| **Language** | TypeScript 5.x |
| **Styling** | Tailwind CSS 4 |
| **Database** | PostgreSQL (Neon prod / Local dev) |
| **ORM** | Prisma |
| **Auth** | NextAuth.js v5 (Auth.js) |
| **AI SDK** | Vercel AI SDK |
| **AI Providers** | Gemini, Groq, OpenRouter |
| **Deployment** | Vercel |
| **Monorepo** | pnpm workspaces + Turborepo |

---

## Usage Quotas & Monetization

> [!IMPORTANT]
> **Cost control is built-in from day one.** Every AI operation is tracked and limited by tier.

### Pricing Tiers

| Feature | Free | Pro ($9.99/mo) | Unlimited ($19.99/mo) |
|---------|------|----------------|----------------------|
| **Study Sets** | 3 | 20 | Unlimited |
| **Quiz Generations/day** | 5 | 50 | Unlimited |
| **AI Chat Messages/day** | 20 | 200 | Unlimited |
| **Web Search Grounding** | ❌ | ✅ | ✅ |
| **Exam Prediction** | ❌ | ✅ | ✅ |
| **Export to PDF** | ❌ | ✅ | ✅ |
| **Priority Support** | ❌ | ❌ | ✅ |

### Quota Enforcement

```typescript
// lib/services/quota.service.ts
export const quotaLimits = {
  free: {
    studySets: 3,
    quizGenerationsPerDay: 5,
    chatMessagesPerDay: 20,
    webSearchEnabled: false,
    examPredictionEnabled: false,
  },
  pro: {
    studySets: 20,
    quizGenerationsPerDay: 50,
    chatMessagesPerDay: 200,
    webSearchEnabled: true,
    examPredictionEnabled: true,
  },
  unlimited: {
    studySets: Infinity,
    quizGenerationsPerDay: Infinity,
    chatMessagesPerDay: Infinity,
    webSearchEnabled: true,
    examPredictionEnabled: true,
  },
};

export async function checkQuota(
  userId: string,
  action: 'quiz_generation' | 'chat_message' | 'create_study_set'
): Promise<{ allowed: boolean; remaining: number; resetAt?: Date }> {
  // Check user's tier and current usage
  // Return quota status
}
```

### Usage Tracking Schema

```prisma
model UsageRecord {
  id        String   @id @default(cuid())
  userId    String
  action    String   // 'quiz_generation', 'chat_message', etc.
  count     Int      @default(1)
  date      DateTime @default(now()) @db.Date
  
  user      User     @relation(fields: [userId], references: [id])
  
  @@unique([userId, action, date])
  @@index([userId, date])
}

model Subscription {
  id        String   @id @default(cuid())
  userId    String   @unique
  tier      String   @default("free") // 'free', 'pro', 'unlimited'
  status    String   @default("active")
  expiresAt DateTime?
  
  user      User     @relation(fields: [userId], references: [id])
}
```

