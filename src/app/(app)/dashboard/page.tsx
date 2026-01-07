import { DashboardContent } from '@/components/dashboard/dashboard-content';
import { getStudySets } from '@/app/actions/study-sets';

export default async function DashboardPage() {
    const studySets = await getStudySets();
    return <DashboardContent studySets={studySets} />;
}
