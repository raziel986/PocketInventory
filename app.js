/**
 * app.js - PocketITCheck Entry Point (ESM)
 */

import { initDB, getAllOffices, saveOffice, deleteOffice, migrateFromLocalStorage } from './js/db.js';
import { applyTranslations, updatePagination, categoryFields } from './js/ui.js';
import { translations, t, tPdf } from './js/translations.js';
import * as PDF from './js/pdf_engine.js';
import { DIAG_SCHEMA, renderDiagnosticGrid } from './js/diagnostic.js';

// State
let currentLang = localStorage.getItem('pocketITCheckLang') || 'es';
let appData = [];
let activeOfficeId = null;
let editingIndex = -1;
let editingOfficeId = null;
let diagnosticIndex = null;
let resultIndex = null;
let tableState = {
    offices: { searchQuery: '', currentPage: 1, itemsPerPage: 10 },
    equipment: { searchQuery: '', currentPage: 1, itemsPerPage: 10 }
};

// DOM Cache
const dom = {
    splash: document.getElementById('splash-screen'),
    sidebarOffices: document.getElementById('viewCreateOfficeSidebar'),
    sidebarEquip: document.getElementById('viewAddEquipmentSidebar'),
    viewOffices: document.getElementById('viewOfficesTable'),
    viewEquip: document.getElementById('viewInventoryTable'),
    officeForm: document.getElementById('officeForm'),
    equipForm: document.getElementById('inventoryForm'),
    officesTbody: document.getElementById('officesTableBody'),
    equipTbody: document.getElementById('tableBody'),
    activeOfficeSummary: document.getElementById('activeOfficeSummary'),
    typeSelect: document.getElementById('type'),
    dynamicContainer: document.getElementById('dynamicFieldsContainer'),
    submitBtnOffice: document.getElementById('submitBtnOffice'),
    cancelEditOfficeBtn: document.getElementById('cancelEditOfficeBtn'),
    submitBtnEquip: document.getElementById('submitBtnEquipment'),
    cancelEditBtn: document.getElementById('cancelEditBtn'),
    countBadge: document.getElementById('itemCount'),
    officeCountBadge: document.getElementById('officeCountBadge')
};

// Init
async function init() {
    await migrateFromLocalStorage();
    appData = await getAllOffices();
    applyTranslations(currentLang);
    renderOfficesTable();
    
    if (dom.splash) {
        setTimeout(() => {
            dom.splash.classList.add('splash-hidden');
            setTimeout(() => dom.splash.remove(), 500);
        }, 600);
    }
}

// Global Exports for HTML
window.toggleLanguage = (isEn) => {
    currentLang = isEn ? 'en' : 'es';
    localStorage.setItem('pocketITCheckLang', currentLang);
    applyTranslations(currentLang);
    renderOfficesTable();
    if (activeOfficeId) {
        renderTable();
        const o = appData.find(o => o.id === activeOfficeId);
        if (o) updateOfficeSummaryUI(o);
    }
};

window.handleSearch = (tableType, query) => {
    tableState[tableType].searchQuery = query.toLowerCase();
    tableState[tableType].currentPage = 1;
    if (tableType === 'offices') renderOfficesTable();
    else renderTable();
};

window.changeLength = (tableType, length) => {
    tableState[tableType].itemsPerPage = length === 'all' ? Infinity : parseInt(length);
    tableState[tableType].currentPage = 1;
    if (tableType === 'offices') renderOfficesTable();
    else renderTable();
};

window.selectOffice = (id) => {
    const o = appData.find(o => o.id === id);
    if (!o) return;
    activeOfficeId = id;
    
    // UI logic
    dom.sidebarOffices.style.display = 'none';
    dom.viewOffices.style.display = 'none';
    
    // On mobile, we hide sidebar by default
    if (isMobile()) {
        dom.sidebarEquip.style.display = 'none';
    } else {
        dom.sidebarEquip.style.display = 'block';
    }
    
    dom.viewEquip.style.display = 'block';
    updateOfficeSummaryUI(o);
    renderTable();
    updateNavUI('inventory');
};

window.goBackToOffices = () => {
    activeOfficeId = null;
    
    if (isMobile()) {
        dom.sidebarOffices.style.display = 'none';
    } else {
        dom.sidebarOffices.style.display = 'block';
    }
    
    dom.viewOffices.style.display = 'block';
    dom.sidebarEquip.style.display = 'none';
    dom.viewEquip.style.display = 'none';
    document.getElementById('diag-integrated-section').style.display = 'none';
    updateNavUI('offices');
    renderOfficesTable();
};

