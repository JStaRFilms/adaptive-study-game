import { DesktopStudyLayout } from '@/components/study/desktop-study-layout';
import { MobileStudyHeader } from '@/components/study/mobile-study-header';
import { MobileStudySlab } from '@/components/study/mobile-study-slab';

export default function StudyPage() {
    return (
        <>
            <div className="hidden md:block h-full">
                <DesktopStudyLayout />
            </div>

            <div className="md:hidden">
                <MobileStudyHeader />
                <MobileStudySlab />
            </div>
        </>
    );
}
