import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface AgeGateModalProps {
  open: boolean;
  onConfirm: () => void;
  onDeny: () => void;
}

const AgeGateModal = ({ open, onConfirm, onDeny }: AgeGateModalProps) => {
  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={() => {
        // Prevent closing by external triggers
      }}
    >
      <DialogPrimitive.Portal>
        {/* Overlay with backdrop blur */}
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/70 backdrop-blur-md",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          )}
        />

        {/* Modal content */}
        <DialogPrimitive.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
            "w-full max-w-md mx-4",
            "bg-card border border-border/60 rounded-2xl shadow-2xl p-8",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
            "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
            "duration-200"
          )}
          // Prevent closing on Escape or outside click
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          {/* Icon */}
          <div className="flex justify-center mb-5">
            <div className="h-16 w-16 rounded-full bg-gradient-primary flex items-center justify-center shadow-glow">
              <ShieldCheck className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>

          {/* Title */}
          <DialogPrimitive.Title className="text-center text-xl font-display font-bold text-foreground mb-2">
            Verificação de idade
          </DialogPrimitive.Title>

          {/* Description */}
          <DialogPrimitive.Description className="text-center text-sm text-muted-foreground mb-8 leading-relaxed">
            Este site contém conteúdo adulto. Você confirma que tem{" "}
            <span className="font-semibold text-foreground">18 anos ou mais</span>?
          </DialogPrimitive.Description>

          {/* Buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={onConfirm}
              className="w-full rounded-xl bg-gradient-primary text-primary-foreground font-semibold py-3 px-6 text-sm shadow-glow transition-all duration-200 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
            >
              Sim, tenho 18 anos ou mais
            </button>
            <button
              onClick={onDeny}
              className="w-full rounded-xl border border-destructive/60 bg-transparent text-destructive font-semibold py-3 px-6 text-sm transition-all duration-200 hover:bg-destructive/10 active:scale-[0.98]"
            >
              Não, sou menor de idade
            </button>
          </div>

          {/* Legal disclaimer */}
          <p className="mt-6 text-center text-xs text-muted-foreground/70 leading-relaxed">
            Ao acessar este site, você confirma que tem idade legal para visualizar
            conteúdo adulto em sua jurisdição. O acesso não autorizado é proibido.
          </p>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default AgeGateModal;
