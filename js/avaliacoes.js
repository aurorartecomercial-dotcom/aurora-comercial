export async function obterAvaliacao(prodId) {
    try {
        const response = await fetch(`/api/avaliacoes?produtoId=${prodId}`);
        const data = await response.json();
        return { media: data.media || 0, total: data.total || 0 };
    } catch (e) {
        return { media: 0, total: 0 };
    }
}

export async function adicionarAvaliacao(prodId, nota) {
    try {
        await fetch('/api/avaliacoes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ produtoId: prodId, nota })
        });
    } catch (e) {
        console.warn('Erro ao adicionar avaliação.');
    }
}