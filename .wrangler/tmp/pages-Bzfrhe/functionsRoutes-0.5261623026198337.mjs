import { onRequestDelete as __api_admin_produtos_js_onRequestDelete } from "C:\\Users\\AGUIAR\\Music\\aurora-comercial\\functions\\api\\admin\\produtos.js"
import { onRequestGet as __api_admin_produtos_js_onRequestGet } from "C:\\Users\\AGUIAR\\Music\\aurora-comercial\\functions\\api\\admin\\produtos.js"
import { onRequestPost as __api_admin_produtos_js_onRequestPost } from "C:\\Users\\AGUIAR\\Music\\aurora-comercial\\functions\\api\\admin\\produtos.js"
import { onRequestPut as __api_admin_produtos_js_onRequestPut } from "C:\\Users\\AGUIAR\\Music\\aurora-comercial\\functions\\api\\admin\\produtos.js"
import { onRequestGet as __api_admin_vendas_js_onRequestGet } from "C:\\Users\\AGUIAR\\Music\\aurora-comercial\\functions\\api\\admin\\vendas.js"
import { onRequestPost as __api_admin_vendas_js_onRequestPost } from "C:\\Users\\AGUIAR\\Music\\aurora-comercial\\functions\\api\\admin\\vendas.js"
import { onRequestPut as __api_admin_vendas_js_onRequestPut } from "C:\\Users\\AGUIAR\\Music\\aurora-comercial\\functions\\api\\admin\\vendas.js"
import { onRequestPost as __api_cliente_login_js_onRequestPost } from "C:\\Users\\AGUIAR\\Music\\aurora-comercial\\functions\\api\\cliente\\login.js"
import { onRequestGet as __api_cliente_me_js_onRequestGet } from "C:\\Users\\AGUIAR\\Music\\aurora-comercial\\functions\\api\\cliente\\me.js"
import { onRequestPost as __api_cliente_registar_js_onRequestPost } from "C:\\Users\\AGUIAR\\Music\\aurora-comercial\\functions\\api\\cliente\\registar.js"
import { onRequestPost as __api_frete_calcular_js_onRequestPost } from "C:\\Users\\AGUIAR\\Music\\aurora-comercial\\functions\\api\\frete\\calcular.js"
import { onRequestPost as __api_pagamento_criar_js_onRequestPost } from "C:\\Users\\AGUIAR\\Music\\aurora-comercial\\functions\\api\\pagamento\\criar.js"
import { onRequestPost as __api_pagamento_webhook_js_onRequestPost } from "C:\\Users\\AGUIAR\\Music\\aurora-comercial\\functions\\api\\pagamento\\webhook.js"
import { onRequestGet as __api_avaliacoes_js_onRequestGet } from "C:\\Users\\AGUIAR\\Music\\aurora-comercial\\functions\\api\\avaliacoes.js"
import { onRequestPost as __api_avaliacoes_js_onRequestPost } from "C:\\Users\\AGUIAR\\Music\\aurora-comercial\\functions\\api\\avaliacoes.js"
import { onRequestPost as __api_chat_js_onRequestPost } from "C:\\Users\\AGUIAR\\Music\\aurora-comercial\\functions\\api\\chat.js"
import { onRequestPost as __api_login_js_onRequestPost } from "C:\\Users\\AGUIAR\\Music\\aurora-comercial\\functions\\api\\login.js"
import { onRequestGet as __api_pontos_js_onRequestGet } from "C:\\Users\\AGUIAR\\Music\\aurora-comercial\\functions\\api\\pontos.js"
import { onRequestPost as __api_pontos_js_onRequestPost } from "C:\\Users\\AGUIAR\\Music\\aurora-comercial\\functions\\api\\pontos.js"
import { onRequestDelete as __api_produtos_js_onRequestDelete } from "C:\\Users\\AGUIAR\\Music\\aurora-comercial\\functions\\api\\produtos.js"
import { onRequestGet as __api_produtos_js_onRequestGet } from "C:\\Users\\AGUIAR\\Music\\aurora-comercial\\functions\\api\\produtos.js"
import { onRequestPost as __api_produtos_js_onRequestPost } from "C:\\Users\\AGUIAR\\Music\\aurora-comercial\\functions\\api\\produtos.js"
import { onRequestPut as __api_produtos_js_onRequestPut } from "C:\\Users\\AGUIAR\\Music\\aurora-comercial\\functions\\api\\produtos.js"
import { onRequestGet as __api_rastreio_js_onRequestGet } from "C:\\Users\\AGUIAR\\Music\\aurora-comercial\\functions\\api\\rastreio.js"
import { onRequestGet as __api_recomendacoes_js_onRequestGet } from "C:\\Users\\AGUIAR\\Music\\aurora-comercial\\functions\\api\\recomendacoes.js"
import { onRequestGet as __api_vendas_js_onRequestGet } from "C:\\Users\\AGUIAR\\Music\\aurora-comercial\\functions\\api\\vendas.js"
import { onRequestPost as __api_vendas_js_onRequestPost } from "C:\\Users\\AGUIAR\\Music\\aurora-comercial\\functions\\api\\vendas.js"
import { onRequestPut as __api_vendas_js_onRequestPut } from "C:\\Users\\AGUIAR\\Music\\aurora-comercial\\functions\\api\\vendas.js"
import { onRequest as __api_admin__middleware_js_onRequest } from "C:\\Users\\AGUIAR\\Music\\aurora-comercial\\functions\\api\\admin\\_middleware.js"

