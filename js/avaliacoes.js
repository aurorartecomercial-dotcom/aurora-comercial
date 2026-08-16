export function obterAvaliacao(prodId) {
    const avaliacoes = JSON.parse(localStorage.getItem('aurora_avaliacoes') || '{}');
    const prodAval = avaliacoes[prodId] || [];
    if (prodAval.length === 0) return { media: 0, total: 0 };
    const soma = prodAval.reduce((acc, a) => acc + a.nota, 0);
    return { media: soma / prodAval.length, total: prodAval.length };
}

export function adicionarAvaliacao(prodId, nota) {
    const avaliacoes = JSON.parse(localStorage.getItem('aurora_avaliacoes') || '{}');
    if (!avaliacoes[prodId]) avaliacoes[prodId] = [];
    avaliacoes[prodId].push({ nota, data: new Date().toISOString() });
    localStorage.setItem('aurora_avaliacoes', JSON.stringify(avaliacoes));
}