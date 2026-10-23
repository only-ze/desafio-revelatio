const TOKEN_KEY = 'token';
const USER_KEY = 'user';

export const session = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  getUser: () => {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); } catch { return null; }
  },
  save: (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

function authHeaders() {
  const token = session.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = authHeaders();
  let payload;
  if (form) {
    payload = form;
  } else if (body) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const res = await fetch(`/api${path}`, { method, headers, body: payload });
  if (res.status === 204) return null;

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && session.getToken()) window.dispatchEvent(new Event('auth:expired'));
    const detail = data.details?.length ? ` — ${data.details.map((d) => d.message).join('; ')}` : '';
    throw new Error((data.message || 'Erro inesperado') + detail);
  }
  return data;
}

export async function fetchBlob(url) {
  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) throw new Error('Não foi possível carregar o anexo');
  return res.blob();
}
