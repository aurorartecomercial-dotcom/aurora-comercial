import { auth, db } from './config.js';
import { collection, getDocs, query, where, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { mostrarToast } from './utils.js';

document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = 'index.html';
            return;
        }

        // Preencher dados do utilizador
        document.getElementById('perfilNome').textContent = `Bem-vindo, ${user.displayName || 'Cliente'}!`;
        document.getElementById('perfilEmail').textContent = user.email || '';

        await carregarPedidos(user.uid);
        await carregarFavoritos();
        await carregarPontos(user.uid);
        await carregarCupons(user.uid);
    });
});

async function carregarPedidos(uid) {
    const container = document.getElementById('historicoPedidos');
    try {
        const q = query(collection(db, 'vendas'), where('uidCliente', '==', uid));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            container.innerHTML = '<p style="color:#999; text-align:center; padding:20px;">Nenhum pedido encontrado.</p>';
            return;
        }
        container.innerHTML = '';
        // Ordenar por data decrescente (se tiver campo criadoEm)
        const pedidos = snapshot.docs.map(doc => doc.data()).sort((a, b) => {
            return (b.criadoEm || 0) - (a.criadoEm || 0);
        });
        pedidos.forEach(venda => {
            const statusClass = venda.status === 'entregue' ? 'status-entregue' : venda.status === 'enviado' ? 'status-enviado' : 'status-confirmado';
            const statusText = venda.status === 'entregue' ? '🟢 Entregue' : venda.status === 'enviado' ? '🔵 Enviado' : '🟡 Confirmado';

            const pedido = document.createElement('div');
            pedido.className = 'pedido-item';
            pedido.innerHTML = `
                <strong>${venda.codigoRastreio || 'Sem código'}</strong>
                <small>${venda.dataHora || 'Data não disponível'} | ${venda.produtosResumo || ''}</small>
                <small style="color:#25D366; font-weight:700;">${(venda.valorTotal || 0).toLocaleString('pt-AO')} Kz</small>
                <span class="status ${statusClass}">${statusText}</span>
            `;
            container.appendChild(pedido);
        });
    } catch (e) {
        console.error('Erro ao carregar pedidos:', e);
        container.innerHTML = '<p style="color:#999; text-align:center; padding:20px;">Erro ao carregar pedidos.</p>';
    }
}

async function carregarFavoritos() {
    const container = document.getElementById('listaDesejos');
    const favoritos = JSON.parse(localStorage.getItem('aurora_favoritos') || '[]');
    if (favoritos.length === 0) {
        container.innerHTML = '<p style="color:#999; text-align:center; padding:20px;">Nenhum favorito guardado.</p>';
        return;
    }

    container.innerHTML = '';
    for (const id of favoritos) {
        try {
            const docRef = doc(db, 'produtos', id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                const prod = docSnap.data();
                const item = document.createElement('div');
                item.className = 'favorito-item';
                item.innerHTML = `
                    <img src="${prod.imagens[0]}" alt="${prod.nome}" onerror="this.src='https://via.placeholder.com/50'">
                    <a href="detalhe.html?id=${prod.id}">${prod.nome}</a>
                    <button onclick="removerFavorito('${prod.id}')">🗑️</button>
                `;
                container.appendChild(item);
            }
        } catch (e) {
            console.warn(`Erro ao carregar produto ${id}:`, e);
        }
    }
}

window.removerFavorito = function(id) {
    let favoritos = JSON.parse(localStorage.getItem('aurora_favoritos') || '[]');
    favoritos = favoritos.filter(f => f !== id);
    localStorage.setItem('aurora_favoritos', JSON.stringify(favoritos));
    mostrarToast('Produto removido dos favoritos.', 'info');
    carregarFavoritos();
};

async function carregarPontos(uid) {
    try {
        const docRef = doc(db, 'clientes', uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const pontos = docSnap.data().pontos || 0;
            document.getElementById('pontosFidelidade').textContent = pontos;
        }
    } catch (e) {
        console.error('Erro ao carregar pontos:', e);
        document.getElementById('pontosFidelidade').textContent = localStorage.getItem('aurora_pontos') || '0';
    }
}

async function carregarCupons(uid) {
    const container = document.getElementById('listaCupons');
    try {
        const q = query(collection(db, 'cupons'), where('uidCliente', '==', uid), where('ativo', '==', true));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            container.innerHTML = '<p style="color:#999; text-align:center; padding:20px;">Nenhum cupom disponível.</p>';
            return;
        }
        container.innerHTML = '';
        snapshot.docs.forEach(doc => {
            const cupom = doc.data();
            const item = document.createElement('div');
            item.className = 'pedido-item';
            item.innerHTML = `
                <strong style="color:var(--cor-ouro-escuro);">🎟️ ${cupom.codigo}</strong>
                <small>${cupom.percentual}% de desconto</small>
                <small style="color:var(--cor-esmeralda); font-weight:700;">Até ${cupom.validade || 'nunca'}</small>
            `;
            container.appendChild(item);
        });
    } catch (e) {
        console.error('Erro ao carregar cupons:', e);
        container.innerHTML = '<p style="color:#999; text-align:center; padding:20px;">Erro ao carregar cupons.</p>';
    }
}