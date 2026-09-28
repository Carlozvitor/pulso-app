import { LoginForm } from "@/components/auth/login-form";

export const metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pt-[calc(var(--safe-top)+3rem)] pb-[calc(var(--safe-bottom)+1.5rem)]">
      <div aria-hidden className="mb-10 flex size-10 items-center justify-center rounded-full border-2 border-primary-soft/35">
        <div className="size-4 rounded-full bg-primary" />
      </div>
      <h1 className="text-display font-semibold tracking-tight">Entrar no PULSO</h1>
      <p className="mt-2 mb-8 text-sm text-foreground-subtle">O que merece sua atenção agora.</p>
      <LoginForm />
    </div>
  );
}
