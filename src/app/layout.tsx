import type { Metadata } from 'next';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles.css';

import { SiteFooter } from '../components/SiteFooter';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Planning Poko',
  description: 'Planning Poker para estimativa ágil'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css"
        />
      </head>
      <body>
        <Providers>
          <div className="app-shell">
            <div className="app-main">{children}</div>
            <SiteFooter />
          </div>
        </Providers>
      </body>
    </html>
  );
}

