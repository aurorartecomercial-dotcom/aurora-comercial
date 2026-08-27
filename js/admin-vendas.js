import { auth, db } from './config.js';
import { collection, getDocs, updateDoc, doc, query, where } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { extrairValorNumerico } from './utils.js';

let todasVendas = [];
let catalogo = [];
let graficoVendas = null;
let graficoProdutos = null;
let graficoComparativo = null;
let graficoMapa = null;

// Verificar se Chart.js está disponível
function chartDisponivel() {
    return typeof Chart !== 'undefined';
}

document.addEventListener('DOMContentLoaded', () => {
    const loginDiv = document.getElementById('loginVendas');
    const conteudoDiv = document.getElementById('conteudoVendas');
    const btnLogin = document.getElementById('btnLoginVendas');
    const emailInput = document.getElementById('emailVendas');
    const senhaInput = document.getElementById('senhaVendas');
    const erroLogin = document.getElementById('erroLoginVendas');

    btnLogin.addEventListener('click', async () => {
        try {
            await signInWithEmailAndPassword(auth, emailInput.value, senhaInput.value);
            loginDiv.style.display = 'none';
            conteudoDiv.style.display = 'block';
            carregarDados();
        } catch (error) {
            erroLogin.style.display = 'block';
            erroLogin.textContent = 'Credenciais inválidas';
        }
    });

    senhaInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') btnLogin.click(); });

    document.getElementById('btnRelatorioTodos')?.addEventListener('click', () => gerarRelatorio('todos'));
    document.getElementById('btnRelatorioSemanal')?.addEventListener('click', () => gerarRelatorio('semana'));
    document.getElementById('btnRelatorioMensal')?.addEventListener('click', () => gerarRelatorio('mes'));
});

async function carregarDados() {
    try {
        const vendasSnap = await getDocs(collection(db, 'vendas'));
        todasVendas = vendasSnap.docs.map(doc => doc.data());

        const produtosSnap = await getDocs(collection(db, 'produtos'));
        catalogo = produtosSnap.docs.map(doc => doc.data());

        gerarRelatorio('todos');
    } catch (e) {
        console.error('Erro ao carregar dados:', e);
        document.getElementById('erroMensagem').style.display = 'block';
        document.getElementById('erroMensagem').textContent = 'Erro: ' + e.message;
    }
}

