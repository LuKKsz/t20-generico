/**
 * Módulo de Ordenação para T20 - Livro Básico (Addon)
 * Adiciona botão de 2 estados: Manual e A-Z
 * Versão 2.1: Removido Favoritos, apenas Manual e Alfabética
 */

Hooks.on('renderActorSheet', async (sheet, html, data) => {
    // Apenas para personagens
    if (sheet.actor.type !== 'character') return;

    const actor = sheet.actor;
    const FLAG_Scope = 't20-generico';
    // Armazena estado em objeto: { "habilidade-de-classe": 1, "magias-1-circulo": 0 }
    const FLAG_Dictionary = 'sortDictionary';

    // Recupera dicionário ou cria vazio
    let sortDict = actor.getFlag(FLAG_Scope, FLAG_Dictionary) || {};

    const modes = [
        { icon: 'fa-sort', label: 'Manual', color: 'rgba(0,0,0,0.3)', value: 0 },
        { icon: 'fa-sort-alpha-down', label: 'Alfabética', color: 'var(--dnd5e-color-crimson)', value: 1 }
    ];

    // Seletores de cabeçalho
    const headerSelector = '.tab.spells .item-header, .tab.powers .item-header, .tab.attributes .favorites .item-header, .tab.inventory .item-header';

    // --- ORDENAÇÃO DE SEÇÕES (PERÍCIAS / TIPOS DE PODERES) ---
    // Solicitado: Habilidades de Classe, Classe, Distinção, Geral, Origem, Racial, Concedido, Complicação
    const powersTab = html.find('.tab.powers');
    if (powersTab.length) {
        const cleanStr = (s) => s ? s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() : "";

        const getSectionWeight = (text) => {
            const t = cleanStr(text);
            if (t.includes("habilidade de classe") || t.includes("habilidades de classe")) return 1;
            if (t === "classe" || t === "classes") return 2; // Exato para não confundir com o de cima
            if (t.includes("distincao")) return 3;
            if (t.includes("geral") || t.includes("gerais")) return 4;
            if (t.includes("origem")) return 5;
            if (t.includes("racial") || t.includes("raca")) return 6;
            if (t.includes("concedido")) return 7;
            if (t.includes("complicacao")) return 8;
            return 99; // Fim da lista
        };

        const lists = powersTab.find('.item-list');
        if (lists.length > 1) {
            // Converte para array, ordena e reinsere
            const listsArray = lists.toArray();
            listsArray.sort((a, b) => {
                const titleA = $(a).find('.item-header .item-name').text();
                const titleB = $(b).find('.item-header .item-name').text();
                const wA = getSectionWeight(titleA);
                const wB = getSectionWeight(titleB);
                return wA - wB;
            });
            // Append move os elementos já existentes para a nova ordem
            console.log("T20 Generico | Reordenando seções de poderes...");
            powersTab.append(listsArray);
        }
    }


    html.find(headerSelector).each((index, element) => {
        const $header = $(element);

        // --- 1. Identificar Seção Única ---
        // Lógica de Estilo e Posição (Movido para cima para usar no sectionKey)
        const isDetailsTab = $header.closest('.tab.attributes').length > 0;
        const isInventoryTab = $header.closest('.tab.inventory').length > 0;

        let titleText = $header.find('.item-name').text().trim();
        if (!titleText) titleText = `section-${index}`;

        let sectionKey = titleText.toLowerCase()
            .replace(/[àáâãäå]/g, "a").replace(/ç/g, "c").replace(/[èéêë]/g, "e")
            .replace(/[ìíîï]/g, "i").replace(/[òóôõö]/g, "o").replace(/[ùúûü]/g, "u")
            .replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-");

        // Adiciona sufixo para diferenciar mesmas seções em abas diferentes (ex: Armas em Detalhes vs Inventário)
        if (isInventoryTab) {
            sectionKey += "-inv";
        } else if (isDetailsTab) {
            sectionKey += "-fav";
        }

        // --- 2. Obter Estado Atual ---
        // Se o valor salvo for 2 (antigo favoritos), força 0 (manual) ou 1
        let currentModeVal = sortDict[sectionKey] || 0;
        if (currentModeVal > 1) currentModeVal = 0; // Reset se for inválido

        const currentMode = modes[currentModeVal];

        // Evita duplicatas
        if ($header.find('.t20-sort-btn').length > 0) return;

        // --- 3. Injetar Botão ---
        const $controls = $header.find('.item-controls');

        let buttonStyle = `margin-right: 5px; color: ${currentMode.color}; cursor: pointer;`;

        if (isDetailsTab) {
            // Aba Detalhes: Força Absolute Right
            $header.css('position', 'relative');
            buttonStyle = `position: absolute; right: 5px; top: 50%; transform: translateY(-50%); color: ${currentMode.color}; cursor: pointer;`;
        }
        else if (isInventoryTab) {
            // Aba Inventário: Margem simples, pois vamos injetar DENTRO da célula
            buttonStyle = `margin-right: 5px; color: ${currentMode.color}; cursor: pointer;`;
        }

        const btnHtml = `
            <a class="t20-sort-btn" title="Ordenar: ${currentMode.label}" style="${buttonStyle}">
                <i class="fas ${currentMode.icon}"></i>
            </a>
        `;
        const $btn = $(btnHtml);

        // --- 4. Evento de Clique ---
        $btn.on('click', async (ev) => {
            ev.preventDefault();
            ev.stopPropagation();

            // Alterna 0 -> 1 -> 0
            const newMode = (currentModeVal + 1) % 2;

            const updatedDict = { ... (actor.getFlag(FLAG_Scope, FLAG_Dictionary) || {}) };
            updatedDict[sectionKey] = newMode;

            await actor.setFlag(FLAG_Scope, FLAG_Dictionary, updatedDict);
        });

        // --- Inserção no DOM ---
        if (isInventoryTab) {
            // No inventário, insere DENTRO da coluna QTD (.item-qty), antes do texto
            const $qtyInfo = $header.find('.item-qty');
            if ($qtyInfo.length) {
                // Prepend para ficar antes do texto "QTD"
                $qtyInfo.prepend($btn);
            } else {
                // Fallback
                if ($controls.length) $controls.prepend($btn);
                else $header.append($btn);
            }
        }
        else if ($controls.length) {
            $controls.prepend($btn);
        } else {
            $header.append($btn);
        }

        // --- 5. Executar Ordenação ---
        if (currentModeVal === 0) return; // Modo Manual

        const $parentList = $header.parent('.item-list');
        let $items = $parentList.children('.item');
        $items = $items.not($header);

        if ($items.length < 2) return;

        const itemsArray = $items.toArray();

        itemsArray.sort((a, b) => {
            const idA = $(a).data('item-id');
            const idB = $(b).data('item-id');
            const itemA = actor.items.get(idA);
            const itemB = actor.items.get(idB);

            const nameA = itemA ? itemA.name.toLowerCase() : $(a).find('.item-name').text().trim().toLowerCase();
            const nameB = itemB ? itemB.name.toLowerCase() : $(b).find('.item-name').text().trim().toLowerCase();

            // Apenas Alfabética
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;
            return 0;
        });

        $header.after(itemsArray);
    });
});
