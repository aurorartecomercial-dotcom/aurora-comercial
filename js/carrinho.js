import { extrairValorNumerico, mostrarToast, validarCliente, gerarNumeroFatura } from './utils.js';
import { db, CONFIG } from './config.js';
import { collection, addDoc, updateDoc, doc, getDoc, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { getAuth, signInAnonymously } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { adicionarPontos } from './fidelidade.js';
import { gerarReferenciaMulticaixa } from './multicaixa.js'; // ✅ Importação do Multicaixa

let carrinho = [];
let listaProdutosHTML, totalHTML, badgeContador, sidebar, overlay;
let modalCliente, modalPagamento;
let inputNome, inputTelefone, inputNif, inputMorada, selectBairro, inputObservacao;
let btnSalvarCliente, btnFecharModal;
let cupomAplicado = null;
let dadosVendaTemp = {};
let freteSelecionado = 0;
let bairros = [
    { nome: 'Luanda Centro', taxa: 1000 },
    { nome: 'Ingombota', taxa: 1000 },
    { nome: 'Maianga', taxa: 1200 },
    { nome: 'Rangel', taxa: 1500 },
    { nome: 'Cazenga', taxa: 2000 },
    { nome: 'Viana', taxa: 3500 },
    { nome: 'Talatona', taxa: 4000 },
    { nome: 'Kilamba', taxa: 4500 },
    { nome: 'Benfica', taxa: 3000 },
    { nome: 'Outro', taxa: 5000 }
];

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
    selectBairro = document.getElementById('selectBairro');
    inputObservacao = document.getElementById('inputObservacao');
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
            const bairro = selectBairro ? selectBairro.value : '';
            const observacao = inputObservacao ? inputObservacao.value.trim() : '';
            const erros = validarCliente(nome, telefone, nif);
            if (erros.nome) document.getElementById('erroNome').textContent = erros.nome;
            else document.getElementById('erroNome').textContent = '';
            if (erros.telefone) document.getElementById('erroTelefone').textContent = erros.telefone;
            else document.getElementById('erroTelefone').textContent = '';
            if (erros.nif) document.getElementById('erroNif').textContent = erros.nif;
            else document.getElementById('erroNif').textContent = '';
            if (Object.keys(erros).length > 0) return;
            if (!bairro) { alert('Selecione o bairro para calcular o frete.'); return; }

            freteSelecionado = obterTaxaFrete(bairro);
            fecharModalCliente();
            iniciarFluxoPagamento(nome, telefone, nif, morada, bairro, observacao);
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

    // ✅ DELEGAÇÃO DE EVENTOS CORRIGIDA (para +, - e REMOVER)
    if (listaProdutosHTML) {
        listaProdutosHTML.addEventListener('click', (e) => {
            // Botão de remover (🗑️)
            const btnRemover = e.target.closest('button[data-remover]');
            if (btnRemover) {
                e.preventDefault();
                e.stopPropagation();
                const index = parseInt(btnRemover.dataset.remover, 10);
                if (!isNaN(index) && carrinho[index]) {
                    carrinho.splice(index, 1);
                    atualizarCarrinho();
                    mostrarToast('Produto removido da sacola.', 'info');
                }
                return;
            }

            // Botões de aumentar/diminuir
            const btn = e.target.closest('button[data-index][data-mudanca]');
            if (btn) {
                e.preventDefault();
                e.stopPropagation();
                const index = parseInt(btn.dataset.index, 10);
                const mudanca = parseInt(btn.dataset.mudanca, 10);
                if (!isNaN(index) && !isNaN(mudanca)) {
                    alterarQtd(index, mudanca);
                }
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
                    ${item.observacao ? `<small style="color:#888;">📝 ${item.observacao}</small>` : ''}
                </div>
                <div class="item-controles" style="display:flex; align-items:center; gap:4px; background:#f0f0f0; padding:4px 8px; border-radius:20px;">
                    <button type="button" data-index="${index}" data-mudanca="-1" style="background:none; border:none; font-size:16px; cursor:pointer; padding:4px; width:28px; height:28px; display:flex; align-items:center; justify-content:center; border-radius:50%;">−</button>
                    <span style="font-weight:600; min-width:20px; text-align:center;">${item.quantidade}</span>
                    <button type="button" data-index="${index}" data-mudanca="1" style="background:none; border:none; font-size:16px; cursor:pointer; padding:4px; width:28px; height:28px; display:flex; align-items:center; justify-content:center; border-radius:50%;">+</button>
                    <button type="button" data-remover="${index}" title="Remover do carrinho" style="background:none; border:none; font-size:18px; cursor:pointer; padding:4px; margin-left:4px; color:#E74C3C;">🗑️</button>
                </div>
            `;
            listaProdutosHTML.appendChild(li);
        });
    }
    if (cupomAplicado) totalGeral = totalGeral - (totalGeral * (cupomAplicado.desconto / 100));
    if (totalHTML) totalHTML.textContent = (totalGeral + freteSelecionado).toFixed(2);
    atualizarBadge();
    salvarCarrinho();
}

function obterTaxaFrete(bairro) {
    const b = bairros.find(b => b.nome === bairro);
    return b ? b.taxa : 5000;
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

export function adicionarProdutoCarrinho(nome, preco, estoqueDisponivel, observacao = '') {
    if (estoqueDisponivel !== undefined && estoqueDisponivel <= 0) { mostrarToast('🚫 Produto esgotado!', 'info'); return; }
    const existente = carrinho.find(i => i.nome === nome && i.observacao === observacao);
    let quantidadeAtual = existente ? existente.quantidade : 0;
    if (estoqueDisponivel !== undefined && quantidadeAtual >= estoqueDisponivel) { mostrarToast('🚫 Estoque esgotado!', 'info'); return; }
    if (existente) { existente.quantidade += 1; } else { carrinho.push({ nome, preco, quantidade: 1, observacao }); }
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
        const dadosSalvos = JSON.parse(localStorage.getItem('aurora_cliente_dados') || '{}');
        inputNome.value = dadosSalvos.nome || '';
        inputTelefone.value = dadosSalvos.telefone || '';
        inputNif.value = dadosSalvos.nif || '';
        inputMorada.value = dadosSalvos.morada || '';
        if (selectBairro && dadosSalvos.bairro) selectBairro.value = dadosSalvos.bairro;
        document.getElementById('erroNome').textContent = '';
        document.getElementById('erroTelefone').textContent = '';
        document.getElementById('erroNif').textContent = '';
        setTimeout(() => inputNome.focus(), 100);
    }
}
function fecharModalCliente() { if (modalCliente) modalCliente.style.display = 'none'; }
function fecharModalPagamento() { if (modalPagamento) modalPagamento.style.display = 'none'; }

async function iniciarFluxoPagamento(nome, telefone, nif, morada, bairro, observacao) {
    dadosVendaTemp = { nome, telefone, nif, morada, bairro, observacao };
    let totalProdutos = carrinho.reduce((acc, item) => acc + extrairValorNumerico(item.preco) * item.quantidade, 0);
    let totalComDesconto = totalProdutos;
    let cupomSalvo = null;
    if (cupomAplicado) {
        totalComDesconto = totalComDesconto - (totalComDesconto * (cupomAplicado.desconto / 100));
        cupomSalvo = { ...cupomAplicado };
    }
    let totalFinal = totalComDesconto + freteSelecionado;
    localStorage.setItem('aurora_cliente_dados', JSON.stringify({ nome, telefone, nif, morada, bairro }));

    // ✅ Tenta gerar referência Multicaixa automática
    try {
        const refMulticaixa = await gerarReferenciaMulticaixa(totalFinal, gerarNumeroFatura(), 'Pedido Aurora');
        if (refMulticaixa.referencia) {
            document.getElementById('pagRef').textContent = refMulticaixa.referencia;
        }
    } catch (e) {
        console.warn('Multicaixa não configurado, usando modo manual.');
    }

    await salvarVendaNoHistorico(nome, telefone, nif, morada, bairro, observacao, cupomSalvo, totalProdutos, totalComDesconto, totalFinal);
    abrirModalPagamento(totalProdutos, totalComDesconto, freteSelecionado, totalFinal, nome);
}

function abrirModalPagamento(totalProdutos, totalComDesconto, frete, totalFinal, nomeCliente) {
    if (!modalPagamento) return;
    const referencia = `PAY-${new Date().getFullYear()}-${Math.floor(Math.random()*1000000)}`;
    
    document.getElementById('pagProdutos').textContent = totalProdutos.toLocaleString('pt-AO') + ' Kz';
    if (totalComDesconto !== totalProdutos) {
        document.getElementById('pagDesconto').textContent = '-' + (totalProdutos - totalComDesconto).toLocaleString('pt-AO') + ' Kz';
        document.getElementById('linhaDesconto').style.display = 'block';
    } else {
        document.getElementById('linhaDesconto').style.display = 'none';
    }
    document.getElementById('pagFrete').textContent = frete.toLocaleString('pt-AO') + ' Kz';
    document.getElementById('pagValor').textContent = totalFinal.toLocaleString('pt-AO') + ' Kz';
    document.getElementById('pagRef').textContent = referencia;
    
    const qrText = `NIF:5000048151|REF:${referencia}|VAL:${totalFinal.toFixed(2)}`;
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
    const { nome, telefone, nif, morada, bairro, observacao } = dadosVendaTemp;
    let totalProdutos = carrinho.reduce((acc, item) => acc + extrairValorNumerico(item.preco) * item.quantidade, 0);
    let totalComDesconto = totalProdutos;
    if (cupomAplicado) totalComDesconto = totalComDesconto - (totalComDesconto * (cupomAplicado.desconto / 100));
    let totalFinal = totalComDesconto + freteSelecionado;

    const sucessoFatura = gerarFaturaHTML(carrinho, nome, telefone, nif, morada, bairro, totalProdutos, totalComDesconto, freteSelecionado, totalFinal);
    limparCarrinho();

    let textoWhats = `*AURORARTE COMERCIAL - NOVO PEDIDO*\n=============================\n\n`;
    textoWhats += `Cliente: ${nome}\nTelefone: ${telefone}\nNIF: ${nif}\nMorada: ${morada}\nBairro: ${bairro}\n`;
    if (observacao) textoWhats += `Obs: ${observacao}\n`;
    textoWhats += `\n`;
    carrinho.forEach(item => { textoWhats += `• *${item.nome}* (x${item.quantidade}) - ${item.preco} Kz\n`; });
    textoWhats += `\n📦 Subtotal: ${totalProdutos.toLocaleString('pt-AO')} Kz\n`;
    if (cupomAplicado) textoWhats += `💸 Cupom ${cupomAplicado.codigo}: -${(totalProdutos - totalComDesconto).toLocaleString('pt-AO')} Kz\n`;
    textoWhats += `🚚 Frete (${bairro}): ${freteSelecionado.toLocaleString('pt-AO')} Kz\n`;
    textoWhats += `✅ Total: ${totalFinal.toLocaleString('pt-AO')} Kz\n`;
    
    window.open(`https://api.whatsapp.com/send?phone=${CONFIG.NUMERO_WHATSAPP}&text=${encodeURIComponent(textoWhats)}`, '_blank');

    mostrarToast('Pedido finalizado! Fatura aberta para impressão.', 'sucesso');
}

function gerarFaturaHTML(itens, nome, telefone, nif, morada, bairro, totalProdutos, totalComDesconto, frete, totalFinal) {
    try {
        const numeroFatura = gerarNumeroFatura();
        let itensHTML = '';
        itens.forEach(item => {
            const valorLimpo = extrairValorNumerico(item.preco);
            const subtotal = valorLimpo * item.quantidade;
            itensHTML += `<tr><td>${item.nome}${item.observacao ? '<br><small>Obs: '+item.observacao+'</small>' : ''}</td><td>${item.quantidade}</td><td>${valorLimpo.toFixed(2)}</td><td>${subtotal.toFixed(2)}</td></tr>`;
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
  .resumo { margin-top: 15px; text-align: right; }
  .resumo p { margin: 3px 0; }
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
<p><strong>Morada:</strong> ${morada} - ${bairro}</p>
</div>
<table>
<thead><tr><th>Descrição</th><th>Qtd</th><th>Preço Unit.</th><th>Subtotal</th></tr></thead>
<tbody>${itensHTML}</tbody>
</table>
<div class="resumo">
<p><strong>Subtotal dos produtos:</strong> ${totalProdutos.toFixed(2)} Kz</p>
${totalComDesconto < totalProdutos ? `<p><strong>Desconto (cupom):</strong> -${(totalProdutos - totalComDesconto).toFixed(2)} Kz</p>` : ''}
<p><strong>Frete (${bairro}):</strong> ${frete.toFixed(2)} Kz</p>
<p class="total">Total a Pagar: ${totalFinal.toFixed(2)} Kz</p>
</div>
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
    freteSelecionado = 0;
    atualizarCarrinho(); fecharCarrinho();
}

async function salvarVendaNoHistorico(nomeCliente, telefoneCliente, nifCliente, moradaCliente, bairro, observacao, cupomSalvo, totalProdutos, totalComDesconto, totalFinal) {
    let produtosResumo = carrinho.map(item => `${item.nome} (x${item.quantidade})`).join(', ');
    let valorTotalPedido = totalFinal;
    let totalItensPedido = carrinho.reduce((acc, item) => acc + item.quantidade, 0);
    const agora = new Date();
    const dataHoraFormatada = agora.toLocaleDateString('pt-BR') + ' ' + agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const itensVenda = carrinho.map(item => ({ nome: item.nome, quantidade: item.quantidade, preco: extrairValorNumerico(item.preco), observacao: item.observacao || '' }));

    const codigoRastreio = 'AURORA-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    const novaVenda = {
        codigoRastreio: codigoRastreio,
        dataHora: dataHoraFormatada,
        produtosResumo: produtosResumo,
        valorTotal: valorTotalPedido,
        totalItens: totalItensPedido,
        nomeCliente: nomeCliente,
        telefoneCliente: telefoneCliente,
        nifCliente: nifCliente,
        moradaCliente: moradaCliente,
        bairro: bairro,
        observacao: observacao,
        cupomAplicado: cupomSalvo ? cupomSalvo.codigo : null,
        descontoPercentual: cupomSalvo ? cupomSalvo.desconto : 0,
        subtotal: totalProdutos,
        valorDesconto: totalProdutos - totalComDesconto,
        frete: freteSelecionado,
        status: 'confirmado',
        itens: itensVenda,
        criadoEm: new Date(),
        uidCliente: getAuth().currentUser?.uid || null // ✅ Adicionamos UID para associar ao utilizador
    };

    const auth = getAuth();
    let user = auth.currentUser;
    if (!user) {
        try {
            const cred = await signInAnonymously(auth);
            user = cred.user;
            novaVenda.uidCliente = user.uid; // Atualiza UID após autenticação anónima
        } catch (e) {
            console.error('Erro autenticação anónima:', e);
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
        dadosVendaTemp.codigoRastreio = codigoRastreio;
        dadosVendaTemp.itens = itensVenda;
        dadosVendaTemp.valorTotal = valorTotalPedido;
        
        await atualizarEstoque(itensVenda);

        await adicionarPontos(valorTotalPedido);

        alert(`✅ Pedido registrado!\nCódigo de rastreio: ${codigoRastreio}`);
    } catch (e) {
        console.error('Erro ao salvar venda no Firestore:', e);
        const historicoLocal = JSON.parse(localStorage.getItem('aurora_historico_vendas')) || [];
        historicoLocal.push(novaVenda);
        localStorage.setItem('aurora_historico_vendas', JSON.stringify(historicoLocal));
        dadosVendaTemp.itens = itensVenda;
        dadosVendaTemp.valorTotal = valorTotalPedido;
        alert('⚠️ Não foi possível contactar o servidor. Pedido salvo localmente. Envie-nos uma mensagem no WhatsApp com o código: ' + codigoRastreio);
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
        console.warn('Não foi possível atualizar o estoque automaticamente:', e);
    }
}