function gerarRelatorio(periodo) {
    const agora = new Date();
    let vendasFiltradas = todasVendas;

    if (periodo === 'semana') {
        const inicioSemana = new Date(agora);
        inicioSemana.setDate(agora.getDate() - agora.getDay());
        vendasFiltradas = todasVendas.filter(v => {
            if (!v.dataHora) return false;
            const data = new Date(v.dataHora);
            return data >= inicioSemana;
        });
    } else if (periodo === 'mes') {
        vendasFiltradas = todasVendas.filter(v => {
            if (!v.dataHora) return false;
            const data = new Date(v.dataHora);
            return data.getMonth() === agora.getMonth() && data.getFullYear() === agora.getFullYear();
        });
    }

    const faturamento = vendasFiltradas.reduce((acc, v) => acc + (v.valorTotal || 0), 0);
    const pedidos = vendasFiltradas.length;
    const itensVendidos = vendasFiltradas.reduce((acc, v) => acc + (v.totalItens || 0), 0);
    const estoqueTotal = catalogo.reduce((acc, p) => acc + (p.estoque || 0), 0);

    document.getElementById('kpiFaturamento').textContent = faturamento.toLocaleString('pt-AO') + ' Kz';
    document.getElementById('kpiPedidos').textContent = pedidos;
    document.getElementById('kpiItens').textContent = itensVendidos;
    document.getElementById('kpiEstoque').textContent = estoqueTotal;

    // Tabela de Pedidos
    const corpoTabelaPedidos = document.getElementById('corpoTabelaPedidos');
    corpoTabelaPedidos.innerHTML = '';

    vendasFiltradas.forEach(v => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="padding:8px;">${v.dataHora || 'N/A'}</td>
            <td style="padding:8px; font-weight:600;">${v.nomeCliente || 'N/A'}</td>
            <td style="padding:8px;">${v.telefoneCliente || 'N/A'}</td>
            <td style="padding:8px;">${v.nifCliente || 'N/A'}</td>
            <td style="padding:8px; font-size:11px;">${v.moradaCliente || 'N/A'}</td>
            <td style="padding:8px; font-size:11px;">${v.produtosResumo || 'N/A'}</td>
            <td style="padding:8px; color:#25D366; font-weight:bold;">${(v.valorTotal || 0).toLocaleString('pt-AO')} Kz</td>
            <td style="padding:8px; display:flex; flex-direction:column; gap:4px;">
                <span style="font-size:11px; font-weight:700;">${v.status === 'enviado' ? '🔵 Enviado' : v.status === 'entregue' ? '🟢 Entregue' : '🟡 Confirmado'}</span>
                <div style="display:flex; gap:4px; flex-wrap:wrap;">
                    <button onclick="window.atualizarStatus('${v.codigoRastreio || ''}', 'enviado')" style="background:#3498db; color:#fff; border:none; padding:4px 8px; border-radius:12px; font-size:11px; cursor:pointer;">🚚 Enviar</button>
                    <button onclick="window.atualizarStatus('${v.codigoRastreio || ''}', 'entregue')" style="background:#27ae60; color:#fff; border:none; padding:4px 8px; border-radius:12px; font-size:11px; cursor:pointer;">📦 Entregar</button>
                    <button onclick="window.imprimirFatura('${v.codigoRastreio || ''}')" style="background:#D4AF37; color:#000; border:none; padding:4px 8px; border-radius:12px; font-size:11px; cursor:pointer;">🖨️ Imprimir</button>
                </div>
            </td>
        `;
        corpoTabelaPedidos.appendChild(tr);
    });

    // Tabela de Produtos
    const vendasPorProduto = {};
    vendasFiltradas.forEach(venda => {
        if (venda.itens && Array.isArray(venda.itens)) {
            venda.itens.forEach(item => {
                const nome = item.nome;
                const qtd = item.quantidade || 1;
                vendasPorProduto[nome] = (vendasPorProduto[nome] || 0) + qtd;
            });
        } else if (venda.produtosResumo) {
            venda.produtosResumo.split(', ').forEach(item => {
                const nome = item.split(' (x')[0];
                const qtd = parseInt(item.split('(x')[1]) || 1;
                vendasPorProduto[nome] = (vendasPorProduto[nome] || 0) + qtd;
            });
        }
    });

    const corpoTabelaRelatorio = document.getElementById('corpoTabelaRelatorio');
    corpoTabelaRelatorio.innerHTML = '';
    catalogo.forEach(prod => {
        const qtdVendida = vendasPorProduto[prod.nome] || 0;
        const totalVendido = qtdVendida * (extrairValorNumerico(prod.preco) || 0);
        const desconto = prod.desconto ? parseInt(prod.desconto) : 0;
        const tr = document.createElement('tr');
        tr.innerHTML = `<td style="padding:8px;">${prod.nome}</td><td style="padding:8px; text-align:center;">${qtdVendida}</td><td style="padding:8px; text-align:right;">${totalVendido.toLocaleString('pt-AO')}</td><td style="padding:8px; text-align:center;">${desconto}%</td><td style="padding:8px; text-align:center;">${prod.estoque || 0}</td>`;
        corpoTabelaRelatorio.appendChild(tr);
    });

    // Renderizar gráficos
    renderizarGraficoVendasPorDia(vendasFiltradas);
    renderizarGraficoProdutosMaisVendidos(vendasPorProduto);
    renderizarGraficoComparativoMensal(vendasFiltradas);
    renderizarGraficoMapaVendas(vendasFiltradas);
}

// ✅ FUNÇÃO PARA IMPRIMIR FATURA DO CLIENTE (HTML)
window.imprimirFatura = async function(codigoRastreio) {
    if (!codigoRastreio) {
        alert('Este pedido não tem código de rastreio.');
        return;
    }
    try {
        const q = query(collection(db, 'vendas'), where('codigoRastreio', '==', codigoRastreio));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            alert('Pedido não encontrado.');
            return;
        }
        const venda = snapshot.docs[0].data();

        let itensHTML = '';
        if (venda.itens && venda.itens.length) {
            venda.itens.forEach(item => {
                const unitario = item.preco || 0;
                const subtotal = unitario * item.quantidade;
                itensHTML += `<tr><td>${item.nome}</td><td>${item.quantidade}</td><td>${unitario.toFixed(2)}</td><td>${subtotal.toFixed(2)}</td></tr>`;
            });
        } else if (venda.produtosResumo) {
            const itens = venda.produtosResumo.split(', ');
            itens.forEach(item => {
                const nome = item.split(' (x')[0];
                const qtd = item.split('(x')[1]?.replace(')', '') || 1;
                itensHTML += `<tr><td>${nome}</td><td>${qtd}</td><td>-</td><td>-</td></tr>`;
            });
        }

        const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Fatura ${codigoRastreio} - Aurora</title>
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
</style>
</head>
<body>
<h1>AURORA COMERCIAL</h1>
<h2>Contribuinte: 5000048151 | Tel: +244 933 677 628</h2>
<hr>
<p><strong>Fatura Nº:</strong> ${codigoRastreio}</p>
<p><strong>Data:</strong> ${venda.dataHora || ''}</p>
<div class="dados">
<p><strong>Cliente:</strong> ${venda.nomeCliente || ''}</p>
<p><strong>Telefone:</strong> ${venda.telefoneCliente || ''}</p>
<p><strong>NIF:</strong> ${venda.nifCliente || ''}</p>
<p><strong>Morada:</strong> ${venda.moradaCliente || ''}</p>
</div>
<table>
<thead><tr><th>Descrição</th><th>Qtd</th><th>Preço Unit.</th><th>Subtotal</th></tr></thead>
<tbody>${itensHTML}</tbody>
</table>
<p class="total">Total a Pagar: ${(venda.valorTotal || 0).toFixed(2)} Kz</p>
<script>window.print();</script>
</body>
</html>`;

        const win = window.open('', '_blank');
        win.document.write(html);
        win.document.close();
    } catch (e) {
        console.error('Erro ao imprimir fatura:', e);
        alert('Erro ao gerar fatura: ' + e.message);
    }
};

