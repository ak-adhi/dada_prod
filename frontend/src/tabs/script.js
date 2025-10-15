// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log("Initializing LLM Attacks Taxonomy with " + attacks.length + " attack types...");
    initializeApp();
});

function initializeApp() {
    populateFilters();
    displayAttacks(attacks);
    setupEventListeners();
    updateStats();

    console.log("Website initialized successfully!");
}

function populateFilters() {
    const familyFilter = document.getElementById('familyFilter');
    const usecaseFilter = document.getElementById('usecaseFilter');

    // Clear existing options except the first one
    while (familyFilter.children.length > 1) {
        familyFilter.removeChild(familyFilter.lastChild);
    }
    while (usecaseFilter.children.length > 1) {
        usecaseFilter.removeChild(usecaseFilter.lastChild);
    }

    // Get unique families and usecases
    const families = [...new Set(attacks.map(attack => attack.attack_family))];
    const usecases = [...new Set(attacks.map(attack => attack.usecase))];

    families.forEach(family => {
        const option = document.createElement('option');
        option.value = family;
        option.textContent = formatFamilyName(family);
        familyFilter.appendChild(option);
    });

    usecases.forEach(usecase => {
        const option = document.createElement('option');
        option.value = usecase;
        option.textContent = usecase.charAt(0).toUpperCase() + usecase.slice(1);
        usecaseFilter.appendChild(option);
    });
}

function formatFamilyName(family) {
    return family
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase())
        .replace(/Attack Variants/g, '')
        .trim();
}

function displayAttacks(attacks) {
    const grid = document.getElementById('attackGrid');
    grid.innerHTML = '';

    if (attacks.length === 0) {
        grid.innerHTML = '<div class="no-results">No attacks found matching your criteria</div>';
        return;
    }

    attacks.forEach(attack => {
        const card = createAttackCard(attack);
        grid.appendChild(card);
    });
}

function createAttackCard(attack) {
    const card = document.createElement('div');
    card.className = 'attack-card';
    card.onclick = () => showAttackDetails(attack);

    card.innerHTML = `
        <div class="attack-header">
            <span class="attack-family">${formatFamilyName(attack.attack_family)}</span>
            <span class="usecase-tag usecase-${attack.usecase}">${attack.usecase.charAt(0).toUpperCase() + attack.usecase.slice(1)}</span>
        </div>
        <div class="attack-title">${attack.attack_name}</div>
        <div class="attack-description">${attack.attack_prompt.substring(0, 150)}...</div>
        <div class="attack-details">
            <strong>ID:</strong> ${attack.id} |
            <strong>Family:</strong> ${formatFamilyName(attack.attack_family).substring(0, 20)}...
        </div>
    `;

    return card;
}

function showAttackDetails(attack) {
    const modal = document.getElementById('attackModal');
    const content = document.getElementById('modalContent');

    content.innerHTML = `
        <h2>${attack.attack_name}</h2>

        <div class="modal-section">
            <h3>Attack Details</h3>
            <p><strong>ID:</strong> ${attack.id}</p>
            <p><strong>Usecase:</strong> <span class="usecase-badge ${attack.usecase}">${attack.usecase.charAt(0).toUpperCase() + attack.usecase.slice(1)}</span></p>
            <p><strong>Attack Family:</strong> ${formatFamilyName(attack.attack_family)}</p>
        </div>

        <div class="modal-section">
            <h3>Attack Prompt</h3>
            <div class="prompt-example">${attack.attack_prompt}</div>
        </div>

        <div class="modal-section">
            <h3>Attack Pattern</h3>
            <p>This attack belongs to the <strong>${formatFamilyName(attack.attack_family)}</strong> family and targets <strong>${attack.usecase}</strong> systems.</p>
        </div>
    `;

    modal.style.display = 'block';
}

function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const familyFilter = document.getElementById('familyFilter');
    const usecaseFilter = document.getElementById('usecaseFilter');

    if (searchInput) searchInput.addEventListener('input', filterAttacks);
    if (familyFilter) familyFilter.addEventListener('change', filterAttacks);
    if (usecaseFilter) usecaseFilter.addEventListener('change', filterAttacks);

    const closeBtn = document.querySelector('.close');
    const modal = document.getElementById('attackModal');

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

function filterAttacks() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const familyFilter = document.getElementById('familyFilter').value;
    const usecaseFilter = document.getElementById('usecaseFilter').value;

    const filtered = attacks.filter(attack => {
        const matchesSearch = searchTerm === '' ||
            attack.attack_name.toLowerCase().includes(searchTerm) ||
            attack.attack_family.toLowerCase().includes(searchTerm) ||
            attack.usecase.toLowerCase().includes(searchTerm) ||
            attack.attack_prompt.toLowerCase().includes(searchTerm);

        const matchesFamily = !familyFilter || attack.attack_family === familyFilter;
        const matchesUsecase = !usecaseFilter || attack.usecase === usecaseFilter;

        return matchesSearch && matchesFamily && matchesUsecase;
    });

    displayAttacks(filtered);
    updateStats(filtered);
}

function updateStats(filteredAttacks = attacks) {
    const totalAttacks = document.getElementById('totalAttacks');
    const attackFamilies = document.getElementById('attackFamilies');
    const usecasesCount = document.getElementById('usecasesCount');

    if (totalAttacks) totalAttacks.textContent = filteredAttacks.length;

    if (attackFamilies) {
        const uniqueFamilies = new Set(filteredAttacks.map(a => a.attack_family)).size;
        attackFamilies.textContent = uniqueFamilies;
    }

    if (usecasesCount) {
        const uniqueUsecases = new Set(filteredAttacks.map(a => a.usecase)).size;
        usecasesCount.textContent = uniqueUsecases;
    }
}

console.log("LLM Attacks Taxonomy script loaded successfully!");
console.log("Total attack types loaded: " + attacks.length);