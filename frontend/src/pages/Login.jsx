import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { Loader2, LockKeyhole } from "lucide-react";
import { api, formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Seo, Logo } from "@/components/brand/Seo";
import { Field, TextInput } from "@/components/brand/Field";
import { StatusMessage } from "@/components/brand/StatusMessage";
import { BrandButton } from "@/components/brand/BrandButton";

export default function Login() {
  const { user, setUser, checkAuth } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(location.state?.error || "");

  useEffect(() => { if (user === null) checkAuth(); }, [user, checkAuth]);
  if (user) return <Navigate to="/dashboard" replace />;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { setError("Please enter your email and password."); return; }
    setBusy(true); setError("");
    try {
      const { data } = await api.post("/auth/login", form);
      setUser(data);
      navigate("/dashboard", { replace: true });
    } catch (err) { setError(formatApiError(err)); } finally { setBusy(false); }
  };

  const google = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <section className="container-x flex min-h-[calc(100vh-72px)] items-center justify-center py-16">
      <Seo title="Owner sign in" path="/login" description="Owner sign in for the Prayan enquiry dashboard." noindex />
      <div className="card-soft w-full max-w-md p-8 sm:p-10" data-testid="login-card">
        <Logo />
        <h1 className="mt-8 font-display text-3xl font-extrabold text-midnight">Owner sign in</h1>
        <p className="mt-2 text-[15px] text-slateink">Access is limited to approved Prayan owner accounts.</p>
        <form onSubmit={submit} noValidate className="mt-8 space-y-4">
          <Field id="login-email" label="Email"><TextInput id="login-email" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field id="login-password" label="Password"><TextInput id="login-password" type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
          {error && <StatusMessage type="error" testId="login-error">{error}</StatusMessage>}
          <BrandButton type="submit" size="lg" className="w-full" disabled={busy} data-testid="login-submit-btn">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" strokeWidth={1.75} />}Sign In
          </BrandButton>
        </form>
        <div className="my-6 flex items-center gap-3 text-xs text-slateink"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
        <BrandButton variant="secondary" size="lg" className="w-full" onClick={google} data-testid="login-google-btn">
          <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true"><path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7Z"/><path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1 .7-2.4 1.1-4 1.1-3.1 0-5.7-2.1-6.6-4.9h-4v3.1A12 12 0 0 0 12 24Z"/><path fill="#FBBC05" d="M5.4 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z"/><path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8Z"/></svg>
          Continue with Google
        </BrandButton>
      </div>
    </section>
  );
}
