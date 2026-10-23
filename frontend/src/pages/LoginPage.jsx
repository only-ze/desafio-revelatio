import { useState } from 'react';
import { useAuth } from '../auth.jsx';
import { useToast } from '../toast.jsx';

export default function LoginPage() {
  const { login, register } = useAuth();
  const notify = useToast();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const isLogin = mode === 'login';

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) await login(form.email, form.password);
      else await register(form.name, form.email, form.password);
    } catch (err) {
      notify(err.message, true);
      setLoading(false);
    }
  }

  return (
    <section id="auth">
      <div className="auth-card">
        <h1>Task Manager</h1>
        <div className="hint" style={{ margin: 0 }}>Organize suas tarefas e anexos.</div>

        <div className="tabs">
          <button type="button" className={isLogin ? 'active' : ''} onClick={() => setMode('login')}>Entrar</button>
          <button type="button" className={!isLogin ? 'active' : ''} onClick={() => setMode('register')}>Criar conta</button>
        </div>

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <label htmlFor="name">Nome</label>
              <input id="name" value={form.name} onChange={set('name')} required minLength={2} autoComplete="name" />
            </>
          )}
          <label htmlFor="email">E-mail</label>
          <input id="email" type="email" value={form.email} onChange={set('email')} required autoComplete="email" />
          <label htmlFor="password">Senha</label>
          <input id="password" type="password" value={form.password} onChange={set('password')} required minLength={6}
            autoComplete={isLogin ? 'current-password' : 'new-password'} />
          <button className="primary" style={{ width: '100%', marginTop: 18 }} disabled={loading}>
            {loading ? 'Aguarde…' : isLogin ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        <div className="hint">Admin de demonstração: <b>admin@example.com</b> / <b>admin123</b></div>
      </div>
    </section>
  );
}
