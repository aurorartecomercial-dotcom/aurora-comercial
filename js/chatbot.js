// ============================================================
// CHATBOT WHATSAPP - AURORA COMERCIAL
// ============================================================

const NUMERO_WHATSAPP = '244933677628';

export function initChatbot() {
    // Se o menu flutuante existir
    const chatBtn = document.getElementById('chatBtn');
    const chatMenu = document.getElementById('chatMenu');
    if (chatBtn && chatMenu) {
        chatBtn.addEventListener('click', () => {
            chatMenu.style.display = chatMenu.style.display === 'none' ? 'block' : 'none';
        });
    }

    // Botões de opções rápidas (podem estar no chatMenu)
    const botoes = document.querySelectorAll('[data-chat-opcao]');
    botoes.forEach(btn => {
        btn.addEventListener('click', () => {
            const opcao = btn.dataset.chatOpcao;
            const mensagem = obterMensagem(opcao);
            abrirWhatsApp(mensagem);
        });
    });
}

function obterMensagem(opcao) {
    const mensagens = {
        'pedido': 'Olá! Quero fazer um pedido na Aurora Comercial. Pode me ajudar?',
        'rastrear': 'Olá! Preciso de ajuda para rastrear o meu pedido. O código é: ',
        'duvida': 'Olá! Tenho uma dúvida sobre um produto. Pode me ajudar?',
        'pagamento': 'Olá! Como posso pagar o meu pedido?',
        'devolucao': 'Olá! Preciso de ajuda com uma devolução. Pode me orientar?',
        'vender': 'Olá! Quero vender os meus produtos na Aurora Comercial. Como funciona?'
    };
    return mensagens[opcao] || 'Olá! Posso ajudar?';
}

function abrirWhatsApp(mensagem) {
    const url = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
}