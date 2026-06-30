# Bolão da Copa 2026 Security Charter

## Principles

### I. Segredos nunca vivem no código nem no histórico

Apenas a `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (pública por design) pode aparecer no bundle do frontend. A `service_role`/secret key e qualquer token de API carregam só do ambiente (Edge Functions, CI, scripts de teste) e nunca são commitados. Arquivos `.env*` reais ficam no `.gitignore`; apenas `*.example` entram no repositório.

Why: a `service_role` ignora a RLS e dá acesso total ao banco. Um valor vazado no bundle estático (que vai público no Netlify) ou no histórico do git é comprometimento total dos dados de todos os participantes, e o histórico é para sempre.

### II. A RLS do Postgres é a fronteira de autorização

Toda tabela ou view alcançável pela publishable key tem Row Level Security habilitada, com políticas que restringem cada linha ao seu dono (participante) ou a um admin verificado. Nenhum `GRANT` concede mais do que a política permite, e nenhuma decisão de acesso depende do cliente.

Why: o app é uma SPA com static export que fala direto com o Supabase usando uma chave pública — não há servidor próprio para barrar nada. Se a RLS deixa passar, qualquer pessoa com a chave (que é pública) lê ou altera os palpites, perfis e pontos de outros. "permission denied" por falta de GRANT é falha; GRANT sem RLS correta é vazamento.

### III. A apuração e a pontuação são verdade do servidor

O cálculo de pontos (`apurar_pontos()`, `peso_fase()`) e a montagem do ranking acontecem no banco. O cliente nunca calcula, grava ou edita pontos, e nunca define quem é admin. A UI apenas exibe o que o servidor apurou.

Why: pontos são a moeda do bolão. Se o cliente puder influenciar a pontuação, qualquer participante forja a própria vitória e a competição inteira perde sentido.

### IV. Palpite respeita a janela de tempo e é imutável após o lock

A regra de quando um palpite pode ser criado ou editado (janela antes do jogo, liberação antecipada, imutabilidade após o início) é imposta no servidor — por constraints, triggers e RPCs — não apenas escondendo botões na UI.

Why: validar só no front é teatro de segurança. Um palpiteiro que monte a requisição na mão poderia palpitar (ou trocar o palpite) depois de saber o resultado, fraudando o jogo.

### V. Todo input externo é não confiável até validado no servidor

Dados vindos do usuário (palpites, placares, nomes, autoinscrição) e de terceiros (API de futebol, fixtures, resultados) são validados no servidor — via constraints, checagens em RPC e tratamento na ingestão — antes de virar estado persistido. A validação no cliente é só conveniência de UX.

Why: input não checado é a porta de injeção e de dados corrompidos. Um placar negativo, um lado de partida inconsistente ou um payload externo malformado podem quebrar a apuração ou poluir o ranking de todos.

### VI. Funções do banco rodam com privilégio mínimo e `search_path` fixo

Funções `SECURITY DEFINER` só existem quando necessárias, fazem o mínimo, e fixam `search_path` explicitamente. Flags de privilégio (ex.: `is_admin`) não são expostas nem graváveis pelo cliente.

Why: uma função `SECURITY DEFINER` sem `search_path` fixo pode ser sequestrada por objetos plantados num schema do atacante, escalando privilégio. Um `is_admin` exposto ou editável é escalonamento direto para controle total do bolão.

### VII. Dados pessoais dos participantes ficam restritos a quem precisa

Nome, e-mail e identificadores dos participantes só são visíveis para o próprio dono e para admins, conforme a RLS. Nenhuma view ou política expõe a lista completa de perfis ou contatos a participantes comuns.

Why: são amigos reais com dados reais (alguns já no banco de produção na fase de validação privada). Vazar a lista de e-mails/identidades fere a privacidade dos testers e a LGPD, sem nenhum ganho de produto.

## Governance

Este charter supersede decisões pontuais. Toda mudança de segurança (migration de RLS/grant, função de banco, manuseio de segredo) é avaliada contra estes princípios antes de entrar. As fases seguintes do Blue Spec (detect, plan, harden, verify) devem respeitá-lo. Alterações ao charter são revisadas e a versão é atualizada: MAJOR ao remover/redefinir um princípio, MINOR ao adicionar/expandir, PATCH para clareza. O push final que leva qualquer hardening para o repositório é sempre do desenvolvedor humano.

### Exceções aceitas

- **Signup aberto na fase de validação privada (2026):** o cadastro por link público + auto-inscrição no bolão padrão está habilitado de propósito enquanto os amigos testers entram. É uma exceção consciente ao princípio VI (acesso por concessão), não um descuido. Quando a validação terminar, fechar a entrada com token de convite válido (endurecer `handle_new_user` e a policy `participantes_insert_self`).

Version: 1.1.0 | Ratified: 2026-06-18
