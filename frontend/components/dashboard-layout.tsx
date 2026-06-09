"use client";

import { motion } from "framer-motion";
import {
    BarChart3,
    MessageSquare,
    Database,
    Settings,
    LogOut,
    User,
    Users,
    ChevronRight,
    Menu,
    X
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const navItems = [
    { name: "Resumen", href: "/dashboard", icon: BarChart3 },
    { name: "Conversaciones", href: "/dashboard/conversations", icon: MessageSquare },
    { name: "Clientes", href: "/dashboard/customers", icon: Users },
    { name: "Agente RAG", href: "/dashboard/knowledge", icon: Database },
    { name: "Configuración", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    const [userProfile, setUserProfile] = useState<{ full_name: string | null; tenant_name: string | null } | null>(null);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();

    useEffect(() => {
        async function getProfile() {
            try {
                const { data: { user } } = await supabase.auth.getUser();

                if (user) {
                    const { data, error } = await supabase
                        .from('profiles')
                        .select('full_name, tenants(name)')
                        .eq('id', user.id)
                        .single();

                    if (data) {
                        const tData = data.tenants as any;
                        const tenantName = Array.isArray(tData) ? tData[0]?.name : tData?.name;
                        setUserProfile({
                            full_name: data.full_name,
                            tenant_name: tenantName || "Aún sin empresa vinculada",
                        });
                    }
                }
            } catch (err) {
                console.error("Error fetching profile:", err);
            } finally {
                setLoading(false);
            }
        }
        getProfile();
    }, [supabase]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push("/");
    };

    return (
        <div className="flex min-h-screen bg-[#030303]">
            {/* Sidebar */}
            <motion.aside
                initial={false}
                animate={{ width: isSidebarOpen ? 260 : 80 }}
                className="glass border-r border-white/5 flex flex-col z-50 sticky top-0 h-screen"
            >
                <div className="p-6 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center font-bold text-lg text-white">
                        B
                    </div>
                    {isSidebarOpen && (
                        <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="font-bold text-xl tracking-tight"
                        >
                            Babieca
                        </motion.span>
                    )}
                </div>

                <nav className="flex-1 px-4 py-6 space-y-2">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link key={item.href} href={item.href}>
                                <div
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                                        isActive
                                            ? "bg-primary text-white shadow-lg shadow-primary/20"
                                            : "text-muted-foreground hover:bg-white/5 hover:text-white"
                                    )}
                                >
                                    <item.icon className="w-5 h-5" />
                                    {isSidebarOpen && (
                                        <motion.span
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            className="font-medium"
                                        >
                                            {item.name}
                                        </motion.span>
                                    )}
                                    {isActive && isSidebarOpen && (
                                        <motion.div
                                            layoutId="active-pill"
                                            className="ml-auto w-1.5 h-1.5 rounded-full bg-white"
                                        />
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-white/5">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        {isSidebarOpen && <span className="font-medium">Cerrar Sesión</span>}
                    </button>
                </div>
            </motion.aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0">
                <header className="h-16 glass border-b border-white/5 px-8 flex items-center justify-between sticky top-0 z-40">
                    <button
                        onClick={() => setSidebarOpen(!isSidebarOpen)}
                        className="p-2 hover:bg-white/5 rounded-lg text-muted-foreground"
                    >
                        {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>

                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin ml-auto" />
                            ) : (
                                <>
                                    <p className="text-sm font-medium">{userProfile?.full_name || "Usuario"}</p>
                                    <p className="text-xs text-muted-foreground">{userProfile?.tenant_name || "Plan Free"}</p>
                                </>
                            )}
                        </div>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 border-2 border-white/10 flex items-center justify-center overflow-hidden">
                            <User className="w-6 h-6 text-white" />
                        </div>
                    </div>
                </header>

                <div className="p-8 overflow-y-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