window.atualizarStatus = async function(codigoRastreio, novoStatus) {
    if(!codigoRastreio) return alert('Este pedido não tem código de rastreio.');
    if(!confirm(`Marcar ${codigoRastreio} como "${novoStatus === 'enviado' ? 'Enviado' : 'Entregue'}"?`)) return;
    try {
        const q = query(collection(db, 'vendas'), where('codigoRastreio', '==', codigoRastreio));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            const docRef = snapshot.docs[0].ref;
            await updateDoc(docRef, { status: novoStatus });
            alert('Status atualizado!');
            location.reload();
        } else {
            alert('Pedido não encontrado.');
        }
    } catch(e) { alert('Erro: ' + e.message); }
};

// =================================================================
// FUNÇÕES DE GRÁFICOS (COM FALLBACK PARA CSS SE CHART.JS FALHAR)
// =================================================================

function renderizarGraficoVendasPorDia(vendasFiltradas) {
    const vendasPorDia = {};
    vendasFiltradas.forEach(v => {
        if (v.dataHora) {
            const dia = v.dataHora.split(' ')[0];
            vendasPorDia[dia] = (vendasPorDia[dia] || 0) + (v.valorTotal || 0);
        }
    });

    const ctx = document.getElementById('graficoVendas');
    if (!ctx) return;

    const dias = Object.keys(vendasPorDia);
    const valores = Object.values(vendasPorDia);

    if (dias.length === 0) {
        ctx.parentElement.innerHTML = '<p style="text-align:center; color:#999; padding:40px;">Sem dados de vendas por dia.</p>';
        return;
    }

    if (chartDisponivel()) {
        if (graficoVendas) graficoVendas.destroy();
        graficoVendas = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: dias,
                datasets: [{ label: 'Faturamento (Kz)', data: valores, backgroundColor: 'rgba(0, 90, 76, 0.7)', borderColor: '#005A4C', borderWidth: 1 }]
            },
            options: { responsive: true, maintainAspectRatio: false, aspectRatio: 2, scales: { y: { beginAtZero: true } } }
        });
    } else {
        // FALLBACK: gráfico de barras CSS
        const maxVal = Math.max(...valores);
        let html = '<div style="display:flex; align-items:flex-end; height:200px; gap:10px; padding:10px;">';
        dias.forEach((dia, i) => {
            const altura = (valores[i] / maxVal) * 100;
            html += `<div style="flex:1; text-align:center;">
                <div style="background:#005A4C; height:${altura}%; border-radius:4px;"></div>
                <span style="font-size:10px;">${dia}</span>
            </div>`;
        });
        html += '</div>';
        ctx.parentElement.innerHTML = html;
    }
}

