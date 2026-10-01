import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'JR Insufilm | Proteção e estilo automotivo',
  description: 'Instalação profissional de películas automotivas. Agende seu atendimento com a JR Insufilm.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
