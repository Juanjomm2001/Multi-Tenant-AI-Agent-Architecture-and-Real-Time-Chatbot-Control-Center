import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#030303] selection:bg-primary/30">
      <div className="absolute inset-0 overflow-hidden -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-3xl text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium animate-fade-in">
          <Zap className="w-3 h-3 fill-current" />
          <span>AI Automation Agency Dashboard</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50">
          Monitoriza tu IA en tiempo real
        </h1>

        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Gestiona conversaciones, entrena tus modelos RAG y visualiza el impacto de tus automatizaciones desde un solo lugar.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/dashboard"
            className="px-8 py-4 bg-primary text-white rounded-2xl font-bold hover:scale-105 transition-all shadow-xl shadow-primary/20 flex items-center gap-2"
          >
            Ir al Dashboard <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/auth/login"
            className="px-8 py-4 glass text-white rounded-2xl font-bold hover:bg-white/5 transition-all"
          >
            Iniciar Sesión
          </Link>
        </div>
      </div>
    </main>
  );
}
