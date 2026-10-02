'use client';

import { FormEvent, useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ArrowDown, ArrowRight, Check, CheckCircle2, Menu, ShieldCheck, Sun, ThermometerSun, X } from 'lucide-react';
import { db } from '@/lib/firebase';

const phone = process.env.NEXT_PUBLIC_BUSINESS_WHATSAPP || '5511999999999';
const OPCOES_VIDROS = ['Para-brisa', 'Vidros laterais', 'Vidro traseiro'] as const;

const films = [
  { number: '01', title: 'Fumê Convencional', description: 'Privacidade e estilo com ótimo custo-benefício para o dia a dia.', tag: 'Essencial', image: 'photo-1503376780353-7e6692767b70' },
  { number: '02', title: 'Fumê G5', description: 'Máxima privacidade e tonalidade bem escura, reduzindo drasticamente a visibilidade externa.', tag: 'Mais escuro', image: 'photo-1492144534655-ae79c964c9d7' },
  { number: '03', title: 'Fumê G20', description: 'O equilíbrio perfeito entre privacidade interna e boa visibilidade para dirigir.', tag: 'Mais procurado', image: 'photo-1486262715619-67b85e0b08d3' },
  { number: '04', title: 'Fumê G35', description: 'Tonalidade suave com controle solar leve e ótima transparência de dentro para fora.', tag: 'Intermediário', image: 'photo-1503376780353-7e6692767b70' },
];

