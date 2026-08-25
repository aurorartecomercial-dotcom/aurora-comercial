import { CONFIG } from './config.js';

export async function obterAvaliacao(prodId) {
    try {
        const res = await fetch(`${CONFIG.API_BASE}/avaliacoes.php?produto_id=${prodId}`);
        if (!res.ok) throw new Error('Erro ao buscar avaliações');
        const data = await res.json();
        if (data.media && data.total) {
            return { media: data.media, total: data.total };
        } else {
            return { media: 0, total: 0 };
        }
    } catch (e) {
        const avaliacoes = JSON.parse(localStorage.getItem('aurora_avaliacoes') || '{}');
        const prodAval = avaliacoes[prodId] || [];
        if (prodAval.length === 0) return { media: 0, total: 0 };
        const soma = prodAval.reduce((acc, a) => acc + a.nota, 0);
        return { media: soma / prodAval.length, total: prodAval.length };
    }
}

export async function adicionarAvaliacao(prodId, nota) {
    try {
        const res = await fetch(`${CONFIG.API_BASE}/avaliacoes.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ produto_id: prodId, nota: nota })
        });
        const data = await res.json();
        if (!data.success) throw new Error('Erro ao adicionar avaliação');
    } catch (e) {
        console.warn('Falha ao adicionar avaliação na API, a usar localStorage.');
        const avaliacoes = JSON.parse(localStorage.getItem('aurora_avaliacoes') || '{}');
        if (!avaliacoes[prodId]) avaliacoes[prodId] = [];
        avaliacoes[prodId].push({ nota, data: new Date().toISOString() });
        localStorage.setItem('aurora_avaliacoes', JSON.stringify(avaliacoes));
    }
}