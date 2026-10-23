import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useToast } from '../toast.jsx';
import TaskCard from '../components/TaskCard.jsx';
import TaskFormModal from '../components/TaskFormModal.jsx';
import PreviewModal from '../components/PreviewModal.jsx';

const EMPTY_FILTERS = { q: '', status: '', priority: '', userId: '' };

export default function TasksPage() {
  const { user, isAdmin, logout } = useAuth();
  const notify = useToast();

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [debouncedQ, setDebouncedQ] = useState('');
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(undefined);
  const [preview, setPreview] = useState(null);

  const setFilter = (field) => (e) => setFilters((f) => ({ ...f, [field]: e.target.value }));

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(filters.q.trim()), 300);
    return () => clearTimeout(t);
  }, [filters.q]);

  const loadTasks = useCallback(async () => {
    const params = new URLSearchParams();
    if (debouncedQ) params.set('q', debouncedQ);
    if (filters.status) params.set('status', filters.status);
    if (filters.priority) params.set('priority', filters.priority);
    if (isAdmin && filters.userId) params.set('userId', filters.userId);
    try {
      setTasks(await api(`/tasks?${params}`));
    } catch (err) {
      notify(err.message, true);
    } finally {
      setLoading(false);
    }
  }, [debouncedQ, filters.status, filters.priority, filters.userId, isAdmin, notify]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  useEffect(() => {
    if (!isAdmin) return;
    api('/users').then(setUsers).catch((err) => notify(err.message, true));
  }, [isAdmin, notify]);

  async function handleComplete(task) {
    try {
      await api(`/tasks/${task.id}/complete`, { method: 'PATCH' });
      notify('Tarefa concluída');
      loadTasks();
    } catch (err) { notify(err.message, true); }
  }

  async function handleDelete(task) {
    if (!window.confirm(`Excluir "${task.title}"?`)) return;
    try {
      await api(`/tasks/${task.id}`, { method: 'DELETE' });
      notify('Tarefa removida');
      loadTasks();
    } catch (err) { notify(err.message, true); }
  }

  return (
    <>
      <header>
        <div className="header-in">
          <span className="brand">✅ Task Manager</span>
          <div className="who">
            <span>{user.name}</span>
            <span className={`badge ${isAdmin ? 'admin' : ''}`}>{isAdmin ? 'Administrador' : 'Usuário'}</span>
            <button type="button" onClick={logout}>Sair</button>
          </div>
        </div>
      </header>

      <main>
        <div className="toolbar">
          <input placeholder="Buscar por título ou descrição…" value={filters.q} onChange={setFilter('q')} />
          <select value={filters.status} onChange={setFilter('status')}>
            <option value="">Todos os status</option>
            <option value="pending">Pendente</option>
            <option value="in_progress">Em andamento</option>
            <option value="done">Concluída</option>
          </select>
          <select value={filters.priority} onChange={setFilter('priority')}>
            <option value="">Qualquer prioridade</option>
            <option value="high">Alta</option>
            <option value="medium">Média</option>
            <option value="low">Baixa</option>
          </select>
          {isAdmin && (
            <select value={filters.userId} onChange={setFilter('userId')}>
              <option value="">Todos os usuários</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          )}
          <button className="primary" type="button" onClick={() => setEditing(null)}>+ Nova tarefa</button>
        </div>

        {loading ? (
          <div className="empty">Carregando…</div>
        ) : tasks.length === 0 ? (
          <div className="empty">Nenhuma tarefa por aqui. Que tal criar a primeira?</div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              showOwner={isAdmin}
              onComplete={() => handleComplete(task)}
              onEdit={() => setEditing(task)}
              onDelete={() => handleDelete(task)}
              onPreview={setPreview}
            />
          ))
        )}
      </main>

      {editing !== undefined && (
        <TaskFormModal
          task={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => { setEditing(undefined); loadTasks(); }}
          onAttachmentRemoved={loadTasks}
        />
      )}
      {preview && <PreviewModal attachment={preview} onClose={() => setPreview(null)} />}
    </>
  );
}
