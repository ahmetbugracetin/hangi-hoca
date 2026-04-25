import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Hangi Hoca | ODTÜ Hoca Değerlendirme',
  description:
    'ODTÜ hocalarını değerlendir, en iyi hocayı bul. Anonim hoca yorumları ve puanları.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className="bg-bg-primary text-text-primary font-sans min-h-screen">
        <Navbar />
        <main className="pt-16">{children}</main>
      </body>
    </html>
  );
}
