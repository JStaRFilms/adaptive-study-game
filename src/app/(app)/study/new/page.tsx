import { DesktopCreatorForm } from '@/components/creator/desktop-creator-form';
import { MobileCreatorSlab } from '@/components/creator/mobile-creator-slab';

export default function StudyCreatorPage() {
    return (
        <>
            <div className="hidden md:block h-full">
                <DesktopCreatorForm />
            </div>

            <div className="md:hidden">
                {/* We don't need a header here because the slab covers most of it, 
            or we can render a 'blank' background if needed.
            But since this is a 'Stack' page, the Dashboard is behind it.
            We just render the Slab.
        */}
                <MobileCreatorSlab />
            </div>
        </>
    );
}
