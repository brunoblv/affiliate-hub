"use client";

import Link from "next/link";
import { useState } from "react";

export default function CalculadoraDePisoPage() {
  const [largura, setLargura] = useState("");
  const [comprimento, setComprimento] = useState("");
  const [perda, setPerda] = useState("10");
  const [caixaM2, setCaixaM2] = useState("");

  const larguraNum = Number(largura.replace(",", "."));
  const comprimentoNum = Number(comprimento.replace(",", "."));
  const perdaNum = Number(perda) || 0;
  const caixaM2Num = Number(caixaM2.replace(",", "."));

  const areaBase = larguraNum > 0 && comprimentoNum > 0 ? larguraNum * comprimentoNum : null;
  const areaComPerda = areaBase !== null ? areaBase * (1 + perdaNum / 100) : null;
  const caixas = areaComPerda !== null && caixaM2Num > 0 ? Math.ceil(areaComPerda / caixaM2Num) : null;

  return (
    <div className="mx-auto w-full max-w-[720px] px-5 py-14 sm:px-10">
      <Link href="/ferramentas" className="text-sm text-muted-foreground hover:underline">
        ← Ferramentas
      </Link>

      <h1 className="mt-4 font-heading text-3xl font-semibold text-foreground sm:text-4xl">Calculadora de piso</h1>
      <p className="mt-2 max-w-xl text-[15px] text-muted-foreground">
        Calcule a metragem de piso ou revestimento a comprar, já somando uma margem de perda para corte e recorte de
        peças. A margem recomendada costuma ficar entre 8% e 15%, dependendo do formato do ambiente e do assentamento
        escolhido — confirme com quem for instalar.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-foreground">Largura do ambiente (m)</span>
          <input
            type="text"
            inputMode="decimal"
            value={largura}
            onChange={(e) => setLargura(e.target.value)}
            placeholder="Ex.: 3,5"
            className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-foreground">Comprimento do ambiente (m)</span>
          <input
            type="text"
            inputMode="decimal"
            value={comprimento}
            onChange={(e) => setComprimento(e.target.value)}
            placeholder="Ex.: 4"
            className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-foreground">Margem de perda (%)</span>
          <select
            value={perda}
            onChange={(e) => setPerda(e.target.value)}
            className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground"
          >
            <option value="8">8% — ambiente retangular simples</option>
            <option value="10">10% — padrão</option>
            <option value="15">15% — ambiente com muitos recortes</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-foreground">m² por caixa (opcional)</span>
          <input
            type="text"
            inputMode="decimal"
            value={caixaM2}
            onChange={(e) => setCaixaM2(e.target.value)}
            placeholder="Ex.: 2,10"
            className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground"
          />
        </label>
      </div>

      <div className="mt-8 rounded-xl border border-border bg-secondary p-6">
        {areaComPerda !== null ? (
          <>
            <div className="text-sm text-muted-foreground">Área do ambiente: {areaBase!.toFixed(2)} m²</div>
            <div className="mt-1 text-2xl font-semibold text-foreground">
              ≈ {areaComPerda.toFixed(2).replace(".", ",")} m² a comprar (com perda)
            </div>
            {caixas !== null && (
              <div className="mt-2 text-sm text-muted-foreground">≈ {caixas} caixas, considerando o m² informado</div>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Preencha a largura e o comprimento para ver o resultado.</p>
        )}
      </div>
    </div>
  );
}
