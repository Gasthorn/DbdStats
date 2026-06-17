let perksData = { killer: [], survivor: [], killers: [], survivors: [] };
let equipmentData = { survivorItems: [], survivorAddons: [], killerAddons: {} };
let currentRole = null;
let killerChart = null;
let survivorChart = null;
let roleDistributionChart = null;
let viewedDate = new Date(); // Date de référence pour la heatmap (mois en cours)
let editingMatchIndex = null;

// Mapping des personnages vers leurs dossiers d'icônes spécifiques
// Les clés de cette map doivent correspondre exactement aux noms des personnages tels qu'ils apparaissent dans perksData.killers et perksData.survivors.
const characterFolderMap = {
    "The Unknown": "Applepie",
    "Sable Ward": "Applepie",
    "Ashley J. Williams": "Ash",
    "The Twins": "Aurora",
    "Élodie Rakoto": "Aurora",
    "The Cannibal": "Cannibal",
    "The Lich": "Churros",
    "The Troupe": "Churros",
    "The Trickster": "Comet",
    "Yun-Jin Lee": "Comet",
    "The Shape": "DLC2",
    "Laurie Strode": "DLC2",
    "The Hag": "DLC3",
    "Ace Visconti": "DLC3",
    "The Doctor": "DLC4",
    "Feng Min": "DLC4",
    "The Huntress": "DLC5",
    "David King": "DLC5",
    "Lara Croft": "Donut",
    "The Dracula": "Eclair",
    "Trevor Belmont": "Eclair",
    "The Nemesis": "Eclipse",
    "Jill Valentine": "Eclipse",
    "Leon S. Kennedy": "Eclipse",
    "The Nightmare": "England",
    "Quentin Smith": "England",
    "The Pig": "Finland",
    "Detective David Tapp": "Finland",
    "The Houndmaster": "Gelato",
    "Taurie Cain": "Gelato",
    "The Cenobite": "Gemini",
    "The Clown": "Guam",
    "Kate Denson": "Guam",
    "The Spirit": "Haiti",
    "Adam Francis": "Haiti",
    "Mikaela Reid": "Hubble",
    "The Ghoul": "Icecream",
    "The Artist": "Ion",
    "Jonah Vasquez": "Ion",
    "Orela Rose": "Jerky",
    "The Legion": "Kenya",
    "Jeff Johansen": "Kenya",
    "The Onryō": "Kepler",
    "Yoichi Asakawa": "Kepler",
    "The Animatronic": "Ketchup",
    "William Bill Overbeck": "L4D",
    "Rick Grimes": "Lasagna",
    "Michonne Grimes": "Lasagna",
    "The Plague": "Mali",
    "Jane Romero": "Mali",
    "The Krasue": "Maple",
    "Vee Boonyasak": "Maple",
    "The Dredge": "Meteor",
    "Haddie Kaur": "Meteor",
    "The Ghost Face": "Oman",
    "The Mastermind": "Orion",
    "Ada Wong": "Orion",
    "Rebecca Chambers": "Orion",
    "The First": "Poutine",
    "Dustin Henderson": "Poutine",
    "Eleven": "Poutine",
    "The Demogorgon": "Qatar",
    "Steve Harrington": "Qatar",
    "Nancy Wheeler": "Qatar",
    "The Knight": "Quantum",
    "Vittorio Toscano": "Quantum",
    "Kwon Tae-Young": "Quiche",
    "Kwon Tae-young": "Quiche",
    "Kwon Tae Young": "Quiche",
    "The Skull Merchant": "Saturn",
    "Thalita Lyra": "Saturn",
    "Renato Lyra": "Saturn",
    "The Slasher": "Sushi",
    "The Oni": "Sweden",
    "Yui Kimura": "Sweden",
    "The Deathslinger": "Ukraine",
    "Zarina Kassir": "Ukraine",
    "The Singularity": "Umbra",
    "Gabriel Soma": "Umbra",
    "Nicolas Cage": "Venus",
    "The Executioner": "Wales",
    "Cheryl Mason": "Wales",
    "The Xenomorph": "Wormhole",
    "Ellen Ripley": "Wormhole",
    "The Blight": "Yemen",
    "Felix Richter": "Yemen",
    "The Good Guy": "Yerkes",
    "Alan Wake": "Zodiac"
    // Les personnages sans dossier spécifique dans la liste ci-dessus seront recherchés directement dans "Icons/CharPortraits/"
};

// --- LOGIQUE PERSONNAGES DÉBLOQUÉS ---
const BASE_UNLOCKED = {
    killers: ["The Trapper", "The Wraith", "The Hillbilly", "The Nurse", "The Huntress"],
    survivors: ["Dwight Fairfield", "Meg Thomas", "Claudette Morel", "Jake Park", "Nea Karlsson", "David King", "William Bill Overbeck"]
};

function getUnlockedChars() {
    let unlocked = JSON.parse(localStorage.getItem('dbd_unlocked_chars'));
    if (!unlocked) {
        unlocked = BASE_UNLOCKED;
        localStorage.setItem('dbd_unlocked_chars', JSON.stringify(unlocked));
    }
    return unlocked;
}

function toggleCharUnlock(role, name) {
    let unlocked = getUnlockedChars();
    const list = unlocked[role];
    const idx = list.indexOf(name);
    if (idx > -1) list.splice(idx, 1);
    else list.push(name);
    localStorage.setItem('dbd_unlocked_chars', JSON.stringify(unlocked));
    renderUnlockedChars();
}

function unlockAllChars() {
    const unlocked = {
        killers: [...perksData.killers],
        survivors: [...perksData.survivors]
    };
    localStorage.setItem('dbd_unlocked_chars', JSON.stringify(unlocked));
    renderUnlockedChars();
}

function resetCharsToDefault() {
    if (confirm("Voulez-vous réinitialiser votre liste aux personnages gratuits de base ?")) {
        localStorage.removeItem('dbd_unlocked_chars');
        renderUnlockedChars();
    }
}

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

function resetHardcoreMode() {
    if (confirm("Voulez-vous réinitialiser votre progression Hardcore pour cette saison (Pips et personnages morts) ?")) {
        localStorage.removeItem('dbd_hc_state');
        renderHardcoreUI();
        resetHardcoreUI();
    }
}

