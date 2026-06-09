"use client";

import DashboardLayout from "@/components/dashboard-layout";
import { Upload, FileText, CheckCircle, Clock, AlertCircle, Database, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface KnowledgeItem {
    id: string;
    name: string;
    status: "processing" | "completed" | "error" | "deleted";
    created_at: string;
}

export default function KnowledgePage() {
    const [isUploading, setIsUploading] = useState(false);
    const [items, setItems] = useState<KnowledgeItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const supabase = createClient();

    const fetchItems = async () => {
        try {
            const { data, error } = await supabase
                .from('knowledge_items')
                .select('id, filename, status, created_at, metadata')
                .neq("status", "deleted")
                .order('created_at', { ascending: false });

            if (error) throw error;

            const mappedItems: KnowledgeItem[] = (data || []).map((row: any) => ({
                id: row.id,
                name: row.filename,
                status: row.status,
                created_at: row.created_at,
            }));

            setItems(mappedItems);
        } catch (err) {
            console.error("Error fetching knowledge items:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();

        // Suscribirse a los cambios en tiempo real de la tabla knowledge_items
        // Así, cuando n8n cambie el status a 'completed', la UI se refrescará sola.
        const channel = supabase
            .channel('knowledge_items_updates')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'knowledge_items' },
                (payload) => {
                    console.log("Cambio detectado por n8n:", payload);
                    fetchItems(); // Recarga la lista para mostrar el nuevo estado
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [supabase]);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const uploadFile = async (file: File) => {
        setIsUploading(true);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch("/api/knowledge-items", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                console.error("Error uploading knowledge item:", await response.text());
            }

            await fetchItems();
        } catch (err) {
            console.error("Error uploading knowledge item:", err);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        await uploadFile(file);
    };

    const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        setIsDragging(false);

        if (isUploading) return;

        const file = event.dataTransfer.files?.[0];
        if (!file) return;
        await uploadFile(file);
    };

    const handleDelete = async (id: string) => {
        try {
            const response = await fetch(`/api/knowledge-items?id=${id}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                console.error("Error deleting knowledge item:", await response.text());
            }

            await fetchItems();
        } catch (err) {
            console.error("Error deleting knowledge item:", err);
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Agente RAG</h1>
                        <p className="text-muted-foreground">Gestiona el conocimiento que usa tu IA para responder.</p>
                    </div>
                    <button
                        onClick={handleUploadClick}
                        disabled={isUploading}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-all disabled:opacity-50"
                    >
                        {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {isUploading ? "Procesando..." : "Subir Documento"}
                    </button>
                </div>

                <div className="grid gap-6">
                    {/* Input de archivo oculto para subir PDFs */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.txt,.doc,.docx"
                        className="hidden"
                        onChange={handleFileChange}
                    />

                    {/* Dropzone */}
                    <div
                        onClick={handleUploadClick}
                        onDragEnter={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsDragging(true);
                        }}
                        onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsDragging(true);
                        }}
                        onDragLeave={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsDragging(false);
                        }}
                        onDrop={handleDrop}
                        className={[
                            "glass-card border-dashed border-2 flex flex-col items-center justify-center py-12 text-center group cursor-pointer transition-colors",
                            isDragging ? "border-primary/70 bg-primary/5" : "border-white/10 hover:border-primary/50",
                        ].join(" ")}
                    >
                        <div className="p-4 bg-primary/10 rounded-full mb-4 group-hover:scale-110 transition-transform">
                            {isUploading ? <Loader2 className="w-8 h-8 text-primary animate-spin" /> : <Upload className="w-8 h-8 text-primary" />}
                        </div>
                        <p className="font-semibold text-lg">
                            {isDragging ? "Suelta el archivo para subirlo" : "Arrastra un archivo aquí o haz clic para seleccionar"}
                        </p>
                        <p className="text-sm text-muted-foreground">PDF, TXT o DOCX (Máx. 10MB)</p>
                    </div>

                    {/* Table */}
                    <div className="glass-card p-0 overflow-hidden">
                        <div className="p-6 border-b border-white/5 flex items-center justify-between">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                <Database className="w-5 h-5 text-primary" />
                                Documentos Indexados
                            </h3>
                            <button onClick={fetchItems} className="text-xs text-muted-foreground hover:text-white transition-colors">
                                Actualizar
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-white/5 text-muted-foreground text-xs uppercase tracking-wider">
                                        <th className="px-6 py-4 font-semibold">Archivo</th>
                                        <th className="px-6 py-4 font-semibold">Estado</th>
                                        <th className="px-6 py-4 font-semibold text-right">Fecha</th>
                                        <th className="px-6 py-4 font-semibold text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center">
                                                <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
                                            </td>
                                        </tr>
                                    ) : items.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground italic">
                                                No hay documentos subidos aún. Prueba a subir uno.
                                            </td>
                                        </tr>
                                    ) : (
                                        items.map((item) => (
                                            <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <FileText className="w-5 h-5 text-muted-foreground" />
                                                        <span className="font-medium text-sm">{item.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {item.status === "completed" && (
                                                        <div className="flex items-center gap-1.5 text-emerald-500 text-xs font-medium">
                                                            <CheckCircle className="w-4 h-4" /> Listado
                                                        </div>
                                                    )}
                                                    {item.status === "processing" && (
                                                        <div className="flex items-center gap-1.5 text-blue-500 text-xs font-medium animate-pulse">
                                                            <Clock className="w-4 h-4" /> Vectorizando
                                                        </div>
                                                    )}
                                                    {item.status === "error" && (
                                                        <div className="flex items-center gap-1.5 text-red-500 text-xs font-medium">
                                                            <AlertCircle className="w-4 h-4" /> Error en n8n
                                                        </div>
                                                    )}
                                                    {item.status === "deleted" && (
                                                        <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-medium">
                                                            Eliminado
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right text-sm text-muted-foreground">
                                                    {new Date(item.created_at).toLocaleString(undefined, {
                                                        year: "numeric",
                                                        month: "2-digit",
                                                        day: "2-digit",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => handleDelete(item.id)}
                                                        className="text-xs text-red-400 hover:text-red-300 transition-colors"
                                                    >
                                                        Eliminar
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
