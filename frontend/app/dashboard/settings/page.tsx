"use client";

import DashboardLayout from "@/components/dashboard-layout";
import { User, Save, Loader2, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [tenantName, setTenantName] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        async function loadProfile() {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    setEmail(user.email || "");
                    const { data, error } = await supabase
                        .from('profiles')
                        .select('full_name, tenants(name)')
                        .eq('id', user.id)
                        .single();

                    if (!error && data) {
                        setFullName(data.full_name || "");
                        const tData = data.tenants as any;
                        setTenantName((Array.isArray(tData) ? tData[0]?.name : tData?.name) || "Aún sin empresa vinculada");
                    }
                }
            } catch (err) {
                console.error("Error loading profile:", err);
            } finally {
                setLoading(false);
            }
        }
        loadProfile();
    }, [supabase]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setSaveSuccess(false);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Actualizar nombre
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update({ full_name: fullName, updated_at: new Date().toISOString() })
                    .eq('id', user.id);

                if (profileError) throw profileError;

                setSaveSuccess(true);

                // Hide success message after 3 seconds
                setTimeout(() => setSaveSuccess(false), 3000);
            }
        } catch (err) {
            console.error("Error saving profile:", err);
        } finally {
            setSaving(false);
        }
    };

    const handleResetPassword = async () => {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/dashboard`
            });
            if (error) throw error;
            alert("Te hemos enviado un enlace seguro al correo para cambiar tu contraseña.");
        } catch (error: any) {
            console.error("Error sending reset password email:", error.message);
            alert("Hubo un error al enviar el correo o has solicitado demasiados cambios seguidos.");
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-8 max-w-4xl mx-auto">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
                        <p className="text-muted-foreground">Gestiona la información de tu cuenta.</p>
                    </div>
                </div>

                <div className="glass-card p-8">
                    <div className="flex items-center gap-4 mb-8 pb-8 border-b border-white/5">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                            <User className="w-8 h-8 opacity-80" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold">Perfil del Usuario</h2>
                            <p className="text-sm text-muted-foreground">Actualiza tu información personal</p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <form onSubmit={handleSave} className="space-y-6 max-w-md">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white/80">Empresa (Tenant Activo)</label>
                                <input
                                    type="text"
                                    value={tenantName}
                                    disabled
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white/50 cursor-not-allowed"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white/80">Correo Electrónico de Acceso</label>
                                <input
                                    type="email"
                                    value={email}
                                    disabled
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white/50 cursor-not-allowed"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white/80">Nombre Completo del Operador</label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="Tu nombre y apellidos"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary transition-all text-white"
                                    required
                                />
                                <p className="text-xs text-muted-foreground mt-1 text-white/40">
                                    Este es el nombre visible internamente en el panel de Babieca.
                                </p>
                            </div>

                            <div className="space-y-2 mt-8 pt-8 border-t border-white/5">
                                <label className="text-sm font-medium text-white/80">Seguridad</label>
                                <p className="text-xs text-muted-foreground mt-1 text-white/40 mb-3 block">
                                    Para mayor seguridad, el cambio de contraseña se realiza mediante un enlace único enviado a tu correo.
                                </p>
                                <button
                                    type="button"
                                    onClick={handleResetPassword}
                                    className="px-4 py-2 mt-2 bg-white/10 hover:bg-white/15 text-white rounded-lg text-sm font-medium transition-colors border border-white/10"
                                >
                                    Solicitar Enlace de Cambio de Contraseña
                                </button>
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-all disabled:opacity-50"
                            >
                                {saving ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : saveSuccess ? (
                                    <CheckCircle className="w-5 h-5" />
                                ) : (
                                    <Save className="w-5 h-5" />
                                )}
                                {saving ? "Guardando..." : saveSuccess ? "Guardado!" : "Guardar Cambios"}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