function getAvailableHardcorePerks(role, selectedChar) {
    const state = getHardcoreState();
    const unlocked = getUnlockedChars();
    const roleKey = role === 'killer' ? 'killers' : 'survivors';
    const deadChars = role === 'killer' ? state.deadKillers : state.deadSurvivors;
    const allPerks = perksData[role] || [];
    
    return allPerks.filter(perk => {
        // La perk doit appartenir à un personnage débloqué ou être du Base Kit
        const isUnlocked = perk.owner === "Base Kit" || (unlocked[roleKey] && unlocked[roleKey].includes(perk.owner));
        
        // On autorise quand même la perk si c'est celle du perso sélectionné (cas particulier)
        if (!isUnlocked && perk.owner !== selectedChar) return false;

        if (perk.owner === "Base Kit") return true;
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
    document.getElementById('hc-bp').value = '';
    document.getElementById('hc-killer-stats').style.display = role === 'killer' ? 'flex' : 'none';
    document.getElementById('hc-survivor-stats').style.display = role === 'survivor' ? 'block' : 'none';
    
    if (role === 'survivor') {
        const opponentSelect = document.getElementById('hc-opponent-killer');
        opponentSelect.innerHTML = '<option value="None">None</option>';
        perksData.killers.forEach(k => {
            let opt = document.createElement('option'); opt.value = k; opt.innerHTML = k;
            opponentSelect.appendChild(opt);
        });
        updateImg(document.getElementById('hc-opponent-icon'), 'Characters', opponentSelect.value);
        document.getElementById('hc-gens-done').value = 0;
        document.getElementById('hc-gens-done').nextElementSibling.value = 0;
        ['hc-surv-item', 'hc-surv-addon-1', 'hc-surv-addon-2'].forEach(id => document.getElementById(id).value = 'None');
        ['hc-surv-item-icon', 'hc-surv-addon-1-icon', 'hc-surv-addon-2-icon'].forEach(id => updateImg(document.getElementById(id), id.includes('addon') ? 'Addons' : 'Items', 'None'));
    } else {
        document.getElementById('hc-killer-gens').value = 0;
        document.getElementById('hc-killer-gens').nextElementSibling.value = 0;
        ['hc-kill-addon-1', 'hc-kill-addon-2'].forEach(id => document.getElementById(id).value = 'None');
        ['hc-kill-addon-1-icon', 'hc-kill-addon-2-icon'].forEach(id => updateImg(document.getElementById(id), 'Addons', 'None'));
    }
    updateHCPerksDatalist();
    document.getElementById('hc-survivor-equipment-fields').style.display = role === 'survivor' ? 'flex' : 'none';
    document.getElementById('hc-killer-equipment-fields').style.display = role === 'killer' ? 'flex' : 'none';

    // Mise à jour visuelle des boutons de rôle
    document.querySelectorAll('#hc-role-selection button').forEach(btn => btn.classList.remove('active-role'));
    const btnIdx = role === 'killer' ? 0 : 1;
    document.querySelectorAll('#hc-role-selection button')[btnIdx].classList.add('active-role');
    document.getElementById('hc-form-title').innerText = `Nouveau Match : ${role === 'killer' ? 'Tueur' : 'Survivant'}`;

    renderBuildsList();

    const unlocked = getUnlockedChars()[role === 'killer' ? 'killers' : 'survivors'];
    const characters = (perksData[role === 'killer' ? 'killers' : 'survivors'] || []).filter(c => unlocked.includes(c));
    const deadList = role === 'killer' ? state.deadKillers : state.deadSurvivors;
    
    const editingMatch = editingMatchIndex !== null ? history[editingMatchIndex] : null;

    characters.forEach(char => {
        const item = document.createElement('div');
        item.className = 'hc-char-item';
        // Si le perso est mort mais n'est pas celui du match qu'on modifie actuellement
        if (deadList.includes(char) && (!editingMatch || editingMatch.character !== char)) {
            item.classList.add('blocked-char');
            item.style.pointerEvents = 'none'; // Désactive le clic seulement en mode Hardcore
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

function resetHardcoreUI() {
    document.getElementById('hc-role-selection').style.display = 'block';
    document.getElementById('hc-match-form').style.display = 'none';
    document.querySelectorAll('#hc-role-selection button').forEach(btn => btn.classList.remove('active-role'));
    document.getElementById('hc-character').value = '';
    editingMatchIndex = null;
}

function selectHardcoreChar(name, element) {
    document.querySelectorAll('.hc-char-item').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');
    document.getElementById('hc-character').value = name;
    document.getElementById('hc-selected-char-name').innerText = name;
    updateHCPerksDatalist();
    updateHCUniquePerksDatalist();
    if (currentRole === 'killer') updateHCKillerAddons();
}

function updateHCKillerAddons() {
    const killerName = document.getElementById('hc-character').value;
    const addons = equipmentData.killerAddons[killerName] || [];
    updateDatalist('hc-kill-addons-options', addons);
    updateImg(document.getElementById('hc-kill-addon-1-icon'), 'Addons', document.getElementById('hc-kill-addon-1').value, killerName);
    updateImg(document.getElementById('hc-kill-addon-2-icon'), 'Addons', document.getElementById('hc-kill-addon-2').value, killerName);
}

function updateHCSurvivorAddons() {
    const itemType = document.getElementById('hc-surv-item').value;
    const itemEntry = equipmentData.survivorAddons.find(entry => itemType.toLowerCase().includes(entry.itemType.toLowerCase()));
    const addons = itemEntry ? itemEntry.addons : [];
    updateDatalist('hc-surv-addons-options', addons);
    updateImg(document.getElementById('hc-surv-addon-1-icon'), 'Addons', document.getElementById('hc-surv-addon-1').value);
    updateImg(document.getElementById('hc-surv-addon-2-icon'), 'Addons', document.getElementById('hc-surv-addon-2').value);
}

function updateHCUniquePerksDatalist() {
    const char = document.getElementById('hc-character').value;
    if (!char) return;
    const rolePerks = currentRole === 'killer' ? perksData.killer : perksData.survivor;
    const charPerks = rolePerks.filter(p => 
        p.owner.toLowerCase().replace(/[^a-z0-9]/g, '') === char.toLowerCase().replace(/[^a-z0-9]/g, '')
    );
    const uniqueDatalist = document.getElementById('hc-unique-perks-options');
    uniqueDatalist.innerHTML = '';
    charPerks.forEach(p => {
        let opt = document.createElement('option');
        opt.value = p.name;
        uniqueDatalist.appendChild(opt);
    });
}

function saveHardcoreMatch() {
    const state = getHardcoreState();
    const char = document.getElementById('hc-character').value;
    const pips = parseInt(document.getElementById('hc-pips-earned').value);
    const didDie = document.getElementById('hc-did-die').checked;

    if (!char) return alert("Veuillez sélectionner un personnage !");
    
    const bp = document.getElementById('hc-bp').value || 0;
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
        bloodpoints: bp,
        opponent: currentRole === 'survivor' ? document.getElementById('hc-opponent-killer').value : null,
        gens: currentRole === 'killer' ? document.getElementById('hc-killer-gens').value : document.getElementById('hc-gens-done').value,
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
    resetHardcoreUI();
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

function getIconPath(category, name, manualOwner = null) {
    if (!name || name === "None") {
        // Gestion des dossiers spécifiques pour les icônes vides
        let folder = category;
        if (category === 'Characters') folder = 'CharPortraits';
        if (category === 'Addons') folder = 'ItemAddons';
        return `Icons/${folder}/empty.png`;
    }

    const normalizeForCharacters = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, '');
    const normalizeForPerks = (str) => {
        // Remove accents
        let normalized = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        // Remove non-alphanumeric characters, but keep spaces for PascalCase conversion
        normalized = normalized.replace(/[^a-zA-Z0-9\s]/g, '');
        // Convert to PascalCase and handle casing (e.g., "vigil" -> "Vigil", "ACE IN THE HOLE" -> "AceInTheHole")
        normalized = normalized.split(' ')
            .filter(word => word.length > 0)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join('');
        return normalized;
    };

    // Helper pour trouver les infos de dossier et préfixe (pour Maple, Poutine, Quiche)
    const getFolderInfo = (ownerName, currentCategory) => {
        if (!ownerName || ownerName === "Base Kit") return { path: "", prefix: "" };
        let folder = characterFolderMap[ownerName];

        // Exception : Kate Denson utilise le dossier "Kate" pour ses perks, mais "Guam" pour son portrait
        if (currentCategory === 'Perks' && ownerName === "Kate Denson") {
            folder = "Kate";
        }

        // Exception pour Le Cannibale : ses accessoires sont majoritairement à la racine, sauf quelques exceptions
        if (currentCategory === 'Addons' && ownerName === "The Cannibal") {
            folder = null;
        }

        if (!folder) return { path: "", prefix: "" };

        const path = `${folder}/`;
        let prefix = '';
        
        // Dossiers utilisant T_UI_ pour TOUS leurs assets (Portraits, Perks, Addons)
        const uiPrefixAllFolders = ['Maple', 'Poutine', 'Quiche', 'Sushi'];

        // Dossiers utilisant T_UI_ pour les Perks et les Addons (mais pas les Portraits)
        const uiPrefixPerksAndAddonsFolders = ['Gelato', 'Icecream', 'Ketchup'];

        // Dossiers utilisant T_UI_ UNIQUEMENT pour les Perks
        const uiPrefixPerksOnlyFolders = ['Jerky', 'Lasagna'];

        if (uiPrefixAllFolders.includes(folder)) {
            prefix = 'T_UI_';
        } else if (uiPrefixPerksAndAddonsFolders.includes(folder) && (currentCategory === 'Perks' || currentCategory === 'Addons')) {
            prefix = 'T_UI_';
        } else if (uiPrefixPerksOnlyFolders.includes(folder) && currentCategory === 'Perks') {
            prefix = 'T_UI_';
        } else if (folder === 'Ion' && currentCategory === 'Perks') {
            prefix = 'T_';
        }

        return { path, prefix };
    };

    if (category === 'Characters') {
        let charTypePrefix = '';
        let charId = '';

        // Exception pour certains noms de fichiers de portraits
        let fileNamePart = name;
        if (name === "The Good Guy") fileNamePart = "The Yerkes";

        // Récupère le nom du dossier spécifique pour le personnage. Si non trouvé, le personnage est à la racine de CharPortraits.
        const { path, prefix } = getFolderInfo(name, category);
        const baseCharPath = `Icons/CharPortraits/${path}`;

        // Recherche dans les tueurs
        let index = perksData.killers.indexOf(name);
        if (index !== -1) {
            charTypePrefix = 'K';
            charId = String(index + 1).padStart(2, '0');
            return `${baseCharPath}${prefix}${charTypePrefix}${charId}_${normalizeForCharacters(fileNamePart)}_Portrait.png`;
        }
        
        // Recherche dans les survivants
        index = perksData.survivors.indexOf(name);
        if (index !== -1) {
            charTypePrefix = 'S';
            charId = String(index + 1).padStart(2, '0');
            return `${baseCharPath}${prefix}${charTypePrefix}${charId}_${normalizeForCharacters(fileNamePart)}_Portrait.png`;
        }
        // Fallback si le personnage n'est trouvé ni dans les tueurs ni dans les survivants (ex: personnage custom non listé)
        // ou si le nom n'est pas dans characterFolderMap et n'est pas un personnage standard.
        return `Icons/CharPortraits/empty.png`; // Chemin par défaut pour les icônes de personnages vides/inconnus
    } else if (category === 'Perks') {
        // Mappings pour les perks dérivées (utilisent l'icône d'une autre perk)
        const derivativeMapping = {
            "Bound By Obsession": "Object of Obsession",
            "Bound by Obsession": "Object of Obsession",
            "Down To The Last": "Sole Survivor",
            "Will to Live": "Decisive Strike",
            "Hex: Fortune's Fool": "Hex: Plaything",
            "Keep Them Waiting": "Save the Best for Last",
            "No Holds Barred": "Deadlock",
            "Scourge Hook: Weeping Wounds": "Scourge Hook: Gift of Pain",
            "See How They Run": "Play With Your Food",
            "Cull the Weak": "Dying Light",
            "Cull of the Weak": "Dying Light"
        };
        const searchName = derivativeMapping[name.trim()] || name.trim();

        // Trouver le propriétaire de la perk pour déterminer le dossier
        const allPerks = [...(perksData.killer || []), ...(perksData.survivor || [])];
        const perk = allPerks.find(p => p.name.toLowerCase() === searchName.toLowerCase());
        let officialName = perk ? perk.name : searchName;

        // Table de correspondance pour les noms de fichiers d'icônes capricieux
        const perkNameMapping = {
            "Boon: Dark Theory": "Dark Theory",
            "Boon: Illumination": "Illumination",
            "Quick Gambit": "Vittorios Gambit",
            "Awakened Awareness": "Awakened Awarenesss",
            "Barbecue & Chilli": "BBQAndChili",
            "Cruel Limits": "CruelConfinement",
            "Darkness Revealed": "DarknessRevelated",
            "Dead Man's Switch": "DeadManSwitch",
            "Franklin's Demise": "FranklinsLoss",
            "Hex: Devour Hope": "DevourHope",
            "Hex: Ruin": "Ruin",
            "Hex: Thrill of the Hunt": "ThrillOfTheHunt",
            "Hex: Haunted Ground": "HauntedGround",
            "Hex: Huntress Lullaby": "HuntressLullaby",
            "Hex: No One Escapes Death": "NoOneEscapesDeath",
            "Hex: Nothing but Misery": "NothingButMisery",
            "Hex: Scared to Death": "ScaredToDeath",
            "Hex: The Third Seal": "TheThirdSeal",
            "Hex: Two Can Play": "twoCanPlay",
            "Machine Learning": "SelfAware",
            "Overcharge": "GeneratorOvercharge",
            "Rancor": "Hatred",
            "Scourge Hook: Floods of Rage": "FloodOfRage",
            "Scourge Hook: Hangman's Trick": "HangmansTrick",
            "Scourge Hook: Monstrous Shrine": "MonstrousShrine",
            "Scourge Hook: Pain Resonance": "PainResonance",
            "Thanatophobia": "Thatanophobia",
            "Shattered Hope": "BoonDestroyer"
        };

        if (perkNameMapping[officialName]) {
            officialName = perkNameMapping[officialName];
        }

        let owner = perk ? perk.owner : null;
        // Exceptions pour les perks "Base Kit" situées dans des dossiers de DLC
        if (searchName === "Shattered Hope") owner = "The Dredge";
        if (searchName === "Hex: Thrill of the Hunt") owner = "The Hag";

        const { path, prefix } = getFolderInfo(owner, category);

        // Liste des personnages utilisant "iconsPerks" au lieu de "iconPerks"
        const specialPrefixOwners = [
            "Sable Ward", "Taurie Cain", "Orela Rose", "Dustin Henderson",
            "Eleven", "The First", "Kwon Tae-young", "Kwon Tae-Young",
            "Kwon Tae Young", "Alan Wake", "The Slasher"
        ];

        const perkFilePrefix = specialPrefixOwners.includes(owner) ? 'iconsPerks_' : 'iconPerks_';
        
        let perkFileName = normalizeForPerks(officialName);

        // Forçage du nom de fichier pour les cas où la normalisation PascalCase casserait le nom
        if (officialName === "Self-Preservation" || officialName === "twoCanPlay") {
            perkFileName = officialName;
        }

        return `Icons/Perks/${path}${prefix}${perkFilePrefix}${perkFileName}.png`;
    } else if (category === 'Addons') {
        const survivorAddonMapping = {
            "Low Amp Filament": "threadedFilament",
            "Unique Wedding Ring": "uniqueRing",
            "Rubber Gloves": "gloves",
            "Medical Scissors": "scissors",
            "Needle and Thread": "needAndThread",
            "Gauze Roll": "gauseRoll",
            "Anti-Exhaustion Syringe": "syringe",
            "Wire Spool": "spoolOfWire",
            "Hacksaw": "metalSaw",
            // Exceptions dossier Lasagna (TWD)
            "Friendship Charm": "Lasagna/T_UI_iconIAddon_FriendshipCharm",
            "Shrill Whistle": "Lasagna/T_UI_iconAddon_ShrillWhistle",
            "Braided Bauble": "Lasagna/T_UI_iconAddon_BraidedBauble",
            "Glowing Ink": "Lasagna/T_UI_iconAddon_GlowingInk",
            "Gnarled Compass": "Lasagna/T_UI_iconAddon_GnarledCompass",
            "Battered Tape": "Lasagna/T_UI_iconAddon_BatteredTape",
            "Sharpened Flint": "Lasagna/T_UI_iconAddon_SharpenedFlint",
            "Crimson Stamp": "Lasagna/T_UI_iconAddon_CrimsonStamp",
            "Volcanic Stone": "Lasagna/T_UI_iconAddon_volcanicStone",
            "Reactive Compound": "Lasagna/T_UI_iconAddon_reactiveCompound",
            "Oily Sap": "Lasagna/T_UI_iconAddon_oilySap",
            "Mushroom Formula": "Lasagna/T_UI_iconAddon_mushroomFormula",
            "Potent Extract": "Lasagna/T_UI_iconAddon_potentExtract"
        };

        if (survivorAddonMapping[name]) {
            const mapped = survivorAddonMapping[name];
            return `Icons/ItemAddons/${mapped.includes('/') ? mapped : 'iconAddon_' + mapped}.png`;
        }

        // Déterminer le tueur propriétaire de l'accessoire (priorité au propriétaire sélectionné)
        let ownerKiller = (manualOwner && equipmentData.killerAddons[manualOwner]) ? manualOwner : null;

        if (!ownerKiller) {
            for (const k in equipmentData.killerAddons) {
                if (equipmentData.killerAddons[k].includes(name)) {
                    ownerKiller = k;
                    break;
                }
            }
        }

        if (ownerKiller) {
            // Addons de tueurs dans ItemAddons/[RepoName]/
            const { path, prefix } = getFolderInfo(ownerKiller, category, name);
            const killerAddonMapping = {
                // The Trapper Addons
                "4-Coil Spring Kit": "coilsKit4",
                "Coffee Grounds": "coffeeGrinds",
                "Iridescent Stone": "diamondStone",

                // The Wraith Addons
                "The Beast - Soot": "sootTheBeast",
                "The Ghost - Soot": "sootTheGhost",
                "The Hound - Soot": "sootTheHound",
                "The Serpent - Soot": "sootTheSerpent",
                "Blind Warrior - Mud": "mudBaikraKaeug",
                "Blink - Mud": "mudBlink",
                "Swift Hunt - Mud": "mudSwiftHunt",
                "Windstorm - Mud": "mudWindstorm",
                "Blind Warrior - White": "whiteBlindWarrior",
                "Blink - White": "whiteBlink",
                "Shadow Dance - White": "whiteShadowDance",
                "Swift Hunt - White": "whiteKuntinTakkho",
                "Windstorm - White": "whiteWindstorm",
                "All Seeing - Blood": "bloodKraFabai",
                "Shadow Dance - Blood": "bloodShadowDance",
                "Swift Hunt - Blood": "bloodSwiftHunt",
                "Windstorm - Blood": "bloodWindstorm",
                "All Seeing - Spirit": "spiritAllSeeing",

                //The HillBilly
                "Counterweight": "Zodiac/iconAddon_counterweight",
                "Cracked Primer Bulb": "Zodiac/iconAddon_crackedPrimerBulb",
                "Discarded Air Filter": "Zodiac/iconAddon_discardedAirFilter",
                "Steel Toe Boots": "Xipre/iconAddon_steelToeBoots",
                "Clogged Intake": "Zodiac/iconAddon_cloggedIntake",
                "Greased Throttle": "Zodiac/iconAddon_greasedThrottle",
                "High-Speed Idler Screw": "Zodiac/iconAddon_highSpeedIdlerScrew",
                "Off-Brand Motor Oil": "Xipre/iconAddon_offBrandMotorOil",
                "Thermal Casing": "Zodiac/iconAddon_thermalCasing",
                "Begrimed Chains": "iconAddon_chainsBloody",
                "Dad's Boots": "Xipre/iconAddon_dadsBoots",
                "Low Kickback Chains": "Xipre/iconAddon_lowKickbackChains",
                "Ragged Engine": "Zodiac/iconAddon_raggedEngine",
                "Apex Muffler": "Xipre/iconAddon_apexMuffler",
                "Filthy Slippers": "Zodiac/iconAddon_filthySlippers",
                "LoPro Chains": "Xipre/iconAddon_lowProChains",
                "Iridescent Engravings": "Zodiac/iconAddon_iridescentEngravings",
                "Tuned Carburettor": "Xipre/iconAddon_tunedCarburetor",

                //The Nurse
                "Catatonic Boy's Treasure": "catatonicTreasure",

                //The Shape
                "Blond Hair": "blondeHair",
                "Fragrant Tuft of Hair": "tuftOfHair",
                "Jewellery": "jewelry",
                "Jewellery Box": "jewelryBox",

                //The Hag
                "Grandma's Heart": "granmasHeart",

                //The Doctor
                "Mouldy Electrode": "moldyElectrode",
                "Discipline - Class II": "diciplineClassII",
                "Discipline - Class III": "diciplineClassIII",
                "Discipline - Carter's Notes": "diciplineCartersNotes",

                // The Cannibal 
                "Award-winning Chilli": "Cannibal/iconAddon_awardWinningChili",
                "Chilli": "Cannibal/iconAddon_Chili",
                "Iridescent Flesh": "Cannibal/iconAddon_IridescentFlesh",
                "Knife Scratches": "Cannibal/iconAddon_KnifeScratches",
                "The Beast's Marks": "Cannibal/iconAddon_theBeastsMark",
                "The Grease": "Cannibal/iconAddon_TheGrease",
                "Grisly Chains": "chainsGrisly",
                "Rusted Chains": "chainsRusted",
                "Carburettor Tuning Guide": "carburetorTuningGuide",
                "Begrimed Chains": "chainsBloody",

                //The Pig
                "Razor Wires": "razerWire",
                "Rules Set No.2": "rulesSetN2",

                //The Clown
                "Sulphuric Acid Vial" : "sulfuricAcidVial",
                "Ether 15 Vol%": "ether15",
                "RedHead's Pinkie Finger": "redheadsPinkyFinger",

                //The Spirit
                "Muddy Sports Day Cap": "muddySportCap",
                "Mother's Glasses": "Hubble/iconAddon_mothersGlasses",
                "Senko Hanabi": "Hubble/iconAddon_senkoHanabi",
                "Uchiwa": "Hubble/iconAddon_uchiwa",
                "Furin": "Hubble/iconAddon_furin",
                "Kintsugi Teacup": "Hubble/iconAddon_kintsugiTeacup",

                //The Legion
                "Smiley Face Pin": "smileyFaceButton",
                "Defaced Smiley Pin": "defacedSmileyButton",
                "Stylish Sunglasses": "nastyBlade",
                "Susie's Mix Tape": "suziesMixtape",
                "The Legion Pin": "theLegionButton",
                "BFFs": "coldDirt",

                //The Plague
                "Blessed Apple": "prayerApple",
                "Haematite Seal": "hematiteSeal",

                //The Ghost Face
                "Cinch Straps": "reusuableCinchStraps",
                "Night Vision Monocular": "nightvisionMoncular",
                "Ghost Face Caught on Tape": "caughtOnTape",

                //The Oni
                "Renjiro's Bloody Glove": "renirosBloodyGlove",

                //The Deathslinger
                "Gold Creek Whiskey": "clearCreekWhiskey",

                //The Executioner
                "Misty Day, Remains of Judgement": "mistyDay",
                "Iridescent Seal of Metatron": "iridescentSeal",

                //The Trickster
                "Inferno Wires": "Comet/icons_Addon_InfernoWires",
                "Killing Part Chords": "Comet/icons_Addon_KillingPartChords",
                "Memento Blades": "Comet/icons_Addon_MementoBlades",
                "Trick Pouch": "Comet/icons_Addon_TrickPouch",
                "Bloody Boa": "Comet/icons_Addon_BloodyBoa",
                "Caged Heart Shoes": "Comet/icons_Addon_CagedHeartShoes",
                "Ji-Woon's Autograph": "Comet/icons_Addon_JiWoonsAutograph",
                "Lucky Blade": "Comet/icons_Addon_LuckyBlade",
                "Tequila Moonrock": "Comet/icons_Addon_TequilaMoonrock",
                "Fizz-Spin Soda": "Comet/icons_Addon_FizzSpinSoda",
                "Melodious Murder": "Comet/icons_Addon_YumisMurder",
                "On Target Single": "Comet/icons_Addon_OnTargetSingle",
                "Ripper Brace": "Comet/icons_Addon_RipperBrace",
                "Waiting For You Watch": "Comet/icons_Addon_WaitingForYouWatch",
                "Cut Thru U Single": "Comet/icons_Addon_CutThruUSingle",
                "Diamond Cufflinks": "Comet/icons_Addon_DiamondCufflinks",
                "Edge of Revival Album": "Comet/icons_Addon_EdgeOfRevivalAlbum",
                "Trick Blades": "Comet/icons_Addon_TrickBlades",
                "Death Throes Compilation": "Comet/icons_Addon_DeathThroesCompilation",
                "Iridescent Photocard": "Comet/icons_Addon_IridescentPhotocard",

                //The Nemesis
                "Jill's Sandwich": "jillSandwich",

                //The Artist
                "Matias' Baby Shoes": "JacobsBabyShoes",

                //The Onryo
                "Videotape Copy": "VhsCopy",
                "Distorted Photo": "DisortedPhoto",
                "Iridescent Videotape": "IridescentVHStape",

                //The Dredge
                "Air Freshener": "AirFreshner",
                
                //The Mastermind
                "Maiden Medallion": "maidenMedalliom",
                "Uroboros Virus": "lasPlagasVariant",

                //The Knight
                "Town Watch's Torch": "TownWatctTorch",
                "Sharpened Mount": "Donut/iconAddon_SharpenedMount",
                "Jailer's Chimes": "Donut/iconAddon_JailersChimes",

                //The Skullmerchant
                "Adi Valente Issue 1": "AdiValente1",
                "Ultrasonic Speaker": "UltrasonicTrapSpeaker",
                "Supercharge": "overcharge",
                "Infrared Upgrade": "infaredUpgrade",
                "Randomised Strobes": "RandomizedStrobes",

                //The Singularity
                "Foreign Plant Fibres": "foreignPlantFibers",
                "Iridescent Crystal Shard": "iridiscentCrystalShard",

                //The Good Guy
                "Hair Spray and Candle": "flamingHairSpray",

                //The Unknown
                "B-Movie Poster": "B-MoviePoster",

                //The Lich
                "Vorpal Sword": "SwordOfKass",

                //The Dracula
                "Traveller's Hat": "TravelersHat",

                //The Ghoul
                "Kaneki's Satchel": "satchel",
                "Torture Apparatus": "medicalApparatus",
                
                //The Animatronic
                "Foxy's Hook": "foxyHook",
                
                //The Krasue
                "Spattered Handkerchief": "SpottedHandkerchief",
                "Mysterious Elixir": "IridescentElixir",


                //The First
                "Mid-Century Radio": "Mid-CenturyRadio",
                
            };

            const fileName = killerAddonMapping[name] || normalizeForPerks(name);
            if (fileName.includes('/')) return `Icons/ItemAddons/${fileName}.png`;
            if (fileName.startsWith('iconAddon_')) return `Icons/ItemAddons/${path}${prefix}${fileName}.png`;
            return `Icons/ItemAddons/${path}${prefix}iconAddon_${fileName}.png`;
        }
        // Addons de survivants (ou fallback) dans le dossier Addons standard
        return `Icons/ItemAddons/iconAddon_${normalizeForPerks(name)}.png`;
    } else if (category === 'Items') {
        if (name === "Fog Vial") {
            return `Icons/Items/T_UI_iconItems_apprenticesFogVial.png`;
        }
        return `Icons/Items/iconItems_${normalizeForPerks(name)}.png`;
    }
    return `Icons/${category}/empty.png`;
}

function renderUnlockedChars() {
    const container = document.getElementById('unlocked-chars-content');
    if (!container) return;
    container.innerHTML = '';

    const unlocked = getUnlockedChars();
    const roles = [
        { title: 'Tueurs', key: 'killers', data: perksData.killers },
        { title: 'Survivants', key: 'survivors', data: perksData.survivors }
    ];

    roles.forEach(role => {
        const h3 = document.createElement('h3');
        h3.innerText = role.title;
        container.appendChild(h3);

        const grid = document.createElement('div');
        grid.className = 'hc-grid';
        grid.style.maxHeight = 'none';

        role.data.forEach(name => {
            const isUnlocked = unlocked[role.key].includes(name);
            const item = document.createElement('div');
            item.className = 'hc-char-item';
            if (!isUnlocked) item.classList.add('blocked-char');
            item.onclick = () => toggleCharUnlock(role.key, name);

            const img = document.createElement('img');
            img.src = getIconPath('Characters', name);
            img.title = name;

            item.appendChild(img);
            grid.appendChild(item);
        });
        container.appendChild(grid);
    });
}

function getKillerAddonRarityClass(index) {
    if (index < 0) return '';
    if (index < 4) return 'rarity-common';     // 4 addons
    if (index < 9) return 'rarity-uncommon';   // 5 addons
    if (index < 14) return 'rarity-rare';      // 5 addons
    if (index < 18) return 'rarity-veryrare';  // 4 addons
    return 'rarity-iridescent';                // 2 addons
}

function updateImg(img, category, name, owner = null) {
    img.src = getIconPath(category, name, owner);
    img.style.display = 'inline-block';

    // Gestion de la bordure de rareté pour les addons de tueurs
    const parent = img.parentElement;
    if (parent && parent.classList.contains('selection-slot')) {
        // Nettoyage des classes de rareté précédentes
        parent.classList.remove('rarity-common', 'rarity-uncommon', 'rarity-rare', 'rarity-veryrare', 'rarity-iridescent');
        
        if (category === 'Addons' && owner && equipmentData.killerAddons[owner]) {
            const index = equipmentData.killerAddons[owner].indexOf(name);
            const rarityClass = getKillerAddonRarityClass(index);
            if (rarityClass) parent.classList.add(rarityClass);
        }
    }

    img.onerror = () => { // Le chemin de fallback doit aussi être mis à jour
        let folder = category;
        if (category === 'Characters') folder = 'CharPortraits';
        if (category === 'Addons') folder = 'ItemAddons';
        img.src = `Icons/${folder}/empty.png`;
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
    const unlockedChars = getUnlockedChars()[role === 'killer' ? 'killers' : 'survivors'];
    const characters = (perksData[role === 'killer' ? 'killers' : 'survivors'] || []).filter(c => unlockedChars.includes(c));
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
    const unlockedData = getUnlockedChars();
    const roleKey = role === 'killer' ? 'killers' : 'survivors';

    if (perksData && perksData[role]) {
        perksData[role].forEach(perkObj => {
            if (perkObj.owner === "Base Kit" || (unlockedData[roleKey] && unlockedData[roleKey].includes(perkObj.owner))) {
                let opt = document.createElement('option');
                opt.value = perkObj.name;
                datalist.appendChild(opt);
            }
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
    updateImg(document.getElementById('kill-addon-1-icon'), 'Addons', document.getElementById('kill-addon-1').value, killerName);
    updateImg(document.getElementById('kill-addon-2-icon'), 'Addons', document.getElementById('kill-addon-2').value, killerName);
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
    document.getElementById('ignore-gauntlet').checked = false;
    
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
        // Masquer le bouton de navigation correspondant à la page actuelle pour éviter la redondance
        mainNav.querySelectorAll('button').forEach(btn => {
            if (btn.getAttribute('onclick').includes(`'${viewId}'`)) {
                btn.style.display = 'none';
            } else {
                btn.style.display = 'inline-block';
            }
        });
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
        resetHardcoreUI();
        renderHardcoreUI();
    } else if (viewId === 'unlocked-chars') {
        renderUnlockedChars();
    } else if (viewId === 'icons-index') {
        renderIconsIndex();
    }
}

function renderIconsIndex() {
    const container = document.getElementById('icons-index-content');
    if (!container) return;
    container.innerHTML = '';

    const sections = [
        { title: 'Portraits : Tueurs', category: 'Characters', items: perksData.killers },
        { title: 'Portraits : Survivants', category: 'Characters', items: perksData.survivors },
        { title: 'Compétences : Tueurs', category: 'Perks', items: perksData.killer.map(p => p.name) },
        { title: 'Compétences : Survivants', category: 'Perks', items: perksData.survivor.map(p => p.name) },
        { title: 'Objets', category: 'Items', items: equipmentData.survivorItems }
    ];

    // Addons Survivants par type d'item
    if (equipmentData.survivorAddons) {
        equipmentData.survivorAddons.forEach(group => {
            sections.push({
                title: `Addons : ${group.itemType}`,
                category: 'Addons',
                items: group.addons
            });
        });
    }

    // Addons Tueurs par tueur
    for (const killer in equipmentData.killerAddons) {
        sections.push({ title: `Addons : ${killer}`, category: 'Addons', items: equipmentData.killerAddons[killer], owner: killer });
    }

    sections.forEach(sec => {
        const h3 = document.createElement('h3');
        h3.innerText = sec.title;
        h3.style.marginTop = "40px";
        container.appendChild(h3);

        const grid = document.createElement('div');
        grid.className = 'hc-grid';
        grid.style.maxHeight = 'none'; // Pour tout voir sur une seule page

        sec.items.forEach(name => {
            const wrapper = document.createElement('div');
            wrapper.className = sec.category === 'Characters' ? 'hc-char-item' : 'selection-slot';
            if (sec.category === 'Perks') wrapper.classList.add('perk-container');
            wrapper.title = name;
            
            const img = document.createElement('img');
            if (sec.category === 'Perks') img.className = 'perk-icon';
            
            wrapper.appendChild(img);
            updateImg(img, sec.category, name, sec.owner);
            grid.appendChild(wrapper);
        });
        container.appendChild(grid);
    });
}

function saveBuild() {
    const isHC = document.getElementById('hardcore-view').style.display !== 'none';
    const isGauntlet = document.getElementById('gauntlet-view').style.display !== 'none';
    const prefix = isHC ? 'hc-' : (isGauntlet ? 'gauntlet-' : '');
    const name = document.getElementById(prefix + 'build-name').value;
    if (!name) return alert("Veuillez donner un nom à votre build.");

    const role = isGauntlet ? getGauntletState().activeRole : currentRole;

    let character;
    if (isGauntlet) {
        character = getGauntletState()[role].current;
    } else {
        character = document.getElementById(isHC ? 'hc-character' : 'character').value;
    }

    let perkSelector;
    if (isHC) perkSelector = '.hc-perk-input';
    else if (isGauntlet) perkSelector = '.gauntlet-perk-input';
    else perkSelector = '#match-form .perk-input';

    const build = {
        role: role,
        character: character,
        perks: Array.from(document.querySelectorAll(perkSelector)).map(input => input.value),
        equipment: role === 'survivor' 
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
    const selects = [document.getElementById('load-build-select'), document.getElementById('hc-load-build-select'), document.getElementById('gauntlet-load-build-select')];
    
    const isGauntlet = document.getElementById('gauntlet-view').style.display !== 'none';
    const role = isGauntlet ? (getGauntletState().activeRole) : currentRole;

    selects.forEach(select => {
        if (!select) return;
        select.innerHTML = '<option value="">-- Sélectionner --</option>';
        Object.keys(builds).forEach(name => {
            // On ne propose que les builds correspondant au rôle actuel
            if (builds[name].role === role) {
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
    const isGauntlet = document.getElementById('gauntlet-view').style.display !== 'none';
    const prefix = isHC ? 'hc-' : (isGauntlet ? 'gauntlet-' : '');

    if (isHC) {
        document.getElementById('hc-character').value = b.character;
        document.getElementById('hc-selected-char-name').innerText = b.character;
        document.querySelectorAll('.hc-char-item').forEach(item => {
            item.classList.toggle('selected', item.querySelector('img').title === b.character);
        });
        updateHCPerksDatalist();
    } else if (isGauntlet) {
        // En mode Gauntlet, le personnage est fixé par le tirage
    } else {
        document.getElementById('character').value = b.character;
        updateImg(document.getElementById('char-icon'), 'Characters', b.character);
    }

    let container;
    if (isHC) container = document.getElementById('hc-match-form');
    else if (isGauntlet) container = document.getElementById('gauntlet-quick-form');
    else container = document.getElementById('match-form');

    const perkInputSelector = isHC ? '.hc-perk-input' : (isGauntlet ? '.gauntlet-perk-input' : '.perk-input');
    const perkIconSelector = isHC ? '.hc-perk-icon' : (isGauntlet ? '.perk-icon' : '.perk-icon');

    const perkInputs = container.querySelectorAll(perkInputSelector);
    const perkIcons = container.querySelectorAll(perkIconSelector);

    b.perks.forEach((val, i) => {
        if (perkInputs[i]) {
            perkInputs[i].value = val;
            updateImg(perkIcons[i], 'Perks', val);
        }
    });

    if (b.role === 'survivor') {
        document.getElementById(prefix + 'surv-item').value = b.equipment[0];
        document.getElementById(prefix + 'surv-addon-1').value = b.equipment[1];
        document.getElementById(prefix + 'surv-addon-2').value = b.equipment[2];
        if (isHC) updateHCSurvivorAddons(); else if (isGauntlet) updateGauntletSurvivorAddons(); else updateSurvivorAddons();
        updateImg(document.getElementById(prefix + 'surv-item-icon'), 'Items', b.equipment[0]);
    } else {
        document.getElementById(prefix + 'kill-addon-1').value = b.equipment[0];
        document.getElementById(prefix + 'kill-addon-2').value = b.equipment[1];
        if (isHC) updateHCKillerAddons(); else if (isGauntlet) updateGauntletKillerAddons(); else updateKillerAddons();
    }
}

function resetCurrentBuild() {
    const isHC = document.getElementById('hardcore-view').style.display !== 'none';
    const isGauntlet = document.getElementById('gauntlet-view').style.display !== 'none';
    const prefix = isHC ? 'hc-' : (isGauntlet ? 'gauntlet-' : '');

    document.getElementById(prefix + 'build-name').value = '';
    const loadSelect = document.getElementById(prefix + 'load-build-select');
    if (loadSelect) loadSelect.value = '';

    let container;
    if (isHC) container = document.getElementById('hc-match-form');
    else if (isGauntlet) container = document.getElementById('gauntlet-quick-form');
    else container = document.getElementById('match-form');

    const perkInputSelector = isHC ? '.hc-perk-input' : (isGauntlet ? '.gauntlet-perk-input' : '.perk-input');
    const perkIconSelector = isHC ? '.hc-perk-icon' : (isGauntlet ? '.perk-icon' : '.perk-icon');

    const perkInputs = container.querySelectorAll(perkInputSelector);
    const perkIcons = container.querySelectorAll(perkIconSelector);

    perkInputs.forEach((input, i) => {
        input.value = 'None';
        updateImg(perkIcons[i], 'Perks', 'None');
    });

    const role = isGauntlet ? getGauntletState().activeRole : currentRole;

    if (role === 'survivor') {
        document.getElementById(prefix + 'surv-item').value = 'None';
        document.getElementById(prefix + 'surv-addon-1').value = 'None';
        document.getElementById(prefix + 'surv-addon-2').value = 'None';
        updateImg(document.getElementById(prefix + 'surv-item-icon'), 'Items', 'None');
        if (isHC) updateHCSurvivorAddons(); else if (isGauntlet) updateGauntletSurvivorAddons(); else updateSurvivorAddons();
    } else if (role === 'killer') {
        document.getElementById(prefix + 'kill-addon-1').value = 'None';
        document.getElementById(prefix + 'kill-addon-2').value = 'None';
        if (isHC) updateHCKillerAddons(); else if (isGauntlet) updateGauntletKillerAddons(); else updateKillerAddons();
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
        ? Math.round((statsByDay[day].kills / (statsByDay[day].killerGames * 4)) * 1000) / 10
        : null);
    const escapeRateData = labels.map(day => statsByDay[day].survivorGames > 0 
        ? Math.round((statsByDay[day].escapes / statsByDay[day].survivorGames) * 1000) / 10
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
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: data,
                backgroundColor: color + '80', // Opacité augmentée pour les bâtons
                borderColor: color,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { 
                    beginAtZero: true, 
                    max: 100, 
                    title: { display: true, text: '%', color: '#ccc' },
                    grid: { color: 'rgba(255, 255, 255, 0.15)' },
                    border: { display: true, color: 'rgba(255, 255, 255, 0.5)' },
                    ticks: { color: '#ccc' }
                },
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.15)' },
                    border: { display: true, color: 'rgba(255, 255, 255, 0.5)' },
                    ticks: { color: '#ccc' }
                }
            },
            plugins: {
                legend: {
                    labels: { color: '#ccc' }
                }
            }
        }
    });
}

function saveMatch() {
    const perks = Array.from(document.querySelectorAll('#match-form .perk-input')).map(input => input.value || 'None');
    const ignoreGauntlet = document.getElementById('ignore-gauntlet').checked;
    
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
        gens: currentRole === 'killer' ? document.getElementById('killer-gens').value : document.getElementById('gens-done').value,
        ignoreGauntlet: ignoreGauntlet
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

    // Intégration Gauntlet : si c'est une nouvelle partie et que le perso correspond au tirage actif du Gauntlet
    if (isNewMatch && !ignoreGauntlet) {
        const gauntletState = getGauntletState();
        const activeRole = gauntletState.activeRole;
        
        if (activeRole === currentRole) {
            const roleState = gauntletState[activeRole];
            if (roleState.current && roleState.current === match.character) {
                if (validateGauntletBuild(match.character, match.perks, roleState.completed.length, activeRole)) {
                    let isWin = false;
                    if (activeRole === 'survivor') {
                        isWin = (match.escaped === 'Trappe' || match.escaped === 'Porte' || match.escaped === true);
                    } else {
                        isWin = parseInt(match.kills || 0) >= 3;
                    }
                    recordGauntletResult(isWin, activeRole);
                }
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
        document.getElementById('ignore-gauntlet').checked = !!match.ignoreGauntlet;

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
    ['surv-item', 'surv-addon-1', 'surv-addon-2', 'kill-addon-1', 'kill-addon-2', 
     'hc-surv-item', 'hc-surv-addon-1', 'hc-surv-addon-2', 'hc-kill-addon-1', 'hc-kill-addon-2',
     'gauntlet-surv-item', 'gauntlet-surv-addon-1', 'gauntlet-surv-addon-2', 'gauntlet-kill-addon-1', 'gauntlet-kill-addon-2'].forEach(setupDatalistFocusBehavior);

    document.getElementById('hc-surv-item').addEventListener('input', (e) => {
        updateHCSurvivorAddons();
        updateImg(document.getElementById('hc-surv-item-icon'), 'Items', e.target.value);
        if (equipmentData.survivorItems.includes(e.target.value) || e.target.value === "None") e.target.blur();
    });

    document.getElementById('hc-surv-addon-1').addEventListener('input', (e) => updateImg(document.getElementById('hc-surv-addon-1-icon'), 'Addons', e.target.value));
    document.getElementById('hc-surv-addon-2').addEventListener('input', (e) => updateImg(document.getElementById('hc-surv-addon-2-icon'), 'Addons', e.target.value));
    document.getElementById('hc-kill-addon-1').addEventListener('input', (e) => {
        const char = document.getElementById('hc-character').value;
        updateImg(document.getElementById('hc-kill-addon-1-icon'), 'Addons', e.target.value, char);
    });
    document.getElementById('hc-kill-addon-2').addEventListener('input', (e) => {
        const char = document.getElementById('hc-character').value;
        updateImg(document.getElementById('hc-kill-addon-2-icon'), 'Addons', e.target.value, char);
    });

    document.getElementById('hc-opponent-killer').addEventListener('change', (e) => {
        updateImg(document.getElementById('hc-opponent-icon'), 'Characters', e.target.value);
        e.target.blur();
    });

    document.getElementById('gauntlet-surv-item').addEventListener('input', (e) => {
        updateGauntletSurvivorAddons();
        updateImg(document.getElementById('gauntlet-surv-item-icon'), 'Items', e.target.value);
        if (equipmentData.survivorItems.includes(e.target.value) || e.target.value === "None") e.target.blur();
    });
    document.getElementById('gauntlet-surv-addon-1').addEventListener('input', (e) => updateImg(document.getElementById('gauntlet-surv-addon-1-icon'), 'Addons', e.target.value));
    document.getElementById('gauntlet-surv-addon-2').addEventListener('input', (e) => updateImg(document.getElementById('gauntlet-surv-addon-2-icon'), 'Addons', e.target.value));
    
    document.getElementById('gauntlet-kill-addon-1').addEventListener('input', (e) => {
        updateGauntletKillerAddons();
    });
    document.getElementById('gauntlet-kill-addon-2').addEventListener('input', (e) => {
        updateGauntletKillerAddons();
    });

    document.getElementById('gauntlet-opponent-killer').addEventListener('change', (e) => {
        updateImg(document.getElementById('gauntlet-opponent-icon'), 'Characters', e.target.value);
        e.target.blur();
    });

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
        const killerName = document.getElementById('character').value;
        updateImg(document.getElementById('kill-addon-1-icon'), 'Addons', e.target.value, killerName);
        const list = equipmentData.killerAddons[killerName];
        if ((list && list.includes(e.target.value)) || e.target.value === "None") e.target.blur();
    });

    document.getElementById('kill-addon-2').addEventListener('input', (e) => {
        const killerName = document.getElementById('character').value;
        updateImg(document.getElementById('kill-addon-2-icon'), 'Addons', e.target.value, killerName);
        const list = equipmentData.killerAddons[killerName];
        if ((list && list.includes(e.target.value)) || e.target.value === "None") e.target.blur();
    });

    document.querySelectorAll('#match-form .perk-input, #hc-match-form .hc-perk-input, .gauntlet-perk-input').forEach((input) => {
        const isHC = input.classList.contains('hc-perk-input');
        const isGauntlet = input.classList.contains('gauntlet-perk-input');
        let tempValue = '';
        input.addEventListener('focus', (e) => {
            tempValue = e.target.value;
            e.target.value = '';
        });
        input.addEventListener('blur', (e) => {
            if (e.target.value === '') e.target.value = tempValue;
        });
        input.addEventListener('input', (e) => {
            let container;
            if (isHC) container = document.getElementById('hc-match-form');
            else if (isGauntlet) container = document.getElementById('gauntlet-quick-form');
            else container = document.getElementById('match-form');

            const allInputs = Array.from(container.querySelectorAll(isHC ? '.hc-perk-input' : (isGauntlet ? '.gauntlet-perk-input' : '.perk-input')));
            const idx = allInputs.indexOf(e.target);
            const icon = container.querySelectorAll(isHC ? '.hc-perk-icon' : (isGauntlet ? '.perk-icon' : '.perk-icon'))[idx];

            updateImg(icon, 'Perks', e.target.value);

            let roleForList = currentRole;
            if (isGauntlet) {
                roleForList = getGauntletState().activeRole;
            }

            const list = isHC ? getAvailableHardcorePerks(currentRole, document.getElementById('hc-character').value) : perksData[roleForList];
            if (list && (list.some(p => (p.name || p) === e.target.value) || e.target.value === "None")) e.target.blur();
        });
    });
};

// --- LOGIQUE GAUNTLET ---
function getGauntletState() {
    let state = JSON.parse(localStorage.getItem('dbd_gauntlet_state'));
    if (!state) {
        state = {
            activeRole: null,
            survivor: { completed: [], current: null, order: [] },
            killer: { completed: [], current: null, order: [] }
        };
        localStorage.setItem('dbd_gauntlet_state', JSON.stringify(state));
    }
    // Migration pour les anciennes sauvegardes (Survivor uniquement)
    if (state.completed !== undefined) {
        const old = { ...state };
        state = {
            activeRole: 'survivor',
            survivor: { completed: old.completed || [], current: old.current || null, order: old.order || [] },
            killer: { completed: [], current: null, order: [] }
        };
        localStorage.setItem('dbd_gauntlet_state', JSON.stringify(state));
    }
    return state;
}

function setGauntletRole(role) {
    const state = getGauntletState();
    state.activeRole = role;
    localStorage.setItem('dbd_gauntlet_state', JSON.stringify(state));
    renderGauntletUI();
}

function getGauntletTierInfo(count, total) {
    // count est le nombre de survivants déjà réussis
    const segment = total / 5;
    if (count < segment) return { tier: 1, name: "The Warm Up", perks: "4 Perks (1 Unique)", checkpoint: 0 };
    if (count < segment * 2) return { tier: 2, name: "The Thinning", perks: "3 Perks (1 Unique)", checkpoint: Math.floor(segment) };
    if (count < segment * 3) return { tier: 3, name: "The Struggle", perks: "2 Perks (1 Unique)", checkpoint: Math.floor(segment * 2) };
    if (count < segment * 4) return { tier: 4, name: "The Hardcore", perks: "1 Perk (Character Unique)", checkpoint: Math.floor(segment * 3) };
    return { tier: 5, name: "The Legend", perks: "No Perks Allowed", checkpoint: Math.floor(segment * 4) };
}

/**
 * Vérifie si le build respecte les restrictions du Tier actuel du Gauntlet.
 */
function validateGauntletBuild(character, perks, completedCount, role) {
    const unlockedCount = getUnlockedChars()[role === 'killer' ? 'killers' : 'survivors'].length;
    const tierInfo = getGauntletTierInfo(completedCount, unlockedCount);
    const activePerks = perks.filter(p => p && p !== 'None');
    
    const rolePerks = role === 'killer' ? perksData.killer : perksData.survivor;

    // On identifie les perks uniques du personnage joué
    const uniquePerks = (rolePerks || [])
        .filter(p => p.owner.toLowerCase().replace(/[^a-z0-9]/g, '') === character.toLowerCase().replace(/[^a-z0-9]/g, ''))
        .map(p => p.name);

    const hasUnique = activePerks.some(p => uniquePerks.includes(p));

    if (tierInfo.tier === 1) { // Tier 1: 4 Perks (1 Unique)
        return activePerks.length <= 4 && hasUnique;
    } else if (tierInfo.tier === 2) { // Tier 2: 3 Perks (1 Unique)
        return activePerks.length <= 3 && hasUnique;
    } else if (tierInfo.tier === 3) { // Tier 3: 2 Perks (1 Unique)
        return activePerks.length <= 2 && hasUnique;
    } else if (tierInfo.tier === 4) { // Tier 4: 1 Unique (Seulement sa perk unique)
        return activePerks.length === 1 && hasUnique;
    } else { // Tier 5: No Perks
        return activePerks.length === 0;
    }
}

function renderGauntletUI() {
    const state = getGauntletState();
    
    // Gestion de la sélection de rôle
    document.querySelectorAll('#gauntlet-role-selection button').forEach(btn => btn.classList.remove('active-role'));
    if (state.activeRole) {
        const btnIdx = state.activeRole === 'killer' ? 0 : 1;
        document.querySelectorAll('#gauntlet-role-selection button')[btnIdx].classList.add('active-role');
        document.getElementById('gauntlet-title').innerText = state.activeRole === 'killer' ? 'Killer Gauntlet' : 'Survivor Gauntlet';
        document.getElementById('gauntlet-progress-container').style.display = 'block';
        document.getElementById('gauntlet-roll-zone').style.display = 'block';
        document.getElementById('gauntlet-completed-section').style.display = 'block';
    } else {
        document.getElementById('gauntlet-title').innerText = 'Gauntlet Challenge';
        document.getElementById('gauntlet-progress-container').style.display = 'none';
        document.getElementById('gauntlet-roll-zone').style.display = 'none';
        document.getElementById('gauntlet-completed-section').style.display = 'none';
        return;
    }

    renderBuildsList();

    const roleState = state[state.activeRole];
    const count = roleState.completed.length;
    const unlockedChars = getUnlockedChars()[state.activeRole === 'killer' ? 'killers' : 'survivors'];
    const total = Math.max(1, unlockedChars.length);
    const tier = getGauntletTierInfo(count, total);
    
    document.getElementById('gauntlet-tier-name').innerText = `Tier ${tier.tier}: ${tier.name}`;
    document.getElementById('gauntlet-perk-restriction').innerText = `Restriction : ${tier.perks}`;
    document.getElementById('gauntlet-progress-fill').style.width = (count / total * 100) + '%';
    document.getElementById('gauntlet-count').innerText = `${count} / ${total} ${state.activeRole === 'killer' ? 'Tueurs' : 'Survivants'}`;

    // Ajout des indicateurs de paliers (Tiers)
    const markersContainer = document.getElementById('gauntlet-markers');
    if (markersContainer) {
        markersContainer.innerHTML = '';
        for (let i = 1; i <= 4; i++) {
            const marker = document.createElement('div');
            marker.style.position = 'absolute';
            marker.style.left = (i * 20) + '%';
            marker.style.top = '0';
            marker.style.width = '2px';
            marker.style.height = '100%';
            marker.style.backgroundColor = 'rgba(255, 255, 255, 0.4)';
            marker.style.zIndex = '2';
            markersContainer.appendChild(marker);
        }
    }

    const rollZone = document.getElementById('gauntlet-rolled-char');
    const quickForm = document.getElementById('gauntlet-quick-form');
    
    if (roleState.current && unlockedChars.includes(roleState.current)) {
        rollZone.style.display = 'block';
        document.getElementById('gauntlet-rolled-name').innerText = roleState.current;
        document.getElementById('gauntlet-instr-name').innerText = roleState.current;
        document.getElementById('gauntlet-instr-role').innerText = state.activeRole === 'killer' ? 'tueur' : 'survivant';
        document.getElementById('gauntlet-instr-win-cond').innerText = state.activeRole === 'killer' ? 'Condition : Au moins 3 sacrifices.' : 'Condition : Évadez-vous de la partie.';

        const icon = document.getElementById('gauntlet-rolled-icon');
        // On retire et on remet la classe pour redéclencher l'animation à chaque changement
        icon.classList.remove('animate-roll');
        void icon.offsetWidth; // Force le reflow (recalcul du style)
        icon.classList.add('animate-roll');

        updateImg(icon, 'Characters', roleState.current);

        // Setup Quick Form for the current character
        const isAlreadyVisible = quickForm.style.display === 'block';
        const isCurrentCharSet = quickForm.dataset.currentChar === roleState.current;

        if (!isAlreadyVisible || !isCurrentCharSet) {
            quickForm.style.display = 'block';
            quickForm.dataset.currentChar = roleState.current;

            // Prepare unique perks for the specific character
            const rolePerks = state.activeRole === 'killer' ? perksData.killer : perksData.survivor;
            const charPerks = rolePerks.filter(p => 
                p.owner.toLowerCase().replace(/[^a-z0-9]/g, '') === roleState.current.toLowerCase().replace(/[^a-z0-9]/g, '')
            );

            const uniqueDatalist = document.getElementById('gauntlet-unique-perks-options');
            if (uniqueDatalist) {
                uniqueDatalist.innerHTML = '';
                charPerks.forEach(p => {
                    let opt = document.createElement('option');
                    opt.value = p.name;
                    uniqueDatalist.appendChild(opt);
                });
            }

            // Initialisation des listes de suggestions globales pour le Gauntlet
            const standardPerkDatalist = document.getElementById('perks-options');
            if (standardPerkDatalist) {
                standardPerkDatalist.innerHTML = '<option value="None">None</option>';
                const unlockedData = getUnlockedChars();
                const roleKey = state.activeRole === 'killer' ? 'killers' : 'survivors';
                perksData[state.activeRole].forEach(p => {
                    if (p.owner === "Base Kit" || (unlockedData[roleKey] && unlockedData[roleKey].includes(p.owner))) {
                        let opt = document.createElement('option'); opt.value = p.name;
                        standardPerkDatalist.appendChild(opt);
                    }
                });
            }
            updateDatalist('items-options', equipmentData.survivorItems);

            // Init form values
            document.getElementById('gauntlet-killer-outcome').style.display = state.activeRole === 'killer' ? 'flex' : 'none';
            document.getElementById('gauntlet-survivor-outcome').style.display = state.activeRole === 'survivor' ? 'block' : 'none';
            document.getElementById('gauntlet-bp').value = '';

            if (state.activeRole === 'survivor') {
                const opponentSelect = document.getElementById('gauntlet-opponent-killer');
                opponentSelect.innerHTML = '<option value="None">None</option>';
                perksData.killers.forEach(k => {
                    let opt = document.createElement('option'); opt.value = k; opt.innerHTML = k;
                    opponentSelect.appendChild(opt);
                });
                updateImg(document.getElementById('gauntlet-opponent-icon'), 'Characters', opponentSelect.value);
                document.getElementById('gauntlet-gens-done').value = 0;
                document.getElementById('gauntlet-gens-done').nextElementSibling.value = 0;
                document.getElementById('gauntlet-escaped').value = 'Mort';
                ['gauntlet-surv-item', 'gauntlet-surv-addon-1', 'gauntlet-surv-addon-2'].forEach(id => document.getElementById(id).value = 'None');
                ['gauntlet-surv-item-icon', 'gauntlet-surv-addon-1-icon', 'gauntlet-surv-addon-2-icon'].forEach(id => updateImg(document.getElementById(id), id.includes('addon') ? 'Addons' : 'Items', 'None'));
            } else {
                document.getElementById('gauntlet-kills').value = 0;
                document.getElementById('gauntlet-killer-gens').value = 0;
                document.getElementById('gauntlet-killer-gens').nextElementSibling.value = 0;
                ['gauntlet-kill-addon-1', 'gauntlet-kill-addon-2'].forEach(id => document.getElementById(id).value = 'None');
                ['gauntlet-kill-addon-1-icon', 'gauntlet-kill-addon-2-icon'].forEach(id => updateImg(document.getElementById(id), 'Addons', 'None'));
                updateGauntletKillerAddons();
            }
            document.getElementById('gauntlet-survivor-equipment-fields').style.display = state.activeRole === 'survivor' ? 'flex' : 'none';
            document.getElementById('gauntlet-killer-equipment-fields').style.display = state.activeRole === 'killer' ? 'flex' : 'none';
            
            const gauntletPerks = document.querySelectorAll('.gauntlet-perk-input');
            const gauntletIcons = document.querySelectorAll('#gauntlet-quick-form .perk-icon');
            gauntletPerks.forEach((input, i) => {
                input.value = 'None';
                updateImg(gauntletIcons[i], 'Perks', input.value);
            });
        }

        // Affichage des perks uniques du personnage
        const perksContainer = document.getElementById('gauntlet-rolled-perks');
        if (perksContainer) {
            perksContainer.innerHTML = '';
            const rolePerks = state.activeRole === 'killer' ? perksData.killer : perksData.survivor;
            // On filtre les perks appartenant au personnage actuel
            const charPerks = rolePerks.filter(p => 
                p.owner.toLowerCase().replace(/[^a-z0-9]/g, '') === roleState.current.toLowerCase().replace(/[^a-z0-9]/g, '')
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
    } else if (roleState.completed.length < total) {
        // Si aucun perso n'est en cours pour ce rôle et que le défi n'est pas fini, on roll
        rollGauntletSurvivor();
    } else {
        rollZone.style.display = 'none';
        quickForm.style.display = 'none';
        quickForm.dataset.currentChar = '';
    }
    
    const list = document.getElementById('gauntlet-completed-list');
    list.innerHTML = '';
    roleState.completed.forEach(name => {
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
    if (!state.activeRole) return;
    
    const roleState = state[state.activeRole];
    if (roleState.current) return;

    const unlocked = getUnlockedChars()[state.activeRole === 'killer' ? 'killers' : 'survivors'];
    const all = perksData[state.activeRole === 'killer' ? 'killers' : 'survivors'].filter(s => unlocked.includes(s));

    // Si la file d'attente est vide, on génère un nouvel ordre aléatoire complet
    if (!roleState.order || roleState.order.length === 0) {
        const remaining = all.filter(s => !roleState.completed.includes(s));
        if (remaining.length === 0) return; // Plus rien à tirer

        // Mélange de Fisher-Yates pour garantir un aléatoire de qualité
        for (let i = remaining.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
        }
        roleState.order = remaining;
    }

    // On retire et sélectionne le premier personnage de la file d'attente
    roleState.current = roleState.order.shift();
    localStorage.setItem('dbd_gauntlet_state', JSON.stringify(state));
    renderGauntletUI();
}

function recordGauntletResult(win, role) {
    const state = getGauntletState();
    const roleState = state[role];
    if (!roleState.current) return;

    const unlockedCount = getUnlockedChars()[role === 'killer' ? 'killers' : 'survivors'].length;
    
    if (win) {
        roleState.completed.push(roleState.current);
        roleState.current = null;
        if (roleState.completed.length >= unlockedCount) alert(`GAUNTLET ${role.toUpperCase()} TERMINÉ ! Vous êtes une légende.`);
    } else {
        const tier = getGauntletTierInfo(roleState.completed.length, unlockedCount);
        roleState.completed = roleState.completed.slice(0, tier.checkpoint);
        roleState.current = null;
        roleState.order = []; // Réinitialise l'ordre
        const msg = role === 'killer' ? "Défaite ! Pas assez de sacrifices." : "Mort ! Évasion échouée.";
        alert(`${msg} Progression du tier perdue. Retour au checkpoint : ${tier.checkpoint} personnages.`);
    }
    
    localStorage.setItem('dbd_gauntlet_state', JSON.stringify(state));
    
    // On enchaîne directement sur le tirage du prochain survivant
    if (roleState.completed.length < unlockedCount) {
        rollGauntletSurvivor();
    } else {
        renderGauntletUI();
    }
}

/**
 * Enregistre le match et valide l'étape du Gauntlet.
 */
function saveMatchFromGauntlet() {
    const state = getGauntletState();
    const role = state.activeRole;
    const char = state[role].current;
    
    const bp = document.getElementById('gauntlet-bp').value;
    if (!bp) return alert("Veuillez saisir les points de sang.");

    const perks = Array.from(document.querySelectorAll('.gauntlet-perk-input')).map(i => i.value || 'None');
    
    const roleState = state[role];
    if (!validateGauntletBuild(char, perks, roleState.completed.length, role)) {
        const unlockedChars = getUnlockedChars()[role === 'killer' ? 'killers' : 'survivors'];
        const tier = getGauntletTierInfo(roleState.completed.length, unlockedChars.length);
        return alert(`Votre build ne respecte pas les restrictions du Gauntlet (${tier.perks}).`);
    }

    let isWin = false;
    let kills = null, escaped = null, gens = 0, opponent = null, equipment = [];

    if (role === 'killer') {
        kills = document.getElementById('gauntlet-kills').value;
        gens = document.getElementById('gauntlet-killer-gens').value;
        isWin = parseInt(kills) >= 3;
        equipment = [document.getElementById('gauntlet-kill-addon-1').value, document.getElementById('gauntlet-kill-addon-2').value];
    } else {
        escaped = document.getElementById('gauntlet-escaped').value;
        gens = document.getElementById('gauntlet-gens-done').value;
        opponent = document.getElementById('gauntlet-opponent-killer').value;
        isWin = (escaped === 'Porte' || escaped === 'Trappe');
        equipment = [document.getElementById('gauntlet-surv-item').value, document.getElementById('gauntlet-surv-addon-1').value, document.getElementById('gauntlet-surv-addon-2').value];
    }

    const history = JSON.parse(localStorage.getItem('dbd_stats')) || [];
    history.push({
        date: new Date().toLocaleString(),
        role: role,
        character: char,
        opponent: opponent,
        perks: perks,
        equipment: equipment,
        bloodpoints: bp,
        kills: kills,
        escaped: escaped,
        gens: gens,
        ignoreGauntlet: false
    });
    localStorage.setItem('dbd_stats', JSON.stringify(history));

    recordGauntletResult(isWin, role);
}

function updateGauntletKillerAddons() {
    const state = getGauntletState();
    const killerName = state.killer.current;
    if (!killerName) return;
    const addons = equipmentData.killerAddons[killerName] || [];
    updateDatalist('kill-addons-options', addons);
    updateImg(document.getElementById('gauntlet-kill-addon-1-icon'), 'Addons', document.getElementById('gauntlet-kill-addon-1').value, killerName);
    updateImg(document.getElementById('gauntlet-kill-addon-2-icon'), 'Addons', document.getElementById('gauntlet-kill-addon-2').value, killerName);
}

function updateGauntletSurvivorAddons() {
    const itemType = document.getElementById('gauntlet-surv-item').value;
    const itemEntry = equipmentData.survivorAddons.find(entry => 
        itemType.toLowerCase().includes(entry.itemType.toLowerCase())
    );
    const addons = itemEntry ? itemEntry.addons : [];
    updateDatalist('surv-addons-options', addons);
    updateImg(document.getElementById('gauntlet-surv-addon-1-icon'), 'Addons', document.getElementById('gauntlet-surv-addon-1').value);
    updateImg(document.getElementById('gauntlet-surv-addon-2-icon'), 'Addons', document.getElementById('gauntlet-surv-addon-2').value);
}

/**
 * Actualise la file d'attente du Gauntlet en fonction des personnages débloqués.
 * Utile si l'utilisateur a modifié ses personnages possédés dans les réglages sans vouloir perdre sa progression.
 */
function refreshGauntletQueue() {
    const state = getGauntletState();
    const role = state.activeRole;
    if (!role) return;

    const roleState = state[role];
    const unlockedChars = getUnlockedChars()[role === 'killer' ? 'killers' : 'survivors'];

    // Si le personnage actuel n'est plus dans la liste des débloqués, on l'annule
    if (roleState.current && !unlockedChars.includes(roleState.current)) {
        roleState.current = null;
    }

    // On vide l'ordre pour forcer une régénération complète basée sur les débloqués actuels au prochain rendu
    roleState.order = [];

    localStorage.setItem('dbd_gauntlet_state', JSON.stringify(state));
    renderGauntletUI();
    alert("La liste du Gauntlet a été actualisée en fonction de vos personnages débloqués !");
}

function resetGauntletMode() {
    if (confirm("Voulez-vous réinitialiser complètement le Gauntlet ? Toute votre progression sera perdue.")) {
        localStorage.removeItem('dbd_gauntlet_state');
        renderGauntletUI();
    }
}