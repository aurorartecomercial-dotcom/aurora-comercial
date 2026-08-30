import { extrairValorNumerico, mostrarToast, validarCliente, gerarNumeroFatura } from './utils.js';
import { db, CONFIG } from './config.js';
import { collection, addDoc, updateDoc, doc, getDoc, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

let carrinho = [];
let listaProdutosHTML, totalHTML, badgeContador, sidebar, overlay;
let modalCliente, modalPagamento;
let inputNome, inputTelefone, inputNif, inputMorada;
let btnSalvarCliente, btnFecharModal;
let cupomAplicado = null;
let dadosVendaTemp = {};

export function initCarrinho() {
    listaProdutosHTML = document.getElementById('itensCarrinhoLoja');
    totalHTML = document.getElementById('totalCarrinhoLoja');
    badgeContador = document.getElementById('badgeContador');
    sidebar = document.getElementById('carrinhoSidebar');
    overlay = document.getElementById('carrinhoOverlay');
    modalCliente = document.getElementById('modalCliente');
    modalPagamento = document.getElementById('modalPagamento');
    inputNome = document.getElementById('inputNome');
    inputTelefone = document.getElementById('inputTelefone');
    inputNif = document.getElementById('inputNif');
    inputMorada = document.getElementById('inputMorada');
    btnSalvarCliente = document.getElementById('btnSalvarCliente');
    btnFecharModal = document.getElementById('btnFecharModal');

    if (!listaProdutosHTML || !totalHTML || !badgeContador || !sidebar || !overlay) {
        console.warn('Carrinho: elementos não encontrados nesta página. Inicialização cancelada.');
        return;
    }

    carregarCarrinho();
    atualizarCarrinho();

    const abrirBtn = document.getElementById('abrirCarrinhoFlutuante');
    const fecharBtn = document.getElementById('btnFecharCarrinho');
    if (abrirBtn) abrirBtn.addEventListener('click', abrirCarrinho);
    if (fecharBtn) fecharBtn.addEventListener('click', fecharCarrinho);
    if (overlay) overlay.addEventListener('click', fecharCarrinho);

    const btnCupom = document.getElementById('btnAplicarCupom');
    const inputCupom = document.getElementById('inputCupom');
    if (btnCupom && inputCupom) {
        btnCupom.addEventListener('click', () => aplicarCupom(inputCupom.value.trim()));
    }

    const btnFinalizar = document.getElementById('btnFinalizarWhatsApp');
    if (btnFinalizar) {
        btnFinalizar.addEventListener('click', () => {
            if (carrinho.length === 0) { mostrarToast('Sua sacola está vazia.', 'info'); return; }
            abrirModalCliente();
        });
    }

    if (btnSalvarCliente) {
        btnSalvarCliente.addEventListener('click', () => {
            const nome = inputNome.value.trim();
            const telefone = inputTelefone.value.trim();
            const nif = inputNif.value.trim();
            const morada = inputMorada.value.trim();
            const erros = validarCliente(nome, telefone, nif);
            if (erros.nome) document.getElementById('erroNome').textContent = erros.nome;
            else document.getElementById('erroNome').textContent = '';
            if (erros.telefone) document.getElementById('erroTelefone').textContent = erros.telefone;
            else document.getElementById('erroTelefone').textContent = '';
            if (erros.nif) document.getElementById('erroNif').textContent = erros.nif;
            else document.getElementById('erroNif').textContent = '';
            if (Object.keys(erros).length > 0) return;

            fecharModalCliente();
            iniciarFluxoPagamento(nome, telefone, nif, morada);
        });
    }

    if (btnFecharModal) btnFecharModal.addEventListener('click', fecharModalCliente);
    if (modalCliente) modalCliente.addEventListener('click', (e) => { if (e.target === modalCliente) fecharModalCliente(); });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (sidebar && sidebar.classList.contains('ativo')) fecharCarrinho();
            if (modalCliente && modalCliente.style.display === 'flex') fecharModalCliente();
            if (modalPagamento && modalPagamento.style.display === 'flex') fecharModalPagamento();
        }
    });

    document.getElementById('toastFechar')?.addEventListener('click', () => {
        document.getElementById('toast-notificacao').style.top = '-100px';
    });

    if (listaProdutosHTML) {
        listaProdutosHTML.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;
            const index = btn.dataset.index;
            const mudanca = btn.dataset.mudanca;
            if (index !== undefined && mudanca) {
                alterarQtd(parseInt(index), parseInt(mudanca));
            }
        });
    }

    const btnGPS = document.getElementById('btnGPS');
    if (btnGPS && inputMorada) {
        btnGPS.addEventListener('click', () => {
            if (!navigator.geolocation) { alert('Seu navegador não suporta GPS.'); return; }
            btnGPS.textContent = '⏳ Buscando...'; btnGPS.disabled = true;
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    try {
                        const resposta = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
                        const dados = await resposta.json();
                        if (dados && dados.display_name) inputMorada.value = dados.display_name;
                        else inputMorada.value = `Lat: ${lat}, Lng: ${lng}`;
                        btnGPS.textContent = '✅ Localizado!';
                        setTimeout(() => { btnGPS.textContent = '📍 GPS'; btnGPS.disabled = false; }, 3000);
                    } catch (erro) {
                        inputMorada.value = `Lat: ${lat}, Lng: ${lng}`;
                        btnGPS.textContent = '✅ Coordenadas!';
                        setTimeout(() => { btnGPS.textContent = '📍 GPS'; btnGPS.disabled = false; }, 3000);
                    }
                },
                (erro) => {
                    alert('Erro ao obter localização.'); btnGPS.textContent = '📍 GPS'; btnGPS.disabled = false;
                }
            );
        });
    }
}

