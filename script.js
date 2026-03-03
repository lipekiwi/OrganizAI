const hoje = new Date();
const ano = hoje.getFullYear();
const mes = hoje.getMonth();
const diaHoje = hoje.getDate();
const diasNoMes = new Date(ano, mes + 1, 0).getDate();

document.getElementById("mesAtual").textContent =
    hoje.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

const chaveMes = `${ano}-${mes}`;

let dados = JSON.parse(localStorage.getItem(chaveMes)) || {
    tarefas: [],
    progresso: {}
};

// ── Persist ────────────────────────────────────────────────────────────────
function salvar() {
    localStorage.setItem(chaveMes, JSON.stringify(dados));
}

// ── Toast ──────────────────────────────────────────────────────────────────
function mostrarToast(mensagem, tipo = "default") {
    const container = document.getElementById("toastContainer");
    const toast = document.createElement("div");
    toast.className = `toast ${tipo}`;
    toast.textContent = mensagem;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ── Modal ──────────────────────────────────────────────────────────────────
let editandoIndex = null;

function abrirModal(index) {
    editandoIndex = index;
    const overlay = document.getElementById("modalOverlay");
    const input = document.getElementById("modalInput");
    input.value = dados.tarefas[index].nome;
    overlay.classList.add("ativo");
    setTimeout(() => input.focus(), 100);
}

function fecharModal() {
    document.getElementById("modalOverlay").classList.remove("ativo");
    editandoIndex = null;
}

function confirmarEdicao() {
    const input = document.getElementById("modalInput");
    const novoNome = input.value.trim();
    if (!novoNome || editandoIndex === null) return;
    dados.tarefas[editandoIndex].nome = novoNome;
    salvar();
    renderizar();
    fecharModal();
    mostrarToast("Meta editada com sucesso!", "success");
}

document.getElementById("modalInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") confirmarEdicao();
    if (e.key === "Escape") fecharModal();
});

// ── Add ────────────────────────────────────────────────────────────────────
function adicionarTarefa() {
    const input = document.getElementById("novaTarefa");
    if (input.value.trim() === "") return;
    dados.tarefas.push({ nome: input.value.trim() });
    input.value = "";
    salvar();
    renderizar();
    mostrarToast("Meta adicionada!", "success");
}

document.getElementById("novaTarefa").addEventListener("keydown", (e) => {
    if (e.key === "Enter") adicionarTarefa();
});

// ── Edit / Delete / Reorder ────────────────────────────────────────────────
function editarTarefa(index) {
    abrirModal(index);
}

function excluirTarefa(index) {
    const nome = dados.tarefas[index].nome;
    dados.tarefas.splice(index, 1);

    const novoProgresso = {};
    Object.keys(dados.progresso).forEach(chave => {
        const [i, dia] = chave.split("-").map(Number);
        if (i < index) novoProgresso[`${i}-${dia}`] = dados.progresso[chave];
        else if (i > index) novoProgresso[`${i - 1}-${dia}`] = dados.progresso[chave];
    });
    dados.progresso = novoProgresso;

    salvar();
    renderizar();
    mostrarToast(`"${nome}" removida.`, "danger");
}

function moverCima(index) {
    if (index === 0) return;
    [dados.tarefas[index], dados.tarefas[index - 1]] =
    [dados.tarefas[index - 1], dados.tarefas[index]];
    salvar();
    renderizar();
}

function moverBaixo(index) {
    if (index === dados.tarefas.length - 1) return;
    [dados.tarefas[index], dados.tarefas[index + 1]] =
    [dados.tarefas[index + 1], dados.tarefas[index]];
    salvar();
    renderizar();
}

function alternar(tarefaIndex, dia) {
    const chave = `${tarefaIndex}-${dia}`;
    dados.progresso[chave] = !dados.progresso[chave];
    salvar();
    renderizar();
}

// ── Stats ──────────────────────────────────────────────────────────────────
function calcularMetasCompletas() {
    let completas = 0;
    dados.tarefas.forEach((_, i) => {
        let todas = true;
        for (let d = 1; d <= diasNoMes; d++) {
            if (!dados.progresso[`${i}-${d}`]) { todas = false; break; }
        }
        if (todas) completas++;
    });
    return completas;
}

function progressoPorMeta(index) {
    let feitos = 0;
    for (let d = 1; d <= diasNoMes; d++) {
        if (dados.progresso[`${index}-${d}`]) feitos++;
    }
    return Math.round((feitos / diasNoMes) * 100);
}

function atualizarBarra() {
    const totalPossivel = dados.tarefas.length * diasNoMes;
    const totalFeito = Object.values(dados.progresso).filter(v => v).length;
    const pct = totalPossivel === 0 ? 0 : Math.round((totalFeito / totalPossivel) * 100);

    document.getElementById("barraProgresso").style.width = pct + "%";
    document.getElementById("porcentagem").textContent = pct + "%";
    document.getElementById("metasCompletas").textContent = calcularMetasCompletas();
    document.getElementById("totalMetas").textContent = dados.tarefas.length;
}

// ── Render ─────────────────────────────────────────────────────────────────
function renderizar() {
    const container = document.getElementById("tabelaContainer");
    container.innerHTML = "";

    if (dados.tarefas.length === 0) {
        container.innerHTML = `<div class="empty-state">
            Nenhuma meta adicionada ainda.<br>Adicione sua primeira meta acima! 🚀
        </div>`;
        atualizarBarra();
        return;
    }

    const table = document.createElement("table");

    // Header
    let header = `<thead><tr><th>Meta</th>`;
    for (let d = 1; d <= diasNoMes; d++) {
        const isHoje = d === diaHoje;
        header += `<th class="${isHoje ? 'hoje-col' : ''}">${isHoje ? '📍' : d}</th>`;
    }
    header += `<th>Ações</th></tr></thead>`;
    table.innerHTML = header;

    // Body
    const tbody = document.createElement("tbody");
    dados.tarefas.forEach((tarefa, i) => {
        const pct = progressoPorMeta(i);
        const tr = document.createElement("tr");

        let cells = `<td class="goal-name">
            <span>${tarefa.nome}</span>
            <span class="goal-progress-mini">
                <span class="goal-progress-mini-fill" style="width:${pct}%"></span>
            </span>
        </td>`;

        for (let d = 1; d <= diasNoMes; d++) {
            const chave = `${i}-${d}`;
            const ativo = dados.progresso[chave] ? "ativo" : "";
            const isHoje = d === diaHoje ? "hoje-col" : "";
            cells += `<td class="check ${ativo} ${isHoje}" onclick="alternar(${i}, ${d})"></td>`;
        }

        cells += `<td class="acoes">
            <button class="btn-action" onclick="editarTarefa(${i})" title="Editar">✏️</button>
            <button class="btn-action danger" onclick="excluirTarefa(${i})" title="Excluir">🗑️</button>
            <button class="btn-action" onclick="moverCima(${i})" title="Mover para cima">↑</button>
            <button class="btn-action" onclick="moverBaixo(${i})" title="Mover para baixo">↓</button>
        </td>`;

        tr.innerHTML = cells;
        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    container.appendChild(table);
    atualizarBarra();
}

renderizar();