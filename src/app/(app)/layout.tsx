import { Sidebar } from '@/components/layout/sidebar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { MobileStackManager } from '@/components/layout/mobile-stack-manager';

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="h-screen flex overflow-hidden bg-brand-bg relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(139,92,246,0.08)_0%,transparent_20%)] pointer-events-none" />
            <Sidebar />
            <MobileStackManager>
                {children}
            </MobileStackManager>
            <MobileNav />
        </div>
    );
}
