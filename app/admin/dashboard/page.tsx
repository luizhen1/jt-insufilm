'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  onSnapshot,
  collection,
  query,
  orderBy,
  updateDoc,
  doc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LayoutGrid,
  ListFilter,
  LogOut,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import logoImg from '@/hooks/logo.png';

/* ==========================================================================
   TIPAGENS E INTERFACES DECLARADAS LOCALMENTE
   ========================================================================== */
type AppointmentStatus = 'pendente' | 'confirmado' | 'concluido' | 'cancelado';

interface Appointment {
  id: string;
  clienteNome: string;
  clienteTelefone: string;
  veiculo: string;
  tipoPelicula: string;
  vidros?: string[];
  dataAgendamento: string;
  horario: string;
  status: AppointmentStatus;
  criadoEm?: unknown;
}

const statusLabels: Record<AppointmentStatus, string> = {
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

function toWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 11) {
    return `55${digits}`;
  }
  return digits;
}

type Filter = 'todos' | 'hoje' | 'pendente' | 'confirmado' | 'concluido';
type ViewMode = 'list' | 'calendar';

const OPCOES_VIDROS = ['Para-brisa', 'Vidros laterais', 'Vidro traseiro'] as const;

const filters: { key: Filter; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'hoje', label: 'Hoje' },
  { key: 'pendente', label: 'Pendentes' },
  { key: 'confirmado', label: 'Confirmados' },
  { key: 'concluido', label: 'Concluídos' },
];

const getTodayString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

const getDefaultDateTimeString = (dateBase = getTodayString()) => {
  return `${dateBase}T09:00`;
};

