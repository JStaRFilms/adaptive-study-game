import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { LoginSchema } from '@/lib/schemas/auth';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';

export const authConfig = {
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
        Credentials({
            async authorize(credentials) {
                const validatedFields = LoginSchema.safeParse(credentials);

                if (validatedFields.success) {
                    const { email, password } = validatedFields.data;

                    const user = await prisma.user.findUnique({
                        where: { email }
                    });

                    if (!user || !user.password) return null;

                    const passwordsMatch = await bcrypt.compare(password, user.password);

                    if (passwordsMatch) return user;
                }

                return null;
            }
        })
    ],
    pages: {
        signIn: '/login', // Redirect here for auth errors
    },
    callbacks: {
        async jwt({ token, user, account }) {
            if (user) {
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (token.id && session.user) {
                session.user.id = token.id as string;
            }
            return session;
        },
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnDashboard = nextUrl.pathname.startsWith('/dashboard') || nextUrl.pathname.startsWith('/study');

            if (isOnDashboard) {
                if (isLoggedIn) return true;
                return false; // Redirect unauthenticated users to login page
            } else if (isLoggedIn) {
                // If logged in and on auth pages, redirect to dashboard
                /*
                if (nextUrl.pathname.startsWith('/login') || nextUrl.pathname.startsWith('/register')) {
                     return Response.redirect(new URL('/dashboard', nextUrl));
                }
                */
                // Let middleware handle redirects manually strictly if needed, usually this auto-redirect is confusing 
                // if not carefully handled. For now, we enforce protection on /dashboard only.
            }
            return true;
        },
    },
} satisfies NextAuthConfig;
