/**
 * Router — Hash-based SPA router minimalista com Svelte 5 Runes.
 * 
 * Rotas:
 *   #/           → Menu (seleção de módulos)
 *   #/play/:id   → Tela do jogo
 *   #/reviews    → Tela do aluno com correções
 *   #/editor     → Editor do professor
 * 
 * Zero dependências externas.
 */

/** @type {{ route: string, params: Record<string, string> }} */
let current = $state({ route: '/', params: {} });

/**
 * Definições de rotas com padrões simples.
 * :param captura um segmento dinâmico.
 */
const routes = [
  { pattern: '/play/:id', name: 'play' },
  { pattern: '/reviews', name: 'reviews' },
  { pattern: '/editor', name: 'editor' },
  { pattern: '/', name: 'menu' },
];

/**
 * Resolve hash → rota + params.
 * @param {string} hash
 */
function resolve(hash) {
  const path = hash.replace(/^#/, '') || '/';

  for (const route of routes) {
    const params = matchRoute(route.pattern, path);
    if (params !== null) {
      return { route: route.name, params };
    }
  }

  return { route: 'menu', params: {} };
}

/**
 * Tenta casar um pattern com um path.
 * @param {string} pattern - ex: '/play/:id'
 * @param {string} path - ex: '/play/abc-123'
 * @returns {Record<string, string> | null}
 */
function matchRoute(pattern, path) {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = path.split('/').filter(Boolean);

  if (patternParts.length !== pathParts.length) return null;

  /** @type {Record<string, string>} */
  const params = {};

  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = pathParts[i];
    } else if (patternParts[i] !== pathParts[i]) {
      return null;
    }
  }

  return params;
}

// Escuta mudanças no hash
if (typeof window !== 'undefined') {
  const update = () => {
    const result = resolve(window.location.hash);
    current.route = result.route;
    current.params = result.params;
  };

  window.addEventListener('hashchange', update);
  update(); // resolve rota inicial
}

/**
 * Retorna o estado atual do router (reativo).
 */
export function getRouter() {
  return current;
}

/**
 * Navega para uma rota.
 * @param {string} path - ex: '/play/abc-123' ou '/editor'
 */
export function navigate(path) {
  window.location.hash = `#${path}`;
}
