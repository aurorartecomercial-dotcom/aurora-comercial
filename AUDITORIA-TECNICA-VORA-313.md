# Auditoria técnica e correções — VORA 313

Data: 2026-09-10

## Correções aplicadas nesta versão

1. **Rastreio migrado para VORA**
   - A Cloud Function `criarPedido` agora gera códigos `VORA-...`.
   - `js/rastreio.js` valida o prefixo através de `CONFIG.RASTREIO_PREFIXO`.

2. **Configuração centralizada**
   - `js/config.js` agora contém `MARCA`, `RASTREIO_PREFIXO`, número de WhatsApp e chave de cache.
   - O chatbot usa o número centralizado em `CONFIG`.

3. **Frete do frontend alinhado com o backend**
   - `js/transportadoras.js` deixou de calcular uma taxa por kg diferente da regra usada na Cloud Function.
   - O backend continua sendo a autoridade final do valor do frete.
   - Nomes das transportadoras foram migrados de Aurora para VORA.

4. **Pagamentos**
   - O fluxo atualmente suportado e real é pedido + pagamento manual + comprovativo via WhatsApp + confirmação administrativa.
   - Os módulos de cartão e Multicaixa Express continuam apenas como interfaces para futuras Cloud Functions; não foram fingidos como pagamentos automáticos.

## Pontos que continuam a exigir configuração externa

- Integração real com um provedor de cartão/Stripe ou outro adquirente.
- Integração real com Multicaixa Express/provedor autorizado.
- Email transacional real (EmailJS, SMTP ou provedor via Cloud Functions).
- Processo agendado para expirar automaticamente pedidos pendentes.

## Segurança

- A criação do pedido continua no backend.
- Preço, estoque, cupom e frete são recalculados no servidor.
- A baixa de estoque ocorre por transação quando o pedido passa para `pago`.
- O ganho de pontos ocorre no backend, não deve ser confiado ao navegador.
- Segredos de provedores de pagamento não devem ser colocados no frontend ou GitHub.

## Testes executados

- `node --check functions/index.js`
- `node --check js/chatbot.js`
- `node --check js/rastreio.js`
- `node --check js/transportadoras.js`

Todos os quatro arquivos passaram na verificação sintática.

## Próximo teste obrigatório antes de produção

Fazer um pedido real de teste com um produto barato e verificar, em sequência:

`produto → carrinho → checkout → criarPedido → pagamento manual → confirmação no admin → baixa de estoque → pontos → rastreio`.

Não considerar cartão ou Multicaixa Express como automáticos até que as respectivas Cloud Functions e credenciais de produção de um provedor autorizado estejam configuradas e testadas.
