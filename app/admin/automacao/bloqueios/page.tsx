import { ShieldBan } from "lucide-react";
import { prisma } from "@/lib/database";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BlocklistType } from "@/lib/generated/prisma/client";
import { createBlocklistEntryAction, toggleBlocklistEntryAction } from "./actions";

export default async function BlocklistPage() {
  const entries = await prisma.blocklist.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bloqueios"
        description="Produtos com palavras-chave, vendedores ou categorias bloqueadas são ignorados na descoberta automática."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Novo bloqueio</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createBlocklistEntryAction} className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <select
                id="type"
                name="type"
                defaultValue={BlocklistType.KEYWORD}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <option value={BlocklistType.KEYWORD}>Palavra-chave</option>
                <option value={BlocklistType.SELLER}>Vendedor</option>
                <option value={BlocklistType.CATEGORY}>Categoria</option>
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="value">Valor</Label>
              <Input id="value" name="value" placeholder="pirata, falsificado..." required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Input id="notes" name="notes" />
            </div>
            <div className="sm:col-span-4">
              <Button type="submit" size="sm">
                Adicionar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {entries.length === 0 ? (
        <EmptyState icon={ShieldBan} title="Nenhum bloqueio cadastrado" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Notas</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => {
              const toggle = toggleBlocklistEntryAction.bind(null, entry.id);
              return (
                <TableRow key={entry.id}>
                  <TableCell>{entry.type}</TableCell>
                  <TableCell className="font-medium">{entry.value}</TableCell>
                  <TableCell className="text-muted-foreground">{entry.notes ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={entry.active ? "default" : "secondary"}>{entry.active ? "Ativo" : "Inativo"}</Badge>
                  </TableCell>
                  <TableCell>
                    <form action={toggle}>
                      <Button type="submit" size="xs" variant="outline">
                        {entry.active ? "Desativar" : "Reativar"}
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
