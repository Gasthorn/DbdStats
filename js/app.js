let perksData = { killer: [], survivor: [], killers: [], survivors: [] };
let equipmentData = { survivorItems: [], survivorAddons: [], killerAddons: {} };
let currentRole = null;
let killerChart = null;
let survivorChart = null;
let roleDistributionChart = null;
let viewedDate = new Date(); // Date de référence pour la heatmap (mois en cours)
let editingMatchIndex = null;

// --- LOGIQUE HARDCORE ---
const HC_TIERS = ['Ash', 'Bronze', 'Silver', 'Gold', 'Iridescent'];
const HC_SUBRANKS = ['IV', 'III', 'II', 'I'];
const HC_COLORS = {
    'Ash': '#b1b1b1',
    'Bronze': '#cd7f32',
    'Silver': '#e8e8e8',
    'Gold': '#ffd700',
    'Iridescent': '#a91d1d'
};

function getHardcoreSeason() {
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth(); // 0-11
    
    // Si on est avant le 13, on appartient à la saison commencée le mois précédent
    if (now.getDate() < 13) {
        month--;
        if (month < 0) { month = 11; year--; }
    }
    return `Saison-${year}-${month + 1}`;
}

function getHardcoreState() {
    const season = getHardcoreSeason();
    let state = JSON.parse(localStorage.getItem('dbd_hc_state')) || {};
    
    // Reset si nouvelle saison
    if (state.seasonId !== season) {
        state = {
            seasonId: season,
            killerPips: 0,
            survivorPips: 0,
            deadKillers: [],
            deadSurvivors: []
        };
        localStorage.setItem('dbd_hc_state', JSON.stringify(state));
    }
    
    // Migration si vous aviez déjà des données
    if (state.totalPips !== undefined) {
        state.killerPips = state.killerPips || state.totalPips || 0;
        state.survivorPips = state.survivorPips || 0;
        delete state.totalPips;
        localStorage.setItem('dbd_hc_state', JSON.stringify(state));
    }

    return state;
}

function getAvailableHardcorePerks(role, selectedChar) {
    const state = getHardcoreState();
    const deadChars = role === 'killer' ? state.deadKillers : state.deadSurvivors;
    const allPerks = perksData[role] || [];
    
    return allPerks.filter(perk => {
        if (perk.owner === "Base Kit") return true;
        // La perk est disponible si son propriétaire n'est pas mort, 
        // OU si c'est la perk propre du personnage actuellement sélectionné.
        return !deadChars.includes(perk.owner) || perk.owner === selectedChar;
    });
}

function updateHCPerksDatalist() {
    const role = currentRole;
    const selectedChar = document.getElementById('hc-character').value;
    const availablePerks = getAvailableHardcorePerks(role, selectedChar);
    const datalist = document.getElementById('hc-perks-options');
    datalist.innerHTML = '<option value="None">None</option>';
    availablePerks.forEach(p => {
        let opt = document.createElement('option');
        opt.value = p.name;
        datalist.appendChild(opt);
    });
}

function calculateRank(totalPips) {
    // Barème précis des pips par grade (IV à I pour chaque tier)
    // Ash IV-III: 3, Ash II-I: 4
    // Bronze IV-I: 4
    // Silver IV-I: 5, Gold IV-I: 5, Iridescent IV-II: 5
    const pipRequirements = [
        3, 3, 4, 4, // Ash IV, III, II, I
        4, 4, 4, 4, // Bronze IV, III, II, I
        5, 5, 5, 5, // Silver IV, III, II, I
        5, 5, 5, 5, // Gold IV, III, II, I
        5, 5, 5     // Iridescent IV, III, II
    ];

    let remaining = totalPips;
    for (let i = 0; i < pipRequirements.length; i++) {
        const needed = pipRequirements[i];
        if (remaining < needed) {
            const tierIdx = Math.floor(i / 4);
            const subIdx = i % 4;
            const tierName = HC_TIERS[tierIdx];
            return {
                name: `${tierName} ${HC_SUBRANKS[subIdx]}`,
                current: remaining,
                needed: needed,
                color: HC_COLORS[tierName]
            };
        }
        remaining -= needed;
    }
    return { name: "Iridescent I Max", current: remaining, needed: '∞', color: HC_COLORS['Iridescent'] };
}

function setHardcoreRole(role) {
    currentRole = role;
    const state = getHardcoreState();
    const history = JSON.parse(localStorage.getItem('dbd_stats')) || [];
    const grid = document.getElementById('hc-character-grid');
    grid.innerHTML = '';
    document.getElementById('hc-character').value = ''; 
    document.getElementById('hc-selected-char-name').innerText = 'Aucun personnage sélectionné';
    
    // Réinitialisation du build Hardcore
    document.querySelectorAll('.hc-perk-input').forEach(input => input.value = 'None');
    document.querySelectorAll('.hc-perk-icon').forEach(img => updateImg(img, 'Perks', 'None'));
    if (role === 'survivor') {
        ['hc-surv-item', 'hc-surv-addon-1', 'hc-surv-addon-2'].forEach(id => document.getElementById(id).value = 'None');
        ['hc-surv-item-icon', 'hc-surv-addon-1-icon', 'hc-surv-addon-2-icon'].forEach(id => updateImg(document.getElementById(id), id.includes('addon') ? 'Addons' : 'Items', 'None'));
    } else {
        ['hc-kill-addon-1', 'hc-kill-addon-2'].forEach(id => document.getElementById(id).value = 'None');
        ['hc-kill-addon-1-icon', 'hc-kill-addon-2-icon'].forEach(id => updateImg(document.getElementById(id), 'Addons', 'None'));
    }
    updateHCPerksDatalist();
    document.getElementById('hc-survivor-equipment-fields').style.display = role === 'survivor' ? 'flex' : 'none';
    document.getElementById('hc-killer-equipment-fields').style.display = role === 'killer' ? 'flex' : 'none';
    renderBuildsList();

    const characters = perksData[role === 'killer' ? 'killers' : 'survivors'] || [];
    const deadList = role === 'killer' ? state.deadKillers : state.deadSurvivors;
    
    const editingMatch = editingMatchIndex !== null ? history[editingMatchIndex] : null;

    characters.forEach(char => {
        const item = document.createElement('div');
        item.className = 'hc-char-item';
        // Si le perso est mort mais n'est pas celui du match qu'on modifie actuellement
        if (deadList.includes(char) && (!editingMatch || editingMatch.character !== char)) {
            item.classList.add('blocked-char');
        } else {
            item.onclick = () => selectHardcoreChar(char, item);
        }
        
        const img = document.createElement('img');
        img.src = getIconPath('Characters', char);
        img.title = char;
        
        item.appendChild(img);
        grid.appendChild(item);
    });

    document.getElementById('hc-match-form').style.display = 'block';
    document.getElementById('hc-death-label').innerText = role === 'killer' ? "Évasion par la porte ?" : "Mort en partie ?";
    document.getElementById('hc-did-die').checked = false;
}

function selectHardcoreChar(name, element) {
    document.querySelectorAll('.hc-char-item').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    document.getElementById('hc-character').value = name;
    document.getElementById('hc-selected-char-name').innerText = name;
    updateHCPerksDatalist();
    if (currentRole === 'killer') updateHCKillerAddons();
}

function updateHCKillerAddons() {
    const killerName = document.getElementById('hc-character').value;
    const addons = equipmentData.killerAddons[killerName] || [];
    updateDatalist('hc-kill-addons-options', addons);
    updateImg(document.getElementById('hc-kill-addon-1-icon'), 'Addons', document.getElementById('hc-kill-addon-1').value);
    updateImg(document.getElementById('hc-kill-addon-2-icon'), 'Addons', document.getElementById('hc-kill-addon-2').value);
}

