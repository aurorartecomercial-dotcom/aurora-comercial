import { extrairValorNumerico, formatarMoeda, mostrarToast, validarCliente, gerarNumeroFatura } from './utils.js';
import { CONFIG } from './config.js';

let carrinho = [];
let listaProdutosHTML, totalHTML, badgeContador, sidebar, overlay;
let modalCliente, inputNome, inputTelefone, inputNif, inputMorada;
let btnSalvarCliente, btnFecharModal;

export function initCarrinho() {
    listaProdutosHTML = document.getElementById('itensCarrinhoLoja');
    totalHTML = document.getElementById('totalCarrinhoLoja');
    badgeContador = document.getElementById('badgeContador');
    const totalItensSpan = document.getElementById('carrinhoTotalItens');
    sidebar = document.getElementById('carrinhoSidebar');
    overlay = document.getElementById('carrinhoOverlay');

    modalCliente = document.getElementById('modalCliente');
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

    const btnFinalizar = document.getElementById('btnFinalizarWhatsApp');
    if (btnFinalizar) {
        btnFinalizar.addEventListener('click', () => {
            if (carrinho.length === 0) {
                mostrarToast('Sua sacola está vazia.', 'info');
                return;
            }
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
            finalizarPedido(nome, telefone, nif, morada);
        });
    }

    if (btnFecharModal) {
        btnFecharModal.addEventListener('click', fecharModalCliente);
    }

    if (modalCliente) {
        modalCliente.addEventListener('click', (e) => {
            if (e.target === modalCliente) fecharModalCliente();
        });
    }

    window.addEventListener('storage', (e) => {
        if (e.key === 'carrinho_aurora') {
            carrinho = JSON.parse(e.newValue) || [];
            atualizarCarrinho();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (sidebar && sidebar.classList.contains('ativo')) fecharCarrinho();
            if (modalCliente && modalCliente.style.display === 'flex') fecharModalCliente();
        }
    });

    document.getElementById('toastFechar')?.addEventListener('click', () => {
        document.getElementById('toast-notificacao').style.top = '-100px';
    });

    // ===== GPS (novo) =====
    const btnGPS = document.getElementById('btnGPS');
    if (btnGPS && inputMorada) {
        btnGPS.addEventListener('click', () => {
            if (!navigator.geolocation) {
                alert('Seu navegador não suporta GPS.');
                return;
            }
            btnGPS.textContent = '⏳ Buscando...';
            btnGPS.disabled = true;

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    try {
                        const resposta = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
                        const dados = await resposta.json();
                        if (dados && dados.display_name) {
                            inputMorada.value = dados.display_name;
                        } else {
                            inputMorada.value = `Lat: ${lat}, Lng: ${lng}`;
                        }
                        btnGPS.textContent = '✅ Localizado!';
                        setTimeout(() => { btnGPS.textContent = '📍 GPS'; btnGPS.disabled = false; }, 3000);
                    } catch (erro) {
                        inputMorada.value = `Lat: ${lat}, Lng: ${lng}`;
                        btnGPS.textContent = '✅ Coordenadas!';
                        setTimeout(() => { btnGPS.textContent = '📍 GPS'; btnGPS.disabled = false; }, 3000);
                    }
                },
                (erro) => {
                    alert('Erro ao obter localização. Permita o GPS no navegador.');
                    btnGPS.textContent = '📍 GPS';
                    btnGPS.disabled = false;
                }
            );
        });
    }
}

function carregarCarrinho() {
    const dados = localStorage.getItem('carrinho_aurora');
    carrinho = dados ? JSON.parse(dados) : [];
}

