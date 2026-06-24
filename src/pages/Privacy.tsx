import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import Navbar from "@/components/Navbar";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-3xl pt-28 pb-16">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ChevronLeft className="h-4 w-4" /> Voltar
        </Link>

        <h1 className="font-display text-3xl md:text-4xl font-extrabold text-foreground mb-2">Política de Privacidade</h1>
        <p className="text-sm text-muted-foreground mb-8">Última atualização: 24 de junho de 2026</p>

        <div className="prose prose-invert max-w-none space-y-6 text-sm text-foreground/90 leading-relaxed">
          <section>
            <h2 className="font-display text-lg font-bold text-foreground mb-2">1. Dados que coletamos</h2>
            <p>Coletamos: e-mail, nome, foto de perfil, handle, conteúdo publicado, mensagens, dados de pagamento (processados por terceiros) e métricas de uso (logins, visualizações, interações). Não armazenamos números completos de cartão.</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-bold text-foreground mb-2">2. Como usamos</h2>
            <p>Para operar a plataforma, processar pagamentos via PIX, enviar notificações relacionadas a assinaturas e conteúdo, prevenir fraudes e cumprir obrigações legais. Não vendemos dados pessoais.</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-bold text-foreground mb-2">3. Compartilhamento</h2>
            <p>Compartilhamos dados apenas com: processadores de pagamento (SyncPay), provedor de infraestrutura (Supabase), pixel de conversão (Meta), e autoridades quando exigido por lei.</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-bold text-foreground mb-2">4. Retenção</h2>
            <p>Mantemos dados enquanto sua conta estiver ativa. Após exclusão, removemos dados pessoais em até 30 dias, exceto quando obrigados a manter (registros fiscais, ordens judiciais).</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-bold text-foreground mb-2">5. Seus direitos (LGPD)</h2>
            <p>Você pode solicitar acesso, correção, exclusão, portabilidade e revogação de consentimento entrando em contato pelo e-mail informado nos Termos.</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-bold text-foreground mb-2">6. Cookies</h2>
            <p>Usamos cookies essenciais (autenticação) e analíticos (medição de uso). Você pode desativar no seu navegador, mas isso pode quebrar funcionalidades.</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-bold text-foreground mb-2">7. Menores de 18 anos</h2>
            <p>A plataforma contém conteúdo adulto e é proibida para menores de 18 anos. Não coletamos intencionalmente dados de menores. Se identificarmos uma conta de menor, ela será removida imediatamente.</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-bold text-foreground mb-2">8. Segurança</h2>
            <p>Usamos criptografia em trânsito (HTTPS) e em repouso (Postgres). Mídia privada é servida por URLs assinadas. Apesar dos controles, nenhum sistema é 100% seguro.</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-bold text-foreground mb-2">9. Alterações</h2>
            <p>Podemos atualizar esta política. Mudanças relevantes serão notificadas por e-mail ou no app.</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
