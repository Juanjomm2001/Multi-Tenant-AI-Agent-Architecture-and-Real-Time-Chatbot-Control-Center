"use client";

import DashboardLayout from "@/components/dashboard-layout";
import { Users, Search, Loader2, Calendar, Mail, Hash } from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface Customer {
    id: string;
    external_id: string;
    name: string | null;
    email: string | null;
    created_at: string;
}

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const supabase = createClient();

    useEffect(() => {
        async function fetchCustomers() {
            try {
                // Como los clientes se están guardando flat en Conversations:
                const { data, error } = await supabase
                    .from('conversations')
                    .select('customer_id, first_name, last_name, created_at, session_id')
                    .order('created_at', { ascending: false });

                if (error) throw error;

                // Extraer clientes únicos
                const uniqueCustomersMap = new Map<string, Customer>();
                (data || []).forEach(row => {
                    if (!uniqueCustomersMap.has(row.customer_id)) {
                        uniqueCustomersMap.set(row.customer_id, {
                            id: row.customer_id,
                            external_id: row.session_id || row.customer_id,
                            name: `${row.first_name || 'Desconocido'} ${row.last_name || ''}`.trim(),
                            email: "Sin email (Chat)",
                            created_at: row.created_at
                        });
                    }
                });

                setCustomers(Array.from(uniqueCustomersMap.values()));
            } catch (err) {
                console.error("Error fetching customers:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchCustomers();
    }, [supabase]);

    const filteredCustomers = customers.filter(c => {
        const query = searchTerm.toLowerCase();
        return (c.name?.toLowerCase().includes(query) || c.email?.toLowerCase().includes(query) || c.external_id.toLowerCase().includes(query));
    });

    return (
        <DashboardLayout>
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
                        <p className="text-muted-foreground">Gestiona la base de datos de usuarios que interactúan con tu agente.</p>
                    </div>
                    <div className="bg-primary/10 text-primary px-4 py-2 rounded-xl font-medium flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        {customers.length} Clientes Totales
                    </div>
                </div>

                <div className="glass-card p-0 overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between">
                        <div className="relative w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Buscar por nombre, email o ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all text-white placeholder:text-muted-foreground"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/5 text-muted-foreground text-xs uppercase tracking-wider">
                                    <th className="px-6 py-4 font-semibold">Cliente</th>
                                    <th className="px-6 py-4 font-semibold">Identificador (ID)</th>
                                    <th className="px-6 py-4 font-semibold">Email</th>
                                    <th className="px-6 py-4 font-semibold text-right">Fecha de Registro</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center">
                                            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
                                        </td>
                                    </tr>
                                ) : filteredCustomers.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground italic">
                                            No se encontraron clientes.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredCustomers.map((customer) => (
                                        <tr key={customer.id} className="hover:bg-white/5 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-sm text-white uppercase">
                                                        {customer.name?.[0] || "?"}
                                                    </div>
                                                    <span className="font-medium text-sm text-white">
                                                        {customer.name || "Sin Nombre"}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-muted-foreground font-mono">
                                                <div className="flex items-center gap-2">
                                                    <Hash className="w-4 h-4 opacity-50" />
                                                    {customer.external_id}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-muted-foreground">
                                                <div className="flex items-center gap-2">
                                                    <Mail className="w-4 h-4 opacity-50" />
                                                    {customer.email || "No provisto"}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right text-sm text-muted-foreground">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Calendar className="w-4 h-4 opacity-50" />
                                                    {new Date(customer.created_at).toLocaleDateString(undefined, {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric'
                                                    })}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
