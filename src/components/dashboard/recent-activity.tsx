import { Microscope, PlayCircle, Network, Atom, ChevronRight } from 'lucide-react';

export function RecentActivity() {
    return (
        <div className="col-span-8 space-y-4">
            <h3 className="text-sm font-medium text-gray-400 mb-2 uppercase tracking-wide">Recent Activity</h3>

            {/* Feature Card */}
            <div className="glass p-6 rounded-2xl group cursor-pointer border-l-4 border-l-brand-primary relative overflow-hidden transition-all hover:-translate-y-1">
                <div className="absolute right-0 top-0 p-32 bg-brand-primary/5 blur-3xl rounded-full translate-x-10 -translate-y-10 pointer-events-none"></div>
                <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-brand-primary/20 text-brand-primary flex items-center justify-center border border-brand-primary/20">
                            <Microscope className="w-4 h-4" />
                        </span>
                        <div>
                            <h4 className="text-xl font-heading font-semibold text-white group-hover:text-brand-secondary transition">
                                Cellular Respiration
                            </h4>
                            <span className="text-xs font-mono text-gray-500">BIO-101 • Last studied 2h ago</span>
                        </div>
                    </div>
                    <div className="text-brand-success text-lg font-bold">85%</div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1 bg-white/5 rounded-full mb-4 overflow-hidden">
                    <div className="h-full bg-brand-success w-[85%] rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                </div>

                <div className="flex gap-3 relative z-10">
                    <button className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm flex items-center gap-2 border border-white/5 text-gray-300 hover:text-white transition">
                        <PlayCircle className="w-4 h-4" /> Resume
                    </button>
                    <button className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-sm flex items-center gap-2 border border-white/5 text-gray-300 hover:text-white transition">
                        <Network className="w-4 h-4" /> Canvas
                    </button>
                </div>
            </div>

            {/* List Items */}
            <div className="glass p-4 rounded-xl flex items-center justify-between hover:translate-x-1 transition-all cursor-pointer group">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center border border-blue-500/20 group-hover:bg-blue-500/20 transition-colors">
                        <Atom className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="font-medium text-white group-hover:text-blue-400 transition-colors">
                            Physics: Quantum Mechanics
                        </div>
                        <div className="text-xs text-gray-500">Updated yesterday</div>
                    </div>
                </div>
                <div className="text-right flex items-center gap-4">
                    <div className="text-sm text-gray-400">140 Cards</div>
                    <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors" />
                </div>
            </div>
        </div>
    );
}
