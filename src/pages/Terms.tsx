import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import Navbar from "@/components/Navbar";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-3xl pt-28 pb-16">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ChevronLeft className="h-4 w-4" /> Voltar
        </Link>

        <h1 className="font-display text-3xl md:text-4xl font-extrabold text-foreground mb-2">Termos de Uso</h1>
        <p className="text-sm text-muted-foreground mb-8">Última atualização: 24 de junho de 2026</p>

        <div className="space-y-6 text-sm text-foreground/90 leading-relaxed">
          <section>
            <h2 className="font-display text-lg font-bold text-foreground mb-2">1. Aceite</h2>
            <p>Ao usar a plataforma, você declara ter <strong>18 anos ou mais</strong>, aceita estes Termos e a Política de Privacidade. Se discordar, não use o serviço.</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-bold text-foreground mb-2">2. Cadastro</h2>
            <p>Você é responsável pelas informações fornecidas e pela segurança da sua conta. Uma conta por pessoa. Proibido se passar por outra pessoa.</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-bold text-foreground mb-2">3. Conteúdo do criador</h2>
            <p>Criadores são os únicos responsáveis pelo conteúdo que publicam. Você garante ter os direitos sobre todo material enviado e que ele não viola leis, direitos de terceiros, ou políticas da plataforma (sem CSAM, sem violência real, sem conteúdo não consentido, sem menores em qualquer cena).</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-bold text-foreground mb-2">4. Assinaturas e pagamentos</h2>
            <p>Assinaturas são <strong>por criador</strong>, com preço definido por cada um. Pagamento via PIX. Não há reembolso por conteúdo já entregue. Cancelamento desativa a renovação, mas o acesso permanece até o fim do ciclo pago.</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-bold text-foreground mb-2">5. Moedas virtuais</h2>
            <p>Moedas compradas não são reembolsáveis nem trocáveis por dinheiro. Podem ser usadas para gorjetas, presentes e desbloqueio de conteúdo pago (PPV).</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-bold text-foreground mb-2">6. Repasse a criadores</h2>
            <p>A plataforma retém uma taxa de serviço sobre cada transação. O restante é repassado ao criador conforme cronograma divulgado no painel.</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-bold text-foreground mb-2">7. Conduta proibida</h2>
            <p>Proibido: redistribuir conteúdo pago, fazer engenharia reversa, automatizar acesso, assediar usuários, criar contas fraudulentas ou usar a plataforma para lavagem de dinheiro.</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-bold text-foreground mb-2">8. Remoção e suspensão</h2>
            <p>Podemos remover conteúdo e suspender contas que violem estes Termos, sem aviso prévio quando necessário para proteger usuários ou cumprir a lei.</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-bold text-foreground mb-2">9. Propriedade intelectual</h2>
            <p>Criadores mantêm a propriedade do conteúdo e nos concedem licença não-exclusiva para hospedar, exibir e processar o material dentro da plataforma.</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-bold text-foreground mb-2">10. Limitação de responsabilidade</h2>
            <p>O serviço é fornecido "como está". Não nos responsabilizamos por danos indiretos. Nossa responsabilidade total fica limitada ao valor pago por você nos últimos 12 meses.</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-bold text-foreground mb-2">11. Lei aplicável</h2>
            <p>Estes Termos são regidos pela legislação brasileira. Foro da comarca do prestador.</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-bold text-foreground mb-2">12. Contato</h2>
            <p>Dúvidas, denúncias e solicitações LGPD: utilize o canal de suporte dentro do app.</p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Terms;
