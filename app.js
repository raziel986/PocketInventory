/**
 * app.js - PocketITCheck Entry Point (ESM)
 */

import { initDB, getAllOffices, saveOffice, deleteOffice, migrateFromLocalStorage } from './js/db.js';
import { applyTranslations, updatePagination, categoryFields } from './js/ui.js';
import { t, translations, tPdf } from './js/translations.js';
import * as PDF from './js/pdf_engine.js';
import { initDashboard, updateCharts } from './js/dashboard.js';

// State
let appData = [];
let currentLang = localStorage.getItem('pocketIT_lang') || 'es';
let activeOfficeId = null;
let editingOfficeId = null;
let editingIndex = -1;
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
    initDashboard(appData, currentLang);
    
    if (dom.splash) {
        setTimeout(() => {
            dom.splash.classList.add('splash-hidden');
            setTimeout(() => dom.splash.remove(), 500);
        }, 600);
    }
}

// Global Exports for HTML
window.showSection = (sectionId) => {
    // Hide all main sections
    document.querySelectorAll('.main-content').forEach(s => s.style.display = 'none');
    document.querySelectorAll('.output-section').forEach(s => s.style.display = 'none');
    
    // Show target section
    const target = document.getElementById(sectionId);
    if (target) target.style.display = 'block';

    // Update Nav Active State
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    if (sectionId === 'offices-section') document.getElementById('nav-offices').classList.add('active');
    if (sectionId === 'dashboard-section') {
        document.getElementById('nav-dashboard').classList.add('active');
        updateCharts(appData, currentLang);
    }

    // Sidebar logic
    if (sectionId === 'offices-section') {
        dom.sidebarOffices.style.display = 'block';
        dom.sidebarEquip.style.display = 'none';
        activeOfficeId = null;
    }
};
window.toggleLanguage = (isEn) => {
    currentLang = isEn ? 'en' : 'es';
    localStorage.setItem('pocketIT_lang', currentLang);
    applyTranslations(currentLang);
    renderOfficesTable();
    if (activeOfficeId) {
        renderTable();
        const o = appData.find(o => o.id === activeOfficeId);
        if (o) updateOfficeSummaryUI(o);
    }
    // Update charts if on dashboard
    if (document.getElementById('dashboard-section').style.display === 'block') {
        updateCharts(appData, currentLang);
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
    dom.sidebarOffices.style.display = 'none';
    dom.viewOffices.style.display = 'none';
    dom.sidebarEquip.style.display = 'block';
    dom.viewEquip.style.display = 'block';
    updateOfficeSummaryUI(o);
    renderTable();
};

window.goBackToOffices = () => {
    activeOfficeId = null;
    dom.sidebarOffices.style.display = 'block';
    dom.viewOffices.style.display = 'block';
    dom.sidebarEquip.style.display = 'none';
    dom.viewEquip.style.display = 'none';
    renderOfficesTable();
};

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

    if (dom.countBadge) dom.countBadge.textContent = `${filtered.length} ${t(currentLang, 'equipmentCount')}`;

    if (filtered.length === 0) {
        dom.equipTbody.innerHTML = `<tr><td colspan="6" class="empty-state">📭 ${t(currentLang, state.searchQuery ? 'noResults' : 'emptyAssets')}</td></tr>`;
    } else {
        const start = (state.currentPage - 1) * state.itemsPerPage;
        const paged = state.itemsPerPage === Infinity ? filtered : filtered.slice(start, start + state.itemsPerPage);
        
        paged.forEach(item => {
            const tr = document.createElement('tr');
            const statusClass = `status-${item.status.toLowerCase().replace(/\s/g, '-')}`;
            
            tr.innerHTML = `
                <td data-label="${t(currentLang, 'assetTagLabel')}"><strong>${item.assetTag}</strong></td>
                <td data-label="${t(currentLang, 'categoryLabel')}">
                    <span class="badge-type">${t(currentLang, item.type)}</span><br/>
                    <small>${item.model}</small>
                </td>
                <td data-label="${t(currentLang, 'statusLabel')}"><span class="status-pill ${statusClass}">${t(currentLang, item.status)}</span></td>
                <td data-label="${t(currentLang, 'assignmentLabel')}">${item.user}</td>
                <td data-label="${t(currentLang, 'integratedDiag')}">
                    <div style="display:flex; gap: 0.5rem; justify-content: center;">
                        <button class="icon-btn icon-btn-diag" onclick="openDiagnostic(${item.originalIndex})" title="${t(currentLang, 'diagTitle')}">🩺</button>
                        <button class="icon-btn icon-btn-result" onclick="openResult(${item.originalIndex})" title="${t(currentLang, 'maintResult')}">✅</button>
                    </div>
                </td>
                <td data-label="${t(currentLang, 'actionsLabel')}" class="action-col">
                    <div class="action-icons">
                        <button class="icon-btn icon-btn-edit" onclick="editEquipment(${item.originalIndex})">✏️</button>
                        <button class="icon-btn icon-btn-danger" onclick="deleteEquipment(${item.originalIndex})">🗑️</button>
                    </div>
                </td>
            `;
            dom.equipTbody.appendChild(tr);
        });
        updatePagination('equipment', filtered.length, 'equipmentPagination', state, currentLang, (p) => { state.currentPage = p; renderTable(); });
    }
}

