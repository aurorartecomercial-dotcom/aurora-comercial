// VORA 313 — camada de monetização (somente leitura no cliente)
// Valores financeiros definitivos são sempre calculados pelas Cloud Functions.
export const MONETIZACAO = Object.freeze({
  modelo: 'comissao_por_venda',
  comissaoPadrao: 7,
  planos: Object.freeze([
    { id: 'basico', nome: 'Básico', mensalidade: 0, destaque: false },
    { id: 'profissional', nome: 'Profissional', mensalidade: 15000, destaque: true },
    { id: 'premium', nome: 'Premium', mensalidade: 30000, destaque: true }
  ])
});

export function ordenarProdutosMonetizados(produtos = []) {
  return [...produtos].sort((a, b) => {
    const da = a?.monetizacao?.destaque === true ? 1 : 0;
    const db = b?.monetizacao?.destaque === true ? 1 : 0;
    if (db !== da) return db - da;
    return Number(a?.ordem ?? 9999) - Number(b?.ordem ?? 9999);
  });
}
