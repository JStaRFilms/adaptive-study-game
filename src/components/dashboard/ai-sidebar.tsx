import { Sparkles, Clock4 } from 'lucide-react';

export function AISidebar() {
    return (
        <div className="col-span-12 md:col-span-4 space-y-6">
            {/* AI Insight */}
            <div className="glass p-6 rounded-2xl bg-gradient-to-b from-brand-primary/10 to-transparent border-t border-brand-primary/20">
                <div className="flex items-center gap-2 mb-3 text-brand-primary">
                    <Sparkles className="w-4 h-4 fill-current" />
                    <span className="font-semibold text-sm">AI Coach</span>
                </div>
                <p className="text-sm text-gray-300 italic mb-4 leading-relaxed">
                    "You seem to be having trouble with{' '}
                    <span className="text-white font-medium">Mitosis phases</span>. I've prepared a quick 5-min review for you."
                </p>
                <button className="w-full py-2.5 rounded-lg bg-brand-primary hover:bg-brand-primary/90 text-white text-sm font-medium shadow-lg shadow-brand-primary/20 transition-all">
                    Start Focused Review
                </button>
            </div>

            {/* Due for Review */}
            <div>
                <h3 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wide flex items-center gap-2">
                    <Clock4 className="w-4 h-4" />
                    Due Today
                </h3>
                <div className="space-y-2">
                    <div className="glass p-3 rounded-lg flex justify-between items-center text-sm hover:bg-white/5 transition cursor-pointer group">
                        <span className="text-gray-300 group-hover:text-white transition-colors">History: WW2</span>
                        <span className="bg-brand-accent/20 text-brand-accent px-2 py-0.5 rounded text-xs font-bold">12</span>
                    </div>
                    <div className="glass p-3 rounded-lg flex justify-between items-center text-sm hover:bg-white/5 transition cursor-pointer group">
                        <span className="text-gray-300 group-hover:text-white transition-colors">Calculus I</span>
                        <span className="bg-brand-secondary/20 text-brand-secondary px-2 py-0.5 rounded text-xs font-bold">5</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