const getTodayString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const formatPhone = (val: string) => {
  const numbers = val.replace(/\D/g, '').slice(0, 11);
  if (numbers.length <= 2) return numbers ? `(${numbers}` : '';
  if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  if (numbers.length <= 10) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
  }
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
};

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Estados dos campos do formulário
  const [telefone, setTelefone] = useState('');
  const [selectedVidros, setSelectedVidros] = useState<string[]>(['Vidros laterais', 'Vidro traseiro']);

  const toggleVidro = (vidro: string) => {
    setSelectedVidros((prev) =>
      prev.includes(vidro) ? prev.filter((v) => v !== vidro) : [...prev, vidro]
    );
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedVidros.length === 0) {
      setFeedback({ type: 'error', message: 'Selecione pelo menos um vidro para a aplicação.' });
      return;
    }

    const formElement = event.currentTarget;
    setSending(true);
    setFeedback(null);
    const form = new FormData(formElement);

    const dataHoraRaw = String(form.get('dataHoraAgendamento') || '');
    const [dataParte, horaParte] = dataHoraRaw.split('T');
    const horarioFormatado = horaParte ? `${horaParte}h` : 'Horário a combinar';

    try {
      await addDoc(collection(db, 'agendamentos'), {
        clienteNome: String(form.get('nome')).trim(),
        clienteTelefone: telefone.trim(),
        veiculo: `${String(form.get('veiculo')).trim()} · ${String(form.get('ano')).trim()}`,
        tipoPelicula: String(form.get('pelicula')),
        vidros: selectedVidros,
        dataAgendamento: dataParte || getTodayString(),
        horario: horarioFormatado,
        status: 'pendente',
        criadoEm: serverTimestamp(),
      });
      formElement.reset();
      setTelefone('');
      setSelectedVidros(['Vidros laterais', 'Vidro traseiro']);
      setFeedback({ type: 'success', message: 'Pedido enviado! Vamos chamar você no WhatsApp para confirmar o horário.' });
    } catch {
      setFeedback({ type: 'error', message: 'Não foi possível enviar agora. Tente novamente ou fale com a gente pelo WhatsApp.' });
    } finally {
      setSending(false);
    }
  }

  return (
    <main>
      <header className="absolute inset-x-0 top-0 z-20 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 md:px-8">
          <a href="#inicio" className="flex items-center gap-3" aria-label="JT Insufilm início">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-lime text-sm font-black tracking-tight text-ink">JT</span>
            <span className="text-sm font-bold uppercase tracking-[.2em]">Insufilm</span>
          </a>
          <nav className="hidden items-center gap-9 text-sm text-white/75 md:flex">
            <a className="transition hover:text-lime" href="#peliculas">Películas</a>
            <a className="transition hover:text-lime" href="#trabalho">Nosso trabalho</a>
            <a className="transition hover:text-lime" href="#agendar">Agendamento</a>
          </nav>
          <a href="#agendar" className="hidden rounded-full bg-lime px-5 py-3 text-sm font-bold text-ink transition hover:bg-white md:block">
            Fazer orçamento <ArrowRight className="ml-2 inline" size={16} />
          </a>
          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Abrir menu">
            {menuOpen ? <X /> : <Menu />}
          </button>
        </div>
        {menuOpen && (
          <nav className="grid gap-4 bg-ink px-6 py-5 md:hidden">
            <a href="#peliculas" onClick={() => setMenuOpen(false)}>Películas</a>
            <a href="#trabalho" onClick={() => setMenuOpen(false)}>Nosso trabalho</a>
            <a href="#agendar" onClick={() => setMenuOpen(false)}>Agendamento</a>
          </nav>
        )}
      </header>

      <section id="inicio" className="relative flex min-h-[760px] items-end overflow-hidden bg-ink pb-16 pt-32 text-white md:min-h-[820px] md:pb-24">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=2200&q=90')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/5" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/20" />
        <div className="relative mx-auto w-full max-w-7xl px-5 md:px-8">
          <p className="mb-6 flex items-center gap-3 text-xs font-bold uppercase tracking-[.25em] text-lime">
            <span className="h-px w-8 bg-lime" />Instalação premium · cuidado em cada detalhe
          </p>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[.98] tracking-[-.055em] sm:text-6xl md:text-8xl">
            Mais conforto.<br /><span className="text-lime">Mais proteção.</span>
          </h1>
          <p className="mt-7 max-w-lg text-base leading-7 text-white/70 md:text-lg">
            Películas automotivas instaladas com precisão para transformar sua experiência ao volante.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a href="#agendar" className="inline-flex items-center justify-center gap-3 rounded-full bg-lime px-7 py-4 text-sm font-bold text-ink transition hover:bg-white">
              Agende sua instalação <ArrowRight size={17} />
            </a>
            <a href="#peliculas" className="inline-flex items-center justify-center gap-2 rounded-full border border-white/30 px-7 py-4 text-sm font-semibold text-white transition hover:border-white">
              Conheça as películas
            </a>
          </div>
          <div className="mt-16 grid max-w-2xl grid-cols-3 gap-4 border-t border-white/20 pt-6 md:mt-20">
            {[['01', 'Controle térmico'], ['02', 'Proteção UV'], ['03', 'Privacidade']].map(([n, label]) => (
              <div key={n}>
                <span className="block text-xs text-lime">{n}</span>
                <span className="mt-2 block text-xs font-medium text-white/80 sm:text-sm">{label}</span>
              </div>
            ))}
          </div>
        </div>
        <a href="#peliculas" aria-label="Rolar para baixo" className="absolute bottom-9 right-8 hidden rounded-full border border-white/30 p-3 text-white md:block">
          <ArrowDown size={18} />
        </a>
      </section>

      <section className="bg-paper px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-[.9fr_1.1fr] md:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.22em] text-forest">O cuidado que seu carro merece</p>
            <h2 className="mt-5 text-4xl font-semibold leading-tight tracking-[-.045em] md:text-6xl">
              Dirija melhor,<br />em qualquer clima.
            </h2>
          </div>
          <p className="max-w-xl text-base leading-7 text-black/60 md:justify-self-end md:text-lg">
            A película certa reduz o calor, bloqueia os raios UV e deixa cada viagem mais confortável. Nossa equipe cuida de cada etapa, do primeiro corte à última conferência.
          </p>
        </div>
        <div className="mx-auto mt-14 grid max-w-7xl gap-4 md:mt-20 md:grid-cols-3">
          {[
            [ThermometerSun, 'Cabine mais fresca', 'Reduza a entrada de calor e aproveite um interior mais agradável.'],
            [Sun, 'Proteção UV', 'Ajude a proteger sua pele, o painel e os revestimentos do veículo.'],
            [ShieldCheck, 'Privacidade e segurança', 'Mais discrição no dia a dia e uma camada extra de proteção para os vidros.']
          ].map(([Icon, title, desc], i) => {
            const FeatureIcon = Icon as typeof ThermometerSun;
            return (
              <article key={String(title)} className="rounded-2xl border border-black/10 bg-white/60 p-7 md:p-9">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-lime">
                  <FeatureIcon size={22} />
                </span>
                <p className="mt-9 text-xs text-black/40">0{i + 1}</p>
                <h3 className="mt-2 text-xl font-semibold">{String(title)}</h3>
                <p className="mt-3 text-sm leading-6 text-black/55">{String(desc)}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="peliculas" className="bg-[#e9eae2] px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.22em] text-forest">Tecnologia para cada necessidade</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-.045em] md:text-6xl">Encontre sua película.</h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-black/55">A gente ajuda você a escolher o equilíbrio certo entre conforto, visual e proteção.</p>
          </div>
          <div className="mt-10 grid gap-5 md:mt-14 md:grid-cols-4">
            {films.map((film) => (
              <article key={film.number} className="group overflow-hidden rounded-2xl bg-white shadow-xs">
                <div
                  className="relative h-56 overflow-hidden bg-cover bg-center transition duration-500 group-hover:scale-[1.01]"
                  style={{ backgroundImage: `url(https://images.unsplash.com/${film.image}?auto=format&fit=crop&w=900&q=85)` }}
                >
                  <span className="absolute left-5 top-5 rounded-full bg-lime px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider">
                    {film.tag}
                  </span>
                  <span className="absolute bottom-5 right-5 text-xs font-semibold text-white">{film.number} / 04</span>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
                </div>
                <div className="p-6 md:p-7">
                  <h3 className="text-xl font-semibold">{film.title}</h3>
                  <p className="mt-3 min-h-12 text-sm leading-6 text-black/55">{film.description}</p>
                  <a href="#agendar" className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-forest">
                    Tenho interesse <ArrowRight size={16} />
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="trabalho" className="bg-ink px-5 py-20 text-white md:px-8 md:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.22em] text-lime">Feito com atenção</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-.045em] md:text-6xl">
                Trabalho que aparece<br className="hidden sm:block" /> nos detalhes.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-white/55">
              Cada carro recebe o mesmo cuidado: ambiente preparado, aplicação precisa e acabamento revisado.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-3 md:mt-16 md:grid-cols-4 md:gap-4">
            {['photo-1503376780353-7e6692767b70', 'photo-1486262715619-67b85e0b08d3', 'photo-1492144534655-ae79c964c9d7', 'photo-1503736334956-4c8f8e92946d'].map((image, i) => (
              <div
                key={image}
                className={`relative overflow-hidden rounded-xl bg-cover bg-center ${i === 0 ? 'col-span-2 h-64 md:h-80' : 'h-64 md:h-80'}`}
                style={{ backgroundImage: `url(https://images.unsplash.com/${image}?auto=format&fit=crop&w=900&q=85)` }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SEÇÃO DE AGENDAMENTO / ORÇAMENTO */}
      <section id="agendar" className="bg-lime px-5 py-20 md:px-8 md:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 md:grid-cols-[.8fr_1.2fr] md:gap-20">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.22em] text-forest">Vamos cuidar do seu carro?</p>
            <h2 className="mt-5 text-4xl font-semibold leading-tight tracking-[-.05em] md:text-6xl">
              Seu próximo<br />rolê começa<br />aqui.
            </h2>
            <p className="mt-6 max-w-sm text-base leading-7 text-ink/65">
              Conte pra gente o que você precisa. Entramos em contato para confirmar o horário e tirar suas dúvidas.
            </p>
            <div className="mt-9 flex items-center gap-3 text-sm font-semibold">
              <CheckCircle2 size={20} /> Atendimento feito por pessoas, sem complicação.
            </div>
          </div>

          <form onSubmit={handleSubmit} className="rounded-3xl bg-white p-6 shadow-soft sm:p-8 md:p-10">
            <div className="mb-7 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.18em] text-forest">Agendamento</p>
                <h3 className="mt-2 text-2xl font-bold text-ink">Peça seu orçamento</h3>
              </div>
              <span className="hidden h-11 w-11 place-items-center rounded-full bg-lime sm:grid">
                <ArrowRight size={19} />
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Seu nome">
                <input required name="nome" autoComplete="name" placeholder="Como podemos chamar?" className={inputClass} />
              </Field>

              <Field label="WhatsApp">
                <input
                  required
                  name="telefone"
                  inputMode="numeric"
                  value={telefone}
                  onChange={(e) => setTelefone(formatPhone(e.target.value))}
                  autoComplete="tel"
                  placeholder="(11) 99999-9999"
                  className={inputClass}
                />
              </Field>

              <Field label="Modelo do carro">
                <input required name="veiculo" placeholder="Ex.: Honda Civic" className={inputClass} />
              </Field>

              <Field label="Ano">
                <input required name="ano" inputMode="numeric" placeholder="Ex.: 2024" className={inputClass} />
              </Field>

              <div className="sm:col-span-2">
                <Field label="Película desejada">
                  <select required name="pelicula" defaultValue="" className={inputClass}>
                    <option value="" disabled>Selecione uma opção</option>
                    <option>Fumê Convencional</option>
                    <option>Fumê G5</option>
                    <option>Fumê G20</option>
                    <option>Fumê G35</option>
                  </select>
                </Field>
              </div>

              {/* SELEÇÃO DE VIDROS PARA APLICAÇÃO */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-black/65 mb-2">
                  Vidros para aplicação <span className="text-black/40 font-normal">(escolha um ou mais)</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {OPCOES_VIDROS.map((vidro) => {
                    const isChecked = selectedVidros.includes(vidro);
                    return (
                      <label
                        key={vidro}
                        onClick={() => toggleVidro(vidro)}
                        className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer select-none transition-all ${
                          isChecked
                            ? 'border-ink bg-ink/5 text-ink shadow-2xs font-semibold'
                            : 'border-black/10 bg-[#f7f7f3] text-black/60 hover:bg-white hover:border-black/20'
                        }`}
                      >
                        <div
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                            isChecked
                              ? 'border-ink bg-ink text-white'
                              : 'border-black/20 bg-white'
                          }`}
                        >
                          {isChecked && <Check size={11} strokeWidth={3} />}
                        </div>
                        <span className="text-xs">{vidro}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* CAMPO UNIFICADO DE DATA E HORÁRIO */}
              <div className="sm:col-span-2">
                <Field label="Data e horário de preferência">
                  <input
                    required
                    name="dataHoraAgendamento"
                    type="datetime-local"
                    min={`${getTodayString()}T00:00`}
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>

            {feedback && (
              <p
                role="status"
                className={`mt-5 flex items-start gap-2 rounded-xl p-3.5 text-sm ${
                  feedback.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'
                }`}
              >
                {feedback.type === 'success' && <Check size={17} className="mt-0.5 shrink-0" />}
                {feedback.message}
              </p>
            )}

            <button
              disabled={sending}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-ink px-6 py-4 text-sm font-bold text-white transition hover:bg-forest disabled:cursor-wait disabled:opacity-60 active:scale-[0.99]"
            >
              {sending ? 'Enviando...' : 'Solicitar agendamento'} <ArrowRight size={17} />
            </button>
            <p className="mt-4 text-center text-xs leading-5 text-black/45">
              Ao enviar, você autoriza nosso contato para combinar o serviço.
            </p>
          </form>
        </div>
      </section>

      <footer className="bg-ink px-5 py-10 text-white md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-7 sm:flex-row sm:items-center sm:justify-between">
          <a href="#inicio" className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-lime text-xs font-black text-ink">JT</span>
            <span className="text-xs font-bold uppercase tracking-[.2em]">Insufilm</span>
          </a>
          <p className="text-sm text-white/50">Películas automotivas com instalação profissional.</p>
          <div className="flex items-center gap-5">
            <a className="text-sm text-white/70 hover:text-lime" href={`https://wa.me/${phone}`} target="_blank" rel="noreferrer">
              Fale pelo WhatsApp
            </a>
            <a className="text-xs text-white/35 hover:text-white" href="/admin/login">
              Área do instalador
            </a>
          </div>
        </div>
        <div className="mx-auto mt-8 max-w-7xl border-t border-white/10 pt-6 text-xs text-white/35">
          © {new Date().getFullYear()} JT Insufilm. Todos os direitos reservados.
        </div>
      </footer>
    </main>
  );
}

const inputClass =
  'mt-2 w-full rounded-xl border border-black/10 bg-[#f7f7f3] px-4 py-3.5 text-sm text-ink outline-none transition placeholder:text-black/35 focus:border-forest focus:ring-2 focus:ring-forest/10';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-black/65">{label}{children}</label>;
}