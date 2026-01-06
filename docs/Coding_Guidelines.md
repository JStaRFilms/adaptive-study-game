# Adaptive Study Game v2 - Coding Guidelines

> **Version**: 2.0
> **Last Updated**: 2026-01-06

---

## The Blueprint and Build Protocol (Mandatory)

This protocol governs the entire lifecycle of creating any non-trivial feature.

### Phase 1: The Blueprint (Planning & Documentation)
Before writing code, a plan MUST be created in `docs/features/FeatureName.md`. This plan must detail:
- High-Level Goal
- Component Breakdown (label "Server" or "Client")
- Logic & Data Breakdown (hooks, API routes)
- Database Schema Changes (if any)
- Step-by-Step Implementation Plan

**This plan requires human approval before proceeding.**

### Phase 2: The Build (Iterative Implementation)
Execute the plan one step at a time. Present code AND updated documentation after each step.
Wait for "proceed" signal before continuing.

### Phase 3: Finalization
Announce completion. Present final documentation. Provide integration instructions.

---

## The 200-Line Rule

If a file approaches 200 lines, **STOP**. Proactively propose a refactor:
- Extract `useHook` for complex state logic
- Move UI to `components/`
- Move business logic to `services/`

---

## Next.js App Router Standards

### Server Components (Default)
All components are React Server Components by default. Benefits:
- Zero client JS
- Direct database access
- Secure (API keys never exposed)

```tsx
// app/quiz/[id]/page.tsx (Server Component)
export default async function QuizPage({ params }: { params: { id: string } }) {
  const quiz = await getQuiz(params.id); // Server-side fetch
  return <QuizClient quiz={quiz} />;
}
```

### Client Components (Sparingly)
Only use `'use client'` for:
- Interactivity (`onClick`, `onChange`)
- Hooks (`useState`, `useEffect`)
- Browser APIs

```tsx
// components/QuizClient.tsx
'use client';

import { useState } from 'react';

export function QuizClient({ quiz }: { quiz: Quiz }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  // Interactive logic...
}
```

### Route Handlers (API Routes)
Located in `app/api/`. They are thin controllers - delegate to services.

```tsx
// app/api/quiz/generate/route.ts
import { quizService } from '@/lib/services/quiz.service';

export async function POST(request: Request) {
  const body = await request.json();
  const validated = QuizGenerateSchema.parse(body);
  
  const quiz = await quizService.generate(validated);
  return Response.json(quiz);
}
```

---

## Multi-Provider AI Strategy

### Provider Selection Rules

| Provider | When to Use | When NOT to Use |
|----------|-------------|-----------------|
| **Gemini** | Google Search grounding, File Search, URL reading, Code execution | General chat, quiz generation |
| **Groq** | Real-time chat, low-latency streaming | Complex reasoning, grading |
| **OpenRouter** | Quiz generation, feedback, grading, fallback | When Gemini-native features needed |

### Vercel AI SDK Patterns

```tsx
// lib/ai/providers.ts
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createGroq } from '@ai-sdk/groq';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

export const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

export const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY!,
});

export const gemini = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GEMINI_API_KEY!,
});
```

### Streaming Pattern (Recommended)

```tsx
// app/api/chat/route.ts
import { streamText } from 'ai';
import { groq } from '@/lib/ai/providers';

export async function POST(req: Request) {
  const { messages } = await req.json();
  
  const result = streamText({
    model: groq('llama-3.3-70b-versatile'),
    messages,
    system: 'You are a helpful study tutor...',
  });
  
  return result.toDataStreamResponse();
}
```

### Structured Output Pattern

```tsx
// app/api/quiz/generate/route.ts
import { generateObject } from 'ai';
import { openrouter } from '@/lib/ai/providers';
import { QuizSchema } from '@/lib/schemas/quiz';

export async function POST(req: Request) {
  const { content, config } = await req.json();
  
  const { object: quiz } = await generateObject({
    model: openrouter('google/gemini-2.0-flash-001'),
    schema: QuizSchema,
    prompt: `Generate a quiz from: ${content}`,
  });
  
  return Response.json(quiz);
}
```

### Gemini Native Features (Google Search Grounding)

```tsx
// app/api/quiz/generate-with-search/route.ts
import { generateObject } from 'ai';
import { gemini } from '@/lib/ai/providers';

export async function POST(req: Request) {
  const { topic } = await req.json();
  
  const { object: quiz } = await generateObject({
    model: gemini('gemini-2.0-flash'),
    schema: QuizSchema,
    prompt: `Generate a quiz about ${topic} using current information`,
    // Gemini-native: Google Search grounding
    tools: [{ googleSearch: {} }],
  });
  
  return Response.json(quiz);
}
```

---

## File Structure (Feature-Sliced Design)

```
src/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Auth routes group
│   │   ├── login/
│   │   └── register/
│   ├── (app)/               # Authenticated routes
│   │   ├── study/
│   │   ├── quiz/
│   │   ├── canvas/
│   │   └── stats/
│   └── api/                 # Route handlers
│       ├── ai/
│       ├── quiz/
│       └── study-sets/
├── components/
│   ├── ui/                  # Dumb, reusable UI (shadcn/ui)
│   └── [feature]/           # Feature-specific components
├── lib/
│   ├── ai/                  # AI provider setup
│   ├── db/                  # Prisma client
│   ├── services/            # Business logic
│   └── schemas/             # Zod schemas
├── hooks/                   # Custom React hooks
└── types/                   # TypeScript types
```

---

## Database (Prisma + PostgreSQL)

### Development Setup
```bash
# Local PostgreSQL (your setup)
DATABASE_URL="postgresql://postgres:password@localhost:54321/adaptive_study_game"
```

### Production Setup (Neon)
```bash
DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb"
```

### Schema Changes Workflow
1. Edit `prisma/schema.prisma`
2. Run `npx prisma migrate dev --name description`
3. Prisma generates migration SQL
4. Commit both schema and migration

---

## Validation (Zod)

All inputs MUST be validated with Zod schemas.

```tsx
// lib/schemas/quiz.ts
import { z } from 'zod';

export const QuizGenerateSchema = z.object({
  studySetId: z.string().uuid(),
  questionCount: z.number().min(1).max(50).default(10),
  questionTypes: z.array(z.enum([
    'multiple_choice',
    'true_false',
    'fill_in_blank',
    'matching',
    'sequence',
    'open_ended'
  ])).optional(),
  topics: z.array(z.string()).optional(),
  useWebSearch: z.boolean().default(false),
});

export type QuizGenerateInput = z.infer<typeof QuizGenerateSchema>;
```

---

## Error Handling

```tsx
// lib/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number = 500
  ) {
    super(message);
  }
}

// In route handlers
export async function POST(req: Request) {
  try {
    // ... logic
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    if (error instanceof AppError) {
      return Response.json(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }
    console.error(error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## Testing Strategy

- **Unit Tests**: Vitest for services and utilities
- **Component Tests**: React Testing Library
- **E2E Tests**: Playwright for critical flows
- **AI Tests**: Snapshot tests for prompts, mock responses

---

## Documentation is Code

Every major feature must have a corresponding Markdown file in `docs/features/`.
If you change the code, you **must** update the docs.