window.switchView = (view) => {
    if (view === 'offices') {
        goBackToOffices();
    } else if (view === 'inventory') {
        if (!activeOfficeId) {
            Swal.fire(t(currentLang, 'appName'), t(currentLang, 'emptyOffices'), 'info');
            return;
        }
        dom.sidebarOffices.style.display = 'none';
        dom.viewOffices.style.display = 'none';
        dom.sidebarEquip.style.display = 'block';
        dom.viewEquip.style.display = 'block';
        document.getElementById('diag-integrated-section').style.display = 'none';
        updateNavUI('inventory');
        renderTable();
    } else if (view === 'diagnostic') {
        if (!activeOfficeId || diagnosticIndex === null) {
             const o = appData.find(off => off.id === activeOfficeId);
             if (o && o.inventory.length > 0) {
                 window.openDiagnostic(0); 
             } else {
                 Swal.fire(t(currentLang, 'integratedDiag'), t(currentLang, 'emptyOffices'), 'warning');
                 return;
             }
        }
        document.getElementById('diag-integrated-section').style.display = 'block';
        dom.viewEquip.style.display = 'none';
        dom.sidebarEquip.style.display = 'none';
        updateNavUI('diagnostic');
    }
};

function isMobile() {
    return window.innerWidth <= 1024;
}

function updateNavUI(activeView) {
    document.querySelectorAll('.nav-item').forEach(item => {
        const view = item.getAttribute('onclick').match(/'([^']+)'/)[1];
        item.classList.toggle('active', view === activeView);
    });
}

function updateOfficeSummaryUI(o) {
    dom.activeOfficeSummary.innerHTML = `
        <div style="font-weight: 600; margin-bottom:0.3rem;">🏢 ${o.company}</div>
        <div style="color: #475569;">Depto: ${o.depto}</div>
        <div style="color: #475569;">📍 ${o.location}</div>
        <div style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid #e2e8f0;">
            <span style="color: #475569;">👤 <b>Auditor:</b> ${o.auditor}</span><br />
            <span style="color: #475569;">👔 <b>Resp. Oficina:</b> ${o.manager} - <em>${o.managerTitle}</em></span>
        </div>`;
}

// Offices Rendering
function renderOfficesTable() {
    if (!dom.officesTbody) return;
    dom.officesTbody.innerHTML = '';
    const state = tableState.offices;
    let filtered = appData.filter(o =>
        o.company.toLowerCase().includes(state.searchQuery) ||
        o.depto.toLowerCase().includes(state.searchQuery) ||
        o.location.toLowerCase().includes(state.searchQuery) ||
        o.auditor.toLowerCase().includes(state.searchQuery)
    );

    if (filtered.length === 0) {
        dom.officesTbody.innerHTML = `<tr><td colspan="5" class="empty-state"><div style="font-size: 2rem; margin-bottom: 1rem;">🏢</div>${t(currentLang, state.searchQuery ? 'noResults' : 'emptyOffices')}</td></tr>`;
    } else {
        const start = (state.currentPage - 1) * state.itemsPerPage;
        const paged = state.itemsPerPage === Infinity ? filtered : filtered.slice(start, start + state.itemsPerPage);
        paged.forEach(office => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td data-label="${t(currentLang, 'companyLabel')}"><strong class="text-primary">${office.company}</strong><br /><span class="text-secondary">${t(currentLang, 'deptLabel')}: ${office.depto}</span></td>
                <td data-label="${t(currentLang, 'locationLabel')}">${office.location}</td>
                <td data-label="${t(currentLang, 'techAuditor')}">${office.auditor}</td>
                <td data-label="${t(currentLang, 'equips')}" class="text-center"><span class="badge-count">${office.inventory.length}</span></td>
                <td data-label="${t(currentLang, 'actionsLabel')}" class="action-col">
                    <div class="action-icons">
                        <button class="icon-btn icon-btn-info" onclick="selectOffice('${office.id}')">📂</button>
                        <button class="icon-btn icon-btn-edit" onclick="editOffice('${office.id}')">✏️</button>
                        <button class="icon-btn icon-btn-danger" onclick="deleteOfficeHandler('${office.id}')">🗑️</button>
                    </div>
                </td>`;
            dom.officesTbody.appendChild(tr);
        });
        updatePagination('offices', filtered.length, 'officePagination', state, currentLang, (p) => { state.currentPage = p; renderOfficesTable(); });
    }
    if (dom.officeCountBadge) dom.officeCountBadge.textContent = `${filtered.length} ${t(currentLang, 'officesCount')}`;
}

// ... Additional handlers (editOffice, deleteOfficeHandler) will follow the same pattern ...
// Note: Implementing deleteOfficeHandler to use the new deleteOffice from db.js

window.deleteOfficeHandler = async (id) => {
    const res = await Swal.fire({
        title: t(currentLang, 'sureConfirm'), icon: 'warning',
        showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: t(currentLang, 'deleteBtn')
    });
    if (res.isConfirmed) {
        await deleteOffice(id);
        appData = appData.filter(o => o.id !== id);
        renderOfficesTable();
        Swal.fire({ title: t(currentLang, 'deletedMsg'), icon: 'success', timer: 1500, showConfirmButton: false });
    }
};

// ... Equipment logic rendering table ...
function renderTable() {
    if (!dom.equipTbody) return;
    dom.equipTbody.innerHTML = '';
    const o = appData.find(off => off.id === activeOfficeId);
    if (!o) return;
    const state = tableState.equipment;
    let filtered = o.inventory.map((item, idx) => ({ ...item, originalIndex: idx }))
        .filter(item => {
            const q = state.searchQuery;
            return item.assetTag.toLowerCase().includes(q) || item.type.toLowerCase().includes(q) ||
                item.model.toLowerCase().includes(q) || item.serial.toLowerCase().includes(q) ||
                item.user.toLowerCase().includes(q) || item.notes.toLowerCase().includes(q);
        });

    if (filtered.length === 0) {
        dom.equipTbody.innerHTML = `<tr><td colspan="6" class="empty-state">📭 ${t(currentLang, q ? 'noResults' : 'emptyAssets')}</td></tr>`;
    } else {
        const start = (state.currentPage - 1) * state.itemsPerPage;
        const paged = state.itemsPerPage === Infinity ? filtered : filtered.slice(start, start + state.itemsPerPage);
        paged.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td data-label="${t(currentLang, 'assetTagLabel')}"><strong>${item.assetTag}</strong></td>
                <td data-label="${t(currentLang, 'infoGeneral')}">
                    <span class="text-primary">${item.model}</span><br/>
                    <span class="serial-tag">${item.serial}</span>
                </td>
                <td data-label="${t(currentLang, 'statusAssignment')}">
                    <span class="status-badge status-${item.status.toLowerCase()}">${t(currentLang, item.status)}</span><br/>
                    <span class="text-secondary">${item.user}</span>
                </td>
                <td data-label="${t(currentLang, 'techSpecs')}">
                    <div class="line-height-14">${item.type}</div>
                    ${item.hasWarranty === 'Sí' ? `<div class="warranty-info">📅 ${item.warrantyDate}</div>` : ''}
                </td>
                <td data-label="${t(currentLang, 'actionsLabel')}" class="action-col">
                    <div class="action-icons">
                        <button class="icon-btn icon-btn-info" onclick="openDiagnostic(${item.originalIndex})" title="Diagnóstico">🩺</button>
                        <button class="icon-btn icon-btn-edit" onclick="editEquipment(${item.originalIndex})">✏️</button>
                        <button class="icon-btn icon-btn-danger" onclick="deleteEquipment(${item.originalIndex})">🗑️</button>
                    </div>
                </td>`;
            dom.equipTbody.appendChild(tr);
        });
        updatePagination('equipment', filtered.length, 'equipmentPagination', state, currentLang, (p) => { state.currentPage = p; renderTable(); });
    }
}

