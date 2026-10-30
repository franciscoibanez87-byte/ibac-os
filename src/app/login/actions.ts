"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";

type ActionState = { error?: string } | undefined;

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Correo y contraseña son obligatorios." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Mensaje genérico deliberado: no distinguir "correo no existe" de
    // "contraseña incorrecta" para no filtrar qué correos tienen cuenta.
    return { error: "Correo o contraseña incorrectos." };
  }

  redirect("/empresas");
}
