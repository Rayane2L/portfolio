import type { ReactNode } from 'react';
import type { Fact, RepoLink } from '../data/content';

/* ---------- titres ---------- */

interface PageTitleProps {
  command: string;
  label: string;
}

/** Titre de page en forme de commande : « $ ls ./projets ». Le texte lu est le libellé seul. */
export function PageTitle({ command, label }: PageTitleProps) {
  return (
    <h1 data-node="mid" className="pt-7 text-[clamp(1.75rem,4.6vw,4rem)] font-bold">
      <span aria-hidden="true" className="text-accent">
        ${' '}
      </span>
      <span aria-hidden="true">{command}</span>
      {label}
      <span aria-hidden="true" className="ml-1 inline-block h-[1.1em] w-[0.6em] animate-blink bg-accent align-text-bottom" />
    </h1>
  );
}

interface SectionProps {
  command: string;
  label: string;
  children: ReactNode;
}

/** Section avec son titre-commande ; sur grand écran le titre reste visible pendant la lecture. */
export function Section({ command, label, children }: SectionProps) {
  return (
    <section data-node className="mt-[clamp(2.5rem,4.5vw,4.5rem)] border-t border-rule pt-7 xl:grid xl:grid-cols-[13.5rem_minmax(0,1fr)] xl:gap-x-8">
      <h2 className="mb-6 flex flex-col gap-0.5 xl:sticky xl:top-6 xl:mb-0 xl:self-start">
        <span aria-hidden="true" className="text-lg font-bold text-accent">
          &gt; {command}
        </span>
        <span className="font-sans text-[0.9375rem] font-normal text-dim">{label}</span>
      </h2>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

/* ---------- listes en colonnes ---------- */

interface RowsProps {
  headers: [string, string, string];
  ordered?: boolean;
  children: ReactNode;
}

export const rowGrid = 'grid gap-x-8 gap-y-1.5 md:grid-cols-[minmax(0,1.2fr)_minmax(0,3.2fr)_minmax(0,1.7fr)] md:items-baseline';

export function Rows({ headers, ordered, children }: RowsProps) {
  const List = ordered ? 'ol' : 'ul';
  return (
    <>
      <div aria-hidden="true" className={`${rowGrid} hidden border-b border-rule-strong pb-2.5 font-mono text-[0.8125rem] text-dim md:grid`}>
        {headers.map((h) => (
          <span key={h}>{h}</span>
        ))}
      </div>
      <List className="border-t border-rule md:border-t-0">{children}</List>
    </>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <li className={`${rowGrid} border-b border-rule py-4 [&>*]:min-w-0`}>{children}</li>;
}

export function Stack({ children }: { children: ReactNode }) {
  return (
    <p translate="no" className="mt-2 font-mono text-sm text-accent md:mt-0">
      {children}
    </p>
  );
}

interface SideProps {
  value: string | RepoLink;
}

/** Colonne de droite : lien vers le repo, ou mention (privé, stage…). */
export function Side({ value }: SideProps) {
  return (
    <p className="font-mono text-sm text-dim [overflow-wrap:anywhere] tabular-nums">
      {typeof value === 'string' ? (
        value
      ) : (
        <a href={value.href} rel="noopener noreferrer" translate="no" className="inline-block py-1">
          {value.label}
        </a>
      )}
    </p>
  );
}

/* ---------- faits clés ---------- */

interface FactsProps {
  items: Fact[];
  big?: boolean;
  render?: (item: Fact) => ReactNode;
}

export function Facts({ items, big, render }: FactsProps) {
  return (
    <dl className="grid grid-cols-[repeat(auto-fit,minmax(8.5rem,1fr))] gap-x-6 gap-y-5 sm:grid-cols-[repeat(auto-fit,minmax(13rem,1fr))] sm:gap-x-10 sm:gap-y-6">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="font-mono text-[0.8125rem] text-dim">{item.label}</dt>
          <dd className={`mt-1 [overflow-wrap:anywhere] ${big ? 'font-mono text-[clamp(1rem,1.5vw,1.5rem)]' : 'text-lg'}`}>
            {render ? render(item) : item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/* ---------- ligne de recherche ---------- */

export function SearchLine({ command, text, children }: { command: string; text: string; children?: ReactNode }) {
  return (
    <div>
      <p translate="no" className="font-mono font-bold [overflow-wrap:anywhere]">
        <span aria-hidden="true" className="text-accent">
          ${' '}
        </span>
        {command}
      </p>
      <p className="mt-2.5 text-[1.1875rem]">
        {text}. {children}
      </p>
    </div>
  );
}
