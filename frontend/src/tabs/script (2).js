// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    // Populate dropdowns
    populateDropdowns();
    
    // Display all attacks initially
    displayResults(attacks);
    
    // Add event listeners
    document.getElementById('usecase-filter').addEventListener('change', filterResults);
    document.getElementById('attack-name-filter').addEventListener('change', filterResults);
    document.getElementById('attack-family-filter').addEventListener('change', filterResults);
    document.getElementById('search').addEventListener('input', filterResults);
});

// Populate dropdowns with unique values
function populateDropdowns() {
    const usecases = [...new Set(attacks.map(attack => attack.usecase))];
    const attackNames = [...new Set(attacks.map(attack => attack.attack_name))];
    const attackFamilies = [...new Set(attacks.map(attack => attack.attack_family))];
    
    const usecaseFilter = document.getElementById('usecase-filter');
    const attackNameFilter = document.getElementById('attack-name-filter');
    const attackFamilyFilter = document.getElementById('attack-family-filter');
    
    usecases.forEach(usecase => {
        const option = document.createElement('option');
        option.value = usecase;
        option.textContent = usecase.charAt(0).toUpperCase() + usecase.slice(1);
        usecaseFilter.appendChild(option);
    });
    
    attackNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        attackNameFilter.appendChild(option);
    });
    
    attackFamilies.forEach(family => {
        const option = document.createElement('option');
        option.value = family;
        option.textContent = family.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        attackFamilyFilter.appendChild(option);
    });
}

// Filter results based on selected filters and search
function filterResults() {
    const usecaseFilter = document.getElementById('usecase-filter').value;
    const attackNameFilter = document.getElementById('attack-name-filter').value;
    const attackFamilyFilter = document.getElementById('attack-family-filter').value;
    const searchTerm = document.getElementById('search').value.toLowerCase();
    
    const filteredAttacks = attacks.filter(attack => {
        // Filter by usecase
        if (usecaseFilter !== 'all' && attack.usecase !== usecaseFilter) {
            return false;
        }
        
        // Filter by attack name
        if (attackNameFilter !== 'all' && attack.attack_name !== attackNameFilter) {
            return false;
        }
        
        // Filter by attack family
        if (attackFamilyFilter !== 'all' && attack.attack_family !== attackFamilyFilter) {
            return false;
        }
        
        // Filter by search term
        if (searchTerm && 
            !attack.id.toString().includes(searchTerm) &&
            !attack.usecase.toLowerCase().includes(searchTerm) &&
            !attack.attack_name.toLowerCase().includes(searchTerm) &&
            !attack.attack_family.toLowerCase().includes(searchTerm) &&
            !attack.attack_prompt.toLowerCase().includes(searchTerm)) {
            return false;
        }
        
        return true;
    });
    
    displayResults(filteredAttacks);
}

// Display results in the table
function displayResults(results) {
    const resultsContainer = document.getElementById('results-container');
    const resultCount = document.getElementById('result-count');
    
    resultsContainer.innerHTML = '';
    
    if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="no-results">No attacks match your filters</div>';
        resultCount.textContent = 'Showing 0 results';
        return;
    }
    
    resultCount.textContent = `Showing ${results.length} results`;
    
    results.forEach(attack => {
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';
        
        resultItem.innerHTML = `
            <div class="id-col">${attack.id}</div>
            <div class="usecase-col">${attack.usecase.charAt(0).toUpperCase() + attack.usecase.slice(1)}</div>
            <div class="attack-name-col">${attack.attack_name}</div>
            <div class="attack-family-col">${attack.attack_family.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
            <div class="attack-details" id="details-${attack.id}">
                <strong>Attack Prompt:</strong>
                <div class="attack-prompt">${attack.attack_prompt}</div>
            </div>
        `;
        
        // Add click event to show details
        const attackNameCol = resultItem.querySelector('.attack-name-col');
        attackNameCol.addEventListener('click', function() {
            const details = document.getElementById(`details-${attack.id}`);
            details.classList.toggle('active');
        });
        
        resultsContainer.appendChild(resultItem);
    });
}