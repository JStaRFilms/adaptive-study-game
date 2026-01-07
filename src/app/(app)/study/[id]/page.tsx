import { DesktopStudyLayout } from '@/components/study/desktop-study-layout';
import { MobileStudyHeader } from '@/components/study/mobile-study-header';
import { MobileStudySlab } from '@/components/study/mobile-study-slab';
import { getStudySet } from '@/app/actions/study-sets';
import { notFound } from 'next/navigation';

export default async function StudyPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const studySet = await getStudySet(id);

    if (!studySet) {
        return notFound();
    }

    return (
        <>
            <div className="hidden md:block h-full">
                <DesktopStudyLayout />
            </div>

            <div className="md:hidden">
                <MobileStudyHeader title={studySet.title} subject={studySet.description || 'General'} />
                <MobileStudySlab studySet={studySet as any} />
            </div>
        </>
    );
}
