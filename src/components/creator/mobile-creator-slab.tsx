'use client';

import { useRouter } from 'next/navigation';
import { ChevronDown, FileText, Type, Sparkles } from 'lucide-react';
import { useState } from 'react';

import { createStudySet } from '@/app/actions/study-sets';
import { Loader2 } from 'lucide-react';

export function MobileCreatorSlab() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        subject: '',
        contentType: '' as 'file' | 'text' | 'topic',
        content: '',
        file: null as File | null
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setFormData({ ...formData, file: e.target.files[0], contentType: 'file' });
            // In a real app, we'd probably show a preview or upload progress here
            alert(`Selected: ${e.target.files[0].name}`);
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);

        const data = new FormData();
        data.append('title', formData.title);
        data.append('subject', formData.subject);
        data.append('contentType', formData.contentType);
        data.append('content', formData.content);
        // Note: File upload needs special handling (blob/buffer) or a separate upload route.
        // For now we assume text/topic based input primarily.

        const result = await createStudySet(null, data);

        if (result?.success) {
            router.push(`/study/${result.studySetId}`);
        } else {
            alert(result?.error || 'Error creating study set');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex flex-col flex-1 mt-16 bg-[#141820]/95 backdrop-blur-3xl border-t border-white/10 rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] relative z-10 animate-in slide-in-from-bottom duration-300">

            {/* Dismiss Handle */}
            <button
                className="w-full flex flex-col items-center pt-3 pb-2 cursor-pointer active:opacity-70 touch-none shrink-0 outline-none"
                onClick={() => router.back()}
            >
                <div className="w-12 h-1 bg-white/20 rounded-full mb-2" />
                <ChevronDown className="w-5 h-5 text-gray-400" />
            </button>

            {/* Header */}
            <div className="px-8 pb-6 text-center border-b border-white/5">
                <h1 className="text-xl font-heading font-bold text-white mb-1">
                    {step === 1 ? 'New Study Set' : 'Add Content'}
                </h1>
                <div className="flex justify-center gap-1.5 mt-4">
                    <div className={`h-1 flex-1 rounded-full ${step >= 1 ? 'bg-brand-primary' : 'bg-white/10'}`} />
                    <div className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-brand-primary' : 'bg-white/10'}`} />
                    <div className={`h-1 flex-1 rounded-full ${step >= 3 ? 'bg-brand-primary' : 'bg-white/10'}`} />
                </div>
            </div>

            {/* Step Content */}
            <div className="flex-1 overflow-y-auto p-6">

                {step === 1 && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Title</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="e.g. Cellular Respiration"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-primary transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Subject</label> {/* Renamed Course/Subject to Subject to match backend */}
                            <input
                                type="text"
                                value={formData.subject}
                                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                placeholder="e.g. BIO-101"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-primary transition-colors"
                            />
                        </div>

                        <button
                            onClick={() => formData.title && setStep(2)}
                            disabled={!formData.title}
                            className="w-full py-3.5 bg-brand-primary rounded-xl text-white font-bold shadow-lg shadow-brand-primary/20 mt-4 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Continue
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-3">
                        <label className="w-full p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-4 hover:bg-white/10 transition cursor-pointer">
                            <input type="file" className="hidden" onChange={handleFileChange} accept=".pdf,.pptx,.docx,.txt" />
                            <div className="w-10 h-10 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                                <h3 className="font-medium text-white">Upload Documents</h3>
                                <p className="text-xs text-gray-500">PDF, PPTX, or DOCX</p>
                            </div>
                        </label>

                        <button
                            onClick={() => { setFormData({ ...formData, contentType: 'text' }); setStep(3); }}
                            className="w-full p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-4 hover:bg-white/10 transition"
                        >
                            <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                                <Type className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                                <h3 className="font-medium text-white">Paste Text</h3>
                                <p className="text-xs text-gray-500">Copy notes directly</p>
                            </div>
                        </button>

                        <button
                            onClick={() => { setFormData({ ...formData, contentType: 'topic' }); setStep(3); }}
                            className="w-full p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-4 hover:bg-white/10 transition"
                        >
                            <div className="w-10 h-10 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                                <h3 className="font-medium text-white">Generate from Topic</h3>
                                <p className="text-xs text-gray-500">AI will find resources</p>
                            </div>
                        </button>

                        <button
                            onClick={() => setStep(1)}
                            className="w-full py-3 text-gray-400 font-medium mt-2"
                        >
                            Back
                        </button>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-4">
                        {formData.contentType === 'text' && (
                            <div className="h-full flex flex-col">
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Paste Content</label>
                                <textarea
                                    className="flex-1 min-h-[200px] w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-primary transition-colors resize-none"
                                    placeholder="Paste your notes here..."
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                />
                            </div>
                        )}

                        {formData.contentType === 'topic' && (
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Enter Topic</label>
                                <input
                                    type="text"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-primary transition-colors"
                                    placeholder="e.g. History of Rome"
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                />
                                <p className="text-xs text-gray-500 mt-2">AI will search the web and compile a study guide.</p>
                            </div>
                        )}

                        <div className="pt-4 flex gap-3">
                            <button
                                onClick={() => setStep(2)}
                                disabled={isSubmitting}
                                className="flex-1 py-3.5 bg-white/5 rounded-xl text-white font-medium"
                            >
                                Back
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting || !formData.content}
                                className="flex-[2] py-3.5 bg-brand-primary rounded-xl text-white font-bold shadow-lg shadow-brand-primary/20 active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" /> Creating...
                                    </>
                                ) : 'Create Set'}
                            </button>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
