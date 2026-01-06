'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Library, PieChart, Network, Settings } from 'lucide-react';

export function Sidebar() {
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path;

    return (
        <aside className="hidden md:flex w-64 glass border-r-0 border-r-white/5 flex-col pt-6 m-4 mr-0 rounded-2xl h-[calc(100vh-2rem)]">
            <div className="px-6 mb-8">
                <h1 className="font-heading font-bold text-xl tracking-tight text-white">J-Star OS</h1>
                <p className="text-xs text-gray-500">v2.0 • Pro</p>
            </div>
            <nav className="flex-1 px-3 space-y-1">
                <Link
                    href="/dashboard"
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition group ${isActive('/dashboard')
                        ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/10'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <LayoutDashboard className="w-4 h-4" />
                    <span className="text-sm font-medium">Dashboard</span>
                </Link>
                <Link
                    href="/study-sets"
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition group ${isActive('/study-sets')
                        ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/10'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <Library className={`w-4 h-4 ${!isActive('/study-sets') && 'group-hover:text-brand-secondary transition-colors'}`} />
                    <span className="text-sm font-medium">Study Sets</span>
                </Link>
                <Link
                    href="/analytics"
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition group ${isActive('/analytics')
                        ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/10'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <PieChart className={`w-4 h-4 ${!isActive('/analytics') && 'group-hover:text-brand-accent transition-colors'}`} />
                    <span className="text-sm font-medium">Analytics</span>
                </Link>
                <Link
                    href="/canvas"
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition group ${isActive('/canvas')
                        ? 'bg-brand-primary/10 text-brand-primary border border-brand-primary/10'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <Network className={`w-4 h-4 ${!isActive('/canvas') && 'group-hover:text-pink-500 transition-colors'}`} />
                    <span className="text-sm font-medium">Canvas</span>
                </Link>
            </nav>
            <div className="p-4 border-t border-white/5 mt-auto">
                <div className="flex items-center gap-3 glass p-2 rounded-xl border-white/5 hover:border-white/10 cursor-pointer">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-primary to-brand-secondary"></div>
                    <div className="text-sm">
                        <div className="font-medium text-white">John Doe</div>
                    </div>
                    <Settings className="w-4 h-4 text-gray-500 ml-auto" />
                </div>
            </div>
        </aside>
    );
}