// Dynamic Fields Category Change
dom.typeSelect.addEventListener('change', (e) => {
    const type = e.target.value;
    dom.dynamicContainer.innerHTML = '';
    const fields = categoryFields[type] || [];
    fields.forEach(f => {
        const div = document.createElement('div');
        div.className = 'form-group';
        div.innerHTML = `
            <label>${t(currentLang, f.i18nKey)}</label>
            <input type="${f.type}" id="${f.id}" placeholder="${f.placeholder}">
        `;
        dom.dynamicContainer.appendChild(div);
    });
});

dom.equipForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const o = appData.find(off => off.id === activeOfficeId);
    const typeValue = dom.typeSelect.value;
    
    const extraData = {};
    const fields = categoryFields[typeValue] || [];
    fields.forEach(f => {
        const el = document.getElementById(f.id);
        if (el) extraData[f.id] = el.value.trim();
    });

    const equip = {
        assetTag: document.getElementById('assetTag').value.trim(),
        type: typeValue,
        model: document.getElementById('model').value.trim(),
        serial: document.getElementById('serial').value.trim(),
        status: document.getElementById('status').value,
        user: document.getElementById('assignment').value.trim(),
        notes: document.getElementById('notes').value.trim(),
        extra: extraData,
        diagnostics: editingIndex >= 0 ? o.inventory[editingIndex].diagnostics : null,
        maintenanceResult: editingIndex >= 0 ? o.inventory[editingIndex].maintenanceResult : null
    };

    if (editingIndex >= 0) {
        o.inventory[editingIndex] = equip;
        editingIndex = -1;
        dom.submitBtnEquip.innerHTML = `➕ ${t(currentLang, 'addEquipment')}`;
        dom.cancelEditBtn.style.display = 'none';
    } else {
        o.inventory.push(equip);
    }

    await saveOffice(o);
    renderTable();
    dom.equipForm.reset();
    dom.dynamicContainer.innerHTML = '';
});

window.editEquipment = (index) => {
    editingIndex = index;
    const o = appData.find(off => off.id === activeOfficeId);
    const item = o.inventory[index];

    document.getElementById('assetTag').value = item.assetTag;
    dom.typeSelect.value = item.type;
    dom.typeSelect.dispatchEvent(new Event('change'));
    document.getElementById('model').value = item.model;
    document.getElementById('serial').value = item.serial;
    document.getElementById('status').value = item.status;
    document.getElementById('assignment').value = item.user;
    document.getElementById('notes').value = item.notes;

    const fields = categoryFields[item.type] || [];
    fields.forEach(f => {
        const el = document.getElementById(f.id);
        if (el && item.extra && item.extra[f.id]) el.value = item.extra[f.id];
    });

    dom.submitBtnEquip.innerHTML = `💾 ${t(currentLang, 'saveAsset')}`;
    dom.cancelEditBtn.style.display = 'inline-block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.cancelEditEquipment = () => {
    editingIndex = -1;
    dom.equipForm.reset();
    dom.dynamicContainer.innerHTML = '';
    dom.submitBtnEquip.innerHTML = `➕ ${t(currentLang, 'addEquipment')}`;
    dom.cancelEditBtn.style.display = 'none';
};