function carregarCarrinho() { const dados = localStorage.getItem('carrinho_aurora'); carrinho = dados ? JSON.parse(dados) : []; }
function salvarCarrinho() { localStorage.setItem('carrinho_aurora', JSON.stringify(carrinho)); atualizarBadge(); }

export function atualizarCarrinho() {
    if (!listaProdutosHTML) return;
    listaProdutosHTML.innerHTML = '';
    let totalGeral = 0;
    if (carrinho.length === 0) {
        listaProdutosHTML.innerHTML = `<li style="text-align:center;color:#999;margin-top:40px;font-size:15px;">Sua sacola está vazia.</li>`;
    } else {
        carrinho.forEach((item, index) => {
            const valorLimpo = extrairValorNumerico(item.preco);
            totalGeral += valorLimpo * item.quantidade;
            const li = document.createElement('li');
            li.className = 'item-carrinho-loja';
            li.innerHTML = `
                <div class="item-info-loja">
                    <h4>${item.nome}</h4>
                    <p>${item.preco}</p>
                </div>
                <div class="item-controles">
                    <button data-index="${index}" data-mudanca="-1">−</button>
                    <span>${item.quantidade}</span>
                    <button data-index="${index}" data-mudanca="1">+</button>
                </div>
            `;
            listaProdutosHTML.appendChild(li);
        });
    }
    if (cupomAplicado) totalGeral = totalGeral - (totalGeral * (cupomAplicado.desconto / 100));
    if (totalHTML) totalHTML.textContent = totalGeral.toFixed(2);
    atualizarBadge();
    salvarCarrinho();
}

function atualizarBadge() {
    const totalItens = carrinho.reduce((acc, item) => acc + item.quantidade, 0);
    if (badgeContador) { badgeContador.textContent = totalItens; badgeContador.style.display = totalItens > 0 ? 'inline' : 'none'; }
}

function abrirCarrinho() { if (!sidebar) return; sidebar.classList.add('ativo'); if (overlay) overlay.style.display = 'block'; document.body.style.overflow = 'hidden'; }
function fecharCarrinho() { if (!sidebar) return; sidebar.classList.remove('ativo'); if (overlay) overlay.style.display = 'none'; document.body.style.overflow = ''; }

window.alterarQtd = function(index, mudanca) {
    if (!carrinho[index]) return;
    carrinho[index].quantidade += mudanca;
    if (carrinho[index].quantidade <= 0) carrinho.splice(index, 1);
    atualizarCarrinho();
};

