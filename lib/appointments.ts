import type { Timestamp } from 'firebase/firestore';

export type AppointmentStatus = 'pendente' | 'confirmado' | 'concluido' | 'cancelado';

export type Appointment = {
  id: string;
  clienteNome: string;
  clienteTelefone: string;
  veiculo: string;
  tipoPelicula: string;
  dataAgendamento: string;
  horario: string;
  status: AppointmentStatus;
  criadoEm?: Timestamp;
};

export const statusLabels: Record<AppointmentStatus, string> = {
  pendente: 'Pendente',
  confirmado: 'Confirmado',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

export function toWhatsAppNumber(phone: string) {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('55') ? digits : `55${digits}`;
}