function renderizarGraficoProdutosMaisVendidos(vendasPorProduto) {
    const topProdutos = Object.entries(vendasPorProduto)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const ctx = document.getElementById('graficoProdutos');
    if (!ctx) return;

    if (topProdutos.length === 0) {
        ctx.parentElement.innerHTML = '<p style="text-align:center; color:#999; padding:40px;">Sem produtos vendidos.</p>';
        return;
    }

    if (chartDisponivel()) {
        if (graficoProdutos) graficoProdutos.destroy();
        graficoProdutos = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: topProdutos.map(p => p[0]),
                datasets: [{
                    data: topProdutos.map(p => p[1]),
                    backgroundColor: ['#D4AF37', '#005A4C', '#E74C3C', '#3498DB', '#2ECC71']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, aspectRatio: 2 }
        });
    } else {
        // FALLBACK: lista simples
        let html = '<ul style="list-style:none; padding:20px;">';
        topProdutos.forEach(p => {
            html += `<li style="margin-bottom:10px;">🔹 ${p[0]} - ${p[1]} unidades</li>`;
        });
        html += '</ul>';
        ctx.parentElement.innerHTML = html;
    }
}

function renderizarGraficoComparativoMensal(vendasFiltradas) {
    const meses = ['Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago'];
    const dados = [0, 0, 0, 0, 0, 0];

    vendasFiltradas.forEach(v => {
        if (v.dataHora) {
            const data = new Date(v.dataHora);
            const mesIndex = data.getMonth();
            if (mesIndex >= 2 && mesIndex <= 7) {
                dados[mesIndex - 2] += (v.valorTotal || 0);
            }
        }
    });

    const ctx = document.getElementById('graficoComparativo');
    if (!ctx) return;

    if (chartDisponivel()) {
        if (graficoComparativo) graficoComparativo.destroy();
        graficoComparativo = new Chart(ctx, {
            type: 'line',
            data: {
                labels: meses,
                datasets: [{
                    label: 'Vendas (Kz)',
                    data: dados,
                    borderColor: '#D4AF37',
                    backgroundColor: 'rgba(212, 175, 55, 0.2)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, aspectRatio: 2 }
        });
    } else {
        // FALLBACK: barras simples
        let html = '<div style="display:flex; align-items:flex-end; height:200px; gap:10px; padding:10px;">';
        const maxVal = Math.max(...dados, 1);
        meses.forEach((mes, i) => {
            const altura = (dados[i] / maxVal) * 100;
            html += `<div style="flex:1; text-align:center;">
                <div style="background:#D4AF37; height:${altura}%; border-radius:4px;"></div>
                <span style="font-size:10px;">${mes}</span>
            </div>`;
        });
        html += '</div>';
        ctx.parentElement.innerHTML = html;
    }
}

function renderizarGraficoMapaVendas(vendasFiltradas) {
    const regioes = ['Luanda', 'Benguela', 'Huambo', 'Lubango'];
    const dados = [0, 0, 0, 0];

    vendasFiltradas.forEach(v => {
        const morada = (v.moradaCliente || '').toLowerCase();
        if (morada.includes('luanda')) dados[0]++;
        else if (morada.includes('benguela')) dados[1]++;
        else if (morada.includes('huambo')) dados[2]++;
        else if (morada.includes('lubango')) dados[3]++;
    });

    const ctx = document.getElementById('graficoMapa');
    if (!ctx) return;

    if (chartDisponivel()) {
        if (graficoMapa) graficoMapa.destroy();
        graficoMapa = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: regioes,
                datasets: [{
                    label: 'Pedidos',
                    data: dados,
                    backgroundColor: '#005A4C'
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                aspectRatio: 2
            }
        });
    } else {
        // FALLBACK: lista simples
        let html = '<ul style="list-style:none; padding:20px;">';
        regioes.forEach((reg, i) => {
            html += `<li style="margin-bottom:10px;">📍 ${reg}: ${dados[i]} pedidos</li>`;
        });
        html += '</ul>';
        ctx.parentElement.innerHTML = html;
    }
}