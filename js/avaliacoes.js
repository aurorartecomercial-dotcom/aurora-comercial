import { db } from './config.js';
import { collection, getDocs, addDoc, query, where } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

export async function obterAvaliacao(prodId) {
    try {
        const q = query(collection(db, 'avaliacoes'), where('produtoId', '==', prodId));
        const snapshot = await getDocs(q);
        let soma = 0;
        let total = 0;
        snapshot.forEach(doc => { soma += doc.data().nota; total++; });
        return { media: total > 0 ? soma / total : 0, total };
    } catch (e) {
        // Fallback para localStorage se o Firestore falhar
        const avaliacoes = JSON.parse(localStorage.getItem('aurora_avaliacoes') || '{}');
        const prodAval = avaliacoes[prodId] || [];
        if (prodAval.length === 0) return { media: 0, total: 0 };
        const soma = prodAval.reduce((acc, a) => acc + a.nota, 0);
        return { media: soma / prodAval.length, total: prodAval.length };
    }
}

export async function adicionarAvaliacao(prodId, nota) {
    try {
        await addDoc(collection(db, 'avaliacoes'), { produtoId: prodId, nota, data: new Date().toISOString() });
    } catch (e) {
        console.warn('Falha ao adicionar avaliação no Firestore, a usar localStorage.');
        const avaliacoes = JSON.parse(localStorage.getItem('aurora_avaliacoes') || '{}');
        if (!avaliacoes[prodId]) avaliacoes[prodId] = [];
        avaliacoes[prodId].push({ nota, data: new Date().toISOString() });
        localStorage.setItem('aurora_avaliacoes', JSON.stringify(avaliacoes));
    }
}