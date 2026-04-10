# PROJECT_MEMORY

## Resumo do Estado Atual
O projeto "Display Office" consiste em uma aplicação full-stack para gerenciamento e exibição de páginas/telas em dispositivos (displays) através de códigos de pareamento. O sistema também possui um mecanismo de broadcasts (anúncios) e configurações do sistema. O backend expõe uma API REST conectada a um banco de dados MySQL, enquanto o frontend é construído como uma SPA (Single Page Application).

## Arquitetura e Tecnologias

### Frontend
- **Framework/Biblioteca:** React 18.2 construído com Vite.
- **Roteamento:** React Router DOM.
- **Estilização:** TailwindCSS (v4), Motion (framer-motion) para animações, Lucide React para ícones.
- **Componentes Avançados:** React Grid Layout (para estruturação de páginas/dashboard), Recharts (para relatórios ou métricas), Google Maps JS API.
- **Linguagem:** TypeScript.

### Backend
- **Framework:** Node.js com Express (v5) em TypeScript.
- **Banco de Dados:** MySQL gerenciado usando Prisma ORM.
- **Autenticação e Segurança:** JWT e BcryptJS (criptografia de senhas), além de middleware CORS mapeado globalmente.
- **Outras Dependências:** Multer para upload de arquivos/imagens e Nodemailer para envios de e-mails.

### Banco de Dados (Prisma Schema - MySQL)
- **Modelos Principais:**
  - `User`: Administradores e usuários do sistema.
  - `Display`: Telas ou painéis persistentes configurados com um layout de páginas (salvo via string/LongText).
  - `Device`: Dispositivos físicos pareados ao sistema por `pairingCode`, associados ou não a um `Display`.
  - `Broadcast`: Mensagens temporárias ou permanentes (`page`) para sobrescrever a exibição padrão de uma série de terminais (`displayIds`).
  - `Setting`: Configurações dinâmicas de Key-Value.

## Decisões Técnicas Importantes
- **Autenticação via JWT:** Usado para gerenciar estado seguro de login (stateless RESTful API).
- **ORM Prisma com MySQL:** Escolhido por tipagem forte, além da facilidade de lidar com armazenamentos grandes de atributos dinâmicos (`LongText`) nas configurações visuais das telas.
- **Arquitetura Desacoplada (Frontend/Backend):** Garantia de controle modular e facilidade no deploy de componentes através de múltiplos serviços/containers.

## Pendências e Próximos Passos
- **Hospedagem e Deploy:** Decidir provedores e finalizar estruturação de deploy (Frontend, Backend, DB).
- **Armazenamento de Mídia (Object Storage):** Refatorar o upload de imagens/vídeos (atualmente baseado via `multer` em disco local) para conectar com uma cloud de arquivos de forma a não perder os uploads em caso de restart do servidor na nuvem.
- **Segurança da API:** Considerar uso de limitações de IP (Rate Limiting) e sanitização dos dados que entram via endpoints.
- **Gestão de Segredos:** Criar fluxos para chaves de terceiros (SMTP, Database URI, JWT Secret) por ambiente de CI/CD.

## Histórico de Alterações (Changelog)
- **[Ata de Criação]**: Criação inicial da documentação contínua de memória técnica do projeto (`PROJECT_MEMORY.md`). Constatado que o `README.md` original do frontend era um template placeholder, fazendo necessária a implementação deste arquivo root que concentra o status do projeto.
