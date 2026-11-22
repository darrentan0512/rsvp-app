import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';

export default function Auth({ mode }) {
  const isSignup = mode === 'signup';
  const { setUser } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { user } = await api(`/auth/${isSignup ? 'signup' : 'login'}`, { method: 'POST', body: form });
      setUser(user);
      const next = params.get('next');
      nav(next && next.startsWith('/') ? next : '/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <form className="card auth-card" onSubmit={submit}>
        <h1>{isSignup ? 'Create your account' : 'Welcome back'}</h1>
        {isSignup && (
          <label>Your name<input value={form.name} onChange={set('name')} required autoFocus /></label>
        )}
        <label>Email<input type="email" value={form.email} onChange={set('email')} required autoFocus={!isSignup} /></label>
        <label>Password<input type="password" value={form.password} onChange={set('password')} required minLength={isSignup ? 8 : undefined} /></label>
        {error && <p className="error">{error}</p>}
        <button className="btn btn-block" disabled={busy}>{busy ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'}</button>
        <p className="muted small center">
          {isSignup ? <>Already have an account? <Link to="/login">Sign in</Link></> : <>New here? <Link to="/signup">Create an account</Link></>}
        </p>
      </form>
    </div>
  );
}
