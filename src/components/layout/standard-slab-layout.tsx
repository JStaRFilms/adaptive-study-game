'use client';

interface StandardSlabLayoutProps {
    children: React.ReactNode;
    title?: string;
}

export function StandardSlabLayout({ children, title }: StandardSlabLayoutProps) {
    return (
        <div className="flex flex-col h-full bg-brand-bg mt-4 rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] border-t border-white/10 overflow-hidden">
            {/* Handle */}
            <div className="w-full flex justify-center pt-3 pb-1 bg-brand-bg shrink-0">
                <div className="w-12 h-1 bg-white/20 rounded-full opacity-50" />
            </div>

            {title && (
                <div className="px-6 pb-4 shrink-0">
                    <h1 className="text-xl font-heading font-bold text-white">{title}</h1>
                </div>
            )}

            <div className="flex-1 overflow-y-auto">
                {children}
            </div>
        </div>
    );
}
