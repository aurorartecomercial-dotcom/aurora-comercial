# VORA 313 — Monetização preparada

## Modelo atual
- Comissão padrão: 7% sobre o valor dos produtos.
- Frete continua separado e é contabilizado como receita operacional da VORA.
- Cada item de pedido guarda vendedor, percentual, bruto, comissão e líquido do vendedor.
- Ao marcar um pedido como `pago`, a Cloud Function cria/atualiza um documento em `comissoes/{pedidoId}`.
- Produtos podem ter `monetizacao.destaque = true` e `monetizacao.percentualComissao`.
- Produtos sem percentual explícito usam 7%.
- Limite defensivo de comissão por produto: 30%.

## Próxima fase
1. Criar onboarding de vendedores.
2. Criar carteira/saldo por vendedor.
3. Criar planos de loja pagos.
4. Criar publicidade interna/destaques pagos.
5. Ligar um gateway autorizado de Angola ao backend, usando webhook e idempotência.
6. Implementar estornos e reconciliação antes de produção.

## Segurança
Nenhuma chave secreta de gateway deve entrar em HTML, JS do navegador ou GitHub. O provedor deve ser chamado por Cloud Functions/servidor.