function updateHCSurvivorAddons() {
    const itemType = document.getElementById('hc-surv-item').value;
    const itemEntry = equipmentData.survivorAddons.find(entry => itemType.toLowerCase().includes(entry.itemType.toLowerCase()));
    const addons = itemEntry ? itemEntry.addons : [];
    updateDatalist('hc-surv-addons-options', addons);
    updateImg(document.getElementById('hc-surv-addon-1-icon'), 'Addons', document.getElementById('hc-surv-addon-1').value);
    updateImg(document.getElementById('hc-surv-addon-2-icon'), 'Addons', document.getElementById('hc-surv-addon-2').value);
}

function saveHardcoreMatch() {
    const state = getHardcoreState();
    const char = document.getElementById('hc-character').value;
    const pips = parseInt(document.getElementById('hc-pips-earned').value);
    const didDie = document.getElementById('hc-did-die').checked;

    if (!char) return alert("Veuillez sélectionner un personnage !");
    
    const perks = Array.from(document.querySelectorAll('.hc-perk-input')).map(input => input.value);
    const equipment = currentRole === 'survivor' 
        ? [document.getElementById('hc-surv-item').value, document.getElementById('hc-surv-addon-1').value, document.getElementById('hc-surv-addon-2').value]
        : [document.getElementById('hc-kill-addon-1').value, document.getElementById('hc-kill-addon-2').value];

    let history = JSON.parse(localStorage.getItem('dbd_stats')) || [];
    
    // Si on modifie une partie existante, on annule l'ancien état HC
    if (editingMatchIndex !== null) {
        const oldMatch = history[editingMatchIndex];
        if (oldMatch.mode === 'hardcore') {
            if (oldMatch.role === 'killer') state.killerPips -= (oldMatch.pips || 0);
            else state.survivorPips -= (oldMatch.pips || 0);
            if (oldMatch.didDie) {
                const list = oldMatch.role === 'killer' ? state.deadKillers : state.deadSurvivors;
                const idx = list.indexOf(oldMatch.character);
                if (idx > -1) list.splice(idx, 1);
            }
        }
    }

    const match = {
        date: editingMatchIndex !== null ? history[editingMatchIndex].date : new Date().toLocaleString(),
        role: currentRole,
        character: char,
        mode: 'hardcore',
        pips: pips,
        didDie: didDie,
        bloodpoints: 0,
        perks: perks,
        equipment: equipment
    };

    if (editingMatchIndex !== null) {
        history[editingMatchIndex] = match;
        editingMatchIndex = null;
    } else {
        history.push(match);
    }

    if (currentRole === 'killer') state.killerPips += pips;
    else state.survivorPips += pips;

    if (didDie) {
        if (currentRole === 'killer') state.deadKillers.push(char);
        else state.deadSurvivors.push(char);
    }

    localStorage.setItem('dbd_hc_state', JSON.stringify(state));
    localStorage.setItem('dbd_stats', JSON.stringify(history));

    alert(didDie ? `${char} est mort...` : "Match validé !");
    renderHardcoreUI();
    renderHistory();
    document.getElementById('hc-match-form').style.display = 'none';
}

function renderHardcoreUI() {
    const state = getHardcoreState();
    
    const updateDisplay = (rolePrefix, pips) => {
        const rank = calculateRank(pips);
        const rankEl = document.getElementById(`${rolePrefix}-rank`);
        rankEl.innerText = rank.name;
        rankEl.style.color = rank.color;
        rankEl.style.textShadow = `0 0 10px ${rank.color}80`;

        document.getElementById(`${rolePrefix}-pip-info`).innerText = `${rank.current} / ${rank.needed} Pips`;

        const progressFill = document.getElementById(`${rolePrefix}-rank-progress-fill`);
        if (progressFill) {
            progressFill.style.width = rank.needed === '∞' ? '100%' : (rank.current / rank.needed) * 100 + '%';
            progressFill.style.backgroundColor = rank.color;
            progressFill.style.boxShadow = `0 0 8px ${rank.color}CC`;
        }
    };

    updateDisplay('killer', state.killerPips || 0);
    updateDisplay('survivor', state.survivorPips || 0);
    document.getElementById('hardcore-season-info').innerText = state.seasonId;
}

function getIconPath(category, name) {
    if (!name || name === "None") return `Icons/${category}/empty.png`;

    const normalizeForCharacters = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, '');
    const normalizeForPerks = (str) => {
        // Remove accents
        let normalized = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        // Remove non-alphanumeric characters, but keep spaces for PascalCase conversion
        normalized = normalized.replace(/[^a-zA-Z0-9\s]/g, '');
        // Convert to PascalCase (e.g., "Ace in the Hole" -> "AceInTheHole")
        normalized = normalized.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
        return normalized;
    };

    if (category === 'Characters') {
        
        // Recherche dans les tueurs
        let index = perksData.killers.indexOf(name);
        if (index !== -1) {
            const id = String(index + 1).padStart(2, '0');
            return `Icons/Characters/K${id}_${normalizeForCharacters(name)}_Portrait.png`;
        }
        
        // Recherche dans les survivants
        index = perksData.survivors.indexOf(name);
        if (index !== -1) {
            const id = String(index + 1).padStart(2, '0');
            return `Icons/Characters/S${id}_${normalizeForCharacters(name)}_Portrait.png`;
        }
        return `Icons/Characters/empty.png`;
    } else if (category === 'Perks') {
        return `Icons/Perks/iconPerks_${normalizeForPerks(name)}.png`;
    } else if (category === 'Addons') {
        return `Icons/Addons/iconAddon_${normalizeForPerks(name)}.png`;
    } else if (category === 'Items') {
        return `Icons/Items/iconItems_${normalizeForPerks(name)}.png`;
    }
    return `Icons/${category}/empty.png`;
}

function updateImg(img, category, name) {
    img.src = getIconPath(category, name);
    img.style.display = 'inline-block';
    img.onerror = () => {
        img.src = `Icons/${category}/empty.png`;
    };
}

async function loadData() {
    try {
        const [perksResp, equipResp] = await Promise.all([
            fetch('perks.json'),
            fetch('equipment.json')
        ]);
        perksData = await perksResp.json();
        equipmentData = await equipResp.json();
    } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
    }
}

