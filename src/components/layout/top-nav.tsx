'use client';

import { Sun, Search, Plus } from 'lucide-react';
import Link from 'next/link';

export function TopNav() {
    return (
        <header className="h-16 flex items-center justify-between px-8 pt-4">
            <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Sun className="w-4 h-4" />
                <span>Good afternoon, Traveler.</span>
            </div>
            <div className="flex gap-4">
                <button className="px-4 py-2 rounded-xl glass text-sm hover:text-white text-gray-400 flex items-center gap-2 border border-white/5">
                    <Search className="w-4 h-4" /> Search (Cmd+K)
                </button>
                <Link
                    href="/study/new"
                    className="px-4 py-2 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white text-sm shadow-lg shadow-brand-primary/20 flex items-center gap-2 transition-all font-medium"
                >
                    <Plus className="w-4 h-4" /> New Study Set
                </Link>
            </div>
        </header>
    );
}
