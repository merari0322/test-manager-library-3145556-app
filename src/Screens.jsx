import { useEffect, useState } from 'react';

const API = 'http://localhost:8000/api/v1';

export async function call(path, token, options = {}) {
  const res = await fetch(API + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  const data = res.status === 204 ? null : await res.json();
  if (!res.ok) throw new Error(data.message);
  return data;
}

function useAction() {
  const [message, setMessage] = useState('');
  const run = async (fn) => {
    setMessage('');
    try { await fn(); } catch (err) { setMessage(err.message); }
  };
  return [message, run, setMessage];
}

export function Members({ token }) {
  const [list, setList] = useState({ items: [], total: 0 });
  const [q, setQ] = useState('');
  const [fullName, setFullName] = useState('');
  const [document, setDocument] = useState('');
  const [message, run, setMessage] = useAction();
  const load = () => run(async () => setList(await call(`/members?q=${encodeURIComponent(q)}&size=50`, token)));
  useEffect(() => { load(); }, []);

  return (
    <section>
      <h2>Socios ({list.total})</h2>
      <input placeholder="Nombre o documento" value={q} onChange={(e) => setQ(e.target.value)} />
      <button onClick={load}>Buscar</button>
      <form onSubmit={(e) => { e.preventDefault(); run(async () => {
        await call('/members', token, { method: 'POST', body: JSON.stringify({ full_name: fullName, document_number: document }) });
        setFullName(''); setDocument(''); setMessage('Socio creado.'); await load();
      }); }}>
        <input placeholder="Nombre completo" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <input placeholder="Documento" value={document} onChange={(e) => setDocument(e.target.value)} />
        <button type="submit">Crear socio</button>
      </form>
      {message && <p role="alert">{message}</p>}
      <ul>{list.items.map((m) => <li key={m.id}>{m.full_name} · {m.document_number} · <code>{m.id}</code></li>)}</ul>
    </section>
  );
}

export function Lend({ token }) {
  const [memberId, setMemberId] = useState('');
  const [bookIds, setBookIds] = useState('');
  const [loan, setLoan] = useState(null);
  const [message, run] = useAction();

  return (
    <section>
      <h2>Prestar</h2>
      <form onSubmit={(e) => { e.preventDefault(); run(async () => {
        const items = bookIds.split(',').map((id) => id.trim()).filter(Boolean).map((book_id) => ({ book_id }));
        setLoan(await call('/loans', token, { method: 'POST', body: JSON.stringify({ member_id: memberId.trim(), items }) }));
      }); }}>
        <input placeholder="Id del socio" value={memberId} onChange={(e) => setMemberId(e.target.value)} />
        <input placeholder="Ids de libros (1 a 3, separados por coma)" value={bookIds} onChange={(e) => setBookIds(e.target.value)} size={60} />
        <button type="submit">Registrar préstamo</button>
      </form>
      {message && <p role="alert">{message}</p>}
      {loan && <p>Préstamo <code>{loan.id}</code> ({loan.status}): {loan.items.map((i) => `${i.book_title}, vence ${i.due_at}`).join(' · ')}</p>}
    </section>
  );
}

export function Return({ token }) {
  const [loanId, setLoanId] = useState('');
  const [loan, setLoan] = useState(null);
  const [message, run, setMessage] = useAction();
  const load = () => run(async () => setLoan(await call(`/loans/${loanId.trim()}`, token)));

  return (
    <section>
      <h2>Devolver</h2>
      <input placeholder="Id del préstamo" value={loanId} onChange={(e) => setLoanId(e.target.value)} size={40} />
      <button onClick={load}>Ver préstamo</button>
      {message && <p role="alert">{message}</p>}
      {loan && (
        <div>
          <p>Estado: {loan.status}</p>
          <ul>{loan.items.map((i) => (
            <li key={i.id}>
              {i.book_title} · vence {i.due_at} · {i.returned_at ? `devuelto ${i.returned_at}` : (
                <button onClick={() => run(async () => {
                  await call(`/loans/${loan.id}/items/${i.id}/return`, token, { method: 'POST' });
                  setMessage('Línea devuelta.'); setLoan(await call(`/loans/${loan.id}`, token));
                })}>Devolver</button>
              )}
            </li>
          ))}</ul>
        </div>
      )}
    </section>
  );
}

export function Overdue({ token }) {
  const [items, setItems] = useState([]);
  const [message, run] = useAction();
  useEffect(() => { run(async () => setItems((await call('/loans/overdue', token)).items)); }, []);

  return (
    <section>
      <h2>Vencidos ({items.length})</h2>
      {message && <p role="alert">{message}</p>}
      <ul>{items.map((i) => <li key={i.item_id}>{i.book_title} · {i.member_name} · {i.days_late} días de retraso</li>)}</ul>
    </section>
  );
}

export function Report({ token }) {
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [rows, setRows] = useState([]);
  const [message, run] = useAction();

  return (
    <section>
      <h2>Más prestados</h2>
      <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
      <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      <button onClick={() => run(async () => setRows((await call(`/reports/most-borrowed?from=${from}&to=${to}`, token)).rows))}>Ver reporte</button>
      {message && <p role="alert">{message}</p>}
      <ol>{rows.map((r) => <li key={r.book_id + r.book_title + r.category_name}>{r.book_title} · {r.category_name} · {r.times_borrowed}</li>)}</ol>
    </section>
  );
}
