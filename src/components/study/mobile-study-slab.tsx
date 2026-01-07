'use client';

import { Sparkles, Play, FileText, Link as LinkIcon, Plus, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export function MobileStudySlab({ studySet }: { studySet: any }) {
    const [activeTab, setActiveTab] = useState('Material');
    const router = useRouter();

    return (
        <div className="flex flex-col flex-1 mt-32 bg-[#141820]/95 backdrop-blur-3xl border-t border-white/10 rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] relative z-10">

            {/* Handle & Toggle (Minimize) */}
            <button
                className="w-full flex flex-col items-center pt-3 pb-2 cursor-pointer active:opacity-70 touch-none shrink-0 outline-none"
                onClick={() => router.back()}
            >
                <div className="w-12 h-1 bg-white/20 rounded-full mb-2" />
                <ChevronDown className="w-5 h-5 text-gray-400" />
            </button>

            {/* Sticky Tabs */}
            <div className="flex justify-between px-8 border-b border-white/5 bg-[#141820]/50 backdrop-blur-xl z-20 shrink-0 sticky top-0">
                {['Material', 'Cards (0)', 'Stats'].map((tab) => (
                    <button
                        key={tab}
                        onClick={(e) => { e.stopPropagation(); setActiveTab(tab); }}
                        className={`flex - 1 font - medium text - sm text - center pb - 3 pt - 2 transition - colors ${activeTab === tab ? 'text-white border-b-2 border-brand-primary' : 'text-gray-500'
                            } `}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="p-6 pb-32"> {/* Added padding bottom for FAB */}
                {activeTab === 'Material' && (
                    <>
                        {/* AI Summary Card (Placeholder for now) */}
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-brand-primary/20 to-brand-secondary/5 border border-brand-primary/20 mb-6">
                            <div className="flex items-center gap-2 mb-2 text-brand-primary">
                                <Sparkles className="w-4 h-4 text-brand-accent" />
                                <span className="text-xs font-bold uppercase tracking-wider text-brand-accent">AI Summary</span>
                            </div>
                            <p className="text-sm text-gray-300 leading-relaxed">
                                AI summary generation coming soon...
                            </p>
                            <button className="mt-3 w-full py-2 bg-brand-primary rounded-lg text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-brand-primary/90 transition-colors">
                                <Play className="w-3 h-3 fill-current" /> Quiz Me on This
                            </button>
                        </div>

                        {/* Content List */}
                        <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase">Sources</h3>
                        <div className="space-y-3">
                            {studySet.materials.length === 0 ? (
                                <p className="text-sm text-gray-500 italic">No materials added yet.</p>
                            ) : (
                                studySet.materials.map((material: any) => (
                                    <div key={material.id} className="bg-white/5 p-4 rounded-xl flex items-center gap-4 border border-white/5">
                                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                                            {material.type === 'url' ? <LinkIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <h4 className="text-sm font-medium text-white truncate">{material.content.substring(0, 50)}...</h4>
                                            <p className="text-xs text-gray-500 capitalize">{material.type}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Add Button */}
                        <button className="w-full py-4 mt-6 rounded-xl border border-dashed border-gray-700 text-gray-400 flex items-center justify-center gap-2 hover:bg-white/5 transition-colors">
                            <Plus className="w-4 h-4" /> Add Source
                        </button>
                    </>
                )}
            </div>

            {/* Floating Play Button (Mobile Only) */}
            <div className="fixed bottom-6 right-6 z-50 md:hidden">
                <button className="w-16 h-16 rounded-full bg-brand-primary text-white flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.6)] hover:scale-105 transition-transform active:scale-95">
                    <Play className="w-8 h-8 fill-current ml-1" />
                </button>
            </div>
        </div>
    );
}