// --- Diagnostic Logic ---
window.openDiagnostic = (index) => {
    const o = appData.find(off => off.id === activeOfficeId);
    if (!o) return;
    diagnosticIndex = index;
    const item = o.inventory[index];
    
    document.getElementById('diag-integrated-section').style.display = 'block';
    dom.viewEquip.style.display = 'none';
    dom.sidebarEquip.style.display = 'none'; // Hide sidebar in diag view for mobile focus
    
    document.getElementById('diag-subtitle').textContent = `${item.assetTag} | ${item.model}`;
    document.getElementById('diag-notes-input').value = item.diagNotes || '';
    
    const container = document.getElementById('diag-grid-container');
    renderDiagnosticGrid(container, currentLang, item.diagnostics || {});
    updateNavUI('diagnostic');
};

window.handleDiagToggle = (group, id, isPassed) => {
    const o = appData.find(off => off.id === activeOfficeId);
    const item = o.inventory[diagnosticIndex];
    if (!item.diagnostics) item.diagnostics = { hardware: {}, software: {} };
    item.diagnostics[group][id] = isPassed;
    
    // Update visual state of the card
    const container = document.getElementById('diag-grid-container');
    renderDiagnosticGrid(container, currentLang, item.diagnostics);
};

window.saveIntegratedDiagnosticFlow = async () => {
    const o = appData.find(off => off.id === activeOfficeId);
    const item = o.inventory[diagnosticIndex];
    item.diagNotes = document.getElementById('diag-notes-input').value.trim();
    
    await saveOffice(o);
    Swal.fire({ title: t(currentLang, 'successMsg'), icon: 'success', timer: 1000, showConfirmButton: false });
    closeIntegratedDiagnostic();
};

window.closeIntegratedDiagnostic = () => {
    document.getElementById('diag-integrated-section').style.display = 'none';
    dom.viewEquip.style.display = 'block';
    diagnosticIndex = null;
    renderTable();
};

// ... existing form handlers ...

// Run Init
init();
