export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="h-screen flex items-center justify-center bg-brand-bg relative overflow-hidden">
            <div className="absolute inset-0 hero-glow -z-10 opacity-50"></div>
            <div className="w-full max-w-md p-8 glass rounded-2xl border border-white/10 shadow-2xl">
                {children}
            </div>
        </div>
    );
}
