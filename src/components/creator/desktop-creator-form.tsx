'use client';

import { X } from 'lucide-react';
import Link from 'next/link';

export function DesktopCreatorForm() {
    return (
        <div className="flex items-center justify-center min-h-full p-8 relative z-10">
            <div className="w-full max-w-lg bg-[#151923]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl relative">
                <Link
                    href="/dashboard"
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </Link>

                <h2 className="text-2xl font-heading font-bold text-white mb-2">Create New Study Set</h2>
                <p className="text-gray-400 mb-8">Start by giving your set a name and subject.</p>

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                        <input
                            type="text"
                            placeholder="e.g. Cellular Respiration"
                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-primary transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Subject</label>
                        <input
                            type="text"
                            placeholder="e.g. Biology"
                            className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-primary transition-colors"
                        />
                    </div>

                    <button className="w-full py-3 bg-brand-primary rounded-xl text-white font-bold shadow-lg shadow-brand-primary/20 hover:scale-[1.02] transition-transform">
                        Continue to Content
                    </button>
                </div>
            </div>
        </div>
    );
}
