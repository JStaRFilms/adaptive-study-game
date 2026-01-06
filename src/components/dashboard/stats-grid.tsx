import { Flame, Zap, RotateCcw, Clock } from 'lucide-react';

export function StatsGrid() {
    return (
        <div className="col-span-12 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-2">
            <div className="glass p-4 md:p-5 rounded-2xl flex flex-col justify-between h-28 md:h-32 group hover:border-brand-primary/20 transition-colors">
                <div className="flex justify-between items-start">
                    <Flame className="w-5 h-5 text-brand-accent" />
                    <span className="text-xs font-mono text-gray-500 bg-white/5 px-2 py-0.5 rounded">+12%</span>
                </div>
                <div>
                    <div className="text-3xl font-heading font-bold text-white">12</div>
                    <div className="text-xs text-brand-accent font-medium mt-1">Day Streak</div>
                </div>
            </div>
            <div className="glass p-5 rounded-2xl flex flex-col justify-between h-32 group hover:border-brand-secondary/20 transition-colors">
                <div className="flex justify-between items-start">
                    <Zap className="w-5 h-5 text-brand-secondary" />
                </div>
                <div>
                    <div className="text-3xl font-heading font-bold text-white">2.4k</div>
                    <div className="text-xs text-gray-400 font-medium mt-1">XP Gained</div>
                </div>
            </div>
            <div className="glass p-5 rounded-2xl flex flex-col justify-between h-32 group hover:border-green-500/20 transition-colors">
                <div className="flex justify-between items-start">
                    <RotateCcw className="w-5 h-5 text-green-500" />
                </div>
                <div>
                    <div className="text-3xl font-heading font-bold text-white">85</div>
                    <div className="text-xs text-gray-400 font-medium mt-1">Cards Reviewed</div>
                </div>
            </div>
            <div className="glass p-5 rounded-2xl flex flex-col justify-between h-32 group hover:border-purple-500/20 transition-colors">
                <div className="flex justify-between items-start">
                    <Clock className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                    <div className="text-3xl font-heading font-bold text-white">4h 20m</div>
                    <div className="text-xs text-gray-400 font-medium mt-1">Focus Time</div>
                </div>
            </div>
        </div>
    );
}
