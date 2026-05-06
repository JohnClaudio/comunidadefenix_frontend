import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import api from "@/services/api";
import { Paintbrush, Save, Loader2, Palette } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

export default function AdminSettings() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    // Theme configuration state
    const [themeConfig, setThemeConfig] = useState({
        primary: "#4f46e5",
        sidebar: "#121212",
    });

    // Fetch current global theme settings on mount
    useEffect(() => {
        const fetchThemeSettings = async () => {
            try {
                const response = await api.get("/settings/theme");
                if (response.data?.success && response.data?.data) {
                    setThemeConfig(response.data.data);
                }
            } catch (error) {
                console.error("Failed to load theme settings:", error);
                toast.error("Erro ao carregar as configurações de tema globais.");
            } finally {
                setFetching(false);
            }
        };

        fetchThemeSettings();
    }, []);

    const handleSaveTheme = async () => {
        setLoading(true);
        try {
            const response = await api.post("/settings/theme", themeConfig);
            if (response.data?.success) {
                toast.success("Tema global atualizado com sucesso!");
                // Reload to apply new styles globally through ThemeProvider
                setTimeout(() => window.location.reload(), 1000);
            }
        } catch (error: any) {
            console.error("Failed to save theme:", error);
            toast.error(error.response?.data?.message || "Erro ao salvar o tema.");
        } finally {
            setLoading(false);
        }
    };

    // Restrict access to Admins
    if (user?.role !== "admin") {
        return <Navigate to="/dashboard" replace />;
    }

    return (
        <div className="space-y-6 animate-in fade-in zoom-in duration-500 max-w-4xl mx-auto">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <Paintbrush className="w-8 h-8 text-primary" />
                    Configurações do Sistema
                </h1>
                <p className="text-muted-foreground">
                    Gerencie configurações globais e a aparência da plataforma para todos os usuários.
                </p>
            </div>

            <Card className="border-border/50 bg-card/50 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-10 -mt-20 pointer-events-none" />

                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Palette className="w-5 h-5 text-primary" />
                        Aparência Global (Tema)
                    </CardTitle>
                    <CardDescription>
                        Defina as cores principais do sistema. Essa alteração afetará a visualização de todos os usuários assim que efetuarem login ou atualizarem a página.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {fetching ? (
                        <div className="flex items-center justify-center p-8">
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                            {/* Primary Color Setting */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-foreground">
                                    Cor Principal (Primary)
                                </label>
                                <div className="flex items-center gap-4">
                                    <div
                                        className="w-12 h-12 rounded-lg shadow-inner ring-1 ring-border"
                                        style={{ backgroundColor: themeConfig.primary }}
                                    />
                                    <Input
                                        type="color"
                                        className="w-24 h-12 p-1 cursor-pointer"
                                        value={themeConfig.primary}
                                        onChange={(e) =>
                                            setThemeConfig({ ...themeConfig, primary: e.target.value })
                                        }
                                    />
                                    <Input
                                        type="text"
                                        className="flex-1 font-mono text-sm"
                                        value={themeConfig.primary}
                                        onChange={(e) =>
                                            setThemeConfig({ ...themeConfig, primary: e.target.value })
                                        }
                                        placeholder="#4f46e5"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Usada em botões, links, ícones de destaque e gráficos (ex: Funis e Barras).
                                </p>
                            </div>

                            {/* Sidebar / Background Color Setting */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-foreground">
                                    Cor de Fundo / Sidebar (Modo Escuro)
                                </label>
                                <div className="flex items-center gap-4">
                                    <div
                                        className="w-12 h-12 rounded-lg shadow-inner ring-1 ring-border"
                                        style={{ backgroundColor: themeConfig.sidebar }}
                                    />
                                    <Input
                                        type="text"
                                        className="flex-1 font-mono text-sm"
                                        value={themeConfig.sidebar}
                                        onChange={(e) =>
                                            setThemeConfig({ ...themeConfig, sidebar: e.target.value })
                                        }
                                        placeholder="#121212 ou hsl(0, 0%, 7%)"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Usada principalmente no fundo do menu lateral e fundos mais escuros do sistema. Aceita valores HEX, RGB ou HSL.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="pt-4 flex justify-end">
                        <Button
                            onClick={handleSaveTheme}
                            disabled={loading || fetching}
                            className="gap-2 w-full md:w-auto"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {loading ? "Salvando..." : "Salvar Configurações Globo"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