export const routes = [
    {
      routePath: "/api/admin/produtos",
      mountPath: "/api/admin",
      method: "DELETE",
      middlewares: [],
      modules: [__api_admin_produtos_js_onRequestDelete],
    },
  {
      routePath: "/api/admin/produtos",
      mountPath: "/api/admin",
      method: "GET",
      middlewares: [],
      modules: [__api_admin_produtos_js_onRequestGet],
    },
  {
      routePath: "/api/admin/produtos",
      mountPath: "/api/admin",
      method: "POST",
      middlewares: [],
      modules: [__api_admin_produtos_js_onRequestPost],
    },
  {
      routePath: "/api/admin/produtos",
      mountPath: "/api/admin",
      method: "PUT",
      middlewares: [],
      modules: [__api_admin_produtos_js_onRequestPut],
    },
  {
      routePath: "/api/admin/vendas",
      mountPath: "/api/admin",
      method: "GET",
      middlewares: [],
      modules: [__api_admin_vendas_js_onRequestGet],
    },
  {
      routePath: "/api/admin/vendas",
      mountPath: "/api/admin",
      method: "POST",
      middlewares: [],
      modules: [__api_admin_vendas_js_onRequestPost],
    },
  {
      routePath: "/api/admin/vendas",
      mountPath: "/api/admin",
      method: "PUT",
      middlewares: [],
      modules: [__api_admin_vendas_js_onRequestPut],
    },
  {
      routePath: "/api/cliente/login",
      mountPath: "/api/cliente",
      method: "POST",
      middlewares: [],
      modules: [__api_cliente_login_js_onRequestPost],
    },
  {
      routePath: "/api/cliente/me",
      mountPath: "/api/cliente",
      method: "GET",
      middlewares: [],
      modules: [__api_cliente_me_js_onRequestGet],
    },
  {
      routePath: "/api/cliente/registar",
      mountPath: "/api/cliente",
      method: "POST",
      middlewares: [],
      modules: [__api_cliente_registar_js_onRequestPost],
    },
  {
      routePath: "/api/frete/calcular",
      mountPath: "/api/frete",
      method: "POST",
      middlewares: [],
      modules: [__api_frete_calcular_js_onRequestPost],
    },
  {
      routePath: "/api/pagamento/criar",
      mountPath: "/api/pagamento",
      method: "POST",
      middlewares: [],
      modules: [__api_pagamento_criar_js_onRequestPost],
    },
  {
      routePath: "/api/pagamento/webhook",
      mountPath: "/api/pagamento",
      method: "POST",
      middlewares: [],
      modules: [__api_pagamento_webhook_js_onRequestPost],
    },
  {
      routePath: "/api/avaliacoes",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_avaliacoes_js_onRequestGet],
    },
  {
      routePath: "/api/avaliacoes",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_avaliacoes_js_onRequestPost],
    },
  {
      routePath: "/api/chat",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_chat_js_onRequestPost],
    },
  {
      routePath: "/api/login",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_login_js_onRequestPost],
    },
  {
      routePath: "/api/pontos",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_pontos_js_onRequestGet],
    },
  {
      routePath: "/api/pontos",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_pontos_js_onRequestPost],
    },
  {
      routePath: "/api/produtos",
      mountPath: "/api",
      method: "DELETE",
      middlewares: [],
      modules: [__api_produtos_js_onRequestDelete],
    },
  {
      routePath: "/api/produtos",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_produtos_js_onRequestGet],
    },
  {
      routePath: "/api/produtos",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_produtos_js_onRequestPost],
    },
  {
      routePath: "/api/produtos",
      mountPath: "/api",
      method: "PUT",
      middlewares: [],
      modules: [__api_produtos_js_onRequestPut],
    },
  {
      routePath: "/api/rastreio",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_rastreio_js_onRequestGet],
    },
  {
      routePath: "/api/recomendacoes",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_recomendacoes_js_onRequestGet],
    },
  {
      routePath: "/api/vendas",
      mountPath: "/api",
      method: "GET",
      middlewares: [],
      modules: [__api_vendas_js_onRequestGet],
    },
  {
      routePath: "/api/vendas",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_vendas_js_onRequestPost],
    },
  {
      routePath: "/api/vendas",
      mountPath: "/api",
      method: "PUT",
      middlewares: [],
      modules: [__api_vendas_js_onRequestPut],
    },
  {
      routePath: "/api/admin",
      mountPath: "/api/admin",
      method: "",
      middlewares: [__api_admin__middleware_js_onRequest],
      modules: [],
    },
  ]