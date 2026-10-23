import { PRIORITY, STATUS, fmtDate, fmtSize } from '../utils.js';

export default function TaskCard({ task, showOwner, onComplete, onEdit, onDelete, onPreview }) {
  return (
    <article className={`task ${task.status === 'done' ? 'done' : ''}`}>
      <div className="task-top">
        <div className="title">{task.title}</div>
      </div>

      <div className="meta">
        <span className={`pill ${task.status}`}>{STATUS[task.status]}</span>
        <span className={`pill ${task.priority === 'high' ? 'high' : ''}`}>Prioridade: {PRIORITY[task.priority]}</span>
        <span className={`pill ${task.isOverdue ? 'overdue' : ''}`}>
          Prazo: {fmtDate(task.dueDate)}{task.isOverdue ? ' (atrasada)' : ''}
        </span>
        <span>Criada em {fmtDate(task.createdAt)}</span>
        {showOwner && <span className="pill">👤 {task.owner.name}</span>}
      </div>

      {task.description && <div className="desc">{task.description}</div>}

      {task.attachments.length > 0 && (
        <div className="files">
          {task.attachments.map((a) => (
            <button key={a.id} type="button" className="file" onClick={() => onPreview(a)}>
              📎 {a.originalName} · {fmtSize(a.size)}
            </button>
          ))}
        </div>
      )}

      <div className="actions">
        {task.status !== 'done' && <button type="button" onClick={onComplete}>✔ Concluir</button>}
        <button type="button" onClick={onEdit}>Editar</button>
        <button type="button" className="danger" onClick={onDelete}>Excluir</button>
      </div>
    </article>
  );
}
