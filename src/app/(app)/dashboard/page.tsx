import { TopNav } from '@/components/layout/top-nav';
import { MobileHeader } from '@/components/layout/mobile-header';
import { StatsGrid } from '@/components/dashboard/stats-grid';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { AISidebar } from '@/components/dashboard/ai-sidebar';
import { AnimatedSlab } from '@/components/dashboard/animated-slab';

export default function DashboardPage() {
    return (
        <>
            {/* --- DESKTOP VIEW --- */}
            <div className="hidden md:block flex-1 p-8 overflow-y-auto">
                <TopNav />
                <div className="grid grid-cols-12 gap-6 max-w-7xl mx-auto mt-6">
                    <StatsGrid />
                    <RecentActivity />
                    <AISidebar />
                </div>
            </div>

            {/* --- MOBILE VIEW --- */}
            <div className="md:hidden min-h-screen bg-brand-bg relative overflow-hidden">
                {/* Layer 1: Fixed Background (Header + Stats) */}
                <div className="fixed inset-0 z-0">
                    <MobileHeader />
                    <div className="pt-48 px-6 pb-40">
                        <StatsGrid />
                    </div>
                </div>

                {/* Layer 2: Animated Slab (Draggable Foreground) */}
                <AnimatedSlab>
                    <RecentActivity />
                    <AISidebar />
                </AnimatedSlab>
            </div>
        </>
    );
}
