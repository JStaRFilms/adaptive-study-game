import React, { useState, useEffect, useCallback, useMemo } from 'react';

interface LandingPageProps {
  onLaunch: () => void;
  onLaunchWithContent: (content: string) => void;
}

const Star = React.memo(({ style }: { style: React.CSSProperties }) => <div className="star" style={style} />);

const StarsBackground = React.memo(() => {
    const stars = useMemo(() => {
        return Array.from({ length: 100 }).map(() => ({
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: `${Math.random() * 3 + 1}px`,
            height: `${Math.random() * 3 + 1}px`,
            animationDelay: `${Math.random() * 3}s`,
        }));
    }, []);
    return <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-10">{stars.map((style, i) => <Star key={i} style={style} />)}</div>;
});

const ParticlesBackground = React.memo(() => {
    const [particles, setParticles] = useState<number[]>([]);
    useEffect(() => {
        const interval = setInterval(() => {
            setParticles(prev => [...prev, Date.now()]);
            // Clean up old particles
            setTimeout(() => setParticles(p => p.slice(1)), 8000);
        }, 300);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-20">
            {particles.map(id => (
                <div key={id} className="particle" style={{
                    left: `${Math.random() * 100}%`,
                    width: `${Math.random() * 8 + 3}px`,
                    height: `${Math.random() * 8 + 3}px`,
                    animationDuration: `${Math.random() * 4 + 4}s`
                }}/>
            ))}
        </div>
    );
});


const LoadingScreen = ({ isLoading, progress, onSkip }: { isLoading: boolean, progress: number, onSkip: () => void }) => (
    <div className={`fixed top-0 left-0 w-full h-full bg-gradient-to-br from-[#0a0a0a] to-[#1a1a2e] flex flex-col items-center justify-center z-[100] transition-opacity duration-500 ${isLoading ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="w-20 h-20 border-4 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin mb-8"></div>
        <p className="text-lg font-semibold text-white mb-4">Initializing AI Study Engine...</p>
        <div className="w-72 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
        </div>
        <button onClick={onSkip} className="mt-8 text-white/70 hover:text-white transition-colors text-sm font-semibold tracking-wider uppercase">
            Skip to Main App
        </button>
    </div>
);


const LandingPage: React.FC<LandingPageProps> = ({ onLaunch, onLaunchWithContent }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [isScrolled, setIsScrolled] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);

    const handleLaunch = useCallback(() => {
        setIsLeaving(true);
        setTimeout(onLaunch, 500);
    }, [onLaunch]);
    
    const handleCreateSet = useCallback(() => {
        setIsLeaving(true);
        setTimeout(() => onLaunchWithContent(''), 500);
    }, [onLaunchWithContent]);

    useEffect(() => {
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                setTimeout(() => setIsLoading(false), 500);
            }
            setLoadingProgress(progress);
        }, 150);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (isLoading) return;
        const handleScroll = () => setIsScrolled(window.scrollY > 50);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [isLoading]);

    useEffect(() => {
        const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
        let konamiIndex = 0;
        const keydownHandler = (e: KeyboardEvent) => {
            if (e.key === konamiCode[konamiIndex]) {
                konamiIndex++;
                if (konamiIndex === konamiCode.length) {
                    document.body.style.transition = 'filter 0.5s linear';
                    document.body.style.filter = 'hue-rotate(360deg)';
                    setTimeout(() => {
                        document.body.style.filter = 'hue-rotate(0deg)';
                    }, 1000);
                    konamiIndex = 0;
                }
            } else {
                konamiIndex = 0;
            }
        };
        document.addEventListener('keydown', keydownHandler);
        return () => document.removeEventListener('keydown', keydownHandler);
    }, []);


    return (
        <div className={`font-sans text-white transition-opacity duration-500 ${isLeaving ? 'opacity-0' : 'opacity-100'}`}>
            <LoadingScreen isLoading={isLoading} progress={loadingProgress} onSkip={handleLaunch} />
            <div className="min-h-screen bg-game-landing relative overflow-hidden flex flex-col">
                <StarsBackground />
                <ParticlesBackground />

                <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-black/50 backdrop-blur-md' : 'bg-transparent'}`}>
                    <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16 sm:h-20">
                        <div className="font-extrabold text-lg sm:text-xl">🎯 Adaptive Study</div>
                        <a 
                           href="https://wa.link/9o4a9c"
                           target="_blank" 
                           rel="noopener noreferrer"
                           className="bg-gradient-to-r from-green-500 to-teal-500 text-white font-semibold px-4 py-1.5 sm:px-6 sm:py-2 rounded-full shadow-lg hover:shadow-green-500/50 transition-all transform hover:-translate-y-0.5"
                        >
                            Contact
                        </a>
                    </nav>
                </header>

                <main className="relative z-30 flex-grow flex items-center justify-center text-center px-4 pt-20 sm:pt-24">
                    <div className="absolute top-1/2 left-1/2 w-60 h-60 sm:w-72 sm:h-72 border-2 border-cyan-500/20 rounded-full animate-pulse-ring"></div>
                    <div className="animate-hero-entry">
                        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight text-gradient bg-gradient-to-r from-cyan-400 via-white to-purple-400 animate-gradient-shift max-w-3xl mx-auto">
                            Transform Learning Into Victory
                        </h1>
                        <p className="max-w-2xl mx-auto mt-6 text-base sm:text-lg text-white/80 leading-relaxed">
                            Harness the power of AI to turn your notes into an epic quest of knowledge.
                            Upload any content, face intelligent challenges, and level up your learning game.
                        </p>
                        
                        <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 max-w-md mx-auto">
                           <span className="inline-flex items-center justify-center gap-x-2 bg-white/10 border border-white/20 rounded-full px-4 py-2 text-sm font-semibold backdrop-blur-sm">🤖<span>AI-Powered</span></span>
                           <span className="inline-flex items-center justify-center gap-x-2 bg-white/10 border border-white/20 rounded-full px-4 py-2 text-sm font-semibold backdrop-blur-sm">🎮<span>Gamified</span></span>
                           <span className="inline-flex items-center justify-center gap-x-2 bg-white/10 border border-white/20 rounded-full px-4 py-2 text-sm font-semibold backdrop-blur-sm">📚<span>Multi-Modal</span></span>
                           <span className="inline-flex items-center justify-center gap-x-2 bg-white/10 border border-white/20 rounded-full px-4 py-2 text-sm font-semibold backdrop-blur-sm">⚡<span>Real-time</span></span>
                        </div>
                        
                        <div className="mt-10 sm:mt-12 flex justify-center gap-4 sm:gap-6 flex-col sm:flex-row">
                            <button onClick={handleLaunch} className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold px-8 py-3 sm:px-10 sm:py-4 rounded-full shadow-lg text-base sm:text-lg hover:shadow-cyan-500/50 transition-all transform hover:-translate-y-1">
                                Enter Study Hub
                            </button>
                            <button onClick={handleCreateSet} className="bg-white/10 border-2 border-white/20 text-white font-bold px-8 py-3 sm:px-10 sm:py-4 rounded-full text-base sm:text-lg backdrop-blur-sm hover:bg-white/20 transition-all transform hover:-translate-y-1">
                                Create a New Set
                            </button>
                        </div>
                    </div>
                </main>
                 <footer className="relative z-30 w-full py-8 text-center">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-center gap-4 sm:gap-6 mb-4 text-white/50">
                            <a href="https://github.com/JStaRFilms/adaptive-study-game" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" aria-label="Github"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg></a>
                            <a href="https://wa.link/9o4a9c" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" aria-label="WhatsApp"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 4.315 1.731 6.086l.287.468-1.173 4.249 4.35-1.14zM16.437 14.531c-.197-.1-1.158-.571-1.339-.637s-.312-.1-.444.1c-.132.197-.506.637-.622.769s-.232.15-.444.05c-.212-.1-.9-.335-1.713-1.053-.635-.56-1.06-1.252-1.182-1.468s-.012-.312.088-.413c.091-.091.197-.232.297-.347s.132-.197.198-.33.033-.247-.017-.347c-.05-.1-.444-1.066-.612-1.448s-.324-.312-.444-.312h-.444c-.132 0-.347.05-.522.247s-.637.612-.637 1.492c0 .88.652 1.732.737 1.832s1.182 1.812 2.875 2.533c1.694.72 1.694.468 1.994.438s.9-.132 1.033-.263c.132-.132.132-.247.083-.347s-.197-.1-.43-.2z"/></svg></a>
                             <a href="mailto:johnoke.work@gmail.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors" aria-label="Email"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12.713l-11.985-9.713h23.971l-11.986 9.713zm-5.425-1.822l-6.575-5.329v12.501l6.575-7.172zm10.85 0l6.575 7.172v-12.501l-6.575 5.329zm-1.557 1.261l-3.868 3.135-3.868-3.135-8.11 8.848h23.956l-8.11-8.848z"/></svg></a>
                        </div>
                        <p className="text-sm text-white/50">© 2025 JStaR Films. All Rights Reserved.</p>
                        <p className="text-xs text-white/70 mt-2">Powered by the Google Gemini API.</p>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default LandingPage;