'use client';

import { Menu } from 'lucide-react';

export function MobileHeader() {
    return (
        <div className="fixed top-0 inset-x-0 h-48 px-6 pt-12 z-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-primary/20 via-brand-bg to-transparent md:hidden">
            <div className="flex justify-between items-start">
                <div>
                    <button className="p-2 -ml-2 rounded-full hover:bg-white/10">
                        <Menu className="w-6 h-6 text-white" />
                    </button>
                    <div className="mt-4">
                        <h1 className="text-3xl font-heading font-bold text-white leading-tight">Good evening,<br />Traveler.</h1>
                    </div>
                </div>
                <div className="w-10 h-10 rounded-full border border-white/10 p-0.5">
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary"></div>
                </div>
            </div>
        </div>
    );
}
