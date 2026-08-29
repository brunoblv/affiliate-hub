"use client";

import Link from "next/link";
import { useState } from "react";

const RENDIMENTO_M2_POR_LITRO = 6;

export default function CalculadoraDeTintaPage() {
  const [largura, setLargura] = useState("");
  const [altura, setAltura] = useState("");
  const [demaos, setDemaos] = useState("2");
  const [descontar, setDescontar] = useState("");

  const larguraNum = Number(largura.replace(",", "."));
  const alturaNum = Number(altura.replace(",", "."));
  const demaosNum = Number(demaos) || 1;
  const descontarNum = Number(descontar.replace(",", ".")) || 0;

  const areaBruta = larguraNum > 0 && alturaNum > 0 ? larguraNum * alturaNum : null;
  const areaLiquida = areaBruta !== null ? Math.max(areaBruta - descontarNum, 0) : null;
  const litros = areaLiquida !== null ? (areaLiquida * demaosNum) / RENDIMENTO_M2_POR_LITRO : null;

  return (
    <div className="mx-auto w-full max-w-[720px] px-5 py-14 sm:px-10">
      <Link href="/ferramentas" className="text-sm text-muted-foreground hover:underline">
        ← Ferramentas
      </Link>

      <h1 className="mt-4 font-heading text-3xl font-semibold text-foreground sm:text-4xl">Calculadora de tinta</h1>
      <p className="mt-2 max-w-xl text-[15px] text-muted-foreground">
        Estime quantos litros de tinta comprar a partir da área da parede. O cálculo usa um rendimento médio de{" "}
        {RENDIMENTO_M2_POR_LITRO} m² por litro por demão — o rendimento real varia por marca e tipo de superfície,
        confira a embalagem do produto antes de comprar.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-foreground">Largura da parede (m)</span>
          <input
            type="text"
            inputMode="decimal"
            value={largura}
            onChange={(e) => setLargura(e.target.value)}
            placeholder="Ex.: 4"
            className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-foreground">Altura da parede (m)</span>
          <input
            type="text"
            inputMode="decimal"
            value={altura}
            onChange={(e) => setAltura(e.target.value)}
            placeholder="Ex.: 2,7"
            className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-foreground">Número de demãos</span>
          <select
            value={demaos}
            onChange={(e) => setDemaos(e.target.value)}
            className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground"
          >
            <option value="1">1 demão</option>
            <option value="2">2 demãos</option>
            <option value="3">3 demãos</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-foreground">Descontar portas/janelas (m², opcional)</span>
          <input
            type="text"
            inputMode="decimal"
            value={descontar}
            onChange={(e) => setDescontar(e.target.value)}
            placeholder="Ex.: 3"
            className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground"
          />
        </label>
      </div>

      <div className="mt-8 rounded-xl border border-border bg-secondary p-6">
        {litros !== null && areaLiquida !== null ? (
          <>
            <div className="text-sm text-muted-foreground">Área a pintar: {areaLiquida.toFixed(2)} m²</div>
            <div className="mt-1 text-2xl font-semibold text-foreground">
              ≈ {litros.toFixed(2).replace(".", ",")} litros de tinta
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Preencha a largura e a altura para ver o resultado.</p>
        )}
      </div>
    </div>
  );
}