export function adicionarProdutoCarrinho(nome, preco, estoqueDisponivel) {
    if (estoqueDisponivel !== undefined && estoqueDisponivel <= 0) { mostrarToast('🚫 Produto esgotado!', 'info'); return; }
    const existente = carrinho.find(i => i.nome === nome);
    let quantidadeAtual = existente ? existente.quantidade : 0;
    if (estoqueDisponivel !== undefined && quantidadeAtual >= estoqueDisponivel) { mostrarToast('🚫 Estoque esgotado!', 'info'); return; }
    if (existente) { existente.quantidade += 1; } else { carrinho.push({ nome, preco, quantidade: 1 }); }
    atualizarCarrinho();
    mostrarToast('Produto adicionado!', 'sucesso');
}

export async function aplicarCupom(codigoCupom) {
    if (!codigoCupom) return;
    try {
        const q = query(collection(db, 'cupons'), where('codigo', '==', codigoCupom));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            const cupom = snapshot.docs[0].data();
            if (cupom.ativo) {
                cupomAplicado = { codigo: codigoCupom.toUpperCase(), desconto: cupom.percentual };
                mostrarToast(`Cupom ${codigoCupom.toUpperCase()} aplicado! ${cupom.percentual}% OFF`, 'sucesso');
                atualizarCarrinho();
            } else {
                mostrarToast('Cupom inválido!', 'info');
            }
        } else {
            mostrarToast('Cupom inválido!', 'info');
        }
    } catch (e) {
        console.error('Erro ao validar cupom:', e);
        mostrarToast('Erro ao validar cupom. Tente novamente.', 'info');
    }
}

function abrirModalCliente() {
    if (modalCliente) {
        modalCliente.style.display = 'flex';
        inputNome.value = ''; inputTelefone.value = ''; inputNif.value = ''; inputMorada.value = '';
        document.getElementById('erroNome').textContent = '';
        document.getElementById('erroTelefone').textContent = '';
        document.getElementById('erroNif').textContent = '';
        setTimeout(() => inputNome.focus(), 100);
    }
}
function fecharModalCliente() { if (modalCliente) modalCliente.style.display = 'none'; }
function fecharModalPagamento() { if (modalPagamento) modalPagamento.style.display = 'none'; }

async function iniciarFluxoPagamento(nome, telefone, nif, morada) {
    dadosVendaTemp = { nome, telefone, nif, morada };
    let totalComDesconto = carrinho.reduce((acc, item) => acc + extrairValorNumerico(item.preco) * item.quantidade, 0);
    let cupomSalvo = null;
    if (cupomAplicado) {
        totalComDesconto = totalComDesconto - (totalComDesconto * (cupomAplicado.desconto / 100));
        cupomSalvo = { ...cupomAplicado };
    }
    await salvarVendaNoHistorico(nome, telefone, nif, morada, cupomSalvo);
    abrirModalPagamento(totalComDesconto, nome);
}

