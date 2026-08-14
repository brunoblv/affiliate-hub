"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectClassName =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function PinterestExportForm({ projectSlug }: { projectSlug: string }) {
  const [board, setBoard] = useState("");
  const [status, setStatus] = useState("ACTIVE");

  function download() {
    const trimmed = board.trim();
    if (!trimmed) {
      alert("Informe o nome exato do board no Pinterest.");
      return;
    }
    const params = new URLSearchParams({
      board: trimmed,
      status,
    });
    window.location.href = `/api/admin/afiliados/${projectSlug}/pinterest-export?${params.toString()}`;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="pinterest-board">Nome do board no Pinterest *</Label>
        <Input
          id="pinterest-board"
          value={board}
          onChange={(e) => setBoard(e.target.value)}
          placeholder="Ex.: Achadinhos Tik Tok"
          required
        />
        <p className="text-xs text-muted-foreground">
          Tem que bater com o nome do board (ou board/seção). Só entram produtos com URL de imagem pública e link de
          afiliado já cadastrado.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="pinterest-status">Status dos produtos</Label>
        <select
          id="pinterest-status"
          className={selectClassName}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="ACTIVE">Ativos</option>
          <option value="INACTIVE">Inativos</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <Button type="button" size="sm" onClick={download}>
          Baixar CSV Pinterest
        </Button>
      </div>
    </div>
  );
}
