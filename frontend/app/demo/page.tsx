"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import { Send, User, Loader2, Building, Mail, ArrowRight, Globe, Instagram, MessageCircle, Sparkles, Wifi, ShoppingBasket, Truck, Leaf, MoreHorizontal, X, Sun, Moon } from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Message {
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
    isTyping?: boolean;
    displayedContent?: string;
}

// Helper to render bold markdown formatting (**text**) dynamically in React
function renderFormattedText(text: string) {
    if (!text) return "";
    const parts = text.split(/\*\*([^*]+)\*\*/g);
    return parts.map((part, index) => {
        if (index % 2 === 1) {
            return <strong key={index} className="font-bold">{part}</strong>;
        }
        return part;
    });
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function ChatDemoPage() {
    const { resolvedTheme, setTheme } = useTheme();
    const isDark = resolvedTheme === "dark";

    const [messages, setMessages] = useState<Message[]>([
        {
            role: "assistant",
            content: "¡Hola! Soy el asistente virtual de Cosechados. Estoy aquí para ayudarte a descubrir nuestros productos del campo, gestionar tus pedidos o resolver cualquier duda. ¿En qué te puedo ayudar hoy?",
            timestamp: new Date(),
            displayedContent: "¡Hola! Soy el asistente virtual de Cosechados. Estoy aquí para ayudarte a descubrir nuestros productos del campo, gestionar tus pedidos o resolver cualquier duda. ¿En qué te puedo ayudar hoy?"
        }
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [sessionId] = useState(`demo-${Math.random().toString(36).substring(7)}`);
    const defaultTenantId = process.env.NEXT_PUBLIC_DEMO_TENANT_ID || "00000000-0000-0000-0000-000000000000";

    const [isRegistered, setIsRegistered] = useState(false);
    const [companyName, setCompanyName] = useState("");
    const [email, setEmail] = useState("");
    const [customerId, setCustomerId] = useState<string | null>(null);
    const [registering, setRegistering] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [msgCount, setMsgCount] = useState(0);

    const suggestedPrompts = [
        { icon: "👋", text: "¿Quiénes sois y qué es Cosechados?" },
        { icon: "🛒", text: "¿Qué productos tenéis en el catálogo?" },
        { icon: "🍊", text: "Quiero hacer un pedido de patatas y naranjas" },
    ];

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const runTypewriter = useCallback((msgIndex: number, fullText: string) => {
        let i = 0;
        const interval = setInterval(() => {
            i++;
            setMessages(prev => prev.map((m, idx) =>
                idx === msgIndex
                    ? { ...m, displayedContent: fullText.slice(0, i), isTyping: i < fullText.length }
                    : m
            ));
            if (i >= fullText.length) clearInterval(interval);
        }, 18);
    }, []);

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3500);
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!companyName.trim() || !email.trim()) return;
        setRegistering(true);
        try {
            const res = await fetch("/api/demo-register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: companyName, email, tenant_id: defaultTenantId, session_id: sessionId })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.customer_id) setCustomerId(data.customer_id);
            }
        } catch (err) {
            console.error("Error registering lead:", err);
        } finally {
            setRegistering(false);
            setIsRegistered(true);
            setTimeout(() => showToast(`¡Bienvenido, ${companyName}!  Tu sesión de demo ha comenzado.`), 400);
        }
    };

    const handleSend = async (text?: string) => {
        const userMessage = text || input.trim();
        if (!userMessage) return;
        if (!text) setInput("");
        const userMsg: Message = { role: "user", content: userMessage, timestamp: new Date(), displayedContent: userMessage };
        setMessages(prev => [...prev, userMsg]);
        setMsgCount(c => c + 1);
        setLoading(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_PYTHON_API_URL || "http://127.0.0.1:8000";
            const bodyData: any = { tenant_id: defaultTenantId, session_id: sessionId, query: userMessage, history: messages.slice(-5) };
            if (customerId) bodyData.customer_id = customerId;
            const response = await fetch(`${apiUrl}/api/v1/demo/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(bodyData)
            });
            if (!response.ok) throw new Error("Error en la API");
            const data = await response.json();
            const botMsg: Message = { role: "assistant", content: data.answer, timestamp: new Date(), displayedContent: "", isTyping: true };
            setMessages(prev => {
                const next = [...prev, botMsg];
                setTimeout(() => runTypewriter(next.length - 1, data.answer), 50);
                return next;
            });
        } catch (err) {
            console.error("Chat error:", err);
            setMessages(prev => [...prev, {
                role: "assistant", content: "Lo siento, ha ocurrido un error al conectar con el servidor.",
                timestamp: new Date(), displayedContent: "Lo siento, ha ocurrido un error al conectar con el servidor."
            }]);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (d: Date) => d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

    const initials = companyName
        ? companyName.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()
        : "TU";

    // ── Paleta de colores según tema ─────────────────────────────────────────
    const theme = {
        // Fondos bio — pergamino cálido + tonos tierra
        pageBg: isDark ? "bg-[#0a0a0a]" : "bg-[#f7f4eb]",
        chatBg: isDark ? "bg-[#080808]" : "bg-[#f7f4eb]",
        // Sidebar: lino/piedra, claramente distinto del chat
        sidebarBg: isDark ? "bg-[#0d0d0d]" : "bg-[#ede8db]",
        // Header y barra input: tono de lino intermedio
        headerBg: isDark ? "bg-black/50" : "bg-[#e2dcd0]/98",
        inputBarBg: isDark ? "bg-black/60" : "bg-[#e2dcd0]/98",
        cardBg: isDark ? "bg-white/5" : "bg-[#fbfaf7]/85",
        // Bordes suaves
        border: isDark ? "border-white/10" : "border-[#dcd6c8]",
        // Texto — día: café espresso oscuro cálido para máximo contraste y elegancia
        text: isDark ? "text-white" : "text-[#2d251e]",
        textMuted: isDark ? "text-white/60" : "text-[#61554a]",
        textFaint: isDark ? "text-white/25" : "text-[#9c8e82]",
        // Burbuja bot
        botBubble: isDark ? "bg-white/5 border border-white/10 text-white/90" : "bg-white border border-[#e2dcd0] text-[#3d3126] shadow-sm",
        // Burbuja usuario — verde bosque para detalles interactivos
        userBubble: isDark ? "bg-purple-600 text-white" : "bg-[#3a7d4a] text-white",
        userAvatar: isDark ? "bg-purple-600/80 text-white" : "bg-[#3a7d4a] text-white",
        // Sugerencias
        suggBorder: isDark ? "border-purple-500/30 bg-purple-500/5 text-purple-300 hover:bg-purple-500/15" : "border-[#3a7d4a]/30 bg-[#3a7d4a]/5 text-[#244f2e] hover:bg-[#3a7d4a]/12",
        // Input
        inputBg: isDark ? "bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:ring-purple-500/60" : "bg-white border-[#dcd6c8] text-[#2d251e] placeholder-[#9c8e82] focus:ring-[#3a7d4a]/50",
        sendBtn: isDark ? "bg-purple-600 hover:bg-purple-500 shadow-purple-900/40" : "bg-[#3a7d4a] hover:bg-[#2d6040] shadow-green-900/20",
        // Acentos — verde bosque solo para detalles
        accent: isDark ? "text-purple-400" : "text-[#3a7d4a]",
        accentBorder: isDark ? "border-purple-500/20" : "border-[#3a7d4a]/25",
        // Dot-grid
        dotColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(61, 49, 38, 0.04)",
        // Gradient sidebar top
        sidebarGrad: isDark
            ? "from-purple-600/25 via-emerald-500/15 to-transparent"
            : "from-[#3a7d4a]/12 via-amber-500/5 to-transparent",
    };

    // ════════════════════════════════════════════════════════════════════════
    // PANTALLA DE REGISTRO
    // ════════════════════════════════════════════════════════════════════════
    if (!isRegistered) {
        return (
            <div className={`flex flex-col items-center justify-center min-h-[100dvh] ${theme.pageBg} ${theme.text} p-4 pt-16 relative overflow-hidden transition-colors duration-300`}>
                <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/10 blur-[120px] pointer-events-none" />
                <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] rounded-full bg-emerald-500/10 blur-[120px] pointer-events-none" />

                {/* Botón de tema en esquina */}
                <button
                    onClick={() => setTheme(isDark ? "light" : "dark")}
                    className={`fixed top-4 right-4 z-50 p-2.5 rounded-full ${theme.cardBg} border ${theme.border} ${theme.textMuted} hover:${theme.text} transition-all shadow-md`}
                >
                    {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </button>

                {/* Tarjeta: beige cálido orgánico estilo bio */}
                <div className={`w-full max-w-md p-8 border rounded-2xl shadow-xl relative z-10 transition-colors duration-300 ${isDark ? "bg-white/10 border-white/15 backdrop-blur-md" : "bg-[#efe7d8] border-[#dfd4c1]"
                    }`}>
                    <div className="flex justify-center mb-6">
                        {isDark ? (
                            <img src="/logo-header.avif" alt="Logo" className="h-16 w-auto object-contain" />
                        ) : (
                            /* En modo claro, envolvemos el logo blanco en una elegante cápsula verde bosque bio */
                            <div className="bg-[#2d5236] px-6 py-3.5 rounded-xl shadow-md flex items-center justify-center">
                                <img src="/logo-header.avif" alt="Logo" className="h-11 w-auto object-contain" />
                            </div>
                        )}
                    </div>
                    <h1 className={`text-2xl font-bold text-center mb-1 ${isDark ? "text-white" : "text-[#2d251e]"}`}>Prueba Interactiva</h1>
                    <p className={`text-center font-semibold text-sm mb-6 ${isDark ? theme.accent : "text-[#3a7d4a]"}`}> Frutería Online — Cosechados</p>
                    <div className={`text-sm text-center mb-8 space-y-2 ${isDark ? "text-white/70" : "text-[#61554a]"}`}>
                        <p>Chatbot de demostración para que veas cómo la IA puede atender a tus clientes, gestionar consultas, tomar pedidos y automatizar ventas las 24 h.</p>
                        <p className={`text-xs ${isDark ? "text-white/40" : "text-[#9c8e82]"}`}>Introduce los datos de tu empresa para comenzar.</p>
                    </div>

                    <form onSubmit={handleRegister} className="space-y-4">
                        <div>
                            <label className={`block text-sm font-medium mb-1.5 ${isDark ? "text-white/80" : "text-[#61554a]"}`}>Nombre de tu Empresa</label>
                            <div className="relative">
                                <Building className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${isDark ? "text-white/40" : "text-[#9c8e82]"}`} />
                                <input type="text" required value={companyName} onChange={e => setCompanyName(e.target.value)}
                                    className={`w-full border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3a7d4a]/60 transition-all ${isDark
                                        ? "border-white/15 bg-white/10 text-white placeholder:text-white/35"
                                        : "border-[#dcd6c8] bg-white text-[#2d251e] placeholder-[#9c8e82] shadow-sm"
                                        }`}
                                    placeholder="Ej. Babieca Tech" />
                            </div>
                        </div>
                        <div>
                            <label className={`block text-sm font-medium mb-1.5 ${isDark ? "text-white/80" : "text-[#61554a]"}`}>Correo Electrónico</label>
                            <div className="relative">
                                <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${isDark ? "text-white/40" : "text-[#9c8e82]"}`} />
                                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                                    className={`w-full border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3a7d4a]/60 transition-all ${isDark
                                        ? "border-white/15 bg-white/10 text-white placeholder:text-white/35"
                                        : "border-[#dcd6c8] bg-white text-[#2d251e] placeholder-[#9c8e82] shadow-sm"
                                        }`}
                                    placeholder="contacto@tuempresa.com" />
                            </div>
                        </div>
                        <button type="submit" disabled={registering || !companyName || !email}
                            className={`w-full mt-6 ${theme.sendBtn} text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg`}>
                            {registering ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Comenzar Demo <ArrowRight className="w-4 h-4" /></>}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // ════════════════════════════════════════════════════════════════════════
    // CHAT
    // ════════════════════════════════════════════════════════════════════════
    return (
        <div className={`fixed inset-0 flex ${theme.chatBg} ${theme.text} overflow-hidden transition-colors duration-300 overscroll-none`}>

            {/* Toast */}
            {toast && (
                <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-green-600/90 backdrop-blur-md text-white text-sm rounded-2xl shadow-2xl border border-green-400/30 flex items-center gap-2">
                    <span>{toast}</span>
                </div>
            )}

            {sidebarOpen && (
                <div className="md:hidden fixed inset-0 bg-black/60 z-30 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
            )}

            {/* ── SIDEBAR ── */}
            <aside className={`
                flex flex-col w-72 shrink-0 border-r ${theme.border} overflow-hidden relative
                md:flex
                ${sidebarOpen ? "fixed inset-y-0 left-0 z-40 flex" : "hidden"}
                transition-colors duration-300
            `}>
                {/* Dot-grid */}
                <div className={`absolute inset-0 ${theme.sidebarBg}`}
                    style={{
                        backgroundImage: `radial-gradient(circle, ${theme.dotColor} 1px, transparent 1px)`,
                        backgroundSize: "20px 20px"
                    }}
                />
                {/* Gradient animado superior */}
                <div className="absolute top-0 left-0 right-0 h-40 overflow-hidden pointer-events-none">
                    <div className={`absolute inset-0 bg-gradient-to-br ${theme.sidebarGrad} animate-pulse`} style={{ animationDuration: "4s" }} />
                    <div className={`absolute -top-6 -right-6 w-32 h-32 rounded-full ${isDark ? "bg-purple-500/20" : "bg-emerald-400/15"} blur-2xl`} />
                </div>

                {/* Contenido */}
                <div className="relative z-10 flex flex-col flex-1 overflow-y-auto">
                    {/* Logo + cerrar móvil */}
                    <div className="p-6 pb-5 flex items-center justify-between">
                        <img src="/cosechados-logo.webp" alt="Logo Cosechados" className="h-16 w-auto object-contain" />
                        <button onClick={() => setSidebarOpen(false)} className={`md:hidden p-1 rounded-lg ${theme.textFaint} hover:${theme.text} transition-colors`}>
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="px-4 space-y-5 flex-1">
                        <section>
                            <h3 className={`text-[10px] font-bold ${theme.accent} uppercase tracking-widest mb-2`}> Tu Frutería Online</h3>
                            <p className={`text-xs ${theme.textMuted} leading-relaxed`}>
                                Del campo a tu casa, sin rodeos. En <span className={`${theme.text} font-medium`}>Cosechados</span> te llevamos la mejor fruta y verdura directamente desde el agricultor. ¡Más fresco, campechano y natural imposible!
                            </p>
                        </section>

                        <section className="space-y-2">
                            <h3 className={`text-[10px] font-bold ${theme.accent} uppercase tracking-widest mb-2`}>Por qué Cosechados</h3>
                            {[
                                { icon: Leaf, label: "Producto 100% nacional", color: "text-emerald-500" },
                                { icon: Truck, label: "Envío en 24-48 h a toda España", color: "text-blue-500" },
                                { icon: ShoppingBasket, label: "Sin intermediarios", color: "text-orange-500" },
                            ].map(({ icon: Icon, label, color }) => (
                                <div key={label} className={`flex items-center gap-2.5 text-xs ${theme.textMuted}`}>
                                    <Icon className={`w-3.5 h-3.5 shrink-0 ${color}`} />
                                    {label}
                                </div>
                            ))}
                        </section>

                        <section>
                            <h3 className={`text-[10px] font-bold ${theme.accent} uppercase tracking-widest mb-2`}>Encuéntranos en</h3>
                            <ul className={`text-xs ${theme.textMuted} space-y-2`}>
                                {[
                                    { icon: Globe, label: "cosechados.es", url: "https://cosechados.es/" },
                                    { icon: Instagram, label: "@cosechados", url: "#" },
                                    { icon: MessageCircle, label: "TikTok y Facebook", url: "#" },
                                ].map(({ icon: Icon, label, url }) => (
                                    <li key={label}>
                                        <a href={url} target={url !== "#" ? "_blank" : undefined} rel={url !== "#" ? "noopener noreferrer" : undefined} className={`hover:${theme.accent} transition-colors flex items-center gap-2`}>
                                            <Icon className="w-3.5 h-3.5" /> {label}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </section>

                        <section className={`bg-gradient-to-br ${isDark ? "from-purple-600/15 to-emerald-600/5 border-purple-500/20" : "from-emerald-50 to-amber-50/50 border-emerald-200"} border p-4 rounded-2xl relative overflow-hidden`}>
                            <div className={`absolute top-0 right-0 w-12 h-12 ${isDark ? "bg-purple-500/20" : "bg-emerald-400/20"} blur-xl rounded-full`} />
                            <h3 className={`text-xs font-semibold mb-2 flex items-center gap-2 relative z-10 ${theme.text}`}>
                                <Sparkles className={`w-3.5 h-3.5 ${theme.accent}`} /> ¿Cómo probarlo?
                            </h3>
                            <p className={`text-[11px] ${theme.textMuted} leading-relaxed relative z-10`}>
                                Usa los sugeridos, haz una pregunta o directamente pídele fruta para hacer tu pedido. ¡La IA toma pedidos en tiempo real!
                            </p>
                        </section>
                    </div>

                    <div className={`px-4 py-4 border-t ${theme.border} text-center mt-4`}>
                        <p className={`text-[10px] ${theme.textFaint}`}>Powered by Babieca Tech</p>
                    </div>
                </div>
            </aside>

            {/* ── CHAT AREA ── */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header */}
                <header className={`shrink-0 px-4 md:px-5 py-3.5 border-b ${theme.border} ${theme.headerBg} backdrop-blur-md flex items-center justify-between z-10 transition-colors duration-300`}>
                    <div className="flex items-center gap-2 md:gap-3">
                        <button 
                            onClick={() => setSidebarOpen(true)}
                            className={`md:hidden p-1.5 -ml-1 rounded-md ${theme.textMuted} hover:${theme.text} transition-colors`}
                        >
                            <MoreHorizontal className="w-6 h-6" />
                        </button>
                        <img src="/cosechados-logo.webp" alt="Logo" className="h-7 w-auto object-contain hidden sm:block md:hidden" />
                        <div>
                            <h1 className={`font-semibold text-sm leading-tight ${theme.text}`}>Asistente de {companyName}</h1>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                <span className="text-[11px] text-green-500 font-medium">IA Activa</span>
                                <span className={`${theme.textFaint} text-[10px] ml-1`}>· {msgCount} {msgCount === 1 ? "respuesta" : "respuestas"}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Indicador sesión */}
                        <div className={`hidden sm:flex items-center gap-1.5 text-[11px] ${theme.textFaint} ${theme.cardBg} border ${theme.border} rounded-full px-3 py-1`}>
                            <Wifi className="w-3 h-3 text-green-500" />
                            Sesión activa
                        </div>
                        {/* Toggle tema */}
                        <button
                            onClick={() => setTheme(isDark ? "light" : "dark")}
                            className={`p-2 rounded-full ${theme.cardBg} border ${theme.border} ${theme.textMuted} hover:${theme.text} transition-all`}
                            title={isDark ? "Modo día" : "Modo noche"}
                        >
                            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        </button>
                    </div>
                </header>

                {/* Mensajes */}
                <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4">
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex items-end gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                            {/* Avatar */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${msg.role === "user" ? theme.userAvatar : `${theme.cardBg} border ${theme.border} p-0.5`}`}>
                                {msg.role === "user"
                                    ? initials
                                    : <img src="/cosechados-logo.webp" alt="Bot" className="w-full h-full object-contain rounded-full" />
                                }
                            </div>
                            {/* Burbuja */}
                            <div className="flex flex-col gap-1 max-w-[78%]">
                                <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${msg.role === "user"
                                    ? `${theme.userBubble} rounded-br-sm`
                                    : `${theme.botBubble} rounded-bl-sm`
                                    }`}>
                                    {renderFormattedText(msg.displayedContent ?? msg.content)}
                                    {msg.isTyping && (
                                        <span className={`inline-block w-0.5 h-4 ${isDark ? "bg-purple-400" : "bg-[#3a7d4a]"} ml-0.5 animate-pulse align-middle`} />
                                    )}
                                </div>
                                <p className={`text-[10px] ${theme.textFaint} px-1 ${msg.role === "user" ? "text-right" : ""}`}>
                                    {formatTime(msg.timestamp)}
                                </p>
                            </div>
                        </div>
                    ))}

                    {/* Sugerencias */}
                    {messages.length === 1 && (
                        <div className="flex flex-wrap gap-2 pl-11 mt-1">
                            {suggestedPrompts.map(({ icon, text }, idx) => (
                                <button key={idx} onClick={() => handleSend(text)} disabled={loading}
                                    className={`flex items-center gap-1.5 px-3.5 py-2 text-xs border rounded-full transition-all disabled:opacity-50 ${theme.suggBorder}`}>
                                    <span>{icon}</span> {text}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Loading */}
                    {loading && (
                        <div className="flex items-end gap-2.5">
                            <div className={`w-8 h-8 rounded-full ${theme.cardBg} border ${theme.border} p-0.5 shrink-0`}>
                                <img src="/cosechados-logo.webp" alt="Bot" className="w-full h-full object-contain rounded-full" />
                            </div>
                            <div className={`${isDark ? "bg-white/5 border-white/10" : "bg-white border-stone-200 shadow-sm"} border rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1`}>
                                <span className={`w-1.5 h-1.5 ${isDark ? "bg-purple-400" : "bg-[#3a7d4a]"} rounded-full animate-bounce`} style={{ animationDelay: "0ms" }} />
                                <span className={`w-1.5 h-1.5 ${isDark ? "bg-purple-400" : "bg-[#3a7d4a]"} rounded-full animate-bounce`} style={{ animationDelay: "150ms" }} />
                                <span className={`w-1.5 h-1.5 ${isDark ? "bg-purple-400" : "bg-[#3a7d4a]"} rounded-full animate-bounce`} style={{ animationDelay: "300ms" }} />
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className={`shrink-0 p-4 border-t ${theme.border} ${theme.inputBarBg} backdrop-blur-md transition-colors duration-300`}>
                    <div className="relative flex items-center max-w-4xl mx-auto">
                        <input
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                            placeholder="Escribe tu consulta aquí..."
                            className={`flex-1 border rounded-full pl-5 pr-14 py-3.5 text-base md:text-sm focus:outline-none focus:ring-1 transition-all ${theme.inputBg}`}
                            disabled={loading}
                        />
                        <button onClick={() => handleSend()} disabled={loading || !input.trim()}
                            className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-2.5 rounded-full ${theme.sendBtn} text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg`}>
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
