
import React, { useState, useEffect } from 'react';

interface LandingPageProps {
  onLaunch: () => void;
  onLaunchWithContent: (content: string) => void;
}

const placeholders = [
    "The powerhouse of the cell is the mitochondria...",
    "In 1492, Columbus sailed the ocean blue...",
    "Photosynthesis is the process used by plants, algae, and some bacteria...",
    "E = mc² relates energy to mass...",
    "Paste your notes here and watch the magic happen."
];

const LandingPage: React.FC<LandingPageProps> = ({ onLaunch, onLaunchWithContent }) => {
    const [noteContent, setNoteContent] = useState('');
    const [placeholder, setPlaceholder] = useState(placeholders[0]);
    
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                }
            });
        }, { threshold: 0.1 });

        const sections = document.querySelectorAll('.fade-in-section');
        sections.forEach(section => observer.observe(section));

        const placeholderInterval = setInterval(() => {
            setPlaceholder(prev => {
                const currentIndex = placeholders.indexOf(prev);
                const nextIndex = (currentIndex + 1) % placeholders.length;
                return placeholders[nextIndex];
            });
        }, 3000);

        return () => {
            sections.forEach(section => observer.unobserve(section));
            clearInterval(placeholderInterval);
        };
    }, []);

  return (
    <div className="bg-background-dark text-text-primary font-sans">
      {/* Animated Background */}
      <div className="fixed top-0 left-0 w-full h-full bg-gradient-to-br from-background-dark via-gray-900 to-brand-secondary/20 animate-background-pan -z-10"></div>
      
      {/* Header */}
      <header className="fixed top-0 left-0 w-full p-4 bg-background-dark/50 backdrop-blur-sm z-50">
          <div className="container mx-auto flex justify-between items-center">
              <h1 className="text-xl font-bold">🧠 Adaptive Study Game</h1>
              <a href="mailto:johnoke.work@gmail.com" className="px-4 py-2 text-sm bg-brand-primary text-white font-bold rounded-full shadow-lg hover:bg-brand-secondary transition-all transform hover:scale-105">
                  Contact
              </a>
          </div>
      </header>

      <main className="container mx-auto px-4 pt-24 pb-12">
        {/* Hero Section */}
        <section className="text-center py-20">
          <h2 className="text-5xl md:text-7xl font-extrabold text-text-primary animate-fade-in-down" style={{ animationDelay: '0.2s' }}>
            Learn Smarter, <br className="sm:hidden" />Not Harder.
          </h2>
          <p className="mt-6 text-lg md:text-xl text-text-secondary max-w-2xl mx-auto animate-fade-in-down" style={{ animationDelay: '0.4s' }}>
            Transform your notes, documents, and even audio into interactive, gamified quizzes with the power of AI.
          </p>
          <div className="mt-10 animate-fade-in-down" style={{ animationDelay: '0.6s' }}>
            <button
              onClick={onLaunch}
              className="px-10 py-4 bg-brand-primary text-white font-bold text-xl rounded-lg shadow-lg hover:bg-brand-secondary transition-all duration-300 transform hover:scale-105 animate-pulse"
            >
              🔥 Launch App (BETA)
            </button>
            <p className="text-sm mt-4 text-gray-500">Powered by J Start Films</p>
          </div>
        </section>

        {/* Interactive Placeholder Section */}
        <section className="py-12 fade-in-section">
             <div className="relative max-w-4xl mx-auto animate-float">
                <div className="absolute -inset-2 bg-gradient-to-r from-brand-primary to-purple-600 rounded-xl blur opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
                <textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder={placeholder}
                    className="relative w-full h-56 bg-surface-dark/70 backdrop-blur-md rounded-xl border-2 p-8 text-xl text-text-secondary placeholder-gray-500 focus:text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary animate-pulse-glow resize-none transition-all duration-300"
                    aria-label="Paste your notes here"
                />
             </div>
             {noteContent && (
                 <div className="text-center mt-8 animate-fade-in">
                     <button
                        onClick={() => onLaunchWithContent(noteContent)}
                        className="px-10 py-4 bg-gradient-to-r from-brand-primary to-purple-600 text-white font-bold text-xl rounded-lg shadow-lg hover:shadow-purple-500/50 transition-all duration-300 transform hover:scale-105 animate-pulse"
                     >
                        ✨ Experience the Magic ✨
                     </button>
                 </div>
             )}
        </section>

        {/* Features Section */}
        <section className="py-20 fade-in-section">
            <h3 className="text-4xl font-bold text-center mb-12">Why It’s Different</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {featureCards.map((feature, index) => (
                    <div key={feature.title} className="bg-surface-dark/50 backdrop-blur-md p-6 rounded-xl border border-gray-700/50 shadow-lg transition-transform transform hover:-translate-y-2 fade-in-section" style={{ transitionDelay: `${index * 150}ms`}}>
                        <div className="text-4xl mb-4">{feature.icon}</div>
                        <h4 className="text-xl font-bold mb-2">{feature.title}</h4>
                        <p className="text-text-secondary">{feature.description}</p>
                    </div>
                ))}
            </div>
        </section>
        
        {/* How It Works Section */}
        <section className="py-20 fade-in-section">
             <h3 className="text-4xl font-bold text-center mb-12">How It Works</h3>
             <div className="max-w-3xl mx-auto grid grid-cols-1 gap-8">
                {howItWorksSteps.map((step, index) => (
                     <div key={index} className="flex items-center gap-6 fade-in-section" style={{ transitionDelay: `${index * 150}ms`}}>
                        <div className="flex-shrink-0 bg-brand-primary/20 text-brand-primary w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold border-2 border-brand-primary">{index + 1}</div>
                        <div>
                            <h4 className="text-xl font-bold">{step.title}</h4>
                            <p className="text-text-secondary">{step.description}</p>
                        </div>
                     </div>
                ))}
             </div>
        </section>

        {/* Tech Stack Section */}
        <section className="py-20 fade-in-section">
             <h3 className="text-4xl font-bold text-center mb-12">Built With</h3>
             <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4 max-w-2xl mx-auto">
                {techStack.map(tech => (
                    <span key={tech} className="text-lg text-text-secondary font-semibold hover:text-brand-primary transition-colors">{tech}</span>
                ))}
             </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="text-center py-10 bg-surface-dark/20 border-t border-gray-800">
        <div className="container mx-auto">
          <p className="font-bold text-lg">Made by John Oluleke-Oke</p>
          <p className="text-text-secondary mb-4">🎬 Powered by J Start Films</p>
          <div className="flex justify-center items-center flex-wrap gap-x-6 gap-y-2">
            <a href="https://wa.me/248152657887" target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:underline font-medium">WhatsApp</a>
            <a href="https://www.youtube.com/@jstarfilms" target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:underline font-medium">YouTube</a>
            <a href="mailto:johnoke.work@gmail.com" className="text-brand-primary hover:underline font-medium">Email</a>
          </div>
          <p className="text-xs text-gray-500 mt-6">Your feedback on this BETA release means a lot!</p>
        </div>
      </footer>
    </div>
  );
};

const featureCards = [
    { icon: '🧠', title: 'AI Quiz Generation', description: 'Turns your passive study materials into active learning challenges automatically.' },
    { icon: '📁', title: 'Multimodal Input', description: 'Supports PDFs, Docs, spreadsheets, images, and even transcribes audio files.' },
    { icon: '🎲', title: 'Gamified Experience', description: 'Makes studying engaging with points, streaks, and speed bonuses to keep you motivated.' },
];

const howItWorksSteps = [
    { title: 'Create a Study Set', description: 'Add your notes by pasting text or uploading files in various formats.' },
    { title: 'Configure Your Quiz', description: 'Choose your preferred settings, study mode, and number of questions.' },
    { title: 'Take the Quiz', description: 'Play through the generated quiz, score points, and actively learn the material.' },
    { title: 'Review & Improve', description: 'See where you excelled and what you need to work on with detailed explanations.' },
];

const techStack = ['React', 'TypeScript', 'Google Gemini API', 'Tailwind CSS', 'PDF.js', 'SheetJS'];

export default LandingPage;
