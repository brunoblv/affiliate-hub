"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ListChecks, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PostForm, type PostFormDefaults } from "@/components/admin/post-form";
import { createPostAction } from "@/app/admin/(dashboard)/posts/actions";
import { PAUTAS_LISTA_CASA, pautasDeComodo, type PautaListaCasa } from "@/lib/conteudo/pauta-listas-casa";
import type { GerarListaResultado, SalvarListaResultado } from "@/app/admin/(dashboard)/posts/gerar-lista/tipos";

async function chamarApi<T>(body: unknown): Promise<T> {
  const resposta = await fetch("/api/admin/posts/gerar-lista", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  try {
    return (await resposta.json()) as T;
  } catch {
    throw new Error(
      resposta.status === 504 || resposta.status === 502
        ? "O Gemini demorou demais. Tente de novo com uma pauta só."
        : "Não foi possível ler a resposta do servidor. Tente de novo.",
    );
  }
}

function CartaoPauta({
  pauta,
  disponiveis,
  gerandoId,
  onGerar,
  onSalvar,
}: {
  pauta: PautaListaCasa;
  disponiveis: number;
  gerandoId: string | null;
  onGerar: (id: string) => void;
  onSalvar: (id: string) => void;
}) {
  const ocupado = gerandoId === pauta.id;
  const pouco = disponiveis < 3;

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-border p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-medium leading-snug">{pauta.titulo}</h3>
        <p className="text-xs text-muted-foreground">{pauta.angulo}</p>
        <p className="text-xs text-muted-foreground">
          {disponiveis} produto{disponiveis === 1 ? "" : "s"} no catálogo
          {pouco ? " — importe mais desse tema antes" : ""}
        </p>
      </div>
      <div className="mt-auto flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={pouco || Boolean(gerandoId)} onClick={() => onGerar(pauta.id)}>
          {ocupado ? "Escrevendo..." : "Gerar e revisar"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pouco || Boolean(gerandoId)}
          onClick={() => onSalvar(pauta.id)}
        >
          Publicar já
        </Button>
      </div>
    </article>
  );
}

export function GerarListaWizard({
  produtos,
  contagemPorPauta,
}: {
  produtos: Array<{ slug: string; nome: string }>;
  contagemPorPauta: Record<string, number>;
}) {
  const [defaults, setDefaults] = useState<PostFormDefaults | null>(null);
  const [gerandoId, setGerandoId] = useState<string | null>(null);
  const [distribuir, setDistribuir] = useState(true);
  const [lote, setLote] = useState<Array<{ postId: string; slug: string; titulo: string; agendados: number }>>([]);

  const comodos = PAUTAS_LISTA_CASA.filter((p) => p.grupo === "comodo");
  const temas = PAUTAS_LISTA_CASA.filter((p) => p.grupo === "tema");

  async function gerarParaRevisar(pautaId: string) {
    setGerandoId(pautaId);
    try {
      const resultado = await chamarApi<GerarListaResultado>({ pautaId });
      if (!resultado.ok) {
        toast.error(resultado.erro);
        return;
      }
      setDefaults({
        ...resultado.artigo,
        tipo: "LISTA",
        categoriaEditorial: "DICAS_CASA",
        avisoSeguranca: resultado.artigo.avisoSeguranca,
      });
      toast.success("Lista gerada pelo Gemini — revise e marque Publicado antes de distribuir no Facebook.");
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Falha ao gerar a lista.");
    } finally {
      setGerandoId(null);
    }
  }

  async function publicarPauta(pautaId: string): Promise<boolean> {
    setGerandoId(pautaId);
    try {
      const resultado = await chamarApi<SalvarListaResultado>({
        pautaId,
        salvar: true,
        distribuir,
      });
      if (!resultado.ok) {
        toast.error(resultado.erro);
        return false;
      }
      setLote((atual) => [...atual, resultado]);
      const extra =
        distribuir && resultado.agendados > 0
          ? ` · ${resultado.agendados} canal${resultado.agendados === 1 ? "" : "is"} na fila (Facebook incluso, com o link do post)`
          : distribuir
            ? " · nenhum canal recebeu (veja destinos ativos)"
            : "";
      toast.success(`${resultado.titulo} publicado.${extra}`);
      return true;
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Falha ao publicar a lista.");
      return false;
    } finally {
      setGerandoId(null);
    }
  }

  async function gerarTodosComodos() {
    const ids = pautasDeComodo()
      .filter((p) => (contagemPorPauta[p.id] ?? 0) >= 3)
      .map((p) => p.id);
    if (ids.length === 0) {
      toast.error("Nenhum cômodo tem 3+ produtos com link de afiliado.");
      return;
    }
    for (const id of ids) {
      const ok = await publicarPauta(id);
      if (!ok) break;
    }
  }

  if (defaults) {
    return (
      <div className="space-y-4">
        <Button type="button" variant="outline" size="sm" onClick={() => setDefaults(null)}>
          Voltar às pautas
        </Button>
        <p className="text-sm text-muted-foreground">
          Tipo já vem como Lista. Marque Publicado, salve, e no post use &quot;Distribuir nos canais&quot; — o Facebook
          recebe a chamada com o link deste artigo no site; os cards usam o link de afiliado.
        </p>
        <PostForm produtos={produtos} action={createPostAction} defaults={defaults} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={distribuir}
            onChange={(event) => setDistribuir(event.target.checked)}
            className="mt-0.5 size-4 rounded border-input"
          />
          <span>
            Ao publicar, já enfileirar no Facebook e nos outros canais do Meu Novo Lar. A legenda aponta para o
            post no blog — os links de compra ficam na página.
          </span>
        </label>
        <Button type="button" disabled={Boolean(gerandoId)} onClick={() => void gerarTodosComodos()}>
          <Sparkles />
          {gerandoId ? "Gerando..." : "Gerar todos os cômodos"}
        </Button>
      </div>

      {lote.length > 0 && (
        <ul className="space-y-1 text-sm">
          {lote.map((item) => (
            <li key={item.postId}>
              <Link href={`/admin/posts/${item.postId}`} className="text-primary hover:underline">
                {item.titulo}
              </Link>
              {item.agendados > 0 ? ` · ${item.agendados} na fila` : ""}
            </li>
          ))}
        </ul>
      )}

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <ListChecks className="size-4" />
          Cômodos
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {comodos.map((pauta) => (
            <CartaoPauta
              key={pauta.id}
              pauta={pauta}
              disponiveis={contagemPorPauta[pauta.id] ?? 0}
              gerandoId={gerandoId}
              onGerar={(id) => void gerarParaRevisar(id)}
              onSalvar={(id) => void publicarPauta(id)}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Outros posts do tipo</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {temas.map((pauta) => (
            <CartaoPauta
              key={pauta.id}
              pauta={pauta}
              disponiveis={contagemPorPauta[pauta.id] ?? 0}
              gerandoId={gerandoId}
              onGerar={(id) => void gerarParaRevisar(id)}
              onSalvar={(id) => void publicarPauta(id)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
