'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export function MobileStudyHeader({ title, subject }: { title?: string, subject?: string }) {
    return (
        <div className="fixed top-0 inset-x-0 h-40 px-6 pt-12 z-0 bg-gradient-to-b from-brand-primary/10 to-transparent">
            <div className="flex items-center gap-3 mb-4">
                <Link href="/dashboard" className="p-2 -ml-2 rounded-full hover:bg-white/10">
                    <ArrowLeft className="w-6 h-6 text-white" />
                </Link>
                <span className="text-xs font-mono text-brand-secondary border border-brand-secondary/30 px-2 py-0.5 rounded uppercase">
                    {subject || 'Course'}
                </span>
            </div>
            <h1 className="text-2xl font-heading font-bold text-white leading-tight">
                {title || 'Study Set'}
            </h1>
        </div>
    );
}
