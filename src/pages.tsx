import type { JSX } from 'react';
import { BIO, CYBER, EPITECH, EXPERIENCES, FOCUS, FORMATION, LANGUAGES, LINKS, PERSO, SEARCH, SEARCH_CMD, SKILLS, type PageId } from './data/content';
import { Facts, PageTitle, Row, Rows, SearchLine, Section, Side, Stack } from './components/blocks';
import { Layout } from './components/Layout';

/* ---------- accueil ---------- */

function TermLine({ children }: { children: string }) {
  return (
    <p translate="no" className="text-[clamp(0.875rem,1.25vw,1.25rem)] font-bold [overflow-wrap:anywhere] [&+*]:mt-1.5 [*+&]:mt-[clamp(1.1rem,2.2vw,2rem)]">
      <span aria-hidden="true" className="text-accent">
        ${' '}
      </span>
      {children}
    </p>
  );
}

function Home() {
  return (
    <>
      <section aria-label="Présentation rapide" className="pt-2 sm:pt-5">
        <div className="overflow-hidden rounded-[0.6rem] border border-rule-strong bg-bg/55 backdrop-blur-[1px] shadow-[0_0_3rem_rgb(47_129_247/0.1)]">
          <div aria-hidden="true" className="relative flex items-center gap-2 border-b border-rule bg-panel/75 px-3.5 py-3">
            <span className="size-3 rounded-full bg-[#ff5f56]" />
            <span className="size-3 rounded-full bg-[#ffbd2e]" />
            <span className="size-3 rounded-full bg-[#27c93f]" />
            <span className="absolute inset-x-0 text-center font-mono text-xs text-dim sm:text-[0.8125rem]">rayane@epitech-nice: ~</span>
          </div>
          <div className="px-[clamp(1rem,3.2vw,3.5rem)] pb-[clamp(1.5rem,3.4vw,3.5rem)] pt-[clamp(1.25rem,3vw,3rem)] font-mono">
            <TermLine>whoami</TermLine>
            <h1 data-node="mid" className="flex flex-wrap items-baseline gap-x-[0.6em] font-normal">
              <span translate="no" className="text-[clamp(2.5rem,7.4vw,7rem)] font-bold leading-[1.05] text-accent [text-shadow:0_0_1.6rem_rgb(47_129_247/0.45)]">
                Rayane LALI
              </span>{' '}
              <span className="text-[clamp(1rem,1.9vw,1.9rem)] text-dim">étudiant en cybersécurité @ Epitech Nice</span>
            </h1>
            <TermLine>cat focus.txt</TermLine>
            <p className="text-[clamp(1rem,1.9vw,1.9rem)] text-link">{FOCUS}</p>
            <TermLine>{SEARCH_CMD}</TermLine>
            <p className="text-[clamp(1rem,1.9vw,1.9rem)]">
              {SEARCH}
              <span aria-hidden="true" className="ml-1 inline-block h-[1.1em] w-[0.6em] animate-blink bg-accent align-text-bottom" />
            </p>
          </div>
        </div>
      </section>

      <Section command="about_me" label="Présentation">
        <p className="max-w-[68ch] text-[1.1875rem] text-pretty">{BIO}</p>
      </Section>

      <Section command="tree ~" label="Contenu du site">
        <div className="tree grid gap-x-10 gap-y-8 font-mono text-[0.9375rem] md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1.1fr)]">
          <div>
            <a href="./projets.html" className="inline-flex min-h-11 items-center text-[1.1875rem] font-bold">
              projets/
            </a>
            <ul>
              {[
                ['cyber/', CYBER.map((p) => p.name)],
                ['epitech/', EPITECH.map((p) => p.name)],
                ['perso/', PERSO.map((p) => p.name)],
              ].map(([dir, items]) => (
                <li key={dir as string}>
                  <span className="font-bold text-accent">{dir}</span>
                  <ul>
                    {(items as string[]).map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <a href="./parcours.html" className="inline-flex min-h-11 items-center text-[1.1875rem] font-bold">
              parcours/
            </a>
            <ul>
              <li>
                <span className="font-bold text-accent">formation</span>
                <ul>
                  <li>Epitech Nice, Bachelor (2e année), 2025 – 2028</li>
                </ul>
              </li>
              <li>
                <span className="font-bold text-accent">expériences</span>
                <ul>
                  {EXPERIENCES.map((e) => (
                    <li key={e.short}>{e.short}</li>
                  ))}
                </ul>
              </li>
              <li>
                <span className="font-bold text-accent">langues</span>
                <ul>
                  {LANGUAGES.map((l) => (
                    <li key={l.label}>
                      {l.label} ({l.value})
                    </li>
                  ))}
                </ul>
              </li>
            </ul>
          </div>
          <div>
            <a href="./contact.html" className="inline-flex min-h-11 items-center text-[1.1875rem] font-bold">
              contact/
            </a>
            <ul>
              {Object.values(LINKS).map((l) => (
                <li key={l.href}>
                  <a href={l.href} rel={l.href.startsWith('http') ? 'noopener noreferrer' : undefined} translate="no">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>
    </>
  );
}

/* ---------- projets ---------- */

function Projects() {
  return (
    <>
      <PageTitle command="ls ./" label="projets" />

      <Section command="ls ./cyber" label="Cybersécurité">
        <Rows headers={['projet', 'ce qui a été fait', 'code']}>
          {CYBER.map((p) => (
            <Row key={p.name}>
              <div>
                <h3 translate="no" className="text-[1.0625rem]">
                  {p.name}
                </h3>
                {p.context && <p className="mt-0.5 text-sm text-dim">{p.context}</p>}
              </div>
              <div>
                <p className="max-w-[72ch] text-pretty">{p.description}</p>
                {p.stack && <Stack>{p.stack}</Stack>}
              </div>
              <Side value={p.repo ?? p.note ?? ''} />
            </Row>
          ))}
        </Rows>
      </Section>

      <Section command="ls ./epitech" label="Dev (Epitech)">
        <Rows headers={['projet', 'description', 'stack']}>
          {EPITECH.map((p) => (
            <Row key={p.name}>
              <h3 translate="no" className="text-[1.0625rem]">
                {p.name}
              </h3>
              <p className="max-w-[72ch] text-pretty">{p.description}</p>
              <Stack>{p.side as string}</Stack>
            </Row>
          ))}
        </Rows>
        <p className="mt-5 text-dim">Les repos Epitech sont privés&nbsp;: détails en entretien.</p>
      </Section>

      <Section command="ls ./perso" label="Perso et stages">
        <Rows headers={['projet', 'description', 'code']}>
          {PERSO.map((p) => (
            <Row key={p.name}>
              <h3 className="text-[1.0625rem]">{p.name}</h3>
              <p className="max-w-[72ch] text-pretty">{p.description}</p>
              <Side value={p.side} />
            </Row>
          ))}
        </Rows>
      </Section>
    </>
  );
}

/* ---------- parcours ---------- */

function Background() {
  return (
    <>
      <PageTitle command="cat " label="parcours" />

      <Section command="cat formation" label="Formation">
        <Facts items={FORMATION} />
      </Section>

      <Section command="cat experiences" label="Expériences">
        <Rows headers={['période', 'poste', 'lieu']} ordered>
          {EXPERIENCES.map((e) => (
            <Row key={e.short}>
              <p className="font-mono text-[0.9375rem] text-accent tabular-nums">{e.period}</p>
              <div>
                <h3 className="text-[1.0625rem]">{e.title}</h3>
                <p className="mt-1 max-w-[72ch] text-pretty">{e.description}</p>
              </div>
              <Side value={e.place} />
            </Row>
          ))}
        </Rows>
      </Section>

      <Section command="ls ./competences" label="Compétences">
        <ul className="grid grid-cols-2 gap-x-8 gap-y-2.5 font-mono text-sm sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] sm:text-[0.9375rem]">
          {SKILLS.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </Section>

      <Section command="cat langues" label="Langues">
        <Facts items={LANGUAGES} />
      </Section>

      <Section command="./recherche" label="Recherche">
        <SearchLine command={SEARCH_CMD} text={SEARCH}>
          <a href="./contact.html">Me contacter</a>
        </SearchLine>
      </Section>
    </>
  );
}

/* ---------- contact ---------- */

function Contact() {
  return (
    <>
      <PageTitle command="cat " label="contact" />

      <Section command="./recherche" label="Recherche">
        <SearchLine command={SEARCH_CMD} text={SEARCH} />
      </Section>

      <Section command="cat contact" label="Me contacter">
        <Facts
          big
          items={[
            { label: 'github', value: LINKS.github.href },
            { label: 'linkedin', value: LINKS.linkedin.href },
            { label: 'e-mail', value: LINKS.email.href },
          ]}
          render={(item) => {
            const link = Object.values(LINKS).find((l) => l.href === item.value)!;
            return (
              <a href={link.href} rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined} translate="no" className="inline-block py-1">
                {link.label}
              </a>
            );
          }}
        />
      </Section>
    </>
  );
}

const PAGES: Record<PageId, () => JSX.Element> = { index: Home, projets: Projects, parcours: Background, contact: Contact };

export function App({ page }: { page: PageId }) {
  const Page = PAGES[page];
  return (
    <Layout page={page}>
      <Page />
    </Layout>
  );
}
