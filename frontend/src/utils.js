export const STATUS = { pending: 'Pendente', in_progress: 'Em andamento', done: 'Concluída' };
export const PRIORITY = { low: 'Baixa', medium: 'Média', high: 'Alta' };

export function fmtDate(value) {
  if (!value) return '—';
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return date.toLocaleDateString('pt-BR');
}

export function fmtSize(bytes) {
  if (bytes > 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
