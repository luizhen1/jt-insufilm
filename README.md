# JT Insufilm

Aplicação Next.js com Firebase Authentication e Cloud Firestore usados diretamente no navegador. Não há servidor ou API própria.

## Configuração local

1. Instale as dependências com `npm install`.
2. Copie `.env.example` para `.env.local` e preencha as chaves do app Web no Firebase Console (Configurações do projeto → Seus apps).
3. Em Authentication, habilite o provedor **E-mail/senha** e crie a conta do instalador.
4. Crie o banco Firestore e publique as regras de `firestore.rules` no Console do Firebase ou pela Firebase CLI.
5. Rode `npm run dev`.

As variáveis `NEXT_PUBLIC_*` são públicas por definição: as credenciais do Firebase Web identificam o projeto, mas não substituem as regras do Firestore. As regras deste repositório permitem criar pedidos públicos, deixam leitura e atualização restritas a usuários autenticados e impedem exclusão. Cadastre apenas a conta administrativa pretendida no Firebase Authentication.

O telefone do rodapé vem de `NEXT_PUBLIC_BUSINESS_WHATSAPP` e deve estar no formato internacional com código do país, somente números, por exemplo `5511999999999`.

## Coleção `agendamentos`

Os documentos são criados com ID automático e os campos `clienteNome`, `clienteTelefone`, `veiculo`, `tipoPelicula`, `dataAgendamento`, `horario`, `status` e `criadoEm`. O painel escuta a coleção em tempo real. As regras permitem ao instalador atualizar somente o status.
