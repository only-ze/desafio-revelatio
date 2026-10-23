import { useState } from 'react';
import { api } from '../api.js';
import { useToast } from '../toast.jsx';

export default function TaskFormModal({ task, onClose, onSaved, onAttachmentRemoved }) {
  const notify = useToast();
  const isEdit = Boolean(task);

  const [form, setForm] = useState({
    title: task?.title ?? '',
    description: task?.description ?? '',
    dueDate: task?.dueDate ? task.dueDate.slice(0, 10) : '',
    priority: task?.priority ?? 'medium',
    status: task?.status ?? 'pending',
  });
  const [files, setFiles] = useState([]);
  const [existing, setExisting] = useState(task?.attachments ?? []);
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function removeAttachment(attachment) {
    try {
      await api(`/tasks/${task.id}/attachments/${attachment.id}`, { method: 'DELETE' });
      setExisting((list) => list.filter((a) => a.id !== attachment.id));
      onAttachmentRemoved();
    } catch (err) { notify(err.message, true); }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => data.append(key, value));
    files.forEach((file) => data.append('files', file));

    try {
      await api(isEdit ? `/tasks/${task.id}` : '/tasks', { method: isEdit ? 'PUT' : 'POST', form: data });
      notify(isEdit ? 'Tarefa atualizada' : 'Tarefa criada');
      onSaved();
    } catch (err) {
      notify(err.message, true);
      setSaving(false);
    }
  }

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={handleSubmit}>
        <h2>{isEdit ? 'Editar tarefa' : 'Nova tarefa'}</h2>

        <label htmlFor="t-title">Título *</label>
        <input id="t-title" value={form.title} onChange={set('title')} required maxLength={120} autoFocus />

        <label htmlFor="t-desc">Descrição</label>
        <textarea id="t-desc" value={form.description} onChange={set('description')} maxLength={2000} />

        <div className="row2">
          <div>
            <label htmlFor="t-due">Prazo</label>
            <input id="t-due" type="date" value={form.dueDate} onChange={set('dueDate')} />
          </div>
          <div>
            <label htmlFor="t-priority">Prioridade</label>
            <select id="t-priority" value={form.priority} onChange={set('priority')}>
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
            </select>
          </div>
        </div>

        <label htmlFor="t-status">Status</label>
        <select id="t-status" value={form.status} onChange={set('status')}>
          <option value="pending">Pendente</option>
          <option value="in_progress">Em andamento</option>
          <option value="done">Concluída</option>
        </select>

        <label htmlFor="t-files">Anexos (imagens, PDF, TXT, DOC — até 5MB cada)</label>
        <input id="t-files" type="file" multiple accept="image/*,.pdf,.txt,.doc,.docx"
          onChange={(e) => setFiles([...e.target.files])} />

        {existing.length > 0 && (
          <div className="files">
            {existing.map((a) => (
              <span className="file" key={a.id}>
                📎 {a.originalName}{' '}
                <button type="button" className="ghost danger" style={{ padding: '0 4px' }}
                  onClick={() => removeAttachment(a)} aria-label={`Remover ${a.originalName}`}>✕</button>
              </span>
            ))}
          </div>
        )}

        <div className="modal-actions">
          <button type="button" onClick={onClose}>Cancelar</button>
          <button className="primary" disabled={saving}>{saving ? 'Salvando…' : 'Salvar'}</button>
        </div>
      </form>
    </div>
  );
}
