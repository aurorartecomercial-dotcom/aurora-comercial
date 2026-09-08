# Aurora Comercial — Evolução 2 do Painel Administrativo

## Central de Pedidos

A segunda evolução transforma a aba de Pedidos numa central de operação diária:

- fluxo visual por estado;
- contadores por estado;
- pesquisa por cliente, telefone, fatura, rastreio, bairro e produto;
- filtro por cliente e status;
- cartões de pedido com total, entrega e próxima ação;
- botão de ação principal conforme o estado atual;
- painel lateral com detalhes do pedido;
- linha do tempo do pedido;
- impressão da fatura;
- atualização de estado sem recarregar a página inteira;
- layout responsivo para computador e telemóvel.

## Segurança

A evolução usa a função administrativa existente `atualizarEstadoPedido` para alterar estados. Nenhuma regra do Firestore foi enfraquecida e nenhuma credencial foi colocada no frontend.

## Importante

O fluxo de confirmação de pagamento continua dependente da função administrativa já existente. O botão `Confirmar pagamento` chama o backend; a baixa de estoque e as regras de transição continuam no servidor.