function setRole(role) {
    currentRole = role;
    document.getElementById('match-form').style.display = 'block';
    document.getElementById('form-title').innerText = `Nouvelle partie : ${role === 'killer' ? 'Tueur' : 'Survivant'}`;

    // Mise à jour visuelle des boutons de rôle
    document.querySelectorAll('#role-selection button').forEach(btn => btn.classList.remove('active-role'));
    const btnIdx = role === 'killer' ? 0 : 1;
    document.querySelectorAll('#role-selection button')[btnIdx].classList.add('active-role');

    const charSelect = document.getElementById('character');
    charSelect.innerHTML = '<option value="None">None</option>';
    const characters = perksData[role === 'killer' ? 'killers' : 'survivors'] || [];
    characters.forEach(char => {
        let opt = document.createElement('option');
        opt.value = char;
        opt.innerHTML = char;
        charSelect.appendChild(opt);
    });
    updateImg(document.getElementById('char-icon'), 'Characters', charSelect.value);

    document.getElementById('killer-stats').style.display = role === 'killer' ? 'block' : 'none';
    document.getElementById('survivor-stats').style.display = role === 'survivor' ? 'block' : 'none';
    
    validateForm();
    // Déplacement dynamique du champ Points de Sang pour s'adapter au layout
    const bpField = document.getElementById('bp-field');
    if (role === 'killer') {
        document.getElementById('killer-stats').appendChild(bpField);
    } else {
        document.querySelector('.survivor-results-details').appendChild(bpField);
    }

    document.getElementById('survivor-equipment-fields').style.display = role === 'survivor' ? 'block' : 'none';
    document.getElementById('killer-equipment-fields').style.display = role === 'killer' ? 'block' : 'none';

    // Si survivant, on prépare la liste des tueurs adverses
    if (role === 'survivor') {
        const opponentSelect = document.getElementById('opponent-killer');
        opponentSelect.innerHTML = '<option value="None">None</option>';
        perksData.killers.forEach(k => {
            let opt = document.createElement('option');
            opt.value = k;
            opt.innerHTML = k;
            opponentSelect.appendChild(opt);
        });
        updateImg(document.getElementById('opponent-icon'), 'Characters', opponentSelect.value);
    }

    // Mise à jour de la datalist des perks selon le rôle
    const datalist = document.getElementById('perks-options');
    datalist.innerHTML = '<option value="None">None</option>';
    if (perksData && perksData[role]) {
        perksData[role].forEach(perkObj => {
            let opt = document.createElement('option');
            opt.value = perkObj.name;
            datalist.appendChild(opt);
        });
    }
    // Reset perk icons
    document.querySelectorAll('.perk-icon').forEach(img => updateImg(img, 'Perks', 'None'));

    // Mise à jour initiale des datalists d'équipement
    updateDatalist('items-options', equipmentData.survivorItems);
    // Reset equipment icons
    ['surv-item-icon', 'surv-addon-1-icon', 'surv-addon-2-icon', 'kill-addon-1-icon', 'kill-addon-2-icon'].forEach(id => {
        const el = document.getElementById(id);
        if (el) updateImg(el, id.includes('addon') ? 'Addons' : 'Items', 'None');
    });
    
    if (role === 'killer') {
        updateKillerAddons();
    }
    renderBuildsList();
}

function updateKillerAddons() {
    const killerName = document.getElementById('character').value;
    const addons = equipmentData.killerAddons[killerName] || [];
    updateDatalist('kill-addons-options', addons);
    updateImg(document.getElementById('kill-addon-1-icon'), 'Addons', document.getElementById('kill-addon-1').value);
    updateImg(document.getElementById('kill-addon-2-icon'), 'Addons', document.getElementById('kill-addon-2').value);
}

function updateSurvivorAddons() {
    const itemType = document.getElementById('surv-item').value;
    // On cherche l'entrée correspondant au type d'item (ex: "Med-kit")
    const itemEntry = equipmentData.survivorAddons.find(entry => 
        itemType.toLowerCase().includes(entry.itemType.toLowerCase())
    );
    
    const addons = itemEntry ? itemEntry.addons : [];
    updateDatalist('surv-addons-options', addons);
    updateImg(document.getElementById('surv-addon-1-icon'), 'Addons', document.getElementById('surv-addon-1').value);
    updateImg(document.getElementById('surv-addon-2-icon'), 'Addons', document.getElementById('surv-addon-2').value);
}

function updateDatalist(id, list) {
    const el = document.getElementById(id);
    el.innerHTML = '<option value="None">None</option>';
    if (list) {
        list.forEach(item => {
            let opt = document.createElement('option');
            opt.value = item;
            el.appendChild(opt);
        });
    }
}

function resetUI() {
    document.getElementById('role-selection').style.display = 'block';
    document.getElementById('match-form').style.display = 'none';
    document.querySelectorAll('#role-selection button').forEach(btn => btn.classList.remove('active-role'));
    currentRole = null;
    editingMatchIndex = null;
    document.getElementById('gens-done').value = 0;
    document.getElementById('gens-done').nextElementSibling.value = 0;
    document.getElementById('escaped').value = 'Mort';
    document.getElementById('bloodpoints').value = '';
    document.getElementById('kills').value = '';
    document.getElementById('killer-gens').value = 0;
    document.getElementById('killer-gens').nextElementSibling.value = 0;
    
    const saveBtn = document.getElementById('save-button');
    if (saveBtn) {
        saveBtn.innerText = "Enregistrer la partie";
        saveBtn.disabled = true;
    }
}

function validateForm() {
    const saveBtn = document.getElementById('save-button');
    const char = document.getElementById('character').value;
    const bp = document.getElementById('bloodpoints').value;
    
    let isValid = (char !== 'None' && bp !== '' && parseInt(bp) >= 0);

    if (currentRole === 'killer') {
        isValid = isValid && document.getElementById('kills').value !== '' && document.getElementById('killer-gens').value !== '';
    } else if (currentRole === 'survivor') {
        isValid = isValid && document.getElementById('opponent-killer').value !== 'None';
    }

    saveBtn.disabled = !isValid;
}

function showView(viewId) {
    // Cacher toutes les vues
    document.querySelectorAll('.view').forEach(view => view.style.display = 'none');
    // Afficher la vue demandée
    document.getElementById(viewId + '-view').style.display = 'block';

    // Gestion de la visibilité du menu de navigation
    const mainNav = document.getElementById('main-nav');
    if (mainNav) {
        mainNav.style.display = (viewId === 'landing') ? 'none' : 'flex';
        // On masque les boutons spécifiques aux statistiques si on est dans un autre mode
        const isStatsView = ['stats', 'history'].includes(viewId);
        const statsBtns = mainNav.querySelectorAll('button:not(:first-child)');
        statsBtns.forEach(btn => btn.style.display = isStatsView ? 'inline-block' : 'none');
    }

    if (viewId === 'tracker') {
        resetUI();
    } else if (viewId === 'history') {
        renderHistory();
    } else if (viewId === 'stats') {
        renderStats();
    } else if (viewId === 'gauntlet') {
        renderGauntletUI();
    } else if (viewId === 'hardcore') {
        renderHardcoreUI();
    }
}

function saveBuild() {
    const isHC = document.getElementById('hardcore-view').style.display !== 'none';
    const prefix = isHC ? 'hc-' : '';
    const name = document.getElementById(prefix + 'build-name').value;
    if (!name) return alert("Veuillez donner un nom à votre build.");

    const build = {
        role: currentRole,
        character: document.getElementById(isHC ? 'hc-character' : 'character').value,
        perks: Array.from(document.querySelectorAll(isHC ? '.hc-perk-input' : '.perk-input')).map(input => input.value),
        equipment: currentRole === 'survivor' 
            ? [document.getElementById(prefix + 'surv-item').value, document.getElementById(prefix + 'surv-addon-1').value, document.getElementById(prefix + 'surv-addon-2').value]
            : [document.getElementById(prefix + 'kill-addon-1').value, document.getElementById(prefix + 'kill-addon-2').value]
    };

    let builds = JSON.parse(localStorage.getItem('dbd_builds')) || {};
    builds[name] = build;
    localStorage.setItem('dbd_builds', JSON.stringify(builds));
    
    alert(`Build "${name}" enregistré !`);
    renderBuildsList();
}

function renderBuildsList() {
    const builds = JSON.parse(localStorage.getItem('dbd_builds')) || {};
    const selects = [document.getElementById('load-build-select'), document.getElementById('hc-load-build-select')];
    
    selects.forEach(select => {
        if (!select) return;
        select.innerHTML = '<option value="">-- Sélectionner --</option>';
        Object.keys(builds).forEach(name => {
            // On ne propose que les builds correspondant au rôle actuel
            if (builds[name].role === currentRole) {
                const opt = document.createElement('option');
                opt.value = name;
                opt.innerText = name;
                select.appendChild(opt);
            }
        });
    });
}

