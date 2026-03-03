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

    dados.tarefas.push(input.value);
    input.value = "";
    salvar();
    renderizar();
}

function excluirTarefa(index) {
    dados.tarefas.splice(index, 1);

    for (let chave in dados.progresso) {
        if (chave.startsWith(index + "-")) {
            delete dados.progresso[chave];
        }
    }

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

function renderizar() {
    const container = document.getElementById("tabelaContainer");
    container.innerHTML = "";

    const table = document.createElement("table");

    let header = "<tr><th>Tarefa</th>";
    for (let d = 1; d <= diasNoMes; d++) {
        header += `<th>${d}</th>`;
    }
    header += "<th>Excluir</th></tr>";

    table.innerHTML = header;

    dados.tarefas.forEach((tarefa, i) => {
        let row = `<tr><td>${tarefa}</td>`;

        for (let d = 1; d <= diasNoMes; d++) {
            const chave = `${i}-${d}`;
            const ativo = dados.progresso[chave] ? "ativo" : "";

            row += `<td class="check ${ativo}"
                     onclick="alternar(${i}, ${d})"></td>`;
        }

        row += `<td><button onclick="excluirTarefa(${i})">X</button></td>`;
        row += "</tr>";

        table.innerHTML += row;
    });

    container.appendChild(table);
    atualizarBarra();
}

renderizar();