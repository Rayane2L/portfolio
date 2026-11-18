import type { ReactNode } from 'react';
import { LINKS, NAV, type PageId } from '../data/content';
import { Rail } from './Rail';

interface LayoutProps {
  page: PageId;
  children: ReactNode;
}

const navLink =
  'inline-flex min-h-11 items-center font-mono text-sm no-underline text-dim transition-colors duration-200 ease-out ' +
  'hover:text-accent-hi active:text-accent sm:text-[0.9375rem] sm:before:text-accent-mid sm:before:content-["./"]';

export function Layout({ page, children }: LayoutProps) {
  return (
    <>
      <a
        href="#contenu"
        className="absolute left-(--pad) top-0 z-20 -translate-y-[120%] bg-panel px-4 py-2.5 font-mono text-accent-hi focus:translate-y-0"
      >
        Aller au contenu
      </a>

      <header className="relative z-20 flex flex-wrap items-center justify-between gap-x-6 pt-1.5 pr-[max(var(--pad),env(safe-area-inset-right))] sm:py-3.5">
        <a
          href="./index.html"
          translate="no"
          className="inline-flex min-h-11 items-center font-mono font-bold text-ink no-underline hover:text-accent-hi active:text-accent"
        >
          <span className="grid w-(--rail) place-items-center">
            <img src="./assets/favicon.svg" width={28} height={28} alt="" className="block size-6 sm:size-7" />
          </span>
          <span>
            rayane<span className="text-accent">@</span>epitech-nice
          </span>
        </a>
        <nav aria-label="Navigation principale" className="pl-(--rail) sm:pl-0">
          <ul className="flex flex-wrap gap-x-4 sm:gap-x-6">
            {NAV.map((item) => (
              <li key={item.id}>
                <a
                  href={item.href}
                  aria-current={item.id === page ? 'page' : undefined}
                  className={`${navLink} aria-[current=page]:text-accent-hi aria-[current=page]:shadow-[inset_0_-2px_0_var(--color-accent)]`}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main id="contenu" className="grid flex-1 grid-cols-[var(--rail)_minmax(0,1fr)]">
        <Rail />
        <div className="pb-4 pr-[max(var(--pad),env(safe-area-inset-right))]">{children}</div>
      </main>

      <footer className="pt-12">
        <div className="wave h-18 sm:h-28" aria-hidden="true" />
        <div className="flex flex-wrap items-center justify-between gap-x-6 pb-[max(1rem,env(safe-area-inset-bottom))] pl-(--rail) pr-(--pad) pt-2 font-mono text-[0.8125rem] text-dim">
          <p>Rayane LALI, Epitech Nice</p>
          <ul className="flex gap-6">
            <li>
              <a href={LINKS.github.href} rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-dim">
                GitHub
              </a>
            </li>
            <li>
              <a href={LINKS.linkedin.href} rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-dim">
                LinkedIn
              </a>
            </li>
          </ul>
        </div>
      </footer>
    </>
  );
}
