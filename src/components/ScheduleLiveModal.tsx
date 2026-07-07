import { useState } from "react";
import { Calendar, Video, Lock, Globe } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CreatorLive, useManageLives, NewLive } from "@/hooks/useCreatorLives";

interface Props {
  open: boolean;
  onClose: () => void;
  creatorId: string;
  onCreated?: (status: "scheduled" | "live", live?: CreatorLive) => void;
}

export function ScheduleLiveModal({ open, onClose, creatorId, onCreated }: Props) {

  const { create } = useManageLives(creatorId);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [status, setStatus] = useState<"scheduled" | "live">("live");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [minPlan, setMinPlan] = useState("fan");

  const reset = () => {
    setTitle("");
    setDescription("");
    setScheduledAt("");
    setStatus("live");
    setVisibility("public");
    setMinPlan("fan");
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Adicione um título para a live");
      return;
    }
    if (status === "scheduled" && !scheduledAt) {
      toast.error("Escolha a data e o horário do agendamento");
      return;
    }

    const payload: NewLive = {
      title: title.trim(),
      description: description.trim() || undefined,
      stream_url: "native",
      scheduled_at: scheduledAt || undefined,
      status,
      min_plan: visibility === "public" ? "free" : minPlan,
    };

    try {
      const createdLive = await create.mutateAsync(payload);
      toast.success(status === "live" ? "Live iniciada!" : "Live agendada com sucesso!");
      onCreated?.(status, createdLive);

      reset();
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao salvar live. Tente novamente.";
      toast.error(message || "Erro ao salvar live. Tente novamente.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Video className="h-4 w-4 text-primary" />
            Iniciar Live
          </DialogTitle>
          <DialogDescription>
            Configure o acesso e inicie uma transmissão nativa pelo navegador.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-1.5">
            <Label>Título <span className="text-primary">*</span></Label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Live de domingo — respondendo dúvidas"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Descrição</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o que vai acontecer na live..."
              rows={2}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            />
          </div>

          <div className="rounded-lg border border-border/50 bg-muted/20 p-3 text-xs text-muted-foreground">
            <p className="flex items-center gap-1.5 font-medium text-foreground">
              <Video className="h-3.5 w-3.5 text-primary" />
              Transmissão nativa pelo navegador
            </p>
            <p className="mt-1">
              Ao iniciar, vamos pedir acesso à sua câmera e microfone. Os fãs assistem direto no seu perfil — sem YouTube ou Twitch.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Quando</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as "scheduled" | "live")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="live">🔴 Iniciar agora</SelectItem>
                  <SelectItem value="scheduled">📅 Agendar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {status === "scheduled" && (
              <div className="flex flex-col gap-1.5">
                <Label className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  Data e horário
                </Label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="flex items-center gap-1.5">
              {visibility === "public" ? (
                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              ) : (
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              Visibilidade
            </Label>
            <Select value={visibility} onValueChange={(v) => setVisibility(v as "public" | "private")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">🌐 Pública — qualquer pessoa pode assistir</SelectItem>
                <SelectItem value="private">🔒 Privada — apenas assinantes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {visibility === "private" && (
            <div className="flex flex-col gap-1.5">
              <Label className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                Plano mínimo
              </Label>
              <Select value={minPlan} onValueChange={setMinPlan}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fan">💖 Fã</SelectItem>
                  <SelectItem value="superfan">🔥 Super Fã</SelectItem>
                  <SelectItem value="vip">💎 VIP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            disabled={create.isPending}
            className="bg-gradient-primary text-primary-foreground shadow-glow hover:scale-[1.02] transition-transform"
          >
            {create.isPending ? "Salvando..." : status === "live" ? "Iniciar live" : "Agendar live"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
