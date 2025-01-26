"use strict";

const itemsPerPage = 10;
let currentPage = 1;

function init_table(warnings) {
    const sortedWarnings = warnings.sort((a, b) => a.residue_id - b.residue_id)

    setupDialog();
    displayData(sortedWarnings);
    setupPagination(sortedWarnings);
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
    dialog.close()
    molstar.behavior.focus(warning);
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
            <td>${item.chain_id}</td>
            <td>${item.residue_id}</td>
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
