'use client';

import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardContent } from '@/components/dashboard/dashboard-content';

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

                {/* Layer 0: The Base (Dashboard) */}
                {/* Always mounted to preserve state/scroll */}
                <motion.div
                    className="absolute inset-0 z-0 overflow-hidden"
                    animate={{
                        scale: isDashboard ? 1 : 0.95,
                        opacity: isDashboard ? 1 : 0.7,
                        filter: isDashboard ? 'blur(0px)' : 'blur(2px)'
                    }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                >
                    <DashboardContent />
                </motion.div>

                {/* Layer 1: The Slab (Active Task) */}
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
