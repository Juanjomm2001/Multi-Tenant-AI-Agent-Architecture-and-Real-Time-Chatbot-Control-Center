"use client";

import DashboardLayout from "@/components/dashboard-layout";
import { User, MessageSquare, Search, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export interface ChatMessage {
    idx: number;
    id: string;
    session_id: string;
    tenant_id: string;
    customer_id: string;
    role: "user" | "assistant" | "system";
    content: string;
    created_at: string;
    first_name: string | null;
    last_name: string | null;
}

export interface ChatSession {
    customer_id: string;
    first_name: string;
    last_name: string;
    last_message_at: string;
    last_message: string;
    messages: ChatMessage[];
}

export default function ConversationsPage() {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const supabase = createClient();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (selectedChatId) {
            scrollToBottom();
        }
    }, [selectedChatId, sessions]);

    useEffect(() => {
        async function fetchConversations() {
            try {
                // Hacemos JOIN con 'messages' y 'customers' usando la sintaxis de Supabase
                const { data, error } = await supabase
                    .from('conversations')
                    .select(`
                        id,
                        session_id,
                        customer_id,
                        created_at,
                        customers (
                            name
                        ),
                        messages (
                            id,
                            role,
                            content,
                            created_at
                        )
                    `)
                    .order('created_at', { ascending: false });

                if (error) throw error;

                const sessionsArray: ChatSession[] = [];

                (data || []).forEach((conv: any) => {
                    // Ordenamos los mensajes de esta conversación del más antiguo al más nuevo
                    const sortedMessages = (conv.messages || []).sort((a: any, b: any) => 
                        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                    );
                    
                    const lastMsg = sortedMessages.length > 0 ? sortedMessages[sortedMessages.length - 1] : null;

                    // El ID para agrupar será el customer_id o el session_id si es anónimo
                    const chatId = conv.customer_id || conv.session_id;

                    sessionsArray.push({
                        customer_id: chatId,
                        first_name: conv.customers?.name?.split(' ')[0] || (conv.customer_id ? "Cliente" : "Visitante"),
                        last_name: conv.customers?.name?.split(' ').slice(1).join(' ') || (conv.customer_id ? "Anónimo" : conv.session_id.substring(0, 5)),
                        last_message_at: lastMsg ? lastMsg.created_at : conv.created_at,
                        last_message: lastMsg ? lastMsg.content : "Sin mensajes",
                        messages: sortedMessages.map((m: any) => ({
                            id: m.id,
                            role: m.role,
                            content: m.content,
                            created_at: m.created_at,
                            // Campos requeridos por la interfaz ChatMessage
                            idx: 0,
                            session_id: conv.session_id,
                            tenant_id: "",
                            customer_id: conv.customer_id || "",
                            first_name: null,
                            last_name: null
                        }))
                    });
                });

                // Ordenamos las sesiones por el último mensaje
                sessionsArray.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

                setSessions(sessionsArray);
                if (sessionsArray.length > 0) {
                    setSelectedChatId(sessionsArray[0].customer_id);
                }
            } catch (err) {
                console.error("Error fetching conversations:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchConversations();
    }, [supabase]);

    const filteredSessions = sessions.filter(session => {
        const fullName = `${session.first_name} ${session.last_name}`.toLowerCase();
        return fullName.includes(searchTerm.toLowerCase()) || session.customer_id.includes(searchTerm);
    });

    const selectedSession = sessions.find(s => s.customer_id === selectedChatId);

    return (
        <DashboardLayout>
            <div className="flex h-[calc(100vh-160px)] gap-6">
                {/* Panel Izquierdo: Lista de Chats tipo Telegram */}
                <div className="w-80 flex flex-col gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Buscar cliente..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                        />
                    </div>

                    <div className="glass-card p-2 flex-1 overflow-y-auto space-y-1">
                        {loading ? (
                            <div className="flex items-center justify-center h-40">
                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            </div>
                        ) : filteredSessions.length === 0 ? (
                            <div className="p-4 text-center text-xs text-muted-foreground">
                                No hay conversaciones aún.
                            </div>
                        ) : (
                            filteredSessions.map((session) => (
                                <div
                                    key={session.customer_id}
                                    onClick={() => setSelectedChatId(session.customer_id)}
                                    className={`p-3 rounded-xl cursor-pointer transition-all ${selectedChatId === session.customer_id
                                            ? "bg-primary/20 border-primary/20"
                                            : "hover:bg-white/5 border-transparent"
                                        } border`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-xs uppercase text-white shadow-sm">
                                                {session.first_name?.[0] || "?"}
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-baseline">
                                                <p className="font-semibold text-sm truncate">
                                                    {session.first_name} {session.last_name}
                                                </p>
                                                <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2">
                                                    {new Date(session.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground truncate opacity-80 mt-1">{session.last_message}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Panel Derecho: Visor del Chat Activo */}
                <div className="flex-1 glass-card p-0 flex flex-col overflow-hidden relative">
                    {selectedSession ? (
                        <>
                            {/* Cabecera del Chat */}
                            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-sm text-primary uppercase shadow-sm">
                                        {selectedSession.first_name?.[0] || "?"}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-white">{selectedSession.first_name} {selectedSession.last_name}</p>
                                        <p className="text-xs text-muted-foreground">ID Cliente: {selectedSession.customer_id}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 text-xs font-medium px-3 py-1 bg-white/5 text-muted-foreground rounded-full">
                                    {selectedSession.messages.length} mensajes
                                </div>
                            </div>

                            {/* Área de Mensajes (Burbujas) */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {selectedSession.messages.map((msg) => {
                                    const isAssistant = msg.role === 'assistant';

                                    return (
                                        <div
                                            key={msg.id}
                                            // Si es el asistente, el mensaje sale alineado a la derecha (flex-row-reverse)
                                            className={`flex gap-3 max-w-[80%] ${isAssistant ? 'ml-auto flex-row-reverse' : ''
                                                }`}
                                        >
                                            {/* Avatar del usuario o asistente */}
                                            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center shadow-md ${isAssistant ? 'bg-primary text-white font-bold text-[10px]' : 'bg-white/10'
                                                }`}>
                                                {isAssistant ? 'AI' : <User className="w-4 h-4 text-muted-foreground" />}
                                            </div>

                                            {/* Burbuja de chat */}
                                            <div className="flex flex-col gap-1">
                                                <div className={`p-4 rounded-2xl text-[15px] leading-relaxed relative ${isAssistant
                                                        ? 'bg-primary text-white rounded-tr-none shadow-lg shadow-primary/20'
                                                        : 'bg-white/5 border border-white/10 rounded-tl-none text-gray-200 shadow-xl backdrop-blur-sm'
                                                    }`}
                                                >
                                                    {msg.content}
                                                </div>
                                                <span className={`text-[10px] text-muted-foreground/60 px-1 ${isAssistant ? 'text-right' : 'text-left'
                                                    }`}>
                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                                {/* Elemento invisible para hacer scroll hasta abajo */}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Campo de texto inferior (Deshabilitado ya que el agente contesta solo) */}
                            <div className="p-4 bg-white/[0.02] border-t border-white/5 flex gap-2">
                                <input
                                    type="text"
                                    disabled
                                    placeholder="El Agente de IA está gestionando esta conversación en automático..."
                                    className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none opacity-50 cursor-not-allowed"
                                />
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4">
                            <div className="p-6 bg-white/5 rounded-full mb-2">
                                <MessageSquare className="w-12 h-12 text-white/20" />
                            </div>
                            <p className="text-lg font-medium text-white/60">No hay cliente seleccionado</p>
                            <p className="text-sm">Haz clic en un cliente a la izquierda para ver su historial de chat.</p>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
