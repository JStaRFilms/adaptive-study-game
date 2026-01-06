import Link from "next/link";
import { ArrowRight, Layers, Sparkles, Wand2, BrainCircuit, Gamepad2, PlayCircle } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-brand-bg text-gray-100 overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-brand-bg/80 backdrop-blur-lg border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <h1 className="text-2xl font-heading font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-brand-secondary">
            J-Star
          </h1>
          <div className="hidden md:flex gap-8 text-sm font-medium text-gray-400">
            <Link href="#features" className="hover:text-white transition">Features</Link>
            <Link href="#pricing" className="hover:text-white transition">Pricing</Link>
            <Link href="#about" className="hover:text-white transition">About</Link>
          </div>
          <div className="flex gap-4">
            <button className="text-sm font-medium hover:text-white transition">Login</button>
            <button className="px-5 py-2 rounded-full bg-white text-black font-bold text-sm hover:scale-105 transition">
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="relative pt-32 pb-40 px-6">
        <div className="absolute inset-0 hero-glow -z-10 top-0"></div>

        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-primary/30 bg-brand-primary/10 text-brand-primary text-xs font-bold uppercase tracking-widest mb-8">
            <Sparkles className="w-3 h-3" /> v2.0 Now Live
          </div>
          <h1 className="text-6xl md:text-8xl font-heading font-bold mb-8 leading-tight tracking-tight text-white/90 text-glow">
            Study at the <br /> speed of <span className="text-brand-primary">thought.</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            Transform ANY document or note into an interactive, gamified study experience in seconds. Powered by <span className="text-white font-semibold">Liquid AI™</span>.
          </p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <button className="px-8 py-4 rounded-2xl bg-brand-primary text-white font-bold text-lg shadow-[0_0_40px_rgba(139,92,246,0.3)] hover:scale-105 transition-transform flex items-center gap-2">
              Start Learning Free <ArrowRight className="w-5 h-5" />
            </button>
            <button className="px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-lg hover:bg-white/10 transition-colors flex items-center gap-2">
              <PlayCircle className="w-5 h-5" /> Watch Demo
            </button>
          </div>
        </div>

        {/* UI Frame Mock */}
        <div className="max-w-5xl mx-auto mt-20 border border-white/10 rounded-2xl p-2 bg-white/5 backdrop-blur-sm shadow-2xl">
          <div className="w-full h-[500px] bg-brand-bg rounded-xl relative overflow-hidden flex items-center justify-center border border-white/5">
            <div className="text-center">
              <div className="w-20 h-20 bg-brand-primary/20 rounded-2xl mx-auto flex items-center justify-center mb-4 text-brand-primary">
                <Layers className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold">Interactive Demo Here</h3>
            </div>
          </div>
        </div>
      </header>

      {/* Features */}
      <section id="features" className="py-32 bg-black/50 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl font-heading font-bold text-center mb-20">
            Everything you need to <span className="text-brand-primary">flow.</span>
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="glass p-8 rounded-3xl hover:-translate-y-2 transition-transform duration-300">
              <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center mb-6">
                <Wand2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Instant Quizzes</h3>
              <p className="text-gray-400 leading-relaxed">
                Paste notes, upload PDFs, or snap a photo. Our AI generates exam-ready questions instantly.
              </p>
            </div>

            <div className="glass p-8 rounded-3xl hover:-translate-y-2 transition-transform duration-300">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center mb-6">
                <BrainCircuit className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Spaced Repetition</h3>
              <p className="text-gray-400 leading-relaxed">
                Never forget a concept. The "Liquid Memory" algorithm schedules reviews exactly when you need them.
              </p>
            </div>

            <div className="glass p-8 rounded-3xl hover:-translate-y-2 transition-transform duration-300">
              <div className="w-12 h-12 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center mb-6">
                <Gamepad2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Gamified Progress</h3>
              <p className="text-gray-400 leading-relaxed">
                Earn XP, keep streaks alive, and level up your mastery. Studying doesn't have to be boring.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