window.deleteEquipment = async (index) => {
    const res = await Swal.fire({
        title: t(currentLang, 'sureConfirm'), icon: 'warning',
        showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: t(currentLang, 'deleteBtn')
    });
    if (res.isConfirmed) {
        const o = appData.find(off => off.id === activeOfficeId);
        o.inventory.splice(index, 1);
        await saveOffice(o);
        renderTable();
        Swal.fire({ title: t(currentLang, 'deletedMsg'), icon: 'success', timer: 1500, showConfirmButton: false });
    }
};

window.editOffice = (id) => {
    editingOfficeId = id;
    const office = appData.find(o => o.id === id);
    document.getElementById('officeCompany').value = office.company;
    document.getElementById('officeDepto').value = office.depto;
    document.getElementById('officeLocation').value = office.location;
    document.getElementById('officeAuditor').value = office.auditor;
    document.getElementById('officeAuditorCompany').value = office.auditorCompany;
    document.getElementById('officeDate').value = office.auditDate;
    document.getElementById('officeManager').value = office.manager;
    document.getElementById('officeManagerTitle').value = office.managerTitle;

    dom.submitBtnOffice.innerHTML = `💾 ${t(currentLang, 'saveChanges')}`;
    dom.cancelEditOfficeBtn.style.display = 'inline-block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.cancelEditOffice = () => {
    editingOfficeId = null;
    dom.officeForm.reset();
    dom.submitBtnOffice.innerHTML = `📝 ${t(currentLang, 'registerOffice')}`;
    dom.cancelEditOfficeBtn.style.display = 'none';
};

// --- Diagnostic Logic (Integrated View) ---

window.openDiagnostic = (index) => {
    diagnosticIndex = index;
    const o = appData.find(off => off.id === activeOfficeId);
    const item = o.inventory[index];
    
    document.getElementById('diag-title').textContent = `${t(currentLang, 'diagTitle')} - ${item.assetTag}`;
    document.getElementById('diag-subtitle').textContent = `${t(currentLang, item.type)} | ${item.model}`;
    document.getElementById('diag-notes-input').value = item.diagNotes || '';

    const sections = [
        { key: 'power', sub: ['cable', 'bat', 'jack', 'ups'] },
        { key: 'storage', sub: ['smart', 'speed', 'fs', 'space'] },
        { key: 'ram', sub: ['test', 'clean', 'config'] },
        { key: 'temp', sub: ['paste', 'fan', 'throttling'] },
        { key: 'clean', sub: ['int', 'ext', 'kbd'] },
        { key: 'os', sub: ['upd', 'sfc', 'event', 'boot'] },
        { key: 'security', sub: ['av', 'fw', 'enc', 'net'] },
        { key: 'performance', sub: ['drv', 'bg', 'bench'] },
        { key: 'license', sub: ['win', 'off', 'policy'] }
    ];

    const container = document.getElementById('diag-grid-container');
    container.innerHTML = '';
    
    sections.forEach(sec => {
            const group = document.createElement('div');
            group.className = 'diag-group';
            group.innerHTML = `<h4>${t(currentLang, sec.key)}</h4>`;
            sec.sub.forEach(subKey => {
                const val = (item.diagnostics?.hardware?.[sec.key]?.[subKey] !== undefined) ? item.diagnostics.hardware[sec.key][subKey] :
                            (item.diagnostics?.software?.[sec.key]?.[subKey] !== undefined) ? item.diagnostics.software[sec.key][subKey] : true;
                
                const itemDiv = document.createElement('div');
                itemDiv.className = 'diag-item';
                itemDiv.innerHTML = `
                    <div class="diag-info">
                        <div class="diag-label">${t(currentLang, subKey)}</div>
                        <div class="diag-desc">${t(currentLang, 'desc_' + subKey)}</div>
                    </div>
                    <label class="switch">
                        <input type="checkbox" id="diag_${sec.key}_${subKey}" ${val ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                `;
                group.appendChild(itemDiv);
            });
            container.appendChild(group);
    });
    
    document.getElementById('diag-integrated-section').style.display = 'block';
    document.getElementById('result-integrated-section').style.display = 'none';
    window.scrollTo({ top: document.getElementById('diag-integrated-section').offsetTop - 20, behavior: 'smooth' });
};

