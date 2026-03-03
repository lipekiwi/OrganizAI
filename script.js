const hoje = new Date();
const ano = hoje.getFullYear();
const mes = hoje.getMonth();
const diasNoMes = new Date(ano, mes + 1, 0).getDate();

document.getElementById("mesAtual").textContent =
    hoje.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

const chaveMes = `${ano}-${mes}`;

let dados = JSON.parse(localStorage.getItem(chaveMes)) || {
    tarefas: [],
    progresso: {}
};

function salvar() {
    localStorage.setItem(chaveMes, JSON.stringify(dados));
}

function adicionarTarefa() {
    const input = document.getElementById("novaTarefa");
    if (input.value.trim() === "") return;

    dados.tarefas.push({
        nome: input.value
    });

    input.value = "";
    salvar();
    renderizar();
}

function editarTarefa(index) {
    const novoNome = prompt("Editar meta:", dados.tarefas[index].nome);

    if (novoNome && novoNome.trim() !== "") {
        dados.tarefas[index].nome = novoNome;
        salvar();
        renderizar();
    }
}

function excluirTarefa(index) {
    dados.tarefas.splice(index, 1);

    const novoProgresso = {};

    Object.keys(dados.progresso).forEach(chave => {
        const [i, dia] = chave.split("-").map(Number);

        if (i < index) {
            novoProgresso[`${i}-${dia}`] = dados.progresso[chave];
        } else if (i > index) {
            novoProgresso[`${i - 1}-${dia}`] = dados.progresso[chave];
        }
    });

    dados.progresso = novoProgresso;

    salvar();
    renderizar();
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
    atualizarBarra();
    renderizar();
}

function atualizarBarra() {
    const totalPossivel = dados.tarefas.length * diasNoMes;
    const totalFeito = Object.values(dados.progresso).filter(v => v).length;

    const porcentagem = totalPossivel === 0 ? 0 :
        Math.round((totalFeito / totalPossivel) * 100);

    document.getElementById("barraProgresso").style.width = porcentagem + "%";
    document.getElementById("porcentagem").textContent =
        `Progresso do mês: ${porcentagem}%`;
}

function calcularMetasCompletas() {
    let completas = 0;

    dados.tarefas.forEach((_, i) => {
        let todosDias = true;

        for (let d = 1; d <= diasNoMes; d++) {
            if (!dados.progresso[`${i}-${d}`]) {
                todosDias = false;
                break;
            }
        }

        if (todosDias) completas++;
    });

    return completas;
}

function renderizar() {
    const container = document.getElementById("tabelaContainer");
    container.innerHTML = "";

    const table = document.createElement("table");

    let header = "<tr><th>Meta</th>";
    for (let d = 1; d <= diasNoMes; d++) {
        header += `<th>${d}</th>`;
    }
    header += "<th>Ações</th></tr>";

    table.innerHTML = header;

    dados.tarefas.forEach((tarefa, i) => {
        let row = `<tr><td>${tarefa.nome}</td>`;

        for (let d = 1; d <= diasNoMes; d++) {
            const chave = `${i}-${d}`;
            const ativo = dados.progresso[chave] ? "ativo" : "";

            row += `<td class="check ${ativo}"
                     onclick="alternar(${i}, ${d})"></td>`;
        }

        row += `<td>
            <button onclick="editarTarefa(${i})">✏</button>
            <button onclick="excluirTarefa(${i})">🗑</button>
            <button onclick="moverCima(${i})">⬆</button>
            <button onclick="moverBaixo(${i})">⬇</button>
        </td>`;

        row += "</tr>";

        table.innerHTML += row;
    });

    container.appendChild(table);

    atualizarBarra();

    document.getElementById("metasCompletas").textContent =
        "Metas 100% completas: " + calcularMetasCompletas();
}

renderizar();