'use client';

import { motion, useAnimation, PanInfo } from 'framer-motion';
import { useEffect, useState } from 'react';
import { ChevronUp } from 'lucide-react';

interface AnimatedSlabProps {
    children: React.ReactNode;
}

export function AnimatedSlab({ children }: AnimatedSlabProps) {
    const controls = useAnimation();
    const [isOpen, setIsOpen] = useState(false);

    // Initial state: condensed (showing stats behind) - lowered to 82vh
    // Expanded state: full height (covering stats)

    const toggleOpen = () => {
        setIsOpen(!isOpen);
    };

    const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        // Drag up to open
        if (info.offset.y < -50 && !isOpen) {
            setIsOpen(true);
        }
        // Drag down to close
        else if (info.offset.y > 50 && isOpen) {
            setIsOpen(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            controls.start({ y: '12vh' }); // Sticky top position (just below header)
        } else {
            controls.start({ y: '78vh' }); // Lower position (just peeking up)
        }
    }, [isOpen, controls]);

    return (
        <motion.div
            animate={controls}
            initial={{ y: '78vh' }}
            transition={{ duration: 0.4, ease: "easeOut" }} // Smooth, no bounce
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.05} // Less elastic, feels more rigid/controlled
            onDragEnd={handleDragEnd}
            className="fixed inset-x-0 bottom-0 top-0 z-20 
                 bg-[#141820]/95 backdrop-blur-3xl 
                 rounded-t-[2.5rem] border-t border-white/10 
                 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] 
                 flex flex-col md:hidden"
        >
            {/* Drag Handle & Toggle */}
            <div
                className="w-full flex flex-col items-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none"
                onClick={toggleOpen}
            >
                <div className="w-12 h-1 bg-white/20 rounded-full mb-2" />
                <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                </motion.div>
            </div>

            {/* Content Container */}
            <div className="flex-1 overflow-y-auto px-6 pt-2 pb-40">
                {children}
            </div>
        </motion.div>
    );
}
