// ============================================================
// PROGRAMA DE AFILIADOS - AURORA COMERCIAL
// ============================================================

let codigoAfiliado = '';

export function initAfiliados() {
    // Verificar se o URL tem um código de afiliado (?ref=CODIGO)
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
        localStorage.setItem('aurora_ref_afiliado', ref);
        mostrarToast(`Bem-vindo! Usaste o código ${ref}`, 'info');
    }

    // Gerar código de afiliado para o utilizador logado (baseado no UID)
    const uid = localStorage.getItem('aurora_uid_cliente');
    if (uid) {
        codigoAfiliado = uid.substring(0, 8).toUpperCase();
    } else {
        codigoAfiliado = 'AURORA' + Math.random().toString(36).substring(2, 6).toUpperCase();
    }
    
    // Guardar no localStorage
    localStorage.setItem('aurora_codigo_afiliado', codigoAfiliado);

    // Adicionar links de partilha nos produtos
    adicionarLinksAfiliados();
}

function adicionarLinksAfiliados() {
    const btnShare = document.querySelectorAll('.btn-share');
    btnShare.forEach(btn => {
        const linkOriginal = btn.dataset.link;
        if (linkOriginal && !linkOriginal.includes('ref=')) {
            btn.dataset.link = linkOriginal + `?ref=${codigoAfiliado}`;
        }
    });
}

export function obterLinkAfiliado(linkProduto) {
    const codigo = localStorage.getItem('aurora_codigo_afiliado') || 'AURORA0000';
    if (linkProduto.includes('?')) {
        return linkProduto + `&ref=${codigo}`;
    } else {
        return linkProduto + `?ref=${codigo}`;
    }
}

export function aplicarDescontoAfiliado() {
    const ref = localStorage.getItem('aurora_ref_afiliado');
    if (ref) {
        return { codigo: ref, desconto: 5 }; // 5% de desconto para novos clientes
    }
    return null;
}

// Função para atribuir pontos ao afiliado após compra
export async function atribuirPontosAfiliado(valorCompra) {
    const ref = localStorage.getItem('aurora_ref_afiliado');
    if (!ref) return;

    const pontos = Math.floor(valorCompra / 1000) * 0.1; // 10% dos pontos
    console.log(`Afiliado ${ref} ganhou ${pontos} pontos`);
    
    // Em produção, enviar para Firestore
    // await updateDoc(doc(db, 'clientes', ref), { pontos: increment(pontos) });
}