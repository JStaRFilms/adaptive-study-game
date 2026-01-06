'use client';

import * as z from 'zod';
import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginSchema } from '@/lib/schemas/auth';
import { login } from '@/lib/actions/auth';
import Link from 'next/link';
import { SocialButton } from './social-button';
import { Loader2 } from 'lucide-react';

export const LoginForm = () => {
    const [error, setError] = useState<string | undefined>('');
    const [success, setSuccess] = useState<string | undefined>('');
    const [isPending, startTransition] = useTransition();

    const form = useForm<z.infer<typeof LoginSchema>>({
        resolver: zodResolver(LoginSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    });

    const onSubmit = (values: z.infer<typeof LoginSchema>) => {
        setError('');
        setSuccess('');

        startTransition(() => {
            login(values).then((data) => {
                if (data?.error) {
                    form.reset();
                    setError(data.error);
                }
                // Success handled by redirect in action
            });
        });
    };

    return (
        <div className="space-y-6">
            <div className="space-y-1 text-center">
                <h1 className="text-2xl font-bold text-white font-heading">Welcome Back</h1>
                <p className="text-gray-400 text-sm">Sign in to continue your progress</p>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Email</label>
                    <input
                        {...form.register('email')}
                        type="email"
                        disabled={isPending}
                        className="w-full p-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition"
                        placeholder="john@example.com"
                    />
                    {form.formState.errors.email && (
                        <p className="text-xs text-red-400">{form.formState.errors.email.message}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Password</label>
                    <input
                        {...form.register('password')}
                        type="password"
                        disabled={isPending}
                        className="w-full p-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition"
                        placeholder="******"
                    />
                    {form.formState.errors.password && (
                        <p className="text-xs text-red-400">{form.formState.errors.password.message}</p>
                    )}
                </div>

                {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={isPending}
                    className="w-full py-2.5 rounded-lg bg-brand-primary text-white font-bold hover:bg-brand-primary/90 transition disabled:opacity-50 flex items-center justify-center"
                >
                    {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Login'}
                </button>
            </form>

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-brand-surface px-2 text-gray-500">Or continue with</span>
                </div>
            </div>

            <SocialButton />

            <div className="text-center text-sm text-gray-400">
                Don't have an account?{' '}
                <Link href="/register" className="text-brand-primary hover:underline">
                    Register
                </Link>
            </div>
        </div>
    );
};
