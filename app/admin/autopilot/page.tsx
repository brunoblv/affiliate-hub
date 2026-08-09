import { Bot } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/admin/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const MODES = [
  { title: "Manual", description: "Usuário cria e publica todo o conteúdo." },
  { title: "Semiautomático", description: "IA cria conteúdo, usuário aprova e o sistema publica. Modo recomendado para começar." },
  { title: "Automático", description: "Score + regras selecionam produtos, IA gera conteúdo e o sistema publica sozinho." },
];

export default function AutopilotPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Autopilot" description="Níveis de automação do sistema" />

      <div className="grid gap-4 sm:grid-cols-3">
        {MODES.map((mode) => (
          <Card key={mode.title}>
            <CardHeader>
              <CardTitle className="text-base">{mode.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{mode.description}</CardContent>
          </Card>
        ))}
      </div>

      <EmptyState
        icon={Bot}
        title="Operação atual: Semiautomática"
        description="Configure regras de autopilot em Autopilot → Regras para habilitar seleção e publicação automáticas."
      />
    </div>
  );
}