const prettyDate = (value: string) => {
  if (!value) return 'Data a combinar';
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
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

const ITEMS_PER_PAGE = 5;

export default function Dashboard() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filter, setFilter] = useState<Filter>('todos');
  const [search, setSearch] = useState('');
  const [dataLoading, setDataLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalDefaultDateTime, setModalDefaultDateTime] = useState(getDefaultDateTimeString());
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Estados do formulário
  const [phoneInput, setPhoneInput] = useState('');
  const [selectedVidros, setSelectedVidros] = useState<string[]>(['Vidros laterais', 'Vidro traseiro']);

  // Estados do Calendário e Visualização
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Estado de Paginação
  const [currentPage, setCurrentPage] = useState(1);

  const notify = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotice({ msg, type });
    setTimeout(() => setNotice(null), 3500);
  };

  useEffect(() => {
    if (!loading && !user) router.replace('/admin/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'agendamentos'), orderBy('criadoEm', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        setAppointments(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Appointment));
        setDataLoading(false);
      },
      () => {
        notify('Erro ao sincronizar com Firestore.', 'error');
        setDataLoading(false);
      }
    );
  }, [user]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, search, selectedDay]);

  const stats = useMemo(() => {
    const today = getTodayString();
    const hojeCount = appointments.filter((a) => a.dataAgendamento === today).length;
    const pendentesCount = appointments.filter((a) => a.status === 'pendente').length;
    const concluidosCount = appointments.filter((a) => a.status === 'concluido').length;
    const g5Count = appointments.filter((a) =>
      a.tipoPelicula?.toLowerCase().includes('g5')
    ).length;
    return { hojeCount, pendentesCount, concluidosCount, g5Count, total: appointments.length };
  }, [appointments]);

  const visibleAppointments = useMemo(() => {
    return appointments
      .filter((item) => {
        if (selectedDay) {
          return item.dataAgendamento === selectedDay;
        }
        const fitsFilter =
          filter === 'todos' ||
          (filter === 'hoje' && item.dataAgendamento === getTodayString()) ||
          item.status === filter;

        const term = search.trim().toLowerCase();
        const vidrosStr = Array.isArray(item.vidros) ? item.vidros.join(' ') : '';
        const fitsSearch =
          !term ||
          `${item.clienteNome} ${item.veiculo} ${item.clienteTelefone} ${item.tipoPelicula} ${vidrosStr}`
            .toLowerCase()
            .includes(term);

        return fitsFilter && fitsSearch;
      })
      .sort((a, b) => `${a.dataAgendamento} ${a.horario}`.localeCompare(`${b.dataAgendamento} ${b.horario}`));
  }, [appointments, filter, search, selectedDay]);

  const totalPages = Math.ceil(visibleAppointments.length / ITEMS_PER_PAGE) || 1;

  const paginatedAppointments = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return visibleAppointments.slice(start, start + ITEMS_PER_PAGE);
  }, [visibleAppointments, currentPage]);

  const toggleVidro = (vidro: string) => {
    setSelectedVidros((prev) =>
      prev.includes(vidro) ? prev.filter((v) => v !== vidro) : [...prev, vidro]
    );
  };

  async function changeStatus(item: Appointment, status: AppointmentStatus) {
    try {
      await updateDoc(doc(db, 'agendamentos', item.id), { status });
      notify(`Status de ${item.clienteNome} alterado para ${statusLabels[status]}.`);
    } catch {
      notify('Não foi possível atualizar o status.', 'error');
    }
  }

  async function addManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedVidros.length === 0) {
      notify('Selecione pelo menos um vidro para a aplicação.', 'error');
      return;
    }

    setSaving(true);
    const form = new FormData(event.currentTarget);
    const dataHoraRaw = String(form.get('dataHoraAgendamento') || '');
    
    // Separa a data (YYYY-MM-DD) da hora (HH:mm)
    const [dataParte, horaParte] = dataHoraRaw.split('T');
    const horarioFormatado = horaParte ? `${horaParte}h` : 'Horário a combinar';

    try {
      await addDoc(collection(db, 'agendamentos'), {
        clienteNome: String(form.get('clienteNome')).trim(),
        clienteTelefone: phoneInput.trim(),
        veiculo: String(form.get('veiculo')).trim(),
        tipoPelicula: String(form.get('tipoPelicula')),
        vidros: selectedVidros,
        dataAgendamento: dataParte || getTodayString(),
        horario: horarioFormatado,
        status: String(form.get('status')),
        criadoEm: serverTimestamp(),
      });
      setShowModal(false);
      setPhoneInput('');
      setSelectedVidros(['Vidros laterais', 'Vidro traseiro']);
      notify('Agendamento salvo com sucesso!');
    } catch {
      notify('Erro ao salvar agendamento.', 'error');
    } finally {
      setSaving(false);
    }
  }

  const openNewForDate = (dateStr: string) => {
    setModalDefaultDateTime(getDefaultDateTimeString(dateStr));
    setPhoneInput('');
    setSelectedVidros(['Vidros laterais', 'Vidro traseiro']);
    setShowModal(true);
  };

  if (loading || !user) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f8fafc] text-slate-500">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
          <p className="text-sm font-medium">Carregando painel do instalador...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] pb-24 text-slate-900 md:pb-12">
      {/* Topo / Navbar */}
      <header className="sticky top-0 z-20 border-b border-slate-200/90 bg-slate-100/90 backdrop-blur-md shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200/90 bg-white p-1 shadow-xs">
              <Image
                src={logoImg}
                alt="Logo Insufilm Pro"
                className="h-full w-full object-contain"
                priority
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-extrabold tracking-tight text-slate-900">INSUFILM PRO</p>
                <span className="hidden sm:inline-block rounded-full bg-emerald-100/70 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 border border-emerald-300/60">
                  Online
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500">Gestão e Agendamento de Películas</p>
            </div>
          </div>

          <div className="flex items-center">
            <button
              onClick={() => signOut(auth)}
              className="flex items-center gap-2 rounded-xl border border-slate-300/80 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:border-rose-200 hover:bg-rose-50/70 hover:text-rose-600 active:scale-95"
            >
              <LogOut size={15} />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
        {notice && (
          <div
            className={`mb-5 flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all ${
              notice.type === 'error'
                ? 'border border-rose-200 bg-rose-50 text-rose-800'
                : 'border border-emerald-200 bg-emerald-50 text-emerald-800'
            }`}
          >
            <span>{notice.msg}</span>
            <button onClick={() => setNotice(null)} className="text-xs font-bold opacity-60 hover:opacity-100">
              ✕
            </button>
          </div>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Painel de Atendimentos
            </h1>
            <p className="text-sm text-slate-500">
              Gerencie seus carros agendados, horários de aplicação e orçamentos.
            </p>
          </div>
          <button
            onClick={() => {
              setModalDefaultDateTime(getDefaultDateTimeString());
              setPhoneInput('');
              setSelectedVidros(['Vidros laterais', 'Vidro traseiro']);
              setShowModal(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-95"
          >
            <Plus size={18} /> Novo Agendamento
          </button>
        </div>

        {/* CARDS DE KPI / MÉTRICAS */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium">Agendados Hoje</span>
              <CalendarDays size={16} className="text-blue-600" />
            </div>
            <p className="mt-2 text-2xl font-black text-slate-900">{stats.hojeCount}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">Atendimentos no dia</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium">Pendentes</span>
              <Clock3 size={16} className="text-amber-500" />
            </div>
            <p className="mt-2 text-2xl font-black text-amber-600">{stats.pendentesCount}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">Aguardando confirmação</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium">Concluídos</span>
              <Check size={16} className="text-emerald-600" />
            </div>
            <p className="mt-2 text-2xl font-black text-emerald-600">{stats.concluidosCount}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">Películas instaladas</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium">Fumê G5</span>
              <Sparkles size={16} className="text-indigo-600" />
            </div>
            <p className="mt-2 text-2xl font-black text-indigo-600">{stats.g5Count}</p>
            <p className="mt-0.5 text-[11px] text-slate-400">Linha escura mais pedida</p>
          </div>
        </div>

        {/* Filtros e Barra de Busca */}
        <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
            <div className="flex rounded-lg bg-slate-100 p-0.5">
              <button
                onClick={() => {
                  setViewMode('list');
                  setSelectedDay(null);
                }}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  viewMode === 'list' && !selectedDay
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <ListFilter size={14} /> Lista
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                  viewMode === 'calendar'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <LayoutGrid size={14} /> Calendário
              </button>
            </div>

            <div className="h-5 w-[1px] bg-slate-200 mx-1 hidden sm:block" />

            {viewMode === 'list' && !selectedDay && (
              <div className="flex items-center gap-1">
                {filters.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      filter === key
                        ? 'bg-slate-900 text-white font-semibold'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {label}
                    {key === 'pendente' && stats.pendentesCount > 0 && (
                      <span className="ml-1.5 rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[10px] font-bold text-amber-700">
                        {stats.pendentesCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {selectedDay && (
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
                  Filtrado pelo dia: {prettyDate(selectedDay)}
                </span>
                <button
                  onClick={() => setSelectedDay(null)}
                  className="text-xs text-slate-500 hover:text-slate-800 underline"
                >
                  Limpar
                </button>
              </div>
            )}
          </div>

          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente, carro ou película..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white sm:w-72"
            />
          </div>
        </div>

        {/* VISUALIZAÇÃO CALENDÁRIO */}
        {viewMode === 'calendar' && (
          <div className="mt-4 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-xs">
            <CalendarMonthView
              currentDate={currentCalendarDate}
              setCurrentDate={setCurrentCalendarDate}
              appointments={appointments}
              selectedDay={selectedDay}
              onSelectDay={(day) => setSelectedDay(day === selectedDay ? null : day)}
              onQuickAdd={openNewForDate}
            />
          </div>
        )}

        {/* VISUALIZAÇÃO LISTA */}
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between px-1">
            <p className="text-xs font-semibold text-slate-500">
              {visibleAppointments.length} {visibleAppointments.length === 1 ? 'atendimento listado' : 'atendimentos listados'}
              {visibleAppointments.length > ITEMS_PER_PAGE && (
                <span className="ml-1 text-slate-400 font-normal">
                  (Página {currentPage} de {totalPages})
                </span>
              )}
            </p>
            <p className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Sincronizado
            </p>
          </div>

          {dataLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-400">
              Carregando agendamentos...
            </div>
          ) : visibleAppointments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-4 py-16 text-center">
              <CalendarDays size={32} className="mx-auto text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-slate-700">Nenhum agendamento encontrado</p>
              <p className="mt-1 text-xs text-slate-400">
                {selectedDay
                  ? `Nenhum agendamento para o dia ${prettyDate(selectedDay)}.`
                  : 'Tente alterar os filtros de busca ou adicione um novo.'}
              </p>
              {selectedDay && (
                <button
                  onClick={() => openNewForDate(selectedDay)}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-xs"
                >
                  <Plus size={14} /> Agendar neste dia
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid gap-3">
                {paginatedAppointments.map((item) => (
                  <AppointmentCard key={item.id} item={item} onStatus={changeStatus} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200/80 pt-4 px-1">
                  <p className="text-xs text-slate-500">
                    Mostrando{' '}
                    <span className="font-semibold text-slate-700">
                      {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                    </span>{' '}
                    a{' '}
                    <span className="font-semibold text-slate-700">
                      {Math.min(currentPage * ITEMS_PER_PAGE, visibleAppointments.length)}
                    </span>{' '}
                    de <span className="font-semibold text-slate-700">{visibleAppointments.length}</span> atendimentos
                  </p>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft size={14} />
                      <span className="hidden sm:inline">Anterior</span>
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`h-8 w-8 rounded-xl text-xs font-semibold transition ${
                            currentPage === page
                              ? 'bg-slate-900 text-white shadow-xs'
                              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {page}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span className="hidden sm:inline">Próximo</span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Botão Flutuante Mobile */}
      <button
        onClick={() => {
          setModalDefaultDateTime(getDefaultDateTimeString());
          setPhoneInput('');
          setSelectedVidros(['Vidros laterais', 'Vidro traseiro']);
          setShowModal(true);
        }}
        aria-label="Novo agendamento"
        className="fixed bottom-6 right-6 z-30 grid h-14 w-14 place-items-center rounded-2xl bg-slate-900 text-lime-400 shadow-xl sm:hidden"
      >
        <Plus size={24} />
      </button>

      {/* MODAL DE CADASTRO COM DATA E HORA UNIFICADOS */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 backdrop-blur-xs p-0 sm:items-center sm:p-5"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:max-w-2xl sm:rounded-2xl sm:p-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Oficina / Estética</p>
                <h2 className="text-xl font-extrabold text-slate-900">Novo Agendamento</h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                aria-label="Fechar"
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={addManual} className="mt-6 grid gap-5 sm:grid-cols-2">
              <MiniField label="Nome do Cliente">
                <input required name="clienteNome" className={miniInput} placeholder="Ex: Lucas Mendes" />
              </MiniField>

              <MiniField label="WhatsApp / Telefone">
                <input
                  required
                  name="clienteTelefone"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(formatPhone(e.target.value))}
                  inputMode="numeric"
                  className={miniInput}
                  placeholder="(11) 99999-9999"
                />
              </MiniField>

              <MiniField label="Veículo (Modelo e Ano)">
                <input required name="veiculo" className={miniInput} placeholder="Ex: Corolla Cross 2024" />
              </MiniField>

              <MiniField label="Película Desejada">
                <select name="tipoPelicula" className={miniInput}>
                  <option>Fumê Convencional</option>
                  <option>Fumê G5</option>
                  <option>Fumê G20</option>
                  <option>Fumê G35</option>
                </select>
              </MiniField>

              {/* SELEÇÃO DE VIDROS PARA APLICAÇÃO */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-2">
                  Vidros para Aplicação <span className="text-slate-400 font-normal">(escolha um ou mais)</span>
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
                            ? 'border-slate-900 bg-slate-900/5 text-slate-900 shadow-2xs'
                            : 'border-slate-200 bg-slate-50/50 text-slate-600 hover:border-slate-300 hover:bg-white'
                        }`}
                      >
                        <div
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                            isChecked
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isChecked && <Check size={11} strokeWidth={3} />}
                        </div>
                        <span className="text-xs font-bold">{vidro}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* NOVO CAMPO: DATA E HORÁRIO DO ATENDIMENTO JUNTOS */}
              <div className="sm:col-span-2">
                <MiniField label="Data e Horário do Atendimento">
                  <input
                    required
                    name="dataHoraAgendamento"
                    type="datetime-local"
                    defaultValue={modalDefaultDateTime}
                    min={`${getTodayString()}T00:00`}
                    className={miniInput}
                  />
                </MiniField>
              </div>

              <div className="sm:col-span-2">
                <MiniField label="Status Inicial">
                  <select name="status" className={miniInput}>
                    <option value="confirmado">Confirmado</option>
                    <option value="pendente">Pendente de Confirmação</option>
                  </select>
                </MiniField>
              </div>

              <div className="mt-3 sm:col-span-2">
                <button
                  disabled={saving}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:opacity-50 active:scale-[0.99]"
                >
                  {saving ? 'Cadastrando...' : 'Confirmar e Salvar Agendamento'} <Check size={17} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

/* ==========================================================================
   COMPONENTE DO CALENDÁRIO MENSAL
   ========================================================================== */
function CalendarMonthView({
  currentDate,
  setCurrentDate,
  appointments,
  selectedDay,
  onSelectDay,
  onQuickAdd,
}: {
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
  appointments: Appointment[];
  selectedDay: string | null;
  onSelectDay: (dayStr: string) => void;
  onQuickAdd: (dayStr: string) => void;
}) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  const monthName = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const appointmentsByDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    for (const item of appointments) {
      if (!item.dataAgendamento) continue;
      if (!map[item.dataAgendamento]) map[item.dataAgendamento] = [];
      map[item.dataAgendamento].push(item);
    }
    return map;
  }, [appointments]);

  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = getTodayString();

  const calendarDays = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarDays.push({ dayNumber: d, dateStr });
  }

  const weekHeaders = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
        <div>
          <h3 className="capitalize text-lg font-bold text-slate-900">{monthName}</h3>
          <p className="text-xs text-slate-500">Selecione um dia para ver os veículos agendados ou criar um novo.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Hoje
          </button>
          <div className="flex items-center rounded-lg border border-slate-200 bg-white">
            <button
              onClick={prevMonth}
              aria-label="Mês anterior"
              className="p-1.5 text-slate-600 hover:bg-slate-50 rounded-l-lg border-r border-slate-200"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={nextMonth}
              aria-label="Próximo mês"
              className="p-1.5 text-slate-600 hover:bg-slate-50 rounded-r-lg"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 sm:gap-2">
        {weekHeaders.map((header) => (
          <div key={header} className="py-1 text-center text-xs font-semibold text-slate-400">
            {header}
          </div>
        ))}

        {calendarDays.map((cell, idx) => {
          if (!cell) {
            return <div key={`empty-${idx}`} className="min-h-[75px] rounded-xl bg-slate-50/50" />;
          }

          const dayAppts = appointmentsByDate[cell.dateStr] || [];
          const isToday = cell.dateStr === todayStr;
          const isSelected = cell.dateStr === selectedDay;

          return (
            <div
              key={cell.dateStr}
              onClick={() => onSelectDay(cell.dateStr)}
              className={`group relative flex min-h-[85px] sm:min-h-[100px] flex-col justify-between rounded-xl border p-2 transition cursor-pointer ${
                isSelected
                  ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-500/20'
                  : isToday
                  ? 'border-slate-900 bg-slate-50/70'
                  : 'border-slate-100 bg-white hover:border-slate-300 hover:bg-slate-50/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    isToday
                      ? 'bg-slate-900 text-white'
                      : isSelected
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-700'
                  }`}
                >
                  {cell.dayNumber}
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickAdd(cell.dateStr);
                  }}
                  title="Agendar neste dia"
                  className="opacity-0 group-hover:opacity-100 rounded-md p-1 hover:bg-slate-200 text-slate-600 transition"
                >
                  <Plus size={12} />
                </button>
              </div>

              <div className="mt-1 space-y-1">
                {dayAppts.slice(0, 2).map((a) => (
                  <div
                    key={a.id}
                    className={`truncate rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                      a.status === 'concluido'
                        ? 'bg-emerald-100 text-emerald-800'
                        : a.status === 'confirmado'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {a.veiculo.split(' ')[0]} - {a.clienteNome.split(' ')[0]}
                  </div>
                ))}
                {dayAppts.length > 2 && (
                  <p className="text-[10px] font-bold text-slate-500 pl-1">
                    +{dayAppts.length - 2} mais
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ==========================================================================
   CARD DE AGENDAMENTO
   ========================================================================== */
function AppointmentCard({
  item,
  onStatus,
}: {
  item: Appointment;
  onStatus: (item: Appointment, status: AppointmentStatus) => void;
}) {
  const [menu, setMenu] = useState(false);

  const statusStyle: Record<AppointmentStatus, { bg: string; text: string; dot: string }> = {
    pendente: { bg: 'bg-amber-50', text: 'text-amber-800', dot: 'bg-amber-500' },
    confirmado: { bg: 'bg-blue-50', text: 'text-blue-800', dot: 'bg-blue-500' },
    concluido: { bg: 'bg-emerald-50', text: 'text-emerald-800', dot: 'bg-emerald-500' },
    cancelado: { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  };

  const currentStatusConfig = statusStyle[item.status] || statusStyle.pendente;
  const wa = toWhatsAppNumber(item.clienteTelefone);
  const vidrosTexto = Array.isArray(item.vidros) && item.vidros.length > 0 ? item.vidros.join(', ') : '';

  const message = encodeURIComponent(
    `Olá ${item.clienteNome}! Tudo bem? Sobre a aplicação de película (${item.tipoPelicula}${
      vidrosTexto ? ` em: ${vidrosTexto}` : ''
    }) no seu ${item.veiculo} agendada para ${prettyDate(item.dataAgendamento)} às ${item.horario}.`
  );

  return (
    <article className="group rounded-2xl border border-slate-200/80 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">{item.clienteNome}</h2>

            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${currentStatusConfig.bg} ${currentStatusConfig.text}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${currentStatusConfig.dot}`} />
              {statusLabels[item.status]}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span className="font-semibold text-slate-800">{item.veiculo}</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500">{item.tipoPelicula}</span>

            {Array.isArray(item.vidros) && item.vidros.length > 0 && (
              <>
                <span className="text-slate-300">•</span>
                <div className="flex flex-wrap gap-1">
                  {item.vidros.map((v) => (
                    <span
                      key={v}
                      className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 border border-slate-200/60"
                    >
                      {v}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <CalendarDays size={14} className="text-slate-400" />
              {prettyDate(item.dataAgendamento)}
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Clock3 size={14} className="text-slate-400" />
              {item.horario}
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Phone size={14} className="text-slate-400" />
              {item.clienteTelefone}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t border-slate-100 pt-3 sm:border-0 sm:pt-0">
          <a
            href={`https://wa.me/${wa}?text=${message}`}
            target="_blank"
            rel="noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 sm:flex-none"
          >
            <MessageCircle size={15} /> WhatsApp
          </a>

          <div className="relative">
            <button
              onClick={() => setMenu(!menu)}
              className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Status <ChevronDown size={14} />
            </button>

            {menu && (
              <>
                <button
                  className="fixed inset-0 z-30 cursor-default"
                  aria-label="Fechar menu"
                  onClick={() => setMenu(false)}
                />
                <div className="absolute right-0 top-11 z-40 w-44 rounded-xl border border-slate-100 bg-white p-1.5 shadow-xl">
                  {(['pendente', 'confirmado', 'concluido', 'cancelado'] as AppointmentStatus[]).map((st) => (
                    <button
                      key={st}
                      onClick={() => {
                        setMenu(false);
                        onStatus(item, st);
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      {statusLabels[st]}
                      {item.status === st && <Check size={14} className="text-slate-900" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

const miniInput =
  'mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-3 text-sm text-slate-800 outline-none transition focus:border-slate-900 focus:bg-white';

function MiniField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-slate-600">
      {label}
      {children}
    </label>
  );
}