function salvarCarrinho() {
    localStorage.setItem('carrinho_aurora', JSON.stringify(carrinho));
    atualizarBadge();
}

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
                    <button onclick="window.alterarQtd(${index}, -1)">−</button>
                    <span>${item.quantidade}</span>
                    <button onclick="window.alterarQtd(${index}, 1)">+</button>
                </div>
            `;
            listaProdutosHTML.appendChild(li);
        });
    }

    if (totalHTML) {
        totalHTML.textContent = totalGeral.toFixed(2);
    }
    atualizarBadge();
    salvarCarrinho();
}

function atualizarBadge() {
    const totalItens = carrinho.reduce((acc, item) => acc + item.quantidade, 0);
    if (badgeContador) {
        badgeContador.textContent = totalItens;
        badgeContador.style.display = totalItens > 0 ? 'inline' : 'none';
    }
    const totalItensSpan = document.getElementById('carrinhoTotalItens');
    if (totalItensSpan) {
        totalItensSpan.textContent = totalItens > 0 ? `(${totalItens} itens)` : '';
    }
}

function abrirCarrinho() {
    if (!sidebar) return;
    sidebar.classList.add('ativo');
    if (overlay) overlay.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function fecharCarrinho() {
    if (!sidebar) return;
    sidebar.classList.remove('ativo');
    if (overlay) overlay.style.display = 'none';
    document.body.style.overflow = '';
}

window.alterarQtd = function(index, mudanca) {
    if (!carrinho[index]) return;
    carrinho[index].quantidade += mudanca;
    if (carrinho[index].quantidade <= 0) {
        carrinho.splice(index, 1);
    }
    atualizarCarrinho();
};

export function adicionarProdutoCarrinho(nome, preco) {
    const existente = carrinho.find(i => i.nome === nome);
    if (existente) {
        existente.quantidade += 1;
    } else {
        carrinho.push({ nome, preco, quantidade: 1 });
    }
    atualizarCarrinho();
    mostrarToast('Produto adicionado!', 'sucesso');
}

function abrirModalCliente() {
    if (modalCliente) {
        modalCliente.style.display = 'flex';
        inputNome.value = '';
        inputTelefone.value = '';
        inputNif.value = '';
        inputMorada.value = '';
        document.getElementById('erroNome').textContent = '';
        document.getElementById('erroTelefone').textContent = '';
        document.getElementById('erroNif').textContent = '';
        setTimeout(() => inputNome.focus(), 100);
    }
}

function fecharModalCliente() {
    if (modalCliente) modalCliente.style.display = 'none';
}

async function gerarFaturaPDF(itensCarrinho, nomeCliente, telefoneCliente, nifCliente, moradaCliente) {
    await loadJSPDF();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const verdeEscuro = '#005A4C';
    const dourado = '#D4AF37';

    doc.setFontSize(24);
    doc.setTextColor(dourado);
    doc.setFont(undefined, 'bold');
    doc.text('AURORA COMERCIAL', 105, 20, { align: 'center' });

    doc.setFontSize(9);
    doc.setTextColor('#444');
    doc.setFont(undefined, 'normal');
    doc.text('Contribuinte Nº: 5000048151  |  Telefone: +244 925 328 181', 105, 27, { align: 'center' });
    doc.text('Email: contacto@aurorarte.ao  |  Luanda - Angola, Rua da Ende, s/n', 105, 33, { align: 'center' });

    doc.setDrawColor(dourado);
    doc.setLineWidth(0.8);
    doc.line(20, 38, 190, 38);

    const hoje = new Date();
    const dataEmissao = hoje.toLocaleDateString('pt-BR');
    const numeroFatura = gerarNumeroFatura();

    doc.setFontSize(10);
    doc.setTextColor('#333');
    doc.setFont(undefined, 'bold');
    doc.text(`Nº: ${numeroFatura}`, 20, 46);
    doc.setFont(undefined, 'normal');
    doc.text(`Data de Emissão: ${dataEmissao}`, 120, 46);

    doc.setFontSize(10);
    doc.text('Cliente:', 20, 56);
    doc.setFont(undefined, 'bold');
    doc.text(nomeCliente || '_________________________', 50, 56);

    doc.setFont(undefined, 'normal');
    doc.text('Telefone:', 20, 63);
    doc.setFont(undefined, 'bold');
    doc.text(telefoneCliente || '_________________________', 50, 63);

    doc.setFont(undefined, 'normal');
    doc.text('NIF:', 20, 70);
    doc.setFont(undefined, 'bold');
    doc.text(nifCliente || '_________________________', 50, 70);

    doc.setFont(undefined, 'normal');
    doc.text('Morada:', 20, 77);
    doc.setFont(undefined, 'bold');
    doc.text(moradaCliente || '_________________________', 50, 77);

    doc.setFontSize(8);
    doc.setTextColor('#666');
    doc.setFont(undefined, 'italic');
    doc.text('Os bens foram colocados à disposição do adquirente na data do documento.', 105, 85, { align: 'center' });

    const body = itensCarrinho.map(item => {
        const unitario = extrairValorNumerico(item.preco);
        const subtotal = unitario * item.quantidade;
        return [
            item.nome,
            item.quantidade.toString(),
            `${unitario.toFixed(2)}`,
            `${subtotal.toFixed(2)}`
        ];
    });

    doc.autoTable({
        startY: 92,
        head: [['Descrição', 'Qtd', 'Preço Unit.', 'Subtotal']],
        body: body,
        theme: 'grid',
        headStyles: {
            fillColor: verdeEscuro,
            textColor: '#FFFFFF',
            fontSize: 9,
            halign: 'center',
            fontStyle: 'bold'
        },
        bodyStyles: {
            textColor: '#333',
            fontSize: 9,
        },
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
    const totalGeral = itensCarrinho.reduce((acc, item) => acc + extrairValorNumerico(item.preco) * item.quantidade, 0);

    doc.setFontSize(9);
    doc.setTextColor('#333');
    doc.setFont(undefined, 'bold');
    doc.text('Quadro Resumo de Imposto', 20, finalY);
    doc.setFont(undefined, 'normal');
    doc.text(`Total Ilíquido:   ${totalGeral.toFixed(2)} Kz`, 20, finalY + 6);
    doc.text(`Total Desconto:   0,00 Kz`, 20, finalY + 12);
    doc.text(`Total Imposto:    0,00 Kz`, 20, finalY + 18);
    doc.text(`Total IEC:        0,00 Kz`, 20, finalY + 24);

    doc.setFontSize(10);
    doc.setTextColor(verdeEscuro);
    doc.setFont(undefined, 'bold');
    doc.text(`Total a Pagar: ${totalGeral.toFixed(2)} Kz`, 140, finalY + 8, { align: 'right' });

    doc.setFontSize(9);
    doc.setTextColor('#333');
    doc.setFont(undefined, 'normal');
    doc.text('Forma de Pagamento: NUMERÁRIO', 20, finalY + 32);

    const extenso = numeroPorExtenso(totalGeral);
    doc.setFontSize(10);
    doc.setTextColor(verdeEscuro);
    doc.setFont(undefined, 'bold');
    doc.text(extenso, 105, finalY + 44, { align: 'center' });

    const rodapeY = finalY + 55;
    doc.setFontSize(7);
    doc.setTextColor('#888');
    doc.setFont(undefined, 'italic');
    doc.text(`Processado por Sistema Validado - Aurora Comercial v1.0  |  Utilizador: admin`, 105, rodapeY, { align: 'center' });
    doc.text(`Impresso aos ${hoje.toLocaleTimeString('pt-BR')} - ${dataEmissao}  |  Regime: Simplificado`, 105, rodapeY + 5, { align: 'center' });
    doc.text('página 1 de 1', 105, rodapeY + 10, { align: 'center' });

    return doc.output('blob');
}

function loadJSPDF() {
    return new Promise((resolve, reject) => {
        if (window.jspdf && window.jspdf.jsPDF) {
            resolve();
            return;
        }
        const script1 = document.createElement('script');
        script1.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script1.onload = () => {
            const script2 = document.createElement('script');
            script2.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js';
            script2.onload = resolve;
            script2.onerror = reject;
            document.head.appendChild(script2);
        };
        script1.onerror = reject;
        document.head.appendChild(script1);
    });
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
        const especiais = ['dez', 'onze', 'doze', 'treze', 'catorze', 'quinze', 'dezasseis', 'dezassete', 'dezoito', 'dezanove'];
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

async function finalizarPedido(nomeCliente, telefoneCliente, nifCliente, moradaCliente) {
    salvarVendaNoHistorico();

    const pdfBlob = await gerarFaturaPDF(carrinho, nomeCliente, telefoneCliente, nifCliente, moradaCliente);
    const nomeArquivo = `Fatura_Aurora_${Date.now()}.pdf`;
    const file = new File([pdfBlob], nomeArquivo, { type: 'application/pdf' });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({
                title: 'Fatura Aurora Comercial',
                text: 'Segue a fatura do seu pedido.',
                files: [file]
            });
            carrinho = [];
            atualizarCarrinho();
            fecharCarrinho();
            mostrarToast('Fatura enviada com sucesso!', 'sucesso');
            return;
        } catch (err) {
            console.warn('Partilha cancelada ou falhou.', err);
        }
    }

    const urlBlob = URL.createObjectURL(pdfBlob);
    const linkDownload = document.createElement('a');
    linkDownload.href = urlBlob;
    linkDownload.download = nomeArquivo;
    document.body.appendChild(linkDownload);
    linkDownload.click();
    document.body.removeChild(linkDownload);
    URL.revokeObjectURL(urlBlob);

    let textoWhats = `*AURORARTE COMERCIAL - NOVO PEDIDO*\n=============================\n\n`;
    textoWhats += `Cliente: ${nomeCliente}\n`;
    textoWhats += `Telefone: ${telefoneCliente}\n`;
    textoWhats += `NIF: ${nifCliente}\n`;
    textoWhats += `Morada: ${moradaCliente}\n\n`;
    carrinho.forEach(item => {
        textoWhats += `• *${item.nome}* (x${item.quantidade}) - ${item.preco}\n`;
    });
    const total = carrinho.reduce((acc, item) => acc + extrairValorNumerico(item.preco) * item.quantidade, 0);
    textoWhats += `\n*Total:* KZ ${total.toFixed(2)}\n`;
    textoWhats += `\n✅ A fatura em PDF foi descarregada. Anexe o ficheiro antes de enviar.`;

    window.open(`https://api.whatsapp.com/send?phone=${CONFIG.NUMERO_WHATSAPP}&text=${encodeURIComponent(textoWhats)}`, '_blank');

    carrinho = [];
    atualizarCarrinho();
    fecharCarrinho();
    mostrarToast('Fatura descarregada. Anexe‑a ao WhatsApp!', 'sucesso');
}

function salvarVendaNoHistorico() {
    const historico = JSON.parse(localStorage.getItem('aurora_historico_vendas')) || [];
    let produtosResumo = carrinho.map(item => `${item.nome} (x${item.quantidade})`).join(', ');
    let valorTotalPedido = carrinho.reduce((acc, item) => acc + extrairValorNumerico(item.preco) * item.quantidade, 0);
    let totalItensPedido = carrinho.reduce((acc, item) => acc + item.quantidade, 0);
    const agora = new Date();
    const dataHoraFormatada = agora.toLocaleDateString('pt-BR') + ' ' + agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    historico.push({
        dataHora: dataHoraFormatada,
        produtosResumo: produtosResumo,
        valorTotal: valorTotalPedido,
        totalItens: totalItensPedido
    });
    localStorage.setItem('aurora_historico_vendas', JSON.stringify(historico));
    if (typeof renderizarBalancoSemanal === 'function') {
        renderizarBalancoSemanal();
    }
}