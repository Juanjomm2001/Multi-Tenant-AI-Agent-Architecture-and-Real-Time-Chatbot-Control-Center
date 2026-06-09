"use client";

import DashboardLayout from "@/components/dashboard-layout";
import { MessageSquare, Database, Zap, ArrowUpRight, Loader2, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { motion } from "framer-motion";

export default function DashboardPage() {
    const [stats, setStats] = useState([
        { name: "Total Leads/Chats", value: "0", icon: MessageSquare, trend: "..." },
        { name: "Conocimiento (Chunks)", value: "0", icon: Database, trend: "..." },
        { name: "Automatizaciones", value: "Activas", icon: Zap, trend: "Estable" },
    ]);
    const [recentChats, setRecentChats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        async function fetchDashboardData() {
            try {
                // Fetch stats counts
                const [convCount, knowledgeCount, customersCount] = await Promise.all([
                    supabase.from('conversations').select('*', { count: 'exact', head: true }),
                    supabase.from('knowledge_items').select('*', { count: 'exact', head: true }),
                    supabase.from('customers').select('*', { count: 'exact', head: true })
                ]);

                setStats([
                    { name: "Total Mensajes", value: (convCount.count || 0).toString(), icon: MessageSquare, trend: "Activo" },
                    { name: "Documentos RAG", value: (knowledgeCount.count || 0).toString(), icon: Database, trend: "Indexado" },
                    { name: "Total Clientes", value: (customersCount.count || 0).toString(), icon: Users, trend: "Creciendo" },
                ]);

                // Fetch recent messages joined with conversations and customers
                const { data } = await supabase
                    .from('messages')
                    .select(`
                        id,
                        content,
                        role,
                        created_at,
                        conversations (
                            session_id,
                            customers (
                                name
                            )
                        )
                    `)
                    .order('created_at', { ascending: false })
                    .limit(4);

                setRecentChats(data || []);
            } catch (err) {
                console.error("Error fetching dashboard data:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchDashboardData();
    }, [supabase]);

    return (
        <DashboardLayout>
            <div className="space-y-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Bienvenido de nuevo</h1>
                    <p className="text-muted-foreground">Aquí tienes el resumen de tus automatizaciones IA.</p>
                </div>

                {/* Stats Grid */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {stats.map((stat) => (
                        <div key={stat.name} className="glass-card hover:translate-y-[-4px]">
                            <div className="flex items-center justify-between">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <stat.icon className="w-6 h-6 text-primary" />
                                </div>
                                <span className="text-xs font-medium text-emerald-500 px-2 py-1 bg-emerald-500/10 rounded-full">
                                    {stat.trend}
                                </span>
                            </div>
                            <div className="mt-4">
                                <p className="text-sm text-muted-foreground">{stat.name}</p>
                                <p className="text-2xl font-bold">{loading ? "..." : stat.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Main Content Area */}
                <div className="grid gap-6 lg:grid-cols-2">
                    <div className="glass-card">
                        <h3 className="text-lg font-semibold mb-4">Últimas Conversaciones</h3>
                        <div className="space-y-4">
                            {loading ? (
                                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                            ) : recentChats.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">No hay actividad reciente.</p>
                            ) : recentChats.map((chat) => (
                                <Link key={chat.id} href="/dashboard/conversations" className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-white uppercase shadow-sm">
                                            {chat.conversations?.customers?.name?.[0] || "?"}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium text-sm text-white truncate max-w-[130px]">
                                                    {chat.conversations?.customers?.name || "Cliente"}
                                                </p>
                                                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                                    {new Date(chat.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                                {chat.role === 'assistant' ? 'AI: ' : ''}{chat.content}
                                            </p>
                                        </div>
                                    </div>
                                    <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-white transition-colors flex-shrink-0" />
                                </Link>
                            ))}
                        </div>
                    </div>

                    <div className="glass-card premium-gradient overflow-hidden relative">
                        <div className="relative z-10">
                            <h3 className="text-lg font-semibold mb-2">Agente RAG Optimizado</h3>
                            <p className="text-sm text-muted-foreground mb-4">Tu agente IA está usando la última base de datos vectorial para responder con precisión.</p>
                            <Link href="/dashboard/knowledge" className="inline-block px-4 py-2 bg-white text-black rounded-lg font-medium text-sm hover:bg-white/90 transition-colors">
                                Ver Detalles
                            </Link>
                        </div>
                        <Zap className="absolute -right-8 -bottom-8 w-40 h-40 text-primary/10 rotate-12" />
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
