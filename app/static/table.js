"use strict";

// Constants
const ITEMS_PER_PAGE = 5;
let currentPage = 1;
let filteredData = [];

// Initialize
function init_table(warnings) {
    const sortedWarnings = warnings.sort((a ,b) => a.residue_id - b.residue_id)
    if (warnings.length === 0) {
        $('#modalTrigger').hide()
        return;
    }
    filteredData = [...sortedWarnings]
    renderTable();
    $("#searchInput").on("input", handleSearch);

    // Reset page when modal is hidden
    $("#tableModal").on("hidden.bs.modal", () => {
        currentPage = 1;
        $("#searchInput").val("");
        filteredData = [...sortedWarnings];
        renderTable();
    });
}

// Handle search
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    filteredData = filteredData.filter((item) =>
        Object.values(item).some((value) =>
            value.toString().toLowerCase().includes(searchTerm)
        )
    );
    currentPage = 1;
    renderTable();
}

function handleButtonClick(item) {
    $('#tableModal').modal('hide');
    molstar.behavior.focus(item);
}

function renderTable() {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedData = filteredData.slice(startIndex, endIndex);

    // Render table body
    const tableBody = $("#tableBody");
    tableBody.html(
        paginatedData
            .map(
                (item) => `
                <tr>
                    <td>${item.chain_id}</td>
                    <td>${item.residue_id}</td>
                    <td>${item.residue_name}</td>
                    <td>
                        <span class="badge ${item.warning === "None"
                        ? "badge-success"
                        : "badge-warning"
                    }">
                            ${item.warning}
                        </span>
                    </td>
                    <td>
                        <button 
                            type="button" 
                            class="btn btn-sm btn-info"
                            onclick='handleButtonClick(${JSON.stringify(item)})'
                        >
                            Show
                        </button>
                    </td>
                </tr>
            `
            )
            .join("")
    );

    // Render pagination
    renderPagination();
}

// Render pagination
function renderPagination() {
    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
    const pagination = $("#pagination");

    let paginationHTML = `
                <li class="page-item ${currentPage === 1 ? "disabled" : ""}">
                    <a class="page-link" href="#" onclick="changePage(${currentPage - 1
        })">Previous</a>
                </li>
            `;

    for (let i = 1; i <= totalPages; i++) {
        paginationHTML += `
                    <li class="page-item ${currentPage === i ? "active" : ""}">
                        <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
                    </li>
                `;
    }

    paginationHTML += `
                <li class="page-item ${currentPage === totalPages ? "disabled" : ""
        }">
                    <a class="page-link" href="#" onclick="changePage(${currentPage + 1
        })">Next</a>
                </li>
            `;

    pagination.html(paginationHTML);
}

// Change page
function changePage(page) {
    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        renderTable();
    }
}
