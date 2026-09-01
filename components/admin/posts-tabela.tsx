"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deletePostsAction } from "@/app/admin/(dashboard)/posts/actions";
import { BarraExclusaoEmLote, CheckboxLote, useSelecaoEmLote } from "@/components/admin/selecao-em-lote";

export interface PostLinha {
  id: string;
  titulo: string;
  tipo: string;
  status: string;
}

export function PostsTabela({ posts }: { posts: PostLinha[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const selecao = useSelecaoEmLote(posts.map((post) => post.id));

  function excluirSelecionados() {
    const ids = [...selecao.selecionados];
    const n = ids.length;
    if (n === 0) return;
    if (!confirm(`Excluir ${n} post${n === 1 ? "" : "s"}? Essa ação não pode ser desfeita.`)) return;

    startTransition(async () => {
      const toastId = toast.loading(n === 1 ? "Excluindo post..." : `Excluindo ${n} posts...`);
      try {
        const resultado = await deletePostsAction(ids);
        if (!resultado.ok) {
          toast.error(resultado.message ?? "Não foi possível excluir.", { id: toastId });
          return;
        }
        toast.success(resultado.count === 1 ? "Post excluído." : `${resultado.count} posts excluídos.`, { id: toastId });
        router.refresh();
      } catch (erro) {
        toast.error(erro instanceof Error ? erro.message : "Não foi possível excluir.", { id: toastId });
      }
    });
  }

  return (
    <div className="space-y-3">
      <BarraExclusaoEmLote
        quantidade={selecao.quantidade}
        rotuloSingular="post"
        rotuloPlural="posts"
        isPending={isPending}
        onExcluir={excluirSelecionados}
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <CheckboxLote
                checked={selecao.todosSelecionados}
                indeterminate={selecao.algunsSelecionados}
                onChange={selecao.toggleTodos}
                aria-label="Selecionar todos os posts desta página"
              />
            </TableHead>
            <TableHead>Título</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {posts.map((post) => {
            const marcado = selecao.selecionados.has(post.id);
            return (
              <TableRow key={post.id} data-state={marcado ? "selected" : undefined}>
                <TableCell>
                  <CheckboxLote
                    checked={marcado}
                    onChange={() => selecao.toggle(post.id)}
                    aria-label={`Selecionar ${post.titulo}`}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  <Link href={`/admin/posts/${post.id}`} className="hover:underline">
                    {post.titulo}
                  </Link>
                </TableCell>
                <TableCell>{post.tipo}</TableCell>
                <TableCell>
                  <Badge variant={post.status === "PUBLICADO" ? "default" : "secondary"}>
                    {post.status === "PUBLICADO" ? "Publicado" : "Rascunho"}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
