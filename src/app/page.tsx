import { redirect } from "next/navigation";

// La raíz no tiene contenido propio: todo IBAC OS se navega a partir de
// una empresa concreta (CORE 1 es la fuente de verdad de la que dependen
// los demás COREs), así que /empresas es el verdadero punto de entrada.
export default function Home() {
  redirect("/empresas");
}
