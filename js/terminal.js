// Terminal de la page d'accueil : rejoue l'intro puis accepte des commandes.
// Tout le texte est inséré avec textContent : aucune saisie n'est interprétée comme du HTML.
(function () {
  'use strict';

  var body = document.getElementById('term-body');
  var out = document.getElementById('term-out');
  var form = document.getElementById('term-form');
  var input = document.getElementById('term-input');
  var typed = document.getElementById('term-typed');
  var quick = document.getElementById('quick');
  if (!body || !out || !form || !input || !typed) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var PAGES = { projets: 'projets.html', parcours: 'parcours.html', contact: 'contact.html', accueil: 'index.html' };
  var SEARCH_CMD = './recherche --stage --alternance --zone="autour de Nice"';
  var COMPLETIONS = [
    'help', 'whoami', 'cat about_me', 'cat focus.txt', 'cat parcours', 'cat contact',
    'ls', 'ls projets', 'cd projets', 'cd parcours', 'cd contact', 'clear', SEARCH_CMD
  ];

  /* ---------- construction des lignes ---------- */
  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }
  function link(href, text) {
    var a = el('a', null, text);
    a.href = href;
    if (/^https:/.test(href)) a.rel = 'noopener noreferrer';
    return a;
  }
  // Une ligne = liste de morceaux : chaîne, [classe, texte] ou noeud DOM.
  function line(parts) {
    var div = el('div');
    parts.forEach(function (part) {
      if (typeof part === 'string') div.appendChild(document.createTextNode(part));
      else if (Array.isArray(part)) div.appendChild(el('span', part[0], part[1]));
      else div.appendChild(part);
    });
    return div;
  }
  function sub(text) {
    return el('div', 't-sub', text);
  }
  function scrollDown() {
    body.scrollTop = body.scrollHeight;
  }
  function echo(cmd) {
    var ln = el('div', 'ln');
    ln.appendChild(el('span', 'ps1', '$'));
    ln.appendChild(document.createTextNode(' '));
    var span = el('span', 'cmd', cmd);
    ln.appendChild(span);
    out.appendChild(ln);
    return span;
  }
  function print(lines) {
    if (!lines || !lines.length) return;
    var block = el('div', 'out');
    lines.forEach(function (l) { block.appendChild(l); });
    out.appendChild(block);
    scrollDown();
  }

  /* ---------- contenu des commandes ---------- */
  function whoami() {
    return [line([['who-name', 'Rayane LALI'], ' ', ['who-role', 'étudiant en cybersécurité @ Epitech Nice']])];
  }
  function focus() {
    return [line([['t-blue', 'pentest · CTF · détection & réponse · sécurité réseau']])];
  }
  function recherche() {
    return [line(['Stage, puis alternance en cybersécurité, autour de Nice (ou remote)'])];
  }
  function about() {
    return [line(["Étudiant en cybersécurité en 2e année de Bachelor à Epitech Nice. Ce qui me motive : comprendre comment les systèmes fonctionnent pour savoir comment les attaquer, et donc comment les protéger. Je m'entraîne sur HackTheBox et lors des CTF d'Epitech, et je documente ma méthodologie et mes write-ups sur GitHub."])];
  }
  function help() {
    var rows = [
      ['whoami', 'qui je suis'],
      ['cat about_me', 'présentation'],
      ['cat focus.txt', 'spécialité'],
      ['ls projets', 'liste des projets'],
      ['cat parcours', 'formation et expériences'],
      ['cat contact', 'me contacter'],
      ['cd <page>', 'ouvrir projets, parcours ou contact'],
      ['clear', 'vider le terminal']
    ];
    return rows.map(function (r) {
      return line([['t-green', (r[0] + '                ').slice(0, 16)], ['t-muted', r[1]]]);
    });
  }
  function ls() {
    return [line([
      'about_me  focus.txt  ',
      ['t-dir', 'projets/'], '  ', ['t-dir', 'parcours/'], '  ', ['t-dir', 'contact/'], '  ',
      ['t-green', 'recherche*']
    ])];
  }
  function projets() {
    return [
      line([['t-dir', './cyber']]),
      sub('SentinelX · CTF Exegol · OWASP Juice Shop · Codename · HackTheBox'),
      line([['t-dir', './epitech']]),
      sub('Jobryx · Persona · TARDIS · Mog Games · eTodo · ELIZA · Bookworm'),
      line([['t-dir', './perso']]),
      sub('Instagram Followback Checker · Séances Team Nitro · Tracker Air France · Chatbot IA'),
      line([['t-muted', 'détails : '], link(PAGES.projets, 'cd projets')])
    ];
  }
  function parcours() {
    return [
      line([['t-dir', 'formation']]),
      sub('Epitech Nice, Bachelor (2e année), 2025 – 2028'),
      line([['t-dir', 'expériences']]),
      sub('juin 2026 · Stagiaire, Air France, Sophia Antipolis'),
      sub('février – août 2025 · Réceptionniste de nuit, IBIS hotel, Nice'),
      sub('juin 2023 · Stagiaire, Air France'),
      line([['t-dir', 'langues']]),
      sub('Français (natif), Anglais (C1), Espagnol (B2)'),
      line([['t-muted', 'détails : '], link(PAGES.parcours, 'cd parcours')])
    ];
  }
  function contact() {
    return [
      line([['t-muted', 'github    '], link('https://github.com/Rayane2L', 'github.com/Rayane2L')]),
      line([['t-muted', 'linkedin  '], link('https://www.linkedin.com/in/rayane-lali', 'linkedin.com/in/rayane-lali')]),
      line([['t-muted', 'e-mail    '], link('mailto:rayail06@gmail.com', 'rayail06@gmail.com')])
    ];
  }

  /* ---------- interprétation ---------- */
  function run(raw) {
    var cmd = raw.trim().replace(/\s+/g, ' ');
    if (!cmd) return [];
    var low = cmd.toLowerCase();

    if (low === 'clear' || low === 'cls') {
      out.textContent = '';
      return [];
    }
    if (low === 'help' || low === '?') return help();
    if (low === 'whoami') return whoami();
    if (low === 'ls' || low === 'ls ~' || low === 'ls .') return ls();
    if (/^(\.\/)?recherche\b/.test(low)) return recherche();

    var parts = low.split(' ');
    var verb = parts[0];
    var arg = (parts[1] || '').replace(/^(\.\/|~\/)/, '').replace(/\/$/, '').replace(/\.(txt|md|html)$/, '');

    if (verb === 'cd' || verb === 'open') {
      if (!arg || arg === '~') arg = 'accueil';
      if (PAGES[arg]) {
        window.setTimeout(function () { window.location.href = PAGES[arg]; }, 250);
        return [line([['t-muted', 'ouverture de ' + PAGES[arg]]])];
      }
      return [line([verb + ' : page inconnue. Pages : projets, parcours, contact'])];
    }

    var target = verb === 'cat' || verb === 'ls' ? arg : verb;
    if (parts.length <= 2) {
      if (target === 'about_me' || target === 'about') return about();
      if (target === 'focus') return focus();
      if (target === 'projets' || target === 'cyber' || target === 'epitech' || target === 'perso') return projets();
      if (target === 'parcours') return parcours();
      if (target === 'contact') return contact();
    }
    return [line([parts[0] + ' : commande introuvable. Tape ', ['t-green', 'help'], ' pour la liste des commandes.'])];
  }

  /* ---------- saisie ---------- */
  var history = [];
  var historyPos = 0;

  function sync() {
    typed.textContent = input.value;
    scrollDown();
  }
  function submit(value) {
    echo(value);
    print(run(value));
    if (value.trim()) {
      history.push(value);
      historyPos = history.length;
    }
    input.value = '';
    sync();
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    submit(input.value);
  });
  input.addEventListener('input', sync);
  input.addEventListener('keydown', function (event) {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      if (!history.length) return;
      event.preventDefault();
      historyPos += event.key === 'ArrowUp' ? -1 : 1;
      historyPos = Math.max(0, Math.min(history.length, historyPos));
      input.value = history[historyPos] || '';
      sync();
    } else if (event.key === 'Tab' && input.value) {
      var start = input.value.toLowerCase();
      var matches = COMPLETIONS.filter(function (c) { return c.indexOf(start) === 0; });
      if (matches.length) {
        event.preventDefault();
        input.value = matches[0];
        sync();
      }
    } else if (event.key === 'l' && event.ctrlKey) {
      event.preventDefault();
      out.textContent = '';
    }
  });
  // Garde le curseur de saisie en fin de ligne (le curseur affiché est toujours à la fin).
  input.addEventListener('keyup', function () {
    var end = input.value.length;
    input.setSelectionRange(end, end);
  });
  body.addEventListener('click', function (event) {
    if (event.target.closest('a')) return;
    var selection = window.getSelection();
    if (selection && String(selection)) return;
    input.focus({ preventScroll: true });
  });
  if (quick) {
    quick.addEventListener('click', function (event) {
      var button = event.target.closest('button[data-cmd]');
      if (!button || !ready) return;
      submit(button.getAttribute('data-cmd'));
    });
  }

  /* ---------- intro ---------- */
  var ready = false;
  var skip = false;

  function wait(ms) {
    return new Promise(function (resolve) {
      if (skip || ms <= 0) resolve();
      else window.setTimeout(resolve, ms);
    });
  }
  function typeCommand(cmd) {
    var span = echo('');
    var cursor = el('span', 'cursor');
    span.parentNode.appendChild(cursor);
    var i = 0;
    function step() {
      if (skip) i = cmd.length;
      span.textContent = cmd.slice(0, i);
      scrollDown();
      if (i >= cmd.length) return wait(260).then(function () { cursor.remove(); });
      i += 1;
      return wait(34).then(step);
    }
    return step();
  }
  function enable() {
    ready = true;
    out.removeAttribute('aria-busy');
    form.hidden = false;
    if (quick) quick.hidden = false;
    scrollDown();
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      input.focus({ preventScroll: true });
    }
  }
  function hint() {
    print([line([['t-muted', 'Tape '], ['t-green', 'help'], ['t-muted', ' pour la liste des commandes, ou utilise le menu.']])]);
  }

  var staticPrompt = document.getElementById('static-prompt');
  if (staticPrompt) staticPrompt.remove();

  if (reduceMotion) {
    hint();
    enable();
    return;
  }

  var script = [
    ['whoami', whoami],
    ['cat focus.txt', focus],
    [SEARCH_CMD, recherche]
  ];
  function skipIntro() { skip = true; }
  body.addEventListener('pointerdown', skipIntro, { once: true });
  document.addEventListener('keydown', skipIntro, { once: true });

  out.setAttribute('aria-busy', 'true');
  out.textContent = '';
  var chain = wait(350);
  script.forEach(function (entry) {
    chain = chain
      .then(function () { return typeCommand(entry[0]); })
      .then(function () { print(entry[1]()); return wait(320); });
  });
  chain.then(function () {
    hint();
    enable();
  });
})();
