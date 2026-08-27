import { extrairValorNumerico, mostrarToast, validarCliente, gerarNumeroFatura, IMAGEM_FALLBACK } from './utils.js';
import { db, CONFIG } from './config.js';
import { collection, addDoc, updateDoc, doc, getDoc, query, where, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
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

    window.addEventListener('storage', (e) => {
        if (e.key === 'carrinho_aurora') { carrinho = JSON.parse(e.newValue) || []; atualizarCarrinho(); }
    });

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

    try {
        const { jsPDF } = await import('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
        const pdfBlob = await gerarFaturaPDF(carrinho, nome, telefone, nif, morada, totalComDesconto);
        const nomeArquivo = `Fatura_Aurora_${Date.now()}.pdf`;
        const file = new File([pdfBlob], nomeArquivo, { type: 'application/pdf' });

        // ✅ Abrir o PDF numa nova aba para impressão
        const urlBlob = URL.createObjectURL(pdfBlob);
        const win = window.open(urlBlob, '_blank');
        if (win) {
            win.document.title = nomeArquivo;
            setTimeout(() => win.print(), 500); // opcional: abrir diálogo de impressão
        } else {
            // Se popup bloqueado, descarregar
            const linkDownload = document.createElement('a');
            linkDownload.href = urlBlob; linkDownload.download = nomeArquivo;
            document.body.appendChild(linkDownload); linkDownload.click(); document.body.removeChild(linkDownload);
        }
        URL.revokeObjectURL(urlBlob);

        // Partilhar via WhatsApp (opcional)
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({ title: 'Fatura Aurora Comercial', files: [file] });
                limparCarrinho();
                return;
            } catch (err) { console.warn('Partilha cancelada.', err); }
        }

        // Enviar texto para WhatsApp (sem anexo)
        let textoWhats = `*AURORARTE COMERCIAL - NOVO PEDIDO*\n=============================\n\n`;
        textoWhats += `Cliente: ${nome}\nTelefone: ${telefone}\nNIF: ${nif}\nMorada: ${morada}\n\n`;
        carrinho.forEach(item => { textoWhats += `• *${item.nome}* (x${item.quantidade}) - ${item.preco}\n`; });
        if (cupomAplicado) textoWhats += `\n💸 *Cupom aplicado:* ${cupomAplicado.codigo} (-${cupomAplicado.desconto}%)\n`;
        textoWhats += `\n*Total:* KZ ${totalComDesconto.toFixed(2)}\n`;
        textoWhats += `\n✅ A fatura foi gerada e impressa/descarregada.`;
        window.open(`https://api.whatsapp.com/send?phone=${CONFIG.NUMERO_WHATSAPP}&text=${encodeURIComponent(textoWhats)}`, '_blank');

        limparCarrinho();
        mostrarToast('Fatura gerada! Verifique a nova aba.', 'sucesso');
    } catch (e) {
        console.error('❌ Erro ao gerar PDF:', e);
        alert('A fatura não pôde ser gerada automaticamente. Envie os dados manualmente.');
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
        itens: carrinho.map(item => ({ nome: item.nome, quantidade: item.quantidade, preco: extrairValorNumerico(item.preco) }))
    };

    // Autenticação anónima
    const auth = getAuth();
    let user = auth.currentUser;
    if (!user) {
        try {
            const cred = await signInAnonymously(auth);
            user = cred.user;
        } catch (e) {
            console.error('Erro autenticação anónima:', e);
            // Fallback local
            const historicoLocal = JSON.parse(localStorage.getItem('aurora_historico_vendas')) || [];
            historicoLocal.push(novaVenda);
            localStorage.setItem('aurora_historico_vendas', JSON.stringify(historicoLocal));
            alert('⚠️ Pedido salvo localmente (sem conexão).');
            return;
        }
    }

    try {
        const docRef = await addDoc(collection(db, 'vendas'), novaVenda);
        const codigoRastreio = 'AURORA-' + docRef.id.slice(-6).toUpperCase();
        await updateDoc(doc(db, 'vendas', docRef.id), { codigoRastreio: codigoRastreio });
        alert(`✅ Pedido registrado!\nCódigo de rastreio: ${codigoRastreio}\n\nA fatura será aberta para impressão.`);
    } catch (e) {
        console.error('Erro ao salvar venda:', e);
        const historicoLocal = JSON.parse(localStorage.getItem('aurora_historico_vendas')) || [];
        historicoLocal.push(novaVenda);
        localStorage.setItem('aurora_historico_vendas', JSON.stringify(historicoLocal));
        alert(`⚠️ ERRO AO SALVAR A VENDA NA NUVEM:\n${e.message}\n\nA venda foi salva localmente.`);
    }
}

