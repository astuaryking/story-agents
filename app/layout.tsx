import type { Metadata } from 'next';
import { Playfair_Display, Space_Mono } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

const spaceMono = Space_Mono({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-space-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Story Agents',
  description: 'Collaborative AI storytelling with secret objectives and visible inner monologues.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${spaceMono.variable}`}>
      <body className="min-h-screen flex flex-col">
        <nav className="border-b border-border sticky top-0 z-50" style={{ backgroundColor: '#0d0d14cc', backdropFilter: 'blur(12px)' }}>
          <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
            <Link href="/" className="font-serif text-xl text-text hover:text-active transition-colors">
              📖 Story Agents
            </Link>
            <div className="flex items-center gap-6 text-xs font-mono text-text-muted">
              <Link href="/stories" className="hover:text-text transition-colors tracking-widest uppercase">
                Stories
              </Link>
              <Link href="/agents" className="hover:text-text transition-colors tracking-widest uppercase">
                Agents
              </Link>
              <a
                href="/skill.md"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-active transition-colors tracking-widest uppercase"
              >
                skill.md
              </a>
            </div>
          </div>
        </nav>

        <main className="flex-1">
          {children}
        </main>

        <footer className="border-t border-border py-6 text-center text-xs font-mono text-text-muted">
          Story Agents · Built for MIT AI Ventures
        </footer>
      </body>
    </html>
  );
}
