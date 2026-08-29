"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Item = {
  id: string;
  nome: string;
  feito: boolean;
};

const STORAGE_KEY = "meunovolar:lista-de-compras";

export default function ListaDeComprasPage() {
  const [itens, setItens] = useState<Item[]>([]);
  const [novoItem, setNovoItem] = useState("");
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setItens(JSON.parse(raw));
    } catch {
      // localStorage indisponível (ex.: aba privada) — segue com lista vazia.
    }
    setCarregado(true);
  }, []);

  useEffect(() => {
    if (!carregado) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(itens));
    } catch {
      // ignora falha de escrita (ex.: quota cheia)
    }
  }, [itens, carregado]);

  function adicionarItem() {
    const nome = novoItem.trim();
    if (!nome) return;
    setItens((atual) => [...atual, { id: crypto.randomUUID(), nome, feito: false }]);
    setNovoItem("");
  }

  function alternarItem(id: string) {
    setItens((atual) => atual.map((item) => (item.id === id ? { ...item, feito: !item.feito } : item)));
  }

  function removerItem(id: string) {
    setItens((atual) => atual.filter((item) => item.id !== id));
  }

  function limparFeitos() {
    setItens((atual) => atual.filter((item) => !item.feito));
  }

  const pendentes = itens.filter((item) => !item.feito).length;

  return (
    <div className="mx-auto w-full max-w-[640px] px-5 py-14 sm:px-10">
      <Link href="/ferramentas" className="text-sm text-muted-foreground hover:underline">
        ← Ferramentas
      </Link>

      <h1 className="mt-4 font-heading text-3xl font-semibold text-foreground sm:text-4xl">Lista de compras</h1>
      <p className="mt-2 max-w-xl text-[15px] text-muted-foreground">
        Organize o que falta comprar para casa. A lista fica salva só neste navegador — não é enviada para nenhum
        servidor.
      </p>

      <div className="mt-8 flex gap-2.5">
        <input
          type="text"
          value={novoItem}
          onChange={(e) => setNovoItem(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              adicionarItem();
            }
          }}
          placeholder="Ex.: papel toalha"
          className="min-w-0 flex-1 rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground"
        />
        <button
          type="button"
          onClick={adicionarItem}
          className="rounded-lg bg-foreground px-5 py-2.5 text-sm font-semibold text-background"
        >
          Adicionar
        </button>
      </div>

      <div className="mt-6">
        {itens.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sua lista está vazia. Adicione o primeiro item acima.</p>
        ) : (
          <>
            <ul className="divide-y divide-border rounded-xl border border-border">
              {itens.map((item) => (
                <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={item.feito}
                    onChange={() => alternarItem(item.id)}
                    className="size-4 shrink-0 accent-sage"
                  />
                  <span
                    className={
                      item.feito
                        ? "flex-1 text-sm text-muted-foreground line-through"
                        : "flex-1 text-sm text-foreground"
                    }
                  >
                    {item.nome}
                  </span>
                  <button
                    type="button"
                    onClick={() => removerItem(item.id)}
                    aria-label={`Remover ${item.nome}`}
                    className="text-xs font-semibold text-muted-foreground hover:text-destructive"
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{pendentes} item(ns) pendente(s)</span>
              <button type="button" onClick={limparFeitos} className="text-xs font-semibold text-primary">
                Limpar marcados
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