window.closeIntegratedDiagnostic = () => {
    document.getElementById('diag-integrated-section').style.display = 'none';
    diagnosticIndex = null;
};

window.saveIntegratedDiagnosticFlow = async () => {
    if (diagnosticIndex === null) return;
    const o = appData.find(off => off.id === activeOfficeId);
    const item = o.inventory[diagnosticIndex];

    const hw = {};
    const sw = {};
    
    const sections = [
        { key: 'power', sub: ['cable', 'bat', 'jack', 'ups'], target: hw },
        { key: 'storage', sub: ['smart', 'speed', 'fs', 'space'], target: hw },
        { key: 'ram', sub: ['test', 'clean', 'config'], target: hw },
        { key: 'temp', sub: ['paste', 'fan', 'throttling'], target: hw },
        { key: 'clean', sub: ['int', 'ext', 'kbd'], target: hw },
        { key: 'os', sub: ['upd', 'sfc', 'event', 'boot'], target: sw },
        { key: 'security', sub: ['av', 'fw', 'enc', 'net'], target: sw },
        { key: 'performance', sub: ['drv', 'bg', 'bench'], target: sw },
        { key: 'license', sub: ['win', 'off', 'policy'], target: sw }
    ];

    sections.forEach(sec => {
        sec.target[sec.key] = {};
        sec.sub.forEach(sub => {
            sec.target[sec.key][sub] = document.getElementById(`diag_${sec.key}_${sub}`).checked;
        });
    });

    item.diagnostics = { hardware: hw, software: sw };
    item.diagNotes = document.getElementById('diag-notes-input').value.trim();
    
    await saveOffice(o);
    renderTable();
    closeIntegratedDiagnostic();
    Swal.fire({ title: t(currentLang, 'successMsg'), icon: 'success', timer: 1000, showConfirmButton: false });
};

// --- Results Logic (Integrated View) ---

window.openResult = (index) => {
    resultIndex = index;
    const o = appData.find(off => off.id === activeOfficeId);
    const item = o.inventory[index];
    
    document.getElementById('result-title').textContent = `${t(currentLang, 'maintResult')} - ${item.assetTag}`;
    document.getElementById('result-subtitle').textContent = `${t(currentLang, item.type)} | ${item.model}`;
    document.getElementById('result-status').value = item.maintenanceResult?.status || 'Pendiente';
    document.getElementById('result-date').value = item.maintenanceResult?.date || new Date().toISOString().split('T')[0];
    document.getElementById('result-notes-input').value = item.maintenanceResult?.techNotes || '';

    const itemsContainer = document.getElementById('result-items-container');
    itemsContainer.innerHTML = '';
    
    if (item.diagnostics) {
        const allFailed = [];
        const sections = { ...item.diagnostics.hardware, ...item.diagnostics.software };
        Object.keys(sections).forEach(cat => {
            Object.keys(sections[cat]).forEach(sub => {
                if (sections[cat][sub] === false) allFailed.push(sub);
            });
        });

        if (allFailed.length === 0) {
            itemsContainer.innerHTML = `<p style="grid-column: span 2; color: #64748b; font-style: italic;">${t(currentLang, 'allLabel')} OK</p>`;
        } else {
            allFailed.forEach(subKey => {
                const checked = item.maintenanceResult?.resolvedItems?.[subKey] || false;
                const div = document.createElement('div');
                div.className = 'diag-item';
                div.style.padding = '0.5rem';
                div.innerHTML = `
                    <div class="diag-label" style="font-size: 0.85rem;">${t(currentLang, subKey)}</div>
                    <label class="switch" style="transform: scale(0.8);">
                        <input type="checkbox" id="res_${subKey}" ${checked ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                `;
                itemsContainer.appendChild(div);
            });
        }
    }

    document.getElementById('result-integrated-section').style.display = 'block';
    document.getElementById('diag-integrated-section').style.display = 'none';
    window.scrollTo({ top: document.getElementById('result-integrated-section').offsetTop - 20, behavior: 'smooth' });
};

