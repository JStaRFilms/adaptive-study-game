'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, PieChart, Layers, Plus, Search } from 'lucide-react';

export function MobileNav() {
    const pathname = usePathname();
    const isActive = (path: string) => pathname === path;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 md:hidden">
            <div className="flex items-center gap-1 p-1.5 pr-6 bg-brand-surface/60 backdrop-blur-xl border border-white/10 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                {/* FAB for New Action */}
                <Link
                    href="/study/new"
                    className="w-10 h-10 rounded-full bg-brand-primary text-white flex items-center justify-center shadow-lg shadow-brand-primary/40 active:scale-90 transition-transform"
                >
                    <Plus className="w-6 h-6" />
                </Link>

                <div className="w-px h-6 bg-white/10 mx-2"></div>

                <Link
                    href="/dashboard"
                    className={`p-2 transition-colors ${isActive('/dashboard') ? 'text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    <Home className="w-5 h-5" />
                </Link>

                <Link
                    href="/analytics"
                    className={`p-2 transition-colors ml-2 ${isActive('/analytics') ? 'text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    <PieChart className="w-5 h-5" />
                </Link>

                <Link
                    href="/study-sets"
                    className={`p-2 transition-colors ml-2 ${isActive('/study-sets') ? 'text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    <Layers className="w-5 h-5" />
                </Link>

                {/* Added Search for convenience */}
                <button className="p-2 text-gray-400 hover:text-white transition-colors ml-2">
                    <Search className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