function abrirModalPagamento(valorTotal, nomeCliente) {
    if (!modalPagamento) return;
    const referencia = `PAY-${new Date().getFullYear()}-${Math.floor(Math.random()*1000000)}`;
    document.getElementById('pagValor').textContent = valorTotal.toLocaleString('pt-AO') + ' Kz';
    document.getElementById('pagRef').textContent = referencia;
    const qrText = `NIF:5000048151|REF:${referencia}|VAL:${valorTotal.toFixed(2)}`;
    document.getElementById('pagQR').src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrText)}`;
    modalPagamento.style.display = 'flex';

    document.getElementById('btnCopiarRef').onclick = () => {
        navigator.clipboard.writeText(referencia);
        alert('✅ Referência copiada! Cole no Multicaixa.');
    };
    document.getElementById('btnConfirmarPagamento').onclick = () => {
        fecharModalPagamento();
        enviarPedidoWhatsApp();
    };
    document.getElementById('btnFecharPagamento').onclick = () => {
        fecharModalPagamento();
        mostrarToast('Pedido cancelado.', 'info');
    };
}

async function enviarPedidoWhatsApp() {
    const { nome, telefone, nif, morada } = dadosVendaTemp;
    let totalComDesconto = carrinho.reduce((acc, item) => acc + extrairValorNumerico(item.preco) * item.quantidade, 0);
    if (cupomAplicado) totalComDesconto = totalComDesconto - (totalComDesconto * (cupomAplicado.desconto / 100));

    const sucessoFatura = gerarFaturaHTML(carrinho, nome, telefone, nif, morada, totalComDesconto);
    limparCarrinho();

    let textoWhats = `*AURORARTE COMERCIAL - NOVO PEDIDO*\n=============================\n\n`;
    textoWhats += `Cliente: ${nome}\nTelefone: ${telefone}\nNIF: ${nif}\nMorada: ${morada}\n\n`;
    const itens = dadosVendaTemp.itens || [];
    itens.forEach(item => { textoWhats += `• *${item.nome}* (x${item.quantidade}) - ${item.preco} Kz\n`; });
    if (cupomAplicado) textoWhats += `\n💸 *Cupom aplicado:* ${cupomAplicado.codigo} (-${cupomAplicado.desconto}%)\n`;
    textoWhats += `\n*Total:* KZ ${totalComDesconto.toFixed(2)}\n`;
    
    window.open(`https://api.whatsapp.com/send?phone=${CONFIG.NUMERO_WHATSAPP}&text=${encodeURIComponent(textoWhats)}`, '_blank');

    mostrarToast('Pedido finalizado! Fatura aberta para impressão.', 'sucesso');
}