window.closeMaintenanceResult = () => {
    document.getElementById('result-integrated-section').style.display = 'none';
    resultIndex = null;
};

window.saveMaintenanceResult = async () => {
    if (resultIndex === null) return;
    const o = appData.find(off => off.id === activeOfficeId);
    const item = o.inventory[resultIndex];

    const resolved = {};
    if (item.diagnostics) {
        const sections = { ...item.diagnostics.hardware, ...item.diagnostics.software };
        Object.keys(sections).forEach(cat => {
            Object.keys(sections[cat]).forEach(sub => {
                if (sections[cat][sub] === false) {
                    resolved[sub] = document.getElementById(`res_${sub}`).checked;
                }
            });
        });
    }

    item.maintenanceResult = {
        status: document.getElementById('result-status').value,
        date: document.getElementById('result-date').value,
        techNotes: document.getElementById('result-notes-input').value.trim(),
        resolvedItems: resolved
    };

    if (item.maintenanceResult.status === 'Completado') {
        item.status = 'Activo';
    }

    await saveOffice(o);
    renderTable();
    closeMaintenanceResult();
    Swal.fire({ title: t(currentLang, 'successMsg'), icon: 'success', timer: 1000, showConfirmButton: false });
};

// --- Report Generation ---
window.exportToPDF = async () => {
    const { generateInventoryPDF } = await import('./js/reports.js');
    const o = appData.find(off => off.id === activeOfficeId);
    if (o) generateInventoryPDF(o, currentLang);
};

window.generateMasterMaintenancePlanPDF = async () => {
    const { generateMasterPlanPDF } = await import('./js/reports.js');
    const o = appData.find(off => off.id === activeOfficeId);
    if (o) generateMasterPlanPDF(o, currentLang);
};

window.generateResultsReportPDF = async () => {
    const { generateResultsReportPDF } = await import('./js/reports.js');
    const o = appData.find(off => off.id === activeOfficeId);
    if (o) generateResultsReportPDF(o, currentLang);
};

window.exportToCSV = () => {
    const o = appData.find(off => off.id === activeOfficeId);
    if (!o) return;
    const items = o.inventory;
    let csv = "Asset Tag,Type,Model,S/N,Status,User\n";
    items.forEach(i => {
        csv += `"${i.assetTag}","${i.type}","${i.model}","${i.serial}","${i.status}","${i.user}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Inventario_${o.company}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// --- Form Listeners ---
dom.officeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const office = {
        id: editingOfficeId || Date.now().toString(),
        company: document.getElementById('officeCompany').value.trim(),
        depto: document.getElementById('officeDepto').value.trim(),
        location: document.getElementById('officeLocation').value.trim(),
        auditor: document.getElementById('officeAuditor').value.trim(),
        auditorCompany: document.getElementById('officeAuditorCompany').value.trim(),
        auditDate: document.getElementById('officeDate').value,
        manager: document.getElementById('officeManager').value.trim(),
        managerTitle: document.getElementById('officeManagerTitle').value.trim(),
        inventory: editingOfficeId ? appData.find(o => o.id === editingOfficeId).inventory : []
    };

    if (editingOfficeId) {
        const idx = appData.findIndex(o => o.id === editingOfficeId);
        appData[idx] = office;
        editingOfficeId = null;
        dom.submitBtnOffice.innerHTML = `📝 ${t(currentLang, 'registerOffice')}`;
        dom.cancelEditOfficeBtn.style.display = 'none';
    } else {
        appData.push(office);
    }

    await saveOffice(office);
    renderOfficesTable();
    dom.officeForm.reset();
    Swal.fire({ title: t(currentLang, 'successMsg'), icon: 'success', timer: 1000, showConfirmButton: false });
});

// Start Init
init();
