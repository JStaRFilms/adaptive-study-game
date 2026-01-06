# Feature: Authentication

## Goal
Implement secure user authentication using NextAuth.js v5 (Auth.js beta), supporting both **Google OAuth** and **Email/Password (Credentials)**. Ensure session persistence via PostgreSQL + Prisma.

## Components
### Server
- `src/auth.ts`: Main Auth.js initialization.
- `src/auth.config.ts`: Edge-compatible configuration (middleware support).
- `app/api/auth/[...nextauth]/route.ts`: API Route Handler.
- `lib/actions/auth.ts`: Server Actions for Credentials login/register.
- `middleware.ts`: Route protection.

### Client
- `app/(auth)/login/page.tsx`: Login UI.
- `app/(auth)/register/page.tsx`: Registration UI.
- `components/auth/login-form.tsx`: Reusable login form.
- `components/auth/register-form.tsx`: Reusable registration form.
- `components/auth/social-button.tsx`: Google Login button.

## Database Changes
(Already implemented in `prisma/schema.prisma`)
- `User`: Stores user info & password hash.
- `Account`: Stores OAuth tokens (Google).
- `Session`: Database sessions (optional, we use JWT by default for credentials usually, but Prisma Adapter supports db sessions).

## Implementation Steps

### 1. Setup & Dependencies
- [ ] Install `bcryptjs` for password hashing.
- [ ] Install `@types/bcryptjs`.
- [ ] Setup `src/auth.config.ts` (Edge safe).
- [ ] Setup `src/auth.ts` (Prisma Adapter).

### 2. Validation Schemas (Zod)
- [ ] Create `lib/schemas/auth.ts`:
  - `LoginSchema`: email, password.
  - `RegisterSchema`: name, email, password.

### 3. Server Actions
- [ ] Implement `login` action (validates, signIn).
- [ ] Implement `register` action (validates, hashes password, creates User).

### 4. UI Implementation
- [ ] Create `(auth)` layout.
- [ ] Build `LoginPage` matching mockups (Glassmorphism).
- [ ] Build `RegisterPage`.
- [ ] Build `SocialButton` component.

### 5. Middleware
- [ ] Create `middleware.ts` to protect `/dashboard` and `/study` routes.

## Testing Plan
- Register a new user with Email/Password.
- Log out.
- Log in with created credentials.
- Log in with Google.
- Verify user entry in Database.
