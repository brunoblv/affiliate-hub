import { PageHeader } from "@/components/admin/page-header";
import { CanalForm } from "@/components/admin/canal-form";
import { createCanalAction } from "../actions";

export default function NovoCanalPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Novo canal" description="Página, grupo, Telegram ou WhatsApp (grupo comum ou canal de transmissão)." />
      <CanalForm action={createCanalAction} />
    </div>
  );
}