async function gerarFaturaPDF(itensCarrinho, nomeCliente, telefoneCliente, nifCliente, moradaCliente, totalGeral) {
    const { jsPDF } = await import('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const verdeEscuro = '#005A4C';
    const dourado = '#D4AF37';
    try {
        const logoImg = new Image(); logoImg.src = 'logo auro.png';
        await new Promise((resolve) => { logoImg.onload = () => { doc.addImage(logoImg, 'PNG', 15, 10, 20, 20); resolve(); }; logoImg.onerror = resolve; });
    } catch (e) {}

    doc.setFontSize(24); doc.setTextColor(dourado); doc.setFont(undefined, 'bold'); doc.text('AURORA COMERCIAL', 105, 20, { align: 'center' });
    doc.setFontSize(9); doc.setTextColor('#444'); doc.setFont(undefined, 'normal'); doc.text('Contribuinte: 5000048151 | Tel: +244 933 677 628', 105, 28, { align: 'center' });
    doc.text('contacto@aurorarte.ao | Luanda - Angola', 105, 34, { align: 'center' });
    doc.setDrawColor(dourado); doc.setLineWidth(0.8); doc.line(20, 40, 190, 40);

    const numeroFatura = gerarNumeroFatura();
    doc.setFontSize(10); doc.setTextColor('#333'); doc.setFont(undefined, 'bold'); doc.text(`Nº: ${numeroFatura}`, 20, 48);
    doc.setFont(undefined, 'normal'); doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 120, 48);

    let y = 58;
    doc.setFontSize(10); doc.text('Cliente:', 20, y); doc.setFont(undefined, 'bold'); doc.text(nomeCliente || 'N/A', 50, y); y += 7;
    doc.setFont(undefined, 'normal'); doc.text('Telefone:', 20, y); doc.setFont(undefined, 'bold'); doc.text(telefoneCliente || 'N/A', 50, y); y += 7;
    doc.setFont(undefined, 'normal'); doc.text('NIF:', 20, y); doc.setFont(undefined, 'bold'); doc.text(nifCliente || 'N/A', 50, y); y += 7;
    doc.setFont(undefined, 'normal'); doc.text('Morada:', 20, y); doc.setFont(undefined, 'bold'); doc.text(moradaCliente || 'N/A', 50, y); y += 10;

    const body = itensCarrinho.map(item => {
        const unitario = extrairValorNumerico(item.preco);
        return [item.nome, item.quantidade.toString(), `${unitario.toFixed(2)}`, `${(unitario * item.quantidade).toFixed(2)}`];
    });

    doc.autoTable({
        startY: y + 5,
        head: [['Descrição', 'Qtd', 'Preço Unit.', 'Subtotal']],
        body: body,
        theme: 'grid',
        headStyles: { fillColor: verdeEscuro, textColor: '#FFFFFF', fontSize: 9, halign: 'center', fontStyle: 'bold' },
        bodyStyles: { textColor: '#333', fontSize: 9 },
        columnStyles: {
            0: { cellWidth: 70 },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 35, halign: 'right' },
            3: { cellWidth: 35, halign: 'right' }
        },
        margin: { left: 20, right: 20 },
        tableWidth: 170,
        styles: { lineColor: dourado, lineWidth: 0.2 }
    });

    const finalY = doc.lastAutoTable.finalY + 8;
    doc.setFontSize(9); doc.setTextColor('#333'); doc.setFont(undefined, 'bold'); doc.text('Quadro Resumo de Imposto', 20, finalY);
    doc.setFont(undefined, 'normal');
    doc.text(`Total Ilíquido:   ${totalGeral.toFixed(2)} Kz`, 20, finalY + 6);
    doc.text(`Total Desconto:   0,00 Kz`, 20, finalY + 12);
    doc.text(`Total Imposto:    0,00 Kz`, 20, finalY + 18);
    doc.text(`Total IEC:        0,00 Kz`, 20, finalY + 24);

    doc.setFontSize(10); doc.setTextColor(verdeEscuro); doc.setFont(undefined, 'bold'); doc.text(`Total a Pagar: ${totalGeral.toFixed(2)} Kz`, 140, finalY + 8, { align: 'right' });

    const extenso = numeroPorExtenso(totalGeral);
    doc.setFontSize(9); doc.setTextColor(verdeEscuro); doc.setFont(undefined, 'bold');
    doc.text(extenso, 105, finalY + 22, { align: 'center' });

    doc.setFontSize(7); doc.setTextColor('#888'); doc.setFont(undefined, 'italic'); doc.text('Processado por Sistema Validado - Aurora Comercial v1.0', 105, 280, { align: 'center' });
    return doc.output('blob');
}

function numeroPorExtenso(valor) {
    const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
    const dezenas = ['', 'dez', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
    const centenas = ['', 'cem', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

    const inteiro = Math.floor(valor);
    const centavos = Math.round((valor - inteiro) * 100);

    if (inteiro === 0) return 'zero kwanzas';

    let extenso = '';
    const milhares = Math.floor(inteiro / 1000);
    const resto = inteiro % 1000;

    if (milhares > 0) {
        if (milhares === 1) extenso += 'mil ';
        else {
            const milExt = numeroPorExtensoSimples(milhares);
            extenso += milExt + ' mil ';
        }
    }
    if (resto > 0) {
        extenso += numeroPorExtensoSimples(resto);
    }

    extenso = extenso.trim() + ' kwanzas';
    if (centavos > 0) {
        extenso += ` e ${centavos} centavos`;
    }
    return extenso;
}

function numeroPorExtensoSimples(n) {
    const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
    const dezenas = ['', 'dez', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
    const centenas = ['', 'cem', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
    if (n === 0) return '';
    if (n < 10) return unidades[n];
    if (n < 20) {
        const especiais = ['dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
        return especiais[n - 10];
    }
    if (n < 100) {
        const d = Math.floor(n / 10);
        const u = n % 10;
        return dezenas[d] + (u > 0 ? ' e ' + unidades[u] : '');
    }
    if (n < 1000) {
        const c = Math.floor(n / 100);
        const resto = n % 100;
        if (c === 1 && resto === 0) return 'cem';
        return centenas[c] + (resto > 0 ? ' e ' + numeroPorExtensoSimples(resto) : '');
    }
    return '';
}