import { permanentRedirect } from "next/navigation";

/** /blog era a listagem no meunovolar.com; no subdomínio a listagem é a raiz. */
export default function BlogListRedirect() {
  permanentRedirect("/");
}
