import { useEffect, useState } from 'react';
import { Lend, Members, Overdue, Report, Return } from './Screens.jsx';

// The spec defines no variable for the API URL (docs ADR-005, INC-24).
const API = 'http://localhost:8000/api/v1';

async function call(path, token, options = {}) {
  const res = await fetch(API + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
}

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      const data = await call('/auth/login', null, { method: 'POST', body: JSON.stringify({ username, password }) });
      onLogin(data.access_token, data.role);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 8, maxWidth: 320 }}>
      <h1>Manager Library</h1>
      <input placeholder="Usuario" value={username} onChange={(e) => setUsername(e.target.value)} />
      <input placeholder="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button type="submit">Iniciar sesión</button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}

function Catalog({ token, role, onLogout }) {
  const [q, setQ] = useState('');
  const [result, setResult] = useState({ items: [], total: 0 });
  const [error, setError] = useState('');

  async function search() {
    setError('');
    try {
      setResult(await call(`/books?q=${encodeURIComponent(q)}&size=50`, token));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => { search(); }, []);

  return (
    <div>
      <p>Rol: {role} · <button onClick={onLogout}>Cerrar sesión</button></p>
      <h2>Catálogo ({result.total})</h2>
      <input placeholder="Buscar por título o autor" value={q} onChange={(e) => setQ(e.target.value)} />
      <button onClick={search}>Buscar</button>
      {error && <p role="alert">{error}</p>}
      <table>
        <thead>
          <tr><th>Título</th><th>Autor</th><th>ISBN</th><th>Categoría</th><th>Disponibles</th></tr>
        </thead>
        <tbody>
          {result.items.map((b) => (
            <tr key={b.id}>
              <td>{b.title}</td><td>{b.author}</td><td>{b.isbn}</td><td>{b.category.name}</td>
              <td>{b.available_copies} / {b.total_copies}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const SCREENS = { Catálogo: null, Socios: Members, Prestar: Lend, Devolver: Return, Vencidos: Overdue, Reporte: Report };

export default function App() {
  const [session, setSession] = useState(null);
  const [screen, setScreen] = useState('Catálogo');
  const names = Object.keys(SCREENS).filter((n) => n !== 'Reporte' || session?.role === 'admin');
  const Screen = SCREENS[screen];

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 16 }}>
      {!session && <Login onLogin={(token, role) => setSession({ token, role })} />}
      {session && (
        <>
          <nav style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {names.map((n) => <button key={n} onClick={() => setScreen(n)} disabled={n === screen}>{n}</button>)}
          </nav>
          {Screen
            ? <Screen token={session.token} />
            : <Catalog token={session.token} role={session.role} onLogout={() => setSession(null)} />}
        </>
      )}
    </main>
  );
}
