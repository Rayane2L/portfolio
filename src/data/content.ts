// Tout le texte du site. Règles : ne rien inventer, « autour de Nice », pas d'emojis.

export type PageId = 'index' | 'projets' | 'parcours' | 'contact';

export interface NavItem {
  id: PageId;
  label: string;
  href: string;
}

export const NAV: NavItem[] = [
  { id: 'index', label: 'accueil', href: './index.html' },
  { id: 'projets', label: 'projets', href: './projets.html' },
  { id: 'parcours', label: 'parcours', href: './parcours.html' },
  { id: 'contact', label: 'contact', href: './contact.html' },
];

export const LINKS = {
  github: { label: 'github.com/Rayane2L', href: 'https://github.com/Rayane2L' },
  linkedin: { label: 'linkedin.com/in/rayane-lali', href: 'https://www.linkedin.com/in/rayane-lali' },
  email: { label: 'rayail06@gmail.com', href: 'mailto:rayail06@gmail.com' },
} as const;

export const FOCUS = 'pentest · CTF · détection & réponse · sécurité réseau';
export const SEARCH_CMD = './recherche --stage --alternance --zone="autour de Nice"';
export const SEARCH = 'Stage et alternance en cybersécurité, autour de Nice (ou remote)';

export const BIO =
  'Étudiant en cybersécurité en 2e année de Bachelor à Epitech Nice. Ce qui me motive : comprendre comment les systèmes fonctionnent pour savoir comment les attaquer, et donc comment les protéger. Je m’entraîne sur HackTheBox et lors des CTF d’Epitech, et je documente ma méthodologie et mes write-ups sur GitHub.';

export interface RepoLink {
  label: string;
  href: string;
}

export interface CyberProject {
  name: string;
  context?: string;
  description: string;
  stack?: string;
  repo?: RepoLink;
  note?: string;
}

export interface SimpleProject {
  name: string;
  description: string;
  side: string | RepoLink;
}

const repo = (name: string): RepoLink => ({ label: `Rayane2L/${name}`, href: `https://github.com/Rayane2L/${name}` });

export const CYBER: CyberProject[] = [
  {
    name: 'SentinelX',
    context: 'Epitech, binôme',
    description:
      'Volet cyber et détection d’une app de tickets : déploiement de Wazuh, règles de détection, plans d’attaque (bruteforce, SQLi, traversal, IDOR, SSRF, chaîné), runbooks, qualification d’alertes.',
    stack: 'Wazuh, Docker, Prometheus, Grafana',
    note: 'privé, détails en entretien',
  },
  {
    name: 'CTF Exegol',
    context: 'Epitech',
    description: '12 machines Boot2Root : reconnaissance, exploitation, élévation de privilèges, un write-up par machine.',
    stack: 'Exegol, Nmap, Gobuster, curl, netcat, John, Python',
    repo: repo('exegol-ctf-writeups'),
  },
  {
    name: 'OWASP Juice Shop',
    context: 'Epitech',
    description: '45 challenges (Broken Access Control, Injection, XSS, XXE, JWT…) avec méthodologie, risques et remédiation.',
    stack: 'Burp Suite',
    repo: repo('owasp-juice-shop-writeups'),
  },
  {
    name: 'Codename',
    context: 'Epitech',
    description: 'Durcissement d’un agent LLM et boîte à outils de prompt injection.',
    stack: 'Ollama, Python',
    note: 'privé, détails en entretien',
  },
  {
    name: 'HackTheBox',
    description: 'Write-ups de machines retired.',
    repo: repo('hackthebox'),
  },
];

export const EPITECH: SimpleProject[] = [
  { name: 'Jobryx', description: 'Moteur de recherche d’emploi tech. Rôle : backend et sécurité (JWT, RBAC, BDD).', side: 'TypeScript, Node.js, Docker' },
  { name: 'Persona', description: 'Newsletter personnalisée pilotée par un chatbot.', side: 'n8n, IA générative' },
  { name: 'TARDIS', description: 'Analyse et prédiction des retards SNCF (Random Forest) avec dashboard.', side: 'Python, pandas, scikit-learn' },
  { name: 'Mog Games', description: 'Launcher et jeux 2D en Java orienté objet.', side: 'Java' },
  { name: 'eTodo', description: 'Application fullstack de gestion de tâches.', side: 'Node.js, Express, MySQL, Docker' },
  { name: 'ELIZA', description: 'Bot Discord coach fitness avec LLM local.', side: 'Python, Ollama' },
  { name: 'Bookworm', description: 'Moteur NLP : livres vers fiches pour éditeurs.', side: 'Python' },
];

export const PERSO: SimpleProject[] = [
  { name: 'Instagram Followback Checker', description: 'Extension navigateur 100 % locale, privacy by design, licence MIT.', side: repo('instagram-followback-checker') },
  { name: 'Séances Team Nitro', description: 'Apps Script : séances d’athlé personnalisées envoyées sur WhatsApp.', side: 'privé' },
  { name: 'Tracker Air France', description: 'Suivi en temps réel des avions Air France.', side: 'stage 2026' },
  { name: 'Chatbot IA', description: 'Chatbot personnalisé basé sur l’API OpenAI.', side: 'stage Air France 2023' },
];

export interface Fact {
  label: string;
  value: string;
}

export const FORMATION: Fact[] = [
  { label: 'école', value: 'Epitech Nice' },
  { label: 'diplôme', value: 'Bachelor Informatique - Cybersécurité (2e année)' },
  { label: 'période', value: '2025 – 2028' },
  { label: 'spécialité', value: 'Cybersécurité : pentest, CTF, détection & réponse, sécurité réseau' },
];

export interface Experience {
  period: string;
  title: string;
  description: string;
  place: string;
  short: string;
}

export const EXPERIENCES: Experience[] = [
  {
    period: 'juin 2026, 1 mois',
    title: 'Stagiaire, Air France',
    description: 'Développement d’un tracker en temps réel des avions Air France.',
    place: 'Sophia Antipolis, service développement',
    short: 'Stagiaire, Air France, juin 2026',
  },
  {
    period: 'février – août 2025',
    title: 'Réceptionniste de nuit, IBIS hotel',
    description: 'Accueil, petits-déjeuners, bar, problèmes techniques.',
    place: 'Nice',
    short: 'Réceptionniste de nuit, IBIS hotel, février – août 2025',
  },
  {
    period: 'juin 2023, 1 mois',
    title: 'Stagiaire, Air France',
    description: 'Chatbot IA personnalisé basé sur l’API OpenAI.',
    place: 'service développement',
    short: 'Stagiaire, Air France, juin 2023',
  },
];

export const SKILLS = [
  'Cybersécurité', 'Tests d’intrusion', 'Python', 'Linux', 'Sécurité réseau', 'Bash', 'Wireshark', 'Burp Suite', 'Nmap',
  'CTF', 'Active Directory', 'Wazuh', 'Docker', 'JavaScript', 'IA', 'Java', 'Git',
];

export const LANGUAGES: Fact[] = [
  { label: 'Français', value: 'natif' },
  { label: 'Anglais', value: 'C1' },
  { label: 'Espagnol', value: 'B2' },
];
