import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Camera, Instagram, Music, Lock, Save, Loader2, User as UserIcon, Shield, Sparkles, KeyRound, Mail, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { updateProfile, updatePassword as apiUpdatePassword } from '@/services/api';
import { cn } from '@/lib/utils';

const Profile = () => {
    const { user, token, mutateUser } = useAuth();
    const [activeTab, setActiveTab] = useState<'settings' | 'security'>('settings');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [profileData, setProfileData] = useState({
        name: user?.name || '',
        bio: user?.bio || '',
        instagram_url: user?.instagram_url || '',
        spotify_uri: user?.spotify_uri || '',
    });
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar_url || null);
    const [passwordData, setPasswordData] = useState({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    useEffect(() => {
        if (user && !avatarFile) {
            setAvatarPreview(user.avatar_url || null);
            setProfileData({
                name: user.name || '',
                bio: user.bio || '',
                instagram_url: user.instagram_url || '',
                spotify_uri: user.spotify_uri || '',
            });
        }
    }, [user]);

    const updateProfileMutation = useMutation({
        mutationFn: async (data: any) => {
            const formData = new FormData();
            formData.append('name', data.name);
            formData.append('bio', data.bio || '');
            formData.append('instagram_url', data.instagram_url || '');
            formData.append('spotify_uri', data.spotify_uri || '');
            // NOTE: No _method spoofing — backend route is Route::post('/profile')
            if (avatarFile) formData.append('avatar_image', avatarFile);
            return updateProfile(token!, formData);
        },
        onSuccess: (data) => {
            toast.success('Perfil atualizado com sucesso!');
            mutateUser(data.user);
            setAvatarFile(null);
        },
        onError: (err: any) => toast.error(err.message || 'Erro ao atualizar perfil.'),
    });

    const updatePasswordMutation = useMutation({
        mutationFn: (data: any) => apiUpdatePassword(token!, data),
        onSuccess: () => {
            toast.success('Senha atualizada!');
            setPasswordData({ current_password: '', password: '', password_confirmation: '' });
        },
        onError: (err: any) => toast.error(err.message || 'Erro ao atualizar senha.'),
    });

    const handleProfileSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateProfileMutation.mutate(profileData);
    };

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordData.password !== passwordData.password_confirmation) {
            toast.error('As senhas não coincidem!');
            return;
        }
        updatePasswordMutation.mutate(passwordData);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { toast.error('Máx. 5MB.'); return; }
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
    };

    const spotifyTrackId = profileData.spotify_uri
        ? profileData.spotify_uri.split('/').pop()?.split('?')[0]?.replace('spotify:track:', '')
        : null;

    return (
        <div className="h-full flex flex-col gap-6 animate-fade-in max-w-4xl mx-auto w-full pb-10">

            {/* ── Top Banner / Hero ── */}
            <div className="sf-card overflow-hidden p-0 flex-shrink-0">
                {/* Banner */}
                <div className="h-28 bg-gradient-to-br from-amber-600/20 via-orange-500/10 to-amber-900/15 relative overflow-hidden">
                    <div className="absolute inset-0 opacity-[0.07]"
                        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '20px 20px' }}
                    />
                    <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -top-8 right-1/3 w-32 h-32 bg-orange-400/20 rounded-full blur-2xl pointer-events-none" />
                    <div className="absolute top-3 right-4 flex items-center gap-1.5 text-xs text-amber-400 bg-white/10 dark:bg-background/40 backdrop-blur px-3 py-1 rounded-full border border-amber-500/20 dark:border-amber-500/20 font-medium">
                        <Sparkles className="w-3 h-3" /> Membro Fênix
                    </div>
                </div>

                {/* Profile info row */}
                <div className="px-8 pb-5 flex flex-col sm:flex-row items-start sm:items-end gap-4 -mt-12 relative">
                    {/* Avatar */}
                    <div
                        className="group relative cursor-pointer flex-shrink-0"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div className="w-20 h-20 rounded-2xl overflow-hidden border-4 border-card shadow-xl bg-primary/10 flex items-center justify-center transition-all duration-200 group-hover:scale-105">
                            {avatarPreview
                                ? <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                                : <span className="text-4xl font-bold text-primary">{user?.name?.charAt(0) || 'U'}</span>
                            }
                            <div className="absolute inset-0 bg-black/50 rounded-[14px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                                <Camera className="w-5 h-5 text-white" />
                                <span className="text-[9px] font-bold text-white/80 uppercase tracking-wider">Alterar</span>
                            </div>
                        </div>
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                    </div>

                    <div className="flex-1 pt-14 sm:pt-0 pb-1">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h1 className="text-xl font-bold text-foreground">{user?.name || 'Administrador'}</h1>
                                <div className="flex items-center gap-4 mt-1">
                                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                        <Mail className="w-3.5 h-3.5" />{user?.email}
                                    </span>
                                </div>
                            </div>

                            {/* Tab switcher */}
                            <div className="flex items-center rounded-xl border border-border/60 bg-secondary/40 p-1 gap-1">
                                {(['settings', 'security'] as const).map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={cn(
                                            'px-5 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200',
                                            activeTab === tab
                                                ? 'bg-card text-foreground shadow-sm'
                                                : 'text-muted-foreground hover:text-foreground'
                                        )}
                                    >
                                        {tab === 'settings' ? 'Perfil' : 'Segurança'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Content: 2-column grid ── */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 flex-1">

                {/* LEFT: Main form */}
                {activeTab === 'settings' ? (
                    <div className="sf-card animate-in fade-in duration-300">
                        <h2 className="text-sm font-bold text-foreground/70 uppercase tracking-widest mb-5 flex items-center gap-2 pb-4 border-b border-border/40">
                            <UserIcon className="w-4 h-4 text-primary" /> Dados Pessoais
                        </h2>

                        <form onSubmit={handleProfileSubmit} className="space-y-5">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nome de Exibição</label>
                                    <Input
                                        value={profileData.name}
                                        onChange={e => setProfileData({ ...profileData, name: e.target.value })}
                                        placeholder="Seu nome"
                                        className="h-11 bg-background/60"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Instagram</label>
                                    <div className="relative">
                                        <Instagram className="w-4 h-4 absolute left-3 top-3.5 text-muted-foreground" />
                                        <Input
                                            value={profileData.instagram_url}
                                            onChange={e => setProfileData({ ...profileData, instagram_url: e.target.value })}
                                            placeholder="@seu.perfil"
                                            className="h-11 pl-10 bg-background/60"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Biografia</label>
                                <Textarea
                                    value={profileData.bio}
                                    onChange={e => setProfileData({ ...profileData, bio: e.target.value })}
                                    placeholder="Fale um pouco sobre você e seu trabalho..."
                                    className="resize-none min-h-[140px] bg-background/60"
                                />
                            </div>

                            <div className="pt-4 flex justify-end">
                                <Button type="submit" disabled={updateProfileMutation.isPending} className="gap-2 px-8 h-11">
                                    {updateProfileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Salvar Alterações
                                </Button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <div className="sf-card animate-in fade-in duration-300">
                        <h2 className="text-sm font-bold text-foreground/70 uppercase tracking-widest mb-5 flex items-center gap-2 pb-4 border-b border-border/40">
                            <KeyRound className="w-4 h-4 text-orange-500" /> Alterar Senha
                        </h2>

                        <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-sm">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Senha Atual</label>
                                <div className="relative">
                                    <Lock className="w-4 h-4 absolute left-3 top-3.5 text-muted-foreground/50" />
                                    <Input type="password" value={passwordData.current_password}
                                        onChange={e => setPasswordData({ ...passwordData, current_password: e.target.value })}
                                        className="h-11 pl-10 bg-background/60" required />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nova Senha</label>
                                <div className="relative">
                                    <Lock className="w-4 h-4 absolute left-3 top-3.5 text-muted-foreground/50" />
                                    <Input type="password" value={passwordData.password}
                                        onChange={e => setPasswordData({ ...passwordData, password: e.target.value })}
                                        className="h-11 pl-10 bg-background/60" required />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Confirmar Nova Senha</label>
                                <div className="relative">
                                    <Shield className="w-4 h-4 absolute left-3 top-3.5 text-muted-foreground/50" />
                                    <Input type="password" value={passwordData.password_confirmation}
                                        onChange={e => setPasswordData({ ...passwordData, password_confirmation: e.target.value })}
                                        className="h-11 pl-10 bg-background/60" required />
                                </div>
                            </div>
                            <div className="pt-2">
                                <Button type="submit" disabled={updatePasswordMutation.isPending} variant="destructive" className="w-full h-11 gap-2">
                                    {updatePasswordMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                                    Confirmar Nova Senha
                                </Button>
                            </div>
                        </form>
                    </div>
                )}

                {/* RIGHT sidebar */}
                <div className="space-y-5">

                    {/* Account info card */}
                    <div className="sf-card space-y-4">
                        <h3 className="text-xs font-bold text-foreground/60 uppercase tracking-widest pb-3 border-b border-border/40">
                            Informações da Conta
                        </h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground flex items-center gap-2">
                                    <UserIcon className="w-4 h-4" /> Tipo
                                </span>
                                <span className="font-semibold text-primary flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5" /> Premium
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground flex items-center gap-2">
                                    <Mail className="w-4 h-4" /> Email
                                </span>
                                <span className="font-medium text-foreground/80 text-xs truncate max-w-[150px]">{user?.email}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground flex items-center gap-2">
                                    <Shield className="w-4 h-4" /> Segurança
                                </span>
                                <button
                                    onClick={() => setActiveTab('security')}
                                    className="text-xs font-semibold text-primary hover:underline"
                                >
                                    Alterar Senha →
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Spotify card */}
                    <div className="sf-card space-y-4">
                        <h3 className="text-xs font-bold text-foreground/60 uppercase tracking-widest pb-3 border-b border-border/40 flex items-center gap-2">
                            <Music className="w-3.5 h-3.5 text-green-500" /> Música do Perfil
                        </h3>
                        <Input
                            value={profileData.spotify_uri}
                            onChange={e => setProfileData({ ...profileData, spotify_uri: e.target.value })}
                            placeholder="https://open.spotify.com/track/..."
                            className="h-10 bg-background/60 text-xs"
                        />
                        {spotifyTrackId ? (
                            <iframe
                                src={`https://open.spotify.com/embed/track/${spotifyTrackId}?utm_source=generator&theme=0`}
                                width="100%" height="152" frameBorder="0"
                                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                                loading="lazy"
                                className="rounded-xl shadow-md"
                            />
                        ) : (
                            <div className="h-24 border-2 border-dashed border-border/50 rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground/40 bg-secondary/10">
                                <Music className="w-6 h-6 opacity-30" />
                                <span className="text-xs font-bold uppercase tracking-widest">Cole o link acima</span>
                            </div>
                        )}
                        <p className="text-[11px] text-muted-foreground/60">
                            A música fica visível no seu perfil após salvar as alterações.
                        </p>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Profile;
