'use client';

import { FileText, ZoomIn, Maximize, Wand2, Play, Plus, Sparkles, Send, ArrowUp } from 'lucide-react';

export function DesktopStudyLayout() {
    return (
        <main className="flex-1 flex gap-4 p-4 h-full">
            {/* Left: Source Material (PDF/Notes) */}
            <section className="flex-1 glass rounded-2xl flex flex-col overflow-hidden relative group">
                {/* Source Header */}
                <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-black/20">
                    <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-brand-secondary" />
                        <span className="font-medium text-sm">Lecture_04_Mitosis.pdf</span>
                    </div>
                    <div className="flex gap-2">
                        <button className="p-2 hover:bg-white/5 rounded-lg text-gray-400">
                            <ZoomIn className="w-4 h-4" />
                        </button>
                        <button className="p-2 hover:bg-white/5 rounded-lg text-gray-400">
                            <Maximize className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Source Content (Mock) */}
                <div className="flex-1 overflow-y-auto p-8 bg-white/5 font-serif text-gray-300 leading-loose relative">
                    <h1 className="text-2xl text-white font-bold mb-4">Phases of Mitosis</h1>
                    <p className="mb-4">
                        <span className="bg-brand-primary/20 text-white px-1 rounded">Mitosis</span> is the process of cell division...
                    </p>
                    <div className="p-4 border-l-2 border-brand-accent bg-brand-accent/5 my-6">
                        <p className="text-sm italic text-gray-400">Key Concept: Cytokinesis occurs after Telophase.</p>
                    </div>
                    <p>
                        During <span className="bg-brand-secondary/20 text-white px-1 rounded">Prophase</span>, the chromatin condenses into chromosomes...
                    </p>
                    <br /><br />
                    <p className="text-gray-600">... (More content) ...</p>
                </div>

                {/* Floating AI Action */}
                <div className="absolute bottom-6 right-6">
                    <button className="flex items-center gap-2 px-4 py-3 rounded-xl bg-brand-primary text-white shadow-lg shadow-brand-primary/30 hover:scale-105 transition-transform">
                        <Wand2 className="w-4 h-4" />
                        <span>Generate Quiz from Page 4</span>
                    </button>
                </div>
            </section>

            {/* Right: Study Tools & Chat */}
            <section className="w-[450px] flex flex-col gap-4">
                {/* Stats Slab */}
                <div className="h-auto glass rounded-2xl p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h2 className="text-xl font-heading font-bold text-white">Cellular Biology</h2>
                            <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                                <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5">BIO-101</span>
                                <span>• 45 Cards</span>
                            </div>
                        </div>
                        <div className="text-brand-success text-sm font-bold">85%</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <button className="flex-1 py-2.5 rounded-xl bg-brand-primary text-white font-medium shadow-lg shadow-brand-primary/20 flex items-center justify-center gap-2">
                            <Play className="w-4 h-4 fill-current" /> Play Quiz
                        </button>
                        <button className="flex-1 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 flex items-center justify-center gap-2">
                            <Plus className="w-4 h-4" /> Add Card
                        </button>
                    </div>
                </div>

                {/* AI Chat / Notes Tab */}
                <div className="flex-1 glass rounded-2xl flex flex-col overflow-hidden">
                    <div className="flex border-b border-white/5">
                        <button className="flex-1 py-3 text-sm font-medium text-white border-b-2 border-brand-primary bg-white/5">AI Chat</button>
                        <button className="flex-1 py-3 text-sm font-medium text-gray-500 hover:text-gray-300">Flashcards</button>
                        <button className="flex-1 py-3 text-sm font-medium text-gray-500 hover:text-gray-300">Settings</button>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 p-4 overflow-y-auto space-y-4">
                        {/* Bot Msg */}
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-lg bg-brand-primary/20 flex items-center justify-center">
                                <Sparkles className="w-4 h-4 text-brand-primary" />
                            </div>
                            <div className="flex-1 bg-white/5 p-3 rounded-2xl rounded-tl-none border border-white/5">
                                <p className="text-sm text-gray-300">I noticed you highlighted "Prophase". Would you like me to explain the difference between Prophase I and II?</p>
                            </div>
                        </div>
                    </div>

                    {/* Input */}
                    <div className="p-4 border-t border-white/5 bg-black/20">
                        <div className="relative">
                            <input type="text" placeholder="Ask about this document..." className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm focus:outline-none focus:border-brand-primary transition-colors" />
                            <button className="absolute right-2 top-2 p-1.5 rounded-lg bg-brand-primary text-white hover:scale-90 transition-transform">
                                <ArrowUp className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