function applyBuild(name) {
    if (!name) return;
    const builds = JSON.parse(localStorage.getItem('dbd_builds')) || {};
    const b = builds[name];
    if (!b) return;

    const isHC = document.getElementById('hardcore-view').style.display !== 'none';
    const prefix = isHC ? 'hc-' : '';

    if (isHC) {
        document.getElementById('hc-character').value = b.character;
        document.getElementById('hc-selected-char-name').innerText = b.character;
        document.querySelectorAll('.hc-char-item').forEach(item => {
            item.classList.toggle('selected', item.querySelector('img').title === b.character);
        });
        updateHCPerksDatalist();
    } else {
        document.getElementById('character').value = b.character;
        updateImg(document.getElementById('char-icon'), 'Characters', b.character);
    }

    const container = document.getElementById(isHC ? 'hc-match-form' : 'match-form');
    const perkInputs = container.querySelectorAll(isHC ? '.hc-perk-input' : '.perk-input');
    const perkIcons = container.querySelectorAll(isHC ? '.hc-perk-icon' : '.perk-icon');

    b.perks.forEach((val, i) => {
        if (perkInputs[i]) {
            perkInputs[i].value = val;
            updateImg(perkIcons[i], 'Perks', val);
        }
    });

    if (currentRole === 'survivor') {
        document.getElementById(prefix + 'surv-item').value = b.equipment[0];
        document.getElementById(prefix + 'surv-addon-1').value = b.equipment[1];
        document.getElementById(prefix + 'surv-addon-2').value = b.equipment[2];
        if (isHC) updateHCSurvivorAddons(); else updateSurvivorAddons();
        updateImg(document.getElementById(prefix + 'surv-item-icon'), 'Items', b.equipment[0]);
    } else {
        document.getElementById(prefix + 'kill-addon-1').value = b.equipment[0];
        document.getElementById(prefix + 'kill-addon-2').value = b.equipment[1];
        if (isHC) updateHCKillerAddons(); else updateKillerAddons();
    }
}

function resetCurrentBuild() {
    const isHC = document.getElementById('hardcore-view').style.display !== 'none';
    const prefix = isHC ? 'hc-' : '';

    document.getElementById(prefix + 'build-name').value = '';
    const loadSelect = document.getElementById(prefix + 'load-build-select');
    if (loadSelect) loadSelect.value = '';

    const container = document.getElementById(isHC ? 'hc-match-form' : 'match-form');
    const perkInputs = container.querySelectorAll(isHC ? '.hc-perk-input' : '.perk-input');
    const perkIcons = container.querySelectorAll(isHC ? '.hc-perk-icon' : '.perk-icon');

    perkInputs.forEach((input, i) => {
        input.value = 'None';
        updateImg(perkIcons[i], 'Perks', 'None');
    });

    if (currentRole === 'survivor') {
        document.getElementById(prefix + 'surv-item').value = 'None';
        document.getElementById(prefix + 'surv-addon-1').value = 'None';
        document.getElementById(prefix + 'surv-addon-2').value = 'None';
        updateImg(document.getElementById(prefix + 'surv-item-icon'), 'Items', 'None');
        if (isHC) updateHCSurvivorAddons(); else updateSurvivorAddons();
    } else if (currentRole === 'killer') {
        document.getElementById(prefix + 'kill-addon-1').value = 'None';
        document.getElementById(prefix + 'kill-addon-2').value = 'None';
        if (isHC) updateHCKillerAddons(); else updateKillerAddons();
    }
}

function changeMonth(delta) {
    viewedDate.setMonth(viewedDate.getMonth() + delta);
    renderStats();
}

function resetMonth() {
    viewedDate = new Date();
    renderStats();
}

function renderStats() {
    const history = JSON.parse(localStorage.getItem('dbd_stats')) || [];

    // Zone 1 : Heatmap d'activité
    renderActivityHeatmap(history);

    // Zone 2 : Tops (Favoris)
    renderTopStats(history);

    if (history.length === 0) return;

    // Grouper les données par jour
    const statsByDay = {};
    history.forEach(match => {
        if (match.mode === 'hardcore') return;
        const dateKey = match.date.split(' ')[0];
        if (!statsByDay[dateKey]) {
            statsByDay[dateKey] = { games: 0, kills: 0, killerGames: 0, escapes: 0, survivorGames: 0 };
        }
        statsByDay[dateKey].games++;
        if (match.role === 'killer') {
            statsByDay[dateKey].killerGames++;
            statsByDay[dateKey].kills += parseInt(match.kills || 0);
        } else {
            statsByDay[dateKey].survivorGames++;
            const isEscaped = (match.escaped === true || match.escaped === 'Trappe' || match.escaped === 'Porte');
            if (isEscaped) statsByDay[dateKey].escapes++;
        }
    });

    const labels = Object.keys(statsByDay).sort();
    const killRateData = labels.map(day => statsByDay[day].killerGames > 0 
        ? ((statsByDay[day].kills / (statsByDay[day].killerGames * 4)) * 100).toFixed(1) 
        : null);
    const escapeRateData = labels.map(day => statsByDay[day].survivorGames > 0 
        ? ((statsByDay[day].escapes / statsByDay[day].survivorGames) * 100).toFixed(1) 
        : null);

    if (killerChart) killerChart.destroy();
    if (survivorChart) survivorChart.destroy();

    killerChart = createPerformanceChart('killerChart', 'Kill Rate %', labels, killRateData, '#ff4d4d');
    survivorChart = createPerformanceChart('survivorChart', 'Escape Rate %', labels, escapeRateData, '#4da6ff');
}

function renderActivityHeatmap(history) {
    const container = document.getElementById('activity-heatmap');
    container.innerHTML = '';

    const month = viewedDate.getMonth();
    const year = viewedDate.getFullYear();
    
    // Mise à jour du libellé (ex: "Septembre 2023")
    const monthName = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(viewedDate);
    document.getElementById('current-month-label').innerText = monthName.charAt(0).toUpperCase() + monthName.slice(1);

    const counts = {};
    history.forEach(m => {
        const parts = m.date.split(' ')[0].split('/');
        const d = new Date(parts[2], parts[1] - 1, parts[0]);
        if (d.getMonth() === month && d.getFullYear() === year) {
            const day = d.getDate();
            counts[day] = (counts[day] || 0) + 1;
        }
    });

    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 1; i <= lastDayOfMonth; i++) {
        const count = counts[i] || 0;

        const dayWrapper = document.createElement('div');
        dayWrapper.className = 'heatmap-day';
        
        const dayEl = document.createElement('div');
        dayEl.style.width = '18px';
        dayEl.style.height = '18px';
        dayEl.style.borderRadius = '2px';
        dayEl.title = `Jour ${i} : ${count} match(es)`;

        if (count === 0) dayEl.style.backgroundColor = '#ebedf0';
        else if (count <= 1) dayEl.style.backgroundColor = '#9be9a8';
        else if (count <= 3) dayEl.style.backgroundColor = '#40c463';
        else if (count <= 5) dayEl.style.backgroundColor = '#30a14e';
        else dayEl.style.backgroundColor = '#216e39';

        const label = document.createElement('span');
        label.innerText = i;

        dayWrapper.appendChild(dayEl);
        dayWrapper.appendChild(label);
        container.appendChild(dayWrapper);
    }
}

