"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signIn, signUp } from "@/lib/actions/client";

const fieldClass =
  "h-12 w-full rounded-md border border-border bg-surface px-4 text-body text-foreground placeholder:text-foreground-subtle focus-visible:border-primary-soft focus-visible:outline-none";

/** `volta`: tela para onde voltar depois de entrar (a action valida o caminho). */
export function LoginForm({ volta }: { volta?: string }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const signingUp = mode === "signup";

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      // Em caso de sucesso a action redireciona (para `volta` ou para a Agora).
      const result = await (signingUp ? signUp : signIn)(email, password, volta);
      if (result && !result.ok) setError(result.error);
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="text-sm text-foreground-secondary">E-mail</span>
        <input
          type="email"
          name="email"
          inputMode="email"
          autoComplete={signingUp ? "username" : "email"}
          autoCapitalize="none"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@email.com"
          className={fieldClass}
        />
      </label>

      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm text-foreground-secondary">
          Senha
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            name="password"
            autoComplete={signingUp ? "new-password" : "current-password"}
            required
            minLength={signingUp ? 8 : undefined}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${fieldClass} pr-12`}
            aria-invalid={Boolean(error)}
            aria-describedby={[signingUp ? "password-hint" : null, error ? "login-error" : null].filter(Boolean).join(" ") || undefined}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-foreground-subtle active:text-foreground"
          >
            {showPassword ? <EyeOff aria-hidden className="size-5" /> : <Eye aria-hidden className="size-5" />}
          </button>
        </div>
        {signingUp && (
          <span id="password-hint" className="text-caption text-foreground-subtle">
            Pelo menos 8 caracteres.
          </span>
        )}
      </div>

      {error && (
        <p id="login-error" role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Button type="submit" size="touch" disabled={pending || !email.trim() || !password} className="w-full">
        {pending ? (signingUp ? "Criando…" : "Entrando…") : signingUp ? "Criar conta" : "Entrar"}
      </Button>

      <button
        type="button"
        onClick={() => {
          setMode(signingUp ? "signin" : "signup");
          setError(null);
        }}
        className="min-h-11 self-center text-sm text-foreground-secondary active:text-foreground"
      >
        {signingUp ? "Já tenho conta" : "Primeiro acesso? Criar conta"}
      </button>
    </form>
  );
}
