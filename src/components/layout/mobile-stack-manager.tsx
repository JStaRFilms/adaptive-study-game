'use client';

import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface MobileStackManagerProps {
    children: React.ReactNode;
}

export function MobileStackManager({ children }: MobileStackManagerProps) {
    const pathname = usePathname();
    const isDashboard = pathname === '/dashboard';

    return (
        <div className="flex-1 flex flex-col overflow-hidden relative">

            {/* --- DESKTOP: Standard Behavior --- */}
            <div className="hidden md:flex flex-1 flex-col">
                {children}
            </div>

            {/* --- MOBILE: Stack System --- */}
            <div className="md:hidden flex-1 relative overflow-hidden">

                {/* 
                    The `children` prop will be one of:
                    1. DashboardContent (when on /dashboard)
                    2. A Slab page (when on /study/[id], /study/new, etc.)
                    
                    We always render children. When on a slab route, we ALSO show the 
                    dashboard behind it as a scaled/blurred background by using 
                    a persistent mount. But this causes the data issue...
                    
                    NEW APPROACH: On mobile, just show children directly.
                    The slab pages already take care of their own layout.
                    The stack effect is achieved via page-level animations like slide-in-from-bottom.
                */}

                {/* When on dashboard, show full dashboard */}
                {isDashboard && (
                    <div className="absolute inset-0 z-0 overflow-hidden">
                        {children}
                    </div>
                )}

                {/* When on a slab route, show slab as overlay */}
                <AnimatePresence mode="wait">
                    {!isDashboard && (
                        <motion.div
                            key={pathname}
                            initial={{ y: '100%' }}
                            animate={{ y: '0%' }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="absolute inset-0 z-10 overflow-hidden flex flex-col"
                        >
                            {children}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
