import { auth, db, CONFIG } from './config.js';
import { collection, getDocs, updateDoc, doc, query, where } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { extrairValorNumerico } from './utils.js';

let todasVendas = [];
let catalogo = [];

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
    // Botão exportar PDF pode continuar com jsPDF se quiser, mas não é obrigatório
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
                <div style="display:flex; gap:4px;">
                    <span style="font-size:11px; font-weight:700;">${v.status === 'enviado' ? '🔵 Enviado' : v.status === 'entregue' ? '🟢 Entregue' : '🟡 Confirmado'}</span>
                </div>
                <div style="display:flex; gap:4px; flex-wrap:wrap;">
                    <button onclick="window.atualizarStatus('${v.codigoRastreio || ''}', 'enviado')" style="background:#3498db; color:#fff; border:none; padding:4px 8px; border-radius:12px; font-size:11px; cursor:pointer;">🚚 Enviar</button>
                    <button onclick="window.atualizarStatus('${v.codigoRastreio || ''}', 'entregue')" style="background:#27ae60; color:#fff; border:none; padding:4px 8px; border-radius:12px; font-size:11px; cursor:pointer;">📦 Entregar</button>
                    <button onclick="window.imprimirFatura('${v.codigoRastreio || ''}')" style="background:#D4AF37; color:#000; border:none; padding:4px 8px; border-radius:12px; font-size:11px; cursor:pointer;">🖨️ Imprimir</button>
                </div>
            </td>
        `;
        corpoTabelaPedidos.appendChild(tr);
    });

    // Tabela de detalhamento por produto
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
}

// ✅ Imprimir fatura HTML (substitui PDF)
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