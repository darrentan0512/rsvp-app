export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export function formatDate(iso, opts = {}) {
  if (!iso) return '';
  const d = new Date(iso.length <= 10 ? `${iso}T00:00` : iso);
  return d.toLocaleString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', ...opts });
}
export function formatTime(iso) {
  if (!iso || iso.length <= 10) return '';
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
