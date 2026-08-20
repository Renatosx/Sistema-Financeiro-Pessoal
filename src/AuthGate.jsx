import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient.js";
import App from "./App.jsx";

const fontDisplay = "'Fraunces', Georgia, serif";
const fontBody = "'Inter', system-ui, sans-serif";
const COLORS = {
  ink: "#10203D",
  paper: "#F4F5F8",
  line: "#D6DAE4",
  rust: "#9C3B3B",
  green: "#256D5C",
  slate: "#5B6478",
  white: "#FFFFFF",
};

const inputStyle = {
  width: "100%",
  fontFamily: fontBody,
  fontSize: 14,
  padding: "10px 12px",
  border: `1px solid ${COLORS.line}`,
  borderRadius: 5,
  background: COLORS.white,
  color: COLORS.ink,
  outline: "none",
  boxSizing: "border-box",
};

export default function AuthGate() {
  const [session, setSession] = useState(undefined); // undefined = ainda carregando
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div
        style={{
          minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
          background: COLORS.paper, fontFamily: fontBody, color: COLORS.slate,
        }}
      >
        Carregando…
      </div>
    );
  }

  if (!session) {
    async function handleSubmit(e) {
      e.preventDefault();
      setError("");
      setInfo("");
      setBusy(true);
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setError(error.message);
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) setError(error.message);
        else setInfo("Conta criada! Se a confirmação por e-mail estiver ativa no seu projeto Supabase, confirme antes de entrar.");
      }
      setBusy(false);
    }

    return (
      <div
        style={{
          minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
          background: COLORS.paper, fontFamily: fontBody, padding: 16,
        }}
      >
        <form
          onSubmit={handleSubmit}
          style={{ background: COLORS.white, padding: 32, borderRadius: 8, border: `1px solid ${COLORS.line}`, width: "100%", maxWidth: 360 }}
        >
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
            <img src="/logo-full.png" alt="Alicerce Renatosx" style={{ width: 200, height: "auto" }} />
          </div>
          <p style={{ color: COLORS.slate, fontSize: 13, marginBottom: 22 }}>
            {mode === "signin" ? "Entre para acessar seus dados" : "Crie sua conta para começar"}
          </p>

          <input
            type="email" required placeholder="E-mail" value={email}
            onChange={(e) => setEmail(e.target.value)} style={inputStyle}
          />
          <input
            type="password" required minLength={6} placeholder="Senha (mín. 6 caracteres)" value={password}
            onChange={(e) => setPassword(e.target.value)} style={{ ...inputStyle, marginTop: 10 }}
          />

          {error && <p style={{ color: COLORS.rust, fontSize: 12.5, marginTop: 12 }}>{error}</p>}
          {info && <p style={{ color: COLORS.green, fontSize: 12.5, marginTop: 12 }}>{info}</p>}

          <button
            type="submit" disabled={busy}
            style={{
              marginTop: 18, width: "100%", padding: "10px", background: COLORS.ink, color: COLORS.white,
              borderRadius: 5, fontWeight: 600, fontSize: 14, opacity: busy ? 0.7 : 1,
            }}
          >
            {busy ? "Aguarde…" : mode === "signin" ? "Entrar" : "Criar conta"}
          </button>

          <button
            type="button"
            onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); setInfo(""); }}
            style={{ marginTop: 14, width: "100%", background: "transparent", color: COLORS.slate, fontSize: 12.5, textDecoration: "underline" }}
          >
            {mode === "signin" ? "Não tem conta? Criar uma" : "Já tem conta? Entrar"}
          </button>
        </form>
      </div>
    );
  }

  return <App userEmail={session.user.email} onSignOut={() => supabase.auth.signOut()} />;
}
