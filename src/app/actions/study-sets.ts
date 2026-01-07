'use server';

import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createStudySet(prevState: any, formData: FormData) {
    const session = await auth();
    if (!session?.user?.id) {
        return { error: 'Unauthorized' };
    }

    const title = formData.get('title') as string;
    const subject = formData.get('subject') as string;
    const contentType = formData.get('contentType') as string;
    const content = formData.get('content') as string;

    if (!title || !subject) {
        return { error: 'Title and Subject are required' };
    }

    try {
        const studySet = await prisma.studySet.create({
            data: {
                userId: session.user.id,
                title,
                description: subject, // Storing subject in description for now or could add a field
                materials: content ? {
                    create: {
                        type: contentType === 'topic' ? 'text' : contentType, // Normalize 'topic' to 'text' for now, or handle specifically
                        content: content,
                    }
                } : undefined
            },
        });

        revalidatePath('/dashboard');
        return { success: true, studySetId: studySet.id };
    } catch (error) {
        console.error('Failed to create study set:', error);
        return { error: 'Failed to create study set' };
    }
}

export async function getStudySet(id: string) {
    const session = await auth();
    if (!session?.user?.id) return null;

    try {
        const studySet = await prisma.studySet.findUnique({
            where: {
                id,
                userId: session.user.id,
            },
            include: {
                materials: true,
            },
        });
        return studySet;
    } catch (error) {
        console.error('Failed to fetch study set:', error);
        return null;
    }
}

export async function getStudySets() {
    const session = await auth();
    if (!session?.user?.id) return [];

    try {
        const studySets = await prisma.studySet.findMany({
            where: {
                userId: session.user.id,
            },
            include: {
                _count: {
                    select: { materials: true, quizzes: true }
                }
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        return studySets;
    } catch (error) {
        console.error('Failed to fetch study sets:', error);
        return [];
    }
}