function gerarFaturaHTML(itens, nome, telefone, nif, morada, total) {
    try {
        const numeroFatura = gerarNumeroFatura();
        let itensHTML = '';
        itens.forEach(item => {
            const valorLimpo = extrairValorNumerico(item.preco);
            const subtotal = valorLimpo * item.quantidade;
            itensHTML += `<tr><td>${item.nome}</td><td>${item.quantidade}</td><td>${valorLimpo.toFixed(2)}</td><td>${subtotal.toFixed(2)}</td></tr>`;
        });

        const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Fatura ${numeroFatura} - Aurora Comercial</title>
<style>
  body { font-family: Arial, sans-serif; margin: 30px; }
  h1 { color: #005A4C; text-align: center; }
  h2 { color: #D4AF37; text-align: center; margin-top: 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; }
  th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
  th { background-color: #005A4C; color: white; }
  .total { font-size: 20px; font-weight: bold; text-align: right; margin-top: 20px; }
  .dados { margin-top: 20px; }
  .dados p { margin: 5px 0; }
  @media print { body { margin: 0; } }
</style>
</head>
<body>
<h1>AURORA COMERCIAL</h1>
<h2>Contribuinte: 5000048151 | Tel: +244 933 677 628</h2>
<hr>
<p><strong>Fatura Nº:</strong> ${numeroFatura}</p>
<p><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')}</p>
<div class="dados">
<p><strong>Cliente:</strong> ${nome}</p>
<p><strong>Telefone:</strong> ${telefone}</p>
<p><strong>NIF:</strong> ${nif}</p>
<p><strong>Morada:</strong> ${morada}</p>
</div>
<table>
<thead><tr><th>Descrição</th><th>Qtd</th><th>Preço Unit.</th><th>Subtotal</th></tr></thead>
<tbody>${itensHTML}</tbody>
</table>
<p class="total">Total a Pagar: ${total.toFixed(2)} Kz</p>
<script>window.print();</script>
</body>
</html>`;

        const win = window.open('', '_blank');
        win.document.write(html);
        win.document.close();
        return true;
    } catch (e) {
        console.error('Erro ao gerar fatura:', e);
        alert('Não foi possível gerar a fatura. Pedido concluído, mas sem impressão automática.');
        return false;
    }
}

function limparCarrinho() {
    carrinho = []; cupomAplicado = null; sessionStorage.removeItem('cupom_atual');
    atualizarCarrinho(); fecharCarrinho();
}

async function salvarVendaNoHistorico(nomeCliente, telefoneCliente, nifCliente, moradaCliente, cupomSalvo) {
    let produtosResumo = carrinho.map(item => `${item.nome} (x${item.quantidade})`).join(', ');
    let valorTotalPedido = carrinho.reduce((acc, item) => acc + extrairValorNumerico(item.preco) * item.quantidade, 0);
    if (cupomSalvo) valorTotalPedido = valorTotalPedido - (valorTotalPedido * (cupomSalvo.desconto / 100));
    let totalItensPedido = carrinho.reduce((acc, item) => acc + item.quantidade, 0);
    const agora = new Date();
    const dataHoraFormatada = agora.toLocaleDateString('pt-BR') + ' ' + agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const itensVenda = carrinho.map(item => ({ nome: item.nome, quantidade: item.quantidade, preco: extrairValorNumerico(item.preco) }));

    const novaVenda = {
        dataHora: dataHoraFormatada,
        produtosResumo: produtosResumo,
        valorTotal: valorTotalPedido,
        totalItens: totalItensPedido,
        nomeCliente: nomeCliente,
        telefoneCliente: telefoneCliente,
        nifCliente: nifCliente,
        moradaCliente: moradaCliente,
        cupomAplicado: cupomSalvo ? cupomSalvo.codigo : null,
        descontoPercentual: cupomSalvo ? cupomSalvo.desconto : 0,
        status: 'confirmado',
        itens: itensVenda,
        criadoEm: new Date()
    };

    // Garante autenticação anônima
    const auth = getAuth();
    let user = auth.currentUser;
    if (!user) {
        try {
            const cred = await signInAnonymously(auth);
            user = cred.user;
        } catch (e) {
            console.error('Erro autenticação anónima:', e);
            // Se não conseguir autenticar, salva localmente e avisa
            const historicoLocal = JSON.parse(localStorage.getItem('aurora_historico_vendas')) || [];
            historicoLocal.push(novaVenda);
            localStorage.setItem('aurora_historico_vendas', JSON.stringify(historicoLocal));
            dadosVendaTemp.itens = itensVenda;
            dadosVendaTemp.valorTotal = valorTotalPedido;
            alert('⚠️ Sem conexão com o servidor. Pedido salvo localmente. Entre em contacto pelo WhatsApp para confirmar.');
            return;
        }
    }

    try {
        const docRef = await addDoc(collection(db, 'vendas'), novaVenda);
        const codigoRastreio = 'AURORA-' + docRef.id.slice(-6).toUpperCase();
        await updateDoc(doc(db, 'vendas', docRef.id), { codigoRastreio: codigoRastreio });
        
        await atualizarEstoque(itensVenda);
        
        dadosVendaTemp.codigoRastreio = codigoRastreio;
        dadosVendaTemp.itens = itensVenda;
        dadosVendaTemp.valorTotal = valorTotalPedido;
        
        alert(`✅ Pedido registrado!\nCódigo de rastreio: ${codigoRastreio}`);
    } catch (e) {
        console.error('Erro ao salvar venda no Firestore:', e);
        // Fallback: salva localmente
        const historicoLocal = JSON.parse(localStorage.getItem('aurora_historico_vendas')) || [];
        historicoLocal.push(novaVenda);
        localStorage.setItem('aurora_historico_vendas', JSON.stringify(historicoLocal));
        dadosVendaTemp.itens = itensVenda;
        dadosVendaTemp.valorTotal = valorTotalPedido;
        alert('⚠️ Não foi possível contactar o servidor. Pedido salvo localmente. Envie-nos uma mensagem no WhatsApp com o código: ' + dataHoraFormatada);
    }
}

async function atualizarEstoque(itensVenda) {
    try {
        const produtosSnap = await getDocs(collection(db, 'produtos'));
        const produtosMap = new Map();
        produtosSnap.forEach(doc => produtosMap.set(doc.data().nome, doc.id));

        for (const item of itensVenda) {
            const prodId = produtosMap.get(item.nome);
            if (prodId) {
                const prodRef = doc(db, 'produtos', prodId);
                const prodSnap = await getDoc(prodRef);
                if (prodSnap.exists()) {
                    const estoqueAtual = prodSnap.data().estoque || 0;
                    const novoEstoque = Math.max(0, estoqueAtual - item.quantidade);
                    await updateDoc(prodRef, { estoque: novoEstoque });
                }
            }
        }
    } catch (e) {
        console.error('Erro ao atualizar estoque:', e);
    }
}