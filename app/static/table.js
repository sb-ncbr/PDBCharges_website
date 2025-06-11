"use strict";

const itemsPerPage = 10;
let currentPage = 1;
let filteredWarnings = [];

function init_table(warnings) {
    warnings.sort((a, b) => {
        if (a.label_asym_id !== b.label_asym_id) {
            return a.label_asym_id.localeCompare(b.label_asym_id);
        }
        return a.auth_seq_id - b.auth_seq_id;
    });

    if (warnings.length === 0) {
        const dialog = document.getElementById('tableDialog');
        dialog.parentElement.hidden = true;
        return;
    }

    filteredWarnings = [...warnings];
    setupDialog();
    setupSearch(warnings);
    displayData(filteredWarnings);
    setupPagination(filteredWarnings);
}

function setupDialog() {
    const dialog = document.getElementById('tableDialog');
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) {
            dialog.close();
        }
    });
}

function openDialog() {
    const dialog = document.getElementById('tableDialog');
    dialog.showModal();
}

function closeDialog() {
    const dialog = document.getElementById('tableDialog');
    dialog.close();
}

function handleButtonClick(warning) {
    const dialog = document.getElementById('tableDialog');
    dialog.close();
    molstar.behavior.focus({
        chain_id: warning.auth_asym_id,
        residue_id: +warning.auth_seq_id,
        residue_name: warning.residue_name,
        warning: warning.warning
    });
}

function setupSearch(warnings) {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', () => {
        const searchTerm = searchInput.value.toLowerCase().trim();
        
        if (searchTerm === '') {
            filteredWarnings = [...warnings];
        } else {
            filteredWarnings = warnings.filter(item => 
                (item.label_asym_id && item.label_asym_id.toLowerCase().includes(searchTerm)) ||
                (item.auth_asym_id && item.auth_asym_id.toLowerCase().includes(searchTerm)) ||
                (item.auth_seq_id && item.auth_seq_id.toString().includes(searchTerm)) ||
                (item.residue_name && item.residue_name.toLowerCase().includes(searchTerm)) ||
                (item.warning && item.warning.toLowerCase().includes(searchTerm))
            );
        }
        
        // Reset to first page when search changes
        currentPage = 1;
        displayData(filteredWarnings);
        setupPagination(filteredWarnings);
        
        // Show no results message if needed
        const noResultsMsg = document.getElementById('noResultsMessage');
        if (filteredWarnings.length === 0) {
            noResultsMsg.style.display = 'block';
        } else {
            noResultsMsg.style.display = 'none';
        }
    });
}

function displayData(warnings) {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentData = warnings.slice(startIndex, endIndex);

    const tableBody = document.getElementById('tableBody');
    tableBody.innerHTML = '';

    currentData.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.label_asym_id}</td>
            <td>${item.auth_seq_id}</td>
            <td>${item.residue_name}</td>
            <td title='${item.warning}'>${item.warning}</td>
            <td>
                <button onclick='handleButtonClick(${JSON.stringify(item)})' class="btn btn-primary">Show</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function setupPagination(warnings) {
    const totalPages = Math.ceil(warnings.length / itemsPerPage);
    const paginationElement = document.getElementById('pagination');
    paginationElement.innerHTML = '';

    // Show total results count
    const resultsCount = document.getElementById('resultsCount');
    resultsCount.textContent = `Showing ${warnings.length} results`;

    // If no pages, don't show pagination
    if (totalPages === 0) {
        return;
    }

    // Previous button
    const prevButton = document.createElement('button');
    prevButton.innerText = 'Previous';
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            displayData(warnings);
            setupPagination(warnings);
        }
    });
    paginationElement.appendChild(prevButton);

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        const button = document.createElement('button');
        button.innerText = i;
        button.classList.toggle('active', i === currentPage);
        button.addEventListener('click', () => {
            currentPage = i;
            displayData(warnings);
            setupPagination(warnings);
        });
        paginationElement.appendChild(button);
    }

    // Next button
    const nextButton = document.createElement('button');
    nextButton.innerText = 'Next';
    nextButton.disabled = currentPage === totalPages;
    nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            displayData(warnings);
            setupPagination(warnings);
        }
    });
    paginationElement.appendChild(nextButton);
}
