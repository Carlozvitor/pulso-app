import Image from "next/image";
import { LoginForm } from "@/components/auth/login-form";

export const metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { volta } = await searchParams;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-4 pt-[calc(var(--safe-top)+3rem)] pb-[calc(var(--safe-bottom)+1.5rem)] lg:justify-center lg:py-12">
      <div className="lg:panel lg:p-10">
        <Image src="/brand/hub-simbolo.png" alt="" width={48} height={48} priority className="mb-10 size-12" />
        <h1 className="text-display font-semibold tracking-tight">Entrar no Hub</h1>
        <p className="mt-2 mb-8 text-sm text-foreground-subtle">O que merece sua atenção agora.</p>
        <LoginForm volta={typeof volta === "string" ? volta : undefined} />
      </div>
    </div>
  );
}