function renderTopStats(history) {
    const survivorCounts = {};
    const killerCounts = {};
    const opponentCounts = {};
    const survivorBuilds = {};
    const killerBuilds = {};
    let totalBP = 0;
    let killerBP = 0, killerMatches = 0;
    let survivorBP = 0, survivorMatches = 0;

    history.forEach(match => {
        const bp = parseInt(match.bloodpoints) || 0;
        totalBP += bp;
        if (match.role === 'killer') {
            killerBP += bp;
            killerMatches++;
        } else {
            survivorBP += bp;
            survivorMatches++;
        }
        // Normalisation du build (tri alphabétique pour que l'ordre n'influence pas le compte)
        const buildKey = match.perks
            .filter(p => p && p.trim() !== "")
            .sort()
            .join(' | ');

        if (match.role === 'killer') {
            killerCounts[match.character] = (killerCounts[match.character] || 0) + 1;
            if (buildKey) killerBuilds[buildKey] = (killerBuilds[buildKey] || 0) + 1;
        } else {
            survivorCounts[match.character] = (survivorCounts[match.character] || 0) + 1;
            if (match.opponent) {
                opponentCounts[match.opponent] = (opponentCounts[match.opponent] || 0) + 1;
            }
            if (buildKey) survivorBuilds[buildKey] = (survivorBuilds[buildKey] || 0) + 1;
        }
    });

    const displayTop = (id, counts) => {
        const el = document.getElementById(id);
        let max = 0;
        let top = null;
        for (const name in counts) {
            if (counts[name] > max) {
                max = counts[name];
                top = name;
            }
        }

        const img = el.querySelector('img');
        const nameEl = el.querySelector('.name');
        const countEl = el.querySelector('.count');

        if (top) {
            img.src = getIconPath('Characters', top);
            img.style.display = 'block';
            nameEl.innerText = top;
            countEl.innerText = `(${max})`;
        } else {
            img.style.display = 'none';
            nameEl.innerText = "-";
            countEl.innerText = "";
        }
    };

    displayTop('top-survivor', survivorCounts);
    displayTop('top-opponent', opponentCounts);
    displayTop('top-killer', killerCounts);

    // Rendu des builds
    const displayTopBuild = (id, counts) => {
        const el = document.getElementById(id);
        let max = 0;
        let top = null;
        for (const build in counts) {
            if (counts[build] > max) {
                max = counts[build];
                top = build;
            }
        }

        const iconsContainer = el.querySelector('.build-icons');
        const countEl = el.querySelector('.count');
        iconsContainer.innerHTML = '';

        if (top) {
            top.split(' | ').forEach(perkName => {
                const slot = document.createElement('div');
                slot.className = 'selection-slot perk-container';
                slot.style.width = '70px'; // Un peu plus petit pour les stats
                slot.style.height = '70px';
                slot.style.margin = '10px 15px';

                const img = document.createElement('img');
                img.src = getIconPath('Perks', perkName);
                img.title = perkName;
                img.className = 'perk-icon';
                img.onerror = () => slot.style.display = 'none';
                
                slot.appendChild(img);
                iconsContainer.appendChild(slot);
            });
            countEl.innerText = `(${max})`;
        } else {
            countEl.innerText = "";
        }
    };

    displayTopBuild('top-survivor-build', survivorBuilds);
    displayTopBuild('top-killer-build', killerBuilds);

    const setAvg = (id, total, count) => {
        const el = document.getElementById(id);
        if (el) el.querySelector('.value').innerText = count > 0 ? Math.round(total / count).toLocaleString() : "0";
    };
    setAvg('avg-bloodpoints-global', totalBP, history.length);
    setAvg('avg-bloodpoints-killer', killerBP, killerMatches);
    setAvg('avg-bloodpoints-survivor', survivorBP, survivorMatches);

    // Rendu du graphique de répartition des rôles
    if (roleDistributionChart) roleDistributionChart.destroy();
    const ctxRole = document.getElementById('roleDistributionChart').getContext('2d');
    roleDistributionChart = new Chart(ctxRole, {
        type: 'pie',
        data: {
            labels: ['Tueur', 'Survivant'],
            datasets: [{
                data: [killerMatches, survivorMatches],
                backgroundColor: ['#ff4d4d', '#4da6ff'],
                borderColor: '#fff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

function createPerformanceChart(canvasId, label, labels, data, color) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: lineLineData(data),
                borderColor: color,
                backgroundColor: color + '33',
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            scales: {
                y: { beginAtZero: true, max: 100, title: { display: true, text: '%' } }
            }
        }
    });
}

function lineLineData(data) {
    // Helper pour que Chart.js ne trace pas de ligne vers les valeurs nulles
    return data.map(v => v === null ? undefined : v);
}

function saveMatch() {
    const perks = Array.from(document.querySelectorAll('#match-form .perk-input')).map(input => input.value || 'None');
    
    const match = {
        date: new Date().toLocaleString(),
        role: currentRole,
        character: document.getElementById('character').value,
        opponent: currentRole === 'survivor' ? document.getElementById('opponent-killer').value : null,
        perks: perks,
        equipment: currentRole === 'survivor' 
            ? [document.getElementById('surv-item').value, document.getElementById('surv-addon-1').value, document.getElementById('surv-addon-2').value]
            : [document.getElementById('kill-addon-1').value, document.getElementById('kill-addon-2').value],
        bloodpoints: document.getElementById('bloodpoints').value,
        kills: currentRole === 'killer' ? document.getElementById('kills').value : null,
        escaped: currentRole === 'survivor' ? (document.getElementById('escaped').value || 'Mort') : null,
        gens: currentRole === 'killer' ? document.getElementById('killer-gens').value : document.getElementById('gens-done').value
    };

    let history = JSON.parse(localStorage.getItem('dbd_stats')) || [];
    
    const isNewMatch = editingMatchIndex === null;

    if (editingMatchIndex !== null) {
        match.date = history[editingMatchIndex].date; // On garde la date originale
        history[editingMatchIndex] = match;
        editingMatchIndex = null;
    } else {
        history.push(match);
    }
    
    localStorage.setItem('dbd_stats', JSON.stringify(history));

    // Intégration Gauntlet : si c'est une nouvelle partie et que le perso correspond à celui du Gauntlet
    if (isNewMatch && currentRole === 'survivor') {
        const gauntletState = getGauntletState();
        if (gauntletState.current && gauntletState.current === match.character) {
            if (validateGauntletBuild(match.character, match.perks, gauntletState.completed.length)) {
                const isWin = (match.escaped === 'Trappe' || match.escaped === 'Porte' || match.escaped === true);
                recordGauntletResult(isWin);
            }
        }
    }

    alert('Partie enregistrée !');
    renderHistory();
    resetUI();
}

function renderHistory() {
    const historyList = document.getElementById('history-list');
    const history = JSON.parse(localStorage.getItem('dbd_stats')) || [];
    
    historyList.innerHTML = '';
    // On mappe avec l'index original pour que Modifier/Supprimer ciblent le bon élément après le reverse
    const historyWithIdx = history.map((m, i) => ({...m, originalIdx: i}));

    historyWithIdx.reverse().slice(0, 10).forEach(match => {
        const li = document.createElement('li');
        li.style.marginBottom = "10px";

        // Applique la classe verte si le survivant s'est échappé
        const isEscaped = match.role === 'survivor' && (match.escaped === true || match.escaped === 'Trappe' || match.escaped === 'Porte');
        if (isEscaped) {
            li.classList.add('escaped-match');
        }

        const charIcon = `<img src="${getIconPath('Characters', match.character)}" style="width:24px; vertical-align:middle; margin-right:5px;" onerror="this.style.display='none'">`;
        let resultText = "";
        if (match.mode === 'hardcore') {
            const pipText = match.pips > 0 ? `+${match.pips} Pips` : `${match.pips} Pip`;
            const deathText = match.didDie 
                ? `<span style="color: #ff4d4d;">MORT</span>` 
                : `<span style="color: #2ecc71;">SURVIE</span>`;
            resultText = `<span style="color: #aaa;">[HC]</span> ${deathText} - ${pipText}`;
        } else if (match.role === 'killer') {
            resultText = `${match.kills} sacrifices`;
        } else {
            let label = match.escaped === true ? "Échappé" : (match.escaped === false || !match.escaped ? "Mort" : match.escaped);
            const color = isEscaped ? '#2ecc71' : '#ff4d4d';
            resultText = `<span style="color: ${color};">${label}</span> vs ${match.opponent}`;
        }

        li.innerHTML = `
            ${charIcon} <strong>${match.date}</strong> - ${match.character} (${resultText}) - ${match.bloodpoints} BP
            <button onclick="editMatch(${match.originalIdx})">Modifier</button>
            <button onclick="deleteMatch(${match.originalIdx})">Supprimer</button>
        `;
        historyList.appendChild(li);
    });
}

function exportHistoryToCSV() {
    const history = JSON.parse(localStorage.getItem('dbd_stats')) || [];
    if (history.length === 0) return alert("Aucune donnée à exporter.");

    const headers = ["Date", "Role", "Character", "Opponent", "Perk1", "Perk2", "Perk3", "Perk4", "Equip1", "Equip2", "Equip3", "Bloodpoints", "Kills", "Escaped", "Gens"];
    const csvRows = [headers.join(',')];

    history.forEach(match => {
        const row = [
            `"${match.date}"`,
            `"${match.role}"`,
            `"${match.character}"`,
            `"${match.opponent || ''}"`,
            `"${match.perks[0] || ''}"`,
            `"${match.perks[1] || ''}"`,
            `"${match.perks[2] || ''}"`,
            `"${match.perks[3] || ''}"`,
            `"${match.equipment[0] || ''}"`,
            `"${match.equipment[1] || ''}"`,
            `"${match.equipment[2] || ''}"`,
            `"${match.bloodpoints}"`,
            `"${match.kills || ''}"`,
            `"${match.escaped !== null ? match.escaped : ''}"`,
            `"${match.gens || ''}"`
        ];
        csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `dbd_stats_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function importHistoryFromCSV(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const rows = text.split('\n').filter(row => row.trim() !== '');
        if (rows.length <= 1) return alert("Le fichier CSV est vide.");

        const importedMatches = [];
        for (let i = 1; i < rows.length; i++) {
            // Split by comma but ignore commas inside quotes
            const cleanValues = rows[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/^"|"$/g, ''));
            if (cleanValues.length < 15) continue;

            importedMatches.push({
                date: cleanValues[0],
                role: cleanValues[1],
                character: cleanValues[2],
                opponent: cleanValues[3] || null,
                perks: [cleanValues[4], cleanValues[5], cleanValues[6], cleanValues[7]].filter(p => p !== ''),
                equipment: [cleanValues[8], cleanValues[9], cleanValues[10]].filter(e => e !== ''),
                bloodpoints: cleanValues[11],
                kills: cleanValues[12] || null,
                escaped: cleanValues[13] === 'true' ? true : (cleanValues[13] === 'false' ? false : (cleanValues[13] || 'Mort')),
                gens: cleanValues[14]
            });
        }

        if (confirm(`${importedMatches.length} parties trouvées. Voulez-vous les ajouter à votre historique actuel ?`)) {
            const currentHistory = JSON.parse(localStorage.getItem('dbd_stats')) || [];
            localStorage.setItem('dbd_stats', JSON.stringify([...currentHistory, ...importedMatches]));
            renderHistory();
            renderStats();
            alert("Importation réussie !");
        }
        input.value = '';
    };
    reader.readAsText(file);
}

function exportBuildsToJSON() {
    const builds = JSON.parse(localStorage.getItem('dbd_builds')) || {};
    if (Object.keys(builds).length === 0) return alert("Aucun build à exporter.");

    const dataStr = JSON.stringify(builds, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `dbd_builds_export_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function importBuildsFromJSON(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedBuilds = JSON.parse(e.target.result);
            if (typeof importedBuilds !== 'object' || importedBuilds === null || Array.isArray(importedBuilds)) {
                throw new Error("Le fichier doit contenir un objet de builds.");
            }

            const count = Object.keys(importedBuilds).length;
            if (confirm(`${count} builds trouvés. Voulez-vous les ajouter à vos builds actuels ? (Les builds avec le même nom seront écrasés)`)) {
                const currentBuilds = JSON.parse(localStorage.getItem('dbd_builds')) || {};
                const mergedBuilds = { ...currentBuilds, ...importedBuilds };
                localStorage.setItem('dbd_builds', JSON.stringify(mergedBuilds));
                
                renderBuildsList();
                alert("Builds importés avec succès !");
            }
        } catch (err) {
            alert("Erreur lors de l'importation : " + err.message);
        }
        input.value = '';
    };
    reader.readAsText(file);
}

function deleteMatch(index) {
    if(confirm("Voulez-vous supprimer cette partie de l'historique ?")) {
        let history = JSON.parse(localStorage.getItem('dbd_stats')) || [];
        const match = history[index];

        // Si c'est un match hardcore, on nettoie l'état de la saison
        if (match.mode === 'hardcore') {
            const state = getHardcoreState();
            if (match.role === 'killer') state.killerPips -= (match.pips || 0);
            else state.survivorPips -= (match.pips || 0);
            if (match.didDie) {
                const list = match.role === 'killer' ? state.deadKillers : state.deadSurvivors;
                const charIdx = list.indexOf(match.character);
                if (charIdx > -1) list.splice(charIdx, 1);
            }
            localStorage.setItem('dbd_hc_state', JSON.stringify(state));
        }

        history.splice(index, 1);
        localStorage.setItem('dbd_stats', JSON.stringify(history));
        renderHistory();
        renderStats();
        if (document.getElementById('hardcore-view').style.display !== 'none') renderHardcoreUI();
    }
}

function editMatch(index) {
    const history = JSON.parse(localStorage.getItem('dbd_stats')) || [];
    const match = history[index];
    if (!match) return;

    if (match.mode === 'hardcore') {
        showView('hardcore');
        editingMatchIndex = index;
        setHardcoreRole(match.role);
        
        document.getElementById('hc-character').value = match.character;
        document.getElementById('hc-selected-char-name').innerText = match.character;
        document.getElementById('hc-pips-earned').value = match.pips;
        document.getElementById('hc-did-die').checked = match.didDie;
        
        const perkInputs = document.querySelectorAll('.hc-perk-input');
        const perkIcons = document.querySelectorAll('.hc-perk-icon');
        match.perks.forEach((val, i) => {
            if (perkInputs[i]) {
                perkInputs[i].value = val;
                updateImg(perkIcons[i], 'Perks', val);
            }
        });

        if (match.role === 'killer') {
            document.getElementById('hc-kill-addon-1').value = match.equipment[0];
            document.getElementById('hc-kill-addon-2').value = match.equipment[1];
            updateHCKillerAddons();
        } else {
            document.getElementById('hc-surv-item').value = match.equipment[0];
            document.getElementById('hc-surv-addon-1').value = match.equipment[1];
            document.getElementById('hc-surv-addon-2').value = match.equipment[2];
            updateHCSurvivorAddons();
            updateImg(document.getElementById('hc-surv-item-icon'), 'Items', match.equipment[0]);
        }

        // Highlight dans la grille
        document.querySelectorAll('.hc-char-item').forEach(item => {
            if (item.querySelector('img').title === match.character) item.classList.add('selected');
        });
    } else {
        showView('tracker');
        editingMatchIndex = index;
        setRole(match.role);

    document.getElementById('character').value = match.character;
    updateImg(document.getElementById('char-icon'), 'Characters', match.character);
    document.getElementById('bloodpoints').value = match.bloodpoints;

    const perkInputs = document.querySelectorAll('.perk-input');
    const perkIcons = document.querySelectorAll('.perk-icon');
    match.perks.forEach((val, i) => {
        if (perkInputs[i]) {
            perkInputs[i].value = val;
            updateImg(perkIcons[i], 'Perks', val);
        }
    });

    if (match.role === 'killer') {
        document.getElementById('kill-addon-1').value = match.equipment[0];
        document.getElementById('kill-addon-2').value = match.equipment[1];
        document.getElementById('kills').value = match.kills;
        document.getElementById('killer-gens').value = match.gens;
        document.getElementById('killer-gens').nextElementSibling.value = match.gens || 0;
        updateKillerAddons();
    } else {
        document.getElementById('opponent-killer').value = match.opponent;
        updateImg(document.getElementById('opponent-icon'), 'Characters', match.opponent);
        // Gestion de la valeur du select pour legacy ou nouveau format
        const escapedVal = (match.escaped === true ? 'Porte' : (match.escaped === false ? 'Mort' : (match.escaped || 'Mort')));
        document.getElementById('escaped').value = escapedVal;
        document.getElementById('gens-done').value = match.gens || 0;
        document.getElementById('gens-done').nextElementSibling.value = match.gens || 0;
        document.getElementById('surv-item').value = match.equipment[0];
        document.getElementById('surv-addon-1').value = match.equipment[1];
        document.getElementById('surv-addon-2').value = match.equipment[2];
        updateSurvivorAddons();
        updateImg(document.getElementById('surv-item-icon'), 'Items', match.equipment[0]);
    }
    }

    const saveBtn = document.getElementById('save-button');
    if (saveBtn) saveBtn.innerText = "Mettre à jour la partie";
    validateForm();
}

// Initialisation
window.onload = async () => {
    await loadData(); // On attend que les JSON soient chargés pour avoir les bons index
    renderHistory();
    showView('landing');

    // Écouteurs pour les changements dynamiques
    document.getElementById('character').addEventListener('change', (e) => {
        if (currentRole === 'killer') updateKillerAddons();
        updateImg(document.getElementById('char-icon'), 'Characters', e.target.value);
        e.target.blur(); // Masque le texte après sélection
        validateForm();
    });

    document.getElementById('opponent-killer').addEventListener('change', (e) => {
        updateImg(document.getElementById('opponent-icon'), 'Characters', e.target.value);
        e.target.blur(); // Masque le texte après sélection
        validateForm();
    });

    // Validation sur les champs numériques
    ['bloodpoints', 'kills', 'killer-gens'].forEach(id => {
        document.getElementById(id).addEventListener('input', () => {
            validateForm();
        });
    });

    // Validation sur les changements de résultats survivants
    document.getElementById('gens-done').addEventListener('input', validateForm);
    document.getElementById('escaped').addEventListener('change', validateForm);

    // Helper pour afficher toute la liste du datalist au focus (évite le filtrage auto du navigateur)
    const setupDatalistFocusBehavior = (id) => {
        const el = document.getElementById(id);
        let tempValue = '';
        el.addEventListener('focus', (e) => {
            tempValue = e.target.value;
            e.target.value = '';
        });
        el.addEventListener('blur', (e) => {
            if (e.target.value === '') e.target.value = tempValue;
        });
    };

    // Application du comportement aux équipements et add-ons
    ['surv-item', 'surv-addon-1', 'surv-addon-2', 'kill-addon-1', 'kill-addon-2', 'hc-surv-item', 'hc-surv-addon-1', 'hc-surv-addon-2', 'hc-kill-addon-1', 'hc-kill-addon-2'].forEach(setupDatalistFocusBehavior);

    document.getElementById('hc-surv-item').addEventListener('input', (e) => {
        updateHCSurvivorAddons();
        updateImg(document.getElementById('hc-surv-item-icon'), 'Items', e.target.value);
        if (equipmentData.survivorItems.includes(e.target.value) || e.target.value === "None") e.target.blur();
    });

    document.getElementById('hc-surv-addon-1').addEventListener('input', (e) => updateImg(document.getElementById('hc-surv-addon-1-icon'), 'Addons', e.target.value));
    document.getElementById('hc-surv-addon-2').addEventListener('input', (e) => updateImg(document.getElementById('hc-surv-addon-2-icon'), 'Addons', e.target.value));
    document.getElementById('hc-kill-addon-1').addEventListener('input', (e) => updateImg(document.getElementById('hc-kill-addon-1-icon'), 'Addons', e.target.value));
    document.getElementById('hc-kill-addon-2').addEventListener('input', (e) => updateImg(document.getElementById('hc-kill-addon-2-icon'), 'Addons', e.target.value));

    document.getElementById('surv-item').addEventListener('input', (e) => {
        updateSurvivorAddons();
        updateImg(document.getElementById('surv-item-icon'), 'Items', e.target.value);
        // Si l'objet est valide ou "None", on retire le focus pour cacher le texte
        if (equipmentData.survivorItems.includes(e.target.value) || e.target.value === "None") e.target.blur();
    });

    document.getElementById('surv-addon-1').addEventListener('input', (e) => {
        updateImg(document.getElementById('surv-addon-1-icon'), 'Addons', e.target.value);
        const itemType = document.getElementById('surv-item').value;
        const entry = equipmentData.survivorAddons.find(ent => itemType.toLowerCase().includes(ent.itemType.toLowerCase()));
        if ((entry && entry.addons.includes(e.target.value)) || e.target.value === "None") e.target.blur();
    });

    document.getElementById('surv-addon-2').addEventListener('input', (e) => {
        updateImg(document.getElementById('surv-addon-2-icon'), 'Addons', e.target.value);
        const itemType = document.getElementById('surv-item').value;
        const entry = equipmentData.survivorAddons.find(ent => itemType.toLowerCase().includes(ent.itemType.toLowerCase()));
        if ((entry && entry.addons.includes(e.target.value)) || e.target.value === "None") e.target.blur();
    });

    document.getElementById('kill-addon-1').addEventListener('input', (e) => {
        updateImg(document.getElementById('kill-addon-1-icon'), 'Addons', e.target.value);
        const killerName = document.getElementById('character').value;
        const list = equipmentData.killerAddons[killerName];
        if ((list && list.includes(e.target.value)) || e.target.value === "None") e.target.blur();
    });

    document.getElementById('kill-addon-2').addEventListener('input', (e) => {
        updateImg(document.getElementById('kill-addon-2-icon'), 'Addons', e.target.value);
        const killerName = document.getElementById('character').value;
        const list = equipmentData.killerAddons[killerName];
        if ((list && list.includes(e.target.value)) || e.target.value === "None") e.target.blur();
    });

    document.querySelectorAll('#match-form .perk-input, #hc-match-form .hc-perk-input').forEach((input) => {
        const isHC = input.classList.contains('hc-perk-input');
        let tempValue = '';
        input.addEventListener('focus', (e) => {
            tempValue = e.target.value;
            e.target.value = '';
        });
        input.addEventListener('blur', (e) => {
            if (e.target.value === '') e.target.value = tempValue;
        });
        input.addEventListener('input', (e) => {
            const container = isHC ? document.getElementById('hc-match-form') : document.getElementById('match-form');
            const allInputs = Array.from(container.querySelectorAll(isHC ? '.hc-perk-input' : '.perk-input'));
            const idx = allInputs.indexOf(e.target);
            const icon = container.querySelectorAll(isHC ? '.hc-perk-icon' : '.perk-icon')[idx];
            updateImg(icon, 'Perks', e.target.value);
            const list = isHC ? getAvailableHardcorePerks(currentRole, document.getElementById('hc-character').value) : perksData[currentRole];
            if (list && (list.some(p => (p.name || p) === e.target.value) || e.target.value === "None")) e.target.blur();
        });
    });
};

// --- LOGIQUE GAUNTLET ---
function getGauntletState() {
    let state = JSON.parse(localStorage.getItem('dbd_gauntlet_state'));
    if (!state) {
        state = {
            completed: [], // Liste des noms de survivants réussis
            current: null, // Survivant actuellement tiré au sort
            order: []      // File d'attente aléatoire des survivants
        };
        localStorage.setItem('dbd_gauntlet_state', JSON.stringify(state));
    }
    // Migration pour les sauvegardes existantes
    if (state.order === undefined) state.order = [];
    return state;
}

function getGauntletTierInfo(count) {
    // count est le nombre de survivants déjà réussis
    if (count < 10) return { name: "The Warm Up", perks: "4 Perks (1 Unique)", checkpoint: 0 };
    if (count < 20) return { name: "The Thinning", perks: "3 Perks (1 Unique)", checkpoint: 10 };
    if (count < 30) return { name: "The Struggle", perks: "2 Perks (1 Unique)", checkpoint: 20 };
    if (count < 40) return { name: "The Hardcore", perks: "1 Perk (Character Unique)", checkpoint: 30 };
    return { name: "The Legend", perks: "No Perks Allowed", checkpoint: 40 };
}

/**
 * Vérifie si le build respecte les restrictions du Tier actuel du Gauntlet.
 */
function validateGauntletBuild(character, perks, completedCount) {
    const activePerks = perks.filter(p => p && p !== 'None');
    
    // On identifie les perks uniques du survivant joué
    const uniquePerks = (perksData.survivor || [])
        .filter(p => p.owner.toLowerCase().replace(/[^a-z0-9]/g, '') === character.toLowerCase().replace(/[^a-z0-9]/g, ''))
        .map(p => p.name);

    const hasUnique = activePerks.some(p => uniquePerks.includes(p));

    if (completedCount < 10) { // Tier 1: 4 Perks (1 Unique)
        return activePerks.length <= 4 && hasUnique;
    } else if (completedCount < 20) { // Tier 2: 3 Perks (1 Unique)
        return activePerks.length <= 3 && hasUnique;
    } else if (completedCount < 30) { // Tier 3: 2 Perks (1 Unique)
        return activePerks.length <= 2 && hasUnique;
    } else if (completedCount < 40) { // Tier 4: 1 Unique (Seulement sa perk unique)
        return activePerks.length === 1 && hasUnique;
    } else { // Tier 5: No Perks
        return activePerks.length === 0;
    }
}

function renderGauntletUI() {
    const state = getGauntletState();
    const count = state.completed.length;
    const tier = getGauntletTierInfo(count);
    
    document.getElementById('gauntlet-tier-name').innerText = `Tier ${Math.min(5, Math.floor(count / 10) + 1)}: ${tier.name}`;
    document.getElementById('gauntlet-perk-restriction').innerText = `Restriction : ${tier.perks}`;
    document.getElementById('gauntlet-progress-fill').style.width = (count / 52 * 100) + '%';
    document.getElementById('gauntlet-count').innerText = `${count} / 52 Survivants`;
    
    const rollZone = document.getElementById('gauntlet-rolled-char');
    
    if (state.current) {
        rollZone.style.display = 'block';
        document.getElementById('gauntlet-rolled-name').innerText = state.current;
        document.getElementById('gauntlet-instr-name').innerText = state.current;
        
        const icon = document.getElementById('gauntlet-rolled-icon');
        // On retire et on remet la classe pour redéclencher l'animation à chaque changement
        icon.classList.remove('animate-roll');
        void icon.offsetWidth; // Force le reflow (recalcul du style)
        icon.classList.add('animate-roll');

        updateImg(icon, 'Characters', state.current);

        // Affichage des perks uniques du personnage
        const perksContainer = document.getElementById('gauntlet-rolled-perks');
        if (perksContainer) {
            perksContainer.innerHTML = '';
            // On filtre les perks appartenant au survivant actuel
            const charPerks = perksData.survivor.filter(p => 
                p.owner.toLowerCase().replace(/[^a-z0-9]/g, '') === state.current.toLowerCase().replace(/[^a-z0-9]/g, '')
            );
            charPerks.forEach(p => {
                const perkWrapper = document.createElement('div');
                perkWrapper.style.display = 'flex';
                perkWrapper.style.flexDirection = 'column';
                perkWrapper.style.alignItems = 'center';
                perkWrapper.style.width = '110px';

                const slot = document.createElement('div');
                slot.className = 'selection-slot perk-container';
                slot.style.width = '65px';
                slot.style.height = '65px';
                slot.style.margin = '10px 15px';

                const img = document.createElement('img');
                img.src = getIconPath('Perks', p.name);
                img.title = p.name;
                img.className = 'perk-icon';

                const nameLabel = document.createElement('span');
                nameLabel.innerText = p.name;
                nameLabel.style.fontSize = '0.7em';
                nameLabel.style.color = '#aaa';
                nameLabel.style.marginTop = '5px';
                nameLabel.style.textAlign = 'center';

                slot.appendChild(img);
                perkWrapper.appendChild(slot);
                perkWrapper.appendChild(nameLabel);
                perksContainer.appendChild(perkWrapper);
            });
        }
    } else if (state.completed.length < 52) {
        // Si aucun perso n'est en cours et que le défi n'est pas fini, on roll automatiquement
        rollGauntletSurvivor();
    } else {
        rollZone.style.display = 'none';
    }
    
    const list = document.getElementById('gauntlet-completed-list');
    list.innerHTML = '';
    state.completed.forEach(name => {
        const item = document.createElement('div');
        item.className = 'hc-char-item';
        const img = document.createElement('img');
        img.src = getIconPath('Characters', name);
        img.title = name;
        item.appendChild(img);
        list.appendChild(item);
    });
}

function rollGauntletSurvivor() {
    const state = getGauntletState();
    if (state.current) return;

    const all = perksData.survivors;

    // Si la file d'attente est vide, on génère un nouvel ordre aléatoire complet
    if (!state.order || state.order.length === 0) {
        const remaining = all.filter(s => !state.completed.includes(s));
        if (remaining.length === 0) return alert("Félicitations ! Vous avez terminé le Gauntlet !");

        // Mélange de Fisher-Yates pour garantir un aléatoire de qualité
        for (let i = remaining.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
        }
        state.order = remaining;
    }

    // On retire et sélectionne le premier survivant de la file d'attente
    state.current = state.order.shift();
    localStorage.setItem('dbd_gauntlet_state', JSON.stringify(state));
    renderGauntletUI();
}

function recordGauntletResult(win) {
    const state = getGauntletState();
    if (!state.current) return;
    
    if (win) {
        state.completed.push(state.current);
        state.current = null;
        if (state.completed.length === 52) alert("GAUNTLET TERMINÉ ! Vous êtes une légende.");
    } else {
        const tier = getGauntletTierInfo(state.completed.length);
        state.completed = state.completed.slice(0, tier.checkpoint);
        state.current = null;
        state.order = []; // Réinitialise l'ordre pour qu'il soit régénéré au prochain roll
        alert(`Mort ! Progression du tier perdue. Retour au checkpoint : ${tier.checkpoint} survivants.`);
    }
    
    localStorage.setItem('dbd_gauntlet_state', JSON.stringify(state));
    
    // On enchaîne directement sur le tirage du prochain survivant
    if (state.completed.length < 52) {
        rollGauntletSurvivor();
    } else {
        renderGauntletUI();
    }
}