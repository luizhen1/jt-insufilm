'use client';

import { FormEvent, useEffect, useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import type { FirebaseError } from 'firebase/app';
import { ArrowLeft, ArrowRight, LockKeyhole } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';

export default function AdminLogin() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (!loading && user) router.replace('/admin/dashboard'); }, [loading, user, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace('/admin/dashboard');
    } catch (cause) {
      const code = (cause as FirebaseError).code;
      const messages: Record<string, string> = {
        'auth/invalid-credential': 'O Firebase recusou essas credenciais. Confira o e-mail e a senha do usuário cadastrado neste mesmo projeto.',
        'auth/user-not-found': 'Esse e-mail não está cadastrado no projeto Firebase configurado no app.',
        'auth/wrong-password': 'A senha não confere. Confira a senha do usuário no Firebase Authentication.',
        'auth/invalid-email': 'O formato do e-mail é inválido.',
        'auth/operation-not-allowed': 'O login por e-mail e senha está desativado. Habilite esse método em Authentication → Método de login no Firebase.',
        'auth/too-many-requests': 'Muitas tentativas seguidas. Aguarde um pouco e tente novamente.',
        'auth/network-request-failed': 'Não foi possível conectar ao Firebase. Confira a conexão e tente novamente.',
        'auth/unauthorized-domain': 'Este domínio não está autorizado. Adicione localhost em Authentication → Configurações → Domínios autorizados.',
      };
      console.error('Falha ao entrar no Firebase Authentication:', code || cause);
      setError(messages[code] || `Não foi possível entrar${code ? ` (${code})` : ''}. Confira a configuração do Firebase e tente novamente.`);
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="min-h-screen bg-ink text-white">
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-cover bg-center lg:block" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1400&q=90')" }}><div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/20" /><Link href="/" className="absolute left-10 top-9 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-lime text-sm font-black text-ink">JT</span><span className="text-sm font-bold uppercase tracking-[.2em]">Insufilm</span></Link><div className="absolute bottom-12 left-10 right-10"><p className="text-xs font-bold uppercase tracking-[.22em] text-lime">Painel do instalador</p><h1 className="mt-4 max-w-lg text-5xl font-semibold leading-tight tracking-[-.04em]">Seu trabalho,<br />bem organizado.</h1><p className="mt-4 max-w-md text-sm leading-6 text-white/65">Acompanhe os próximos atendimentos e mantenha sua agenda em dia.</p></div></section>
      <section className="flex min-h-screen flex-col justify-between px-6 py-7 sm:px-12 lg:px-16">
        <div><Link href="/" className="inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-white"><ArrowLeft size={16} /> Voltar para o site</Link><Link href="/" className="mt-8 flex w-fit items-center gap-3 lg:hidden"><span className="grid h-10 w-10 place-items-center rounded-full bg-lime text-sm font-black text-ink">JT</span><span className="text-sm font-bold uppercase tracking-[.2em]">Insufilm</span></Link></div>
        <div className="mx-auto w-full max-w-md py-16">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-lime"><LockKeyhole size={22} /></span>
          <p className="mt-8 text-xs font-bold uppercase tracking-[.22em] text-lime">Acesso restrito</p><h2 className="mt-3 text-3xl font-semibold tracking-[-.035em] sm:text-4xl">Bem-vindo de volta.</h2><p className="mt-3 text-sm leading-6 text-white/55">Entre com seu e-mail e senha para acessar seus agendamentos.</p>
          <form onSubmit={handleSubmit} className="mt-9 space-y-5">
            <label className="block text-xs font-semibold text-white/70">E-mail<input required type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-lime" /></label>
            <label className="block text-xs font-semibold text-white/70">Senha<input required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Sua senha" className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-lime" /></label>
            {error && <p role="alert" className="rounded-xl bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
            <button disabled={submitting || loading} className="flex w-full items-center justify-center gap-2 rounded-full bg-lime px-6 py-4 text-sm font-bold text-ink transition hover:bg-white disabled:opacity-60">{submitting ? 'Entrando...' : 'Entrar no painel'} <ArrowRight size={17} /></button>
          </form>
        </div>
        <p className="text-xs text-white/30">JT Insufilm · Área administrativa</p>
      </section>
    </div>
  </main>;
}
