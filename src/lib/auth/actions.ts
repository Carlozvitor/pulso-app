"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type AuthResult = { ok: false; error: string };

const credentialsSchema = z.object({
  email: z.email("Confira o e-mail."),
  password: z.string().min(8, "A senha precisa de pelo menos 8 caracteres.").max(72),
});

function parse(email: string, password: string) {
  return credentialsSchema.safeParse({ email: email.trim().toLowerCase(), password });
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const parsed = parse(email, password);
  if (!parsed.success) return { ok: false, error: "E-mail ou senha incorretos." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return {
      ok: false,
      error: error.status === 429 ? "Muitas tentativas. Espere um minuto." : "E-mail ou senha incorretos.",
    };
  }
  redirect("/agora");
}

export async function signUp(email: string, password: string): Promise<AuthResult> {
  const parsed = parse(email, password);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp(parsed.data);
  if (error) {
    if (error.code === "signup_disabled") return { ok: false, error: "Novos cadastros estão fechados." };
    if (error.code === "user_already_exists") return { ok: false, error: "Esse e-mail já tem conta. Use Entrar." };
    if (error.code === "weak_password") return { ok: false, error: "Escolha uma senha mais forte." };
    return { ok: false, error: "Não deu para criar a conta agora." };
  }
  // Com autoconfirm ligado a sessão já vem pronta; sem ela, algo mudou na config do Supabase.
  if (!data.session) return { ok: false, error: "Conta criada, mas o login não foi concluído. Tente Entrar." };
  redirect("/agora");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
