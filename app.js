/**
 * app.js - PocketITCheck Entry Point (ESM)
 */

import { initDB, getAllOffices, saveOffice, deleteOffice, migrateFromLocalStorage } from './js/db.js';
import { applyTranslations, updatePagination, categoryFields } from './js/ui.js';
import { t, tPdf } from './js/translations.js';
import { getStatusColor, drawHeaderTypeA, drawHeaderTypeB, drawSubheader, drawModelSignatures, addModelPageNumbers } from './js/pdf_engine.js';

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

const statusColorMap = { Activo: '#10b981', Stock: '#3b82f6', Reparacion: '#f59e0b', Baja: '#ef4444' };

const DIAG_STRUCTURE = [
    {
        category: 'hardware',
        groups: [
            { key: 'power', items: [{ id: 'cables', label: 'cables', desc: 'desc_cable' }, { id: 'battery', label: 'battery', desc: 'desc_bat' }] },
            { key: 'storage', items: [{ id: 'smart', label: 'smart', desc: 'desc_smart' }, { id: 'speed', label: 'speed', desc: 'desc_speed' }] },
            { key: 'ram', items: [{ id: 'test', label: 'test', desc: 'desc_test' }, { id: 'clean_ram', label: 'clean_ram', desc: 'desc_clean_ram' }] },
            { key: 'temp', items: [{ id: 'paste', label: 'thermalPaste', desc: 'desc_paste' }, { id: 'fan', label: 'fans', desc: 'desc_fan' }] },
            { key: 'clean', items: [{ id: 'int', label: 'internal', desc: 'desc_int' }, { id: 'ext', label: 'external', desc: 'desc_ext' }] }
        ]
    },
    {
        category: 'software',
        groups: [
            { key: 'os', items: [{ id: 'upd', label: 'updates', desc: 'desc_upd' }, { id: 'sfc', label: 'integrity', desc: 'desc_sfc' }] },
            { key: 'security', items: [{ id: 'av', label: 'av', desc: 'desc_av' }, { id: 'fw', label: 'fw', desc: 'desc_fw' }] },
            { key: 'performance', items: [{ id: 'drv', label: 'drv', desc: 'desc_drv' }, { id: 'bg', label: 'bg', desc: 'desc_bg' }] },
            { key: 'license', items: [{ id: 'win', label: 'win', desc: 'desc_win' }, { id: 'off', label: 'off', desc: 'desc_off' }] }
        ]
    }
];

// DOM Cache
// DOM Cache — populated inside DOMContentLoaded
let dom = {};

document.addEventListener('DOMContentLoaded', () => {
    dom = {
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
        officeCountBadge: document.getElementById('officeCountBadge'),
        mainFAB: document.getElementById('mainFAB')
    };

    // Office form submit
    if (dom.officeForm) {
        dom.officeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newOffice = {
                id: editingOfficeId || Date.now().toString(),
                company: document.getElementById('officeCompany').value.trim(),
                depto: document.getElementById('officeDepto').value.trim(),
                location: document.getElementById('officeLocation').value.trim(),
                auditor: document.getElementById('officeAuditor').value.trim(),
                auditorCompany: document.getElementById('officeAuditorCompany').value.trim(),
                auditDate: document.getElementById('officeDate').value,
                manager: document.getElementById('officeManager').value.trim(),
                managerTitle: document.getElementById('officeManagerTitle').value.trim(),
                inventory: editingOfficeId ? (appData.find(o => o.id === editingOfficeId) || { inventory: [] }).inventory : []
            };
            await saveOffice(newOffice);
            if (editingOfficeId) {
                const idx = appData.findIndex(o => o.id === editingOfficeId);
                if (idx !== -1) appData[idx] = newOffice;
                editingOfficeId = null;
            } else {
                appData.push(newOffice);
            }
            dom.officeForm.reset();
            dom.sidebarOffices.style.display = 'none';
            dom.viewOffices.style.display = 'block';
            renderOfficesTable();
            Swal.fire({ title: t(currentLang, 'successMsg'), icon: 'success', timer: 1200, showConfirmButton: false });
        });
    }

    // Equipment form submit
    if (dom.equipForm) {
        dom.equipForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const o = appData.find(off => off.id === activeOfficeId);
            if (!o) return;
            const specs = {};
            const typeValue = document.getElementById('type').value;
            if (categoryFields[typeValue]) {
                categoryFields[typeValue].forEach(f => {
                    const el = document.getElementById(f.id);
                    if (el) specs[f.id] = el.value.trim();
                });
            }

            const item = {
                type: typeValue,
                typeValue: typeValue,
                model: document.getElementById('model').value.trim(),
                serial: document.getElementById('serial').value.trim(),
                assetTag: document.getElementById('assetTag').value.trim(),
                status: document.getElementById('status').value,
                hasWarranty: document.getElementById('hasWarranty').value,
                purchaseDate: document.getElementById('purchaseDate').value,
                warrantyDate: document.getElementById('warrantyDate').value,
                user: document.getElementById('user').value.trim(),
                notes: document.getElementById('notes').value.trim(),
                specs: specs,
                diagnostics: editingIndex >= 0 && o.inventory[editingIndex] ? o.inventory[editingIndex].diagnostics : null,
                maintenanceResult: editingIndex >= 0 && o.inventory[editingIndex] ? o.inventory[editingIndex].maintenanceResult : null
            };
            if (editingIndex >= 0) {
                o.inventory[editingIndex] = { ...o.inventory[editingIndex], ...item };
            } else {
                o.inventory.push(item);
            }
            await saveOffice(o);
            editingIndex = -1;
            dom.equipForm.reset();
            if (dom.dynamicContainer) dom.dynamicContainer.innerHTML = '';
            dom.sidebarEquip.style.display = 'none';
            dom.viewEquip.style.display = 'block';
            renderTable();
            Swal.fire({ title: t(currentLang, 'successMsg'), icon: 'success', timer: 1200, showConfirmButton: false, confirmButtonColor: '#3525cd' });
        });
    }

    // Start the app
    init();
});

// Init
async function init() {
    try {
        await migrateFromLocalStorage();
        appData = await getAllOffices();
        applyTranslations(currentLang);
        renderOfficesTable();
    } catch (err) {
        console.error('Initialization error:', err);
        // Ensure even if there's an error, we show some UI or message
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'Error de Inicio',
                text: 'Hubo un problema al cargar los datos. Por favor, recarga la página.',
                icon: 'error'
            });
        }
    } finally {
        if (dom.splash) {
            setTimeout(() => {
                dom.splash.classList.add('splash-hidden');
                setTimeout(() => dom.splash.remove(), 500);
            }, 600);
        }
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
    // All sections hidden by default, only show inventory table
    dom.sidebarOffices.style.display = 'none';
    dom.viewOffices.style.display = 'none';
    dom.sidebarEquip.style.display = 'none';
    dom.viewEquip.style.display = 'block';
    updateOfficeSummaryUI(o);
    renderTable();
};

window.showAddEquipmentForm = () => {
    editingIndex = -1;
    dom.equipForm.reset();
    const hw = document.getElementById('hasWarranty');
    if (hw) hw.value = 'No';
    if (typeof window.toggleDates === 'function') window.toggleDates();
    if (dom.dynamicContainer) dom.dynamicContainer.innerHTML = '';
    const title = document.getElementById('equipmentFormTitle');
    if (title) title.setAttribute('data-i18n', 'newEquipment');
    if (dom.cancelEditBtn) dom.cancelEditBtn.style.display = 'none';
    const subBtn = document.getElementById('submitBtnEquipment');
    if (subBtn) subBtn.innerHTML =  t(currentLang, 'addEquipment');
    // Show the form, hide inventory table
    dom.viewEquip.style.display = 'none';
    dom.sidebarEquip.style.display = 'block';
};

window.cancelEdit = () => {
    window.hideAddEquipmentForm();
};

window.cancelEditOffice = () => {
    window.hideAddOfficeForm();
};

window.hideAddEquipmentForm = () => {
    editingIndex = -1;
    dom.equipForm.reset();
    if (dom.dynamicContainer) dom.dynamicContainer.innerHTML = '';
    // Show inventory table, hide the form
    dom.sidebarEquip.style.display = 'none';
    dom.viewEquip.style.display = 'block';
};

window.goBackToOffices = () => {
    activeOfficeId = null;
    dom.sidebarOffices.style.display = 'none';
    dom.viewOffices.style.display = 'block';
    dom.sidebarEquip.style.display = 'none';
    dom.viewEquip.style.display = 'none';
    renderOfficesTable();
};

window.showAddOfficeForm = () => {
    editingOfficeId = null;
    dom.officeForm.reset();
    document.getElementById('officeCompany').focus();
    dom.viewOffices.style.display = 'none';
    dom.sidebarOffices.style.display = 'block';
};

window.hideAddOfficeForm = () => {
    editingOfficeId = null;
    dom.officeForm.reset();
    dom.sidebarOffices.style.display = 'none';
    dom.viewOffices.style.display = 'block';
};

window.handleFABClick = () => {
    if (activeOfficeId) {
        window.showAddEquipmentForm();
    } else {
        window.showAddOfficeForm();
    }
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
    // Robust selection of list container
    let listContainer = document.getElementById('officesListContainer');
    if (!listContainer) {
        const viewOffices = document.getElementById('viewOfficesTable');
        if (!viewOffices) return;
        const tableCont = viewOffices.querySelector('.table-container');
        if (tableCont) {
            tableCont.style.display = 'none';
            listContainer = document.createElement('div');
            listContainer.id = 'officesListContainer';
            tableCont.parentNode.insertBefore(listContainer, tableCont.nextSibling);
        } else {
            listContainer = document.createElement('div');
            listContainer.id = 'officesListContainer';
            viewOffices.appendChild(listContainer);
        }
    }

    listContainer.innerHTML = '';
    const state = tableState.offices;
    let filtered = appData.filter(o =>
        (o.company || '').toLowerCase().includes(state.searchQuery) ||
        (o.depto || '').toLowerCase().includes(state.searchQuery) ||
        (o.location || '').toLowerCase().includes(state.searchQuery) ||
        (o.auditor || '').toLowerCase().includes(state.searchQuery)
    );

    if (dom.officeCountBadge) dom.officeCountBadge.textContent = `${appData.length} ${t(currentLang, 'officesCount')}`;

    if (filtered.length === 0) {
        listContainer.innerHTML = `<div class="glass-card" style="text-align:center; padding: 4rem 2rem;">
            <div style="font-size: 3rem; margin-bottom: 1rem;">🏢</div>
            <h3 style="margin-bottom:0.5rem;">${t(currentLang, 'emptyOffices')}</h3>
            <p style="color:var(--outline);">${t(currentLang, 'noResults')}</p>
        </div>`;
    } else {
        const grid = document.createElement('div');
        grid.className = 'grid-container';
        grid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem;';
        listContainer.appendChild(grid);
        
        const start = (state.currentPage - 1) * state.itemsPerPage;
        const paged = state.itemsPerPage === Infinity ? filtered : filtered.slice(start, start + state.itemsPerPage);
        
        paged.forEach(office => {
            const card = document.createElement('div');
            card.className = 'glass-card office-card';
            card.innerHTML = `
                <div class="office-info">
                    <div class="office-icon">
                        <span class="material-symbols-outlined">business</span>
                    </div>
                    <div class="office-details">
                        <h3>${office.company}</h3>
                        <div style="font-size: 0.85rem; color: var(--on-surface-variant); font-weight:500;">
                            ${t(currentLang, 'deptLabel')}: <b style="color:var(--primary); font-weight:700;">${office.depto}</b>
                        </div>
                    </div>
                </div>
                <div class="office-meta">
                    <div class="meta-item">
                        <span class="material-symbols-outlined">location_on</span>
                        <span>${office.location}</span>
                    </div>
                    <div class="meta-item">
                        <span class="material-symbols-outlined">person_check</span>
                        <span>Auditor: ${office.auditor}</span>
                    </div>
                </div>
                <div class="office-stats">
                    <div class="stat-badge">
                        <span class="stat-value">${(office.inventory || []).length}</span>
                        <span class="stat-label">${t(currentLang, 'equips')}</span>
                    </div>
                    <div class="stat-date">
                        <span class="material-symbols-outlined">calendar_today</span>
                        <span>${office.auditDate}</span>
                    </div>
                </div>
                <div class="office-actions" style="display: flex; gap: 0.5rem; margin-top: 1.25rem;">
                    <button class="btn btn-primary btn-sm" onclick="selectOffice('${office.id}')" style="flex:1;">
                        <span class="material-symbols-outlined">visibility</span> Ver
                    </button>
                    <button class="icon-btn-circle" onclick="editOffice('${office.id}')">
                        <span class="material-symbols-outlined">edit</span>
                    </button>
                    <button class="icon-btn-circle btn-danger" onclick="deleteOfficeHandler('${office.id}')">
                        <span class="material-symbols-outlined">delete</span>
                    </button>
                </div>
            `;
            grid.appendChild(card);
        });

        const paginationCont = document.getElementById('officePagination');
        if (paginationCont) {
            updatePagination('offices', filtered.length, paginationCont);
        }
    }
}

window.editOffice = (id) => {
    const o = appData.find(o => o.id === id);
    if (!o) return;
    editingOfficeId = id;
    
    document.getElementById('officeCompany').value = o.company;
    document.getElementById('officeDepto').value = o.depto;
    document.getElementById('officeLocation').value = o.location;
    document.getElementById('officeAuditor').value = o.auditor;
    document.getElementById('officeAuditorCompany').value = o.auditorCompany || '';
    document.getElementById('officeDate').value = o.auditDate || '';
    document.getElementById('officeManager').value = o.manager || '';
    document.getElementById('officeManagerTitle').value = o.managerTitle || '';
    
    dom.viewOffices.style.display = 'none';
    dom.sidebarOffices.style.display = 'block';
};

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

// Equipment rendering
function renderTable() {
    if (!dom.equipTbody) return;
    dom.equipTbody.innerHTML = '';
    const o = appData.find(off => off.id === activeOfficeId);
    if (!o) return;
    const state = tableState.equipment;
    const q = state.searchQuery;
    let filtered = o.inventory.map((item, idx) => ({ ...item, originalIndex: idx }))
        .filter(item => {
            return item.assetTag.toLowerCase().includes(q) || (item.type||'').toLowerCase().includes(q) ||
                (item.model||'').toLowerCase().includes(q) || (item.serial||'').toLowerCase().includes(q) ||
                (item.user||'').toLowerCase().includes(q) || (item.notes||'').toLowerCase().includes(q);
        });

    if (dom.countBadge) dom.countBadge.textContent = `${o.inventory.length} ${t(currentLang, 'equipmentCount')}`;

    if (filtered.length === 0) {
        dom.equipTbody.innerHTML = `<tr><td colspan="5" class="empty-state">📭 ${t(currentLang, q ? 'noResults' : 'emptyAssets')}</td></tr>`;
    } else {
        const start = (state.currentPage - 1) * state.itemsPerPage;
        const paged = state.itemsPerPage === Infinity ? filtered : filtered.slice(start, start + state.itemsPerPage);
        paged.forEach(item => {
            const hasDiag = item.diagnostics ? Object.values({...item.diagnostics.hardware,...item.diagnostics.software}).some(v => v === false) : false;
            const hasMaint = !!item.maintenanceResult;
            const statusColor = statusColorMap[item.status] || '#64748b';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td data-label="${t(currentLang,'assetTagLabel')}"><span class="section-label" style="background:var(--primary-container); color:var(--on-primary-container);">${item.assetTag}</span></td>
                <td data-label="${t(currentLang,'infoGeneral')}">
                    <div style="font-family:var(--font-headline); font-weight:700; color:var(--primary);">${t(currentLang, item.type)}</div>
                    <div style="font-weight:600; font-size:0.9rem;">${item.model}</div>
                    ${item.specs ? `<div style="font-size:0.75rem; color:var(--outline); margin-top:4px; display:flex; flex-wrap:wrap; gap:8px;">
                        ${Object.entries(item.specs).filter(([k,v]) => v).map(([k,v]) => `<span>• ${v}</span>`).join('')}
                    </div>` : ''}
                </td>
                <td data-label="${t(currentLang,'statusAssignment')}">
                    <span class="badge-status status-${item.status.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}">${t(currentLang, item.status)}</span><br/>
                    <div style="font-size:0.85rem; color:var(--outline); margin-top:4px;">
                        <span class="material-symbols-outlined" style="font-size:0.9rem; vertical-align:middle;">person</span> ${item.user}
                    </div>
                </td>
                <td data-label="${t(currentLang,'techSpecs')}">
                    <div style="font-size:0.85rem;"><span style="color:var(--outline);">S/N:</span> <b>${item.serial || '-'}</b></div>
                    ${item.purchaseDate ? `<div style="font-size:0.75rem; color:var(--outline); margin-top:2px;">📅 ${item.purchaseDate}</div>` : ''}
                </td>
                <td data-label="${t(currentLang,'actionsLabel')}" class="action-col">
                    <div style="display:flex; gap:0.25rem;">
                        <button class="menu-btn" onclick="editEquipment(${item.originalIndex})" title="${t(currentLang,'editEquipment')}"><span class="material-symbols-outlined">edit</span></button>
                        <button class="menu-btn" onclick="openDiagnostic(${item.originalIndex})" title="${t(currentLang,'integratedDiag')}" style="color:var(--primary);"><span class="material-symbols-outlined">biotech</span></button>
                        <button class="menu-btn" onclick="openMaintenanceResult(${item.originalIndex})" title="${t(currentLang,'maintResult')}" style="color:${hasMaint ? '#10b981' : '#f59e0b'};"><span class="material-symbols-outlined">${hasMaint ? 'task_alt' : 'tools_wrench'}</span></button>
                        <button class="menu-btn" onclick="deleteItem(${item.originalIndex})" title="${t(currentLang,'deleteBtn')}" style="color:var(--error);"><span class="material-symbols-outlined">delete</span></button>
                    </div>
                </td>`;
            dom.equipTbody.appendChild(tr);
        });
        updatePagination('equipment', filtered.length, 'equipmentPagination', state, currentLang, (p) => { state.currentPage = p; renderTable(); });
    }
}

window.editEquipment = (idx) => {
    const o = appData.find(off => off.id === activeOfficeId);
    if (!o) return;
    const item = o.inventory[idx];
    if (!item) return;
    editingIndex = idx;
    document.getElementById('type').value = item.type || '';
    document.getElementById('model').value = item.model || '';
    document.getElementById('serial').value = item.serial || '';
    document.getElementById('assetTag').value = item.assetTag || '';
    document.getElementById('status').value = item.status || 'Activo';
    document.getElementById('hasWarranty').value = item.hasWarranty || 'No';
    if (typeof window.toggleDates === 'function') window.toggleDates();
    document.getElementById('purchaseDate').value = item.purchaseDate || '';
    document.getElementById('warrantyDate').value = item.warrantyDate || '';
    document.getElementById('user').value = item.user || '';
    document.getElementById('notes').value = item.notes || '';
    // Show form, hide table
    dom.viewEquip.style.display = 'none';
    dom.sidebarEquip.style.display = 'block';
    if (title) title.textContent = '📋 ' + t(currentLang, 'editEquipment');
    if (dom.cancelEditBtn) dom.cancelEditBtn.style.display = 'inline-block';
    const subBtn = document.getElementById('submitBtnEquipment');
    if (subBtn) subBtn.innerHTML = '💾 ' + t(currentLang, 'saveAsset');

    window.updateDynamicFields(item.type);
    if (item.specs) {
        Object.keys(item.specs).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = item.specs[id];
        });
    }
};

window.updateDynamicFields = (type) => {
    if (!dom.dynamicContainer) return;
    dom.dynamicContainer.innerHTML = '';
    const fields = categoryFields[type];
    if (!fields) return;

    const grid = document.createElement('div');
    grid.className = 'form-grid-3';
    grid.style.gap = '1rem';
    grid.style.marginTop = '1rem';
    grid.style.paddingTop = '1rem';
    grid.style.borderTop = '1px dashed #e2e8f0';

    fields.forEach(f => {
        const group = document.createElement('div');
        group.className = 'form-group';
        group.innerHTML = `
            <label>${t(currentLang, f.i18nKey)}</label>
            <input type="${f.type}" id="${f.id}" placeholder="${f.placeholder}">
        `;
        grid.appendChild(group);
    });
    dom.dynamicContainer.appendChild(grid);
};

window.toggleDates = () => {
    const val = document.getElementById('hasWarranty').value;
    const pContainer = document.getElementById('purchaseDateContainer');
    const wContainer = document.getElementById('warrantyDateContainer');
    if (val === 'Sí') {
        if (pContainer) pContainer.style.display = 'block';
        if (wContainer) wContainer.style.display = 'block';
    } else {
        if (pContainer) pContainer.style.display = 'none';
        if (wContainer) wContainer.style.display = 'none';
        const pInput = document.getElementById('purchaseDate');
        const wInput = document.getElementById('warrantyDate');
        if (pInput) pInput.value = '';
        if (wInput) wInput.value = '';
    }
};

window.deleteItem = async (idx) => {
    const res = await Swal.fire({
        title: t(currentLang, 'sureConfirm'), icon: 'warning',
        showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: t(currentLang, 'deleteBtn')
    });
    if (res.isConfirmed) {
        const o = appData.find(off => off.id === activeOfficeId);
        if (!o) return;
        o.inventory.splice(idx, 1);
        await saveOffice(o);
        renderTable();
        Swal.fire({ title: t(currentLang, 'deletedMsg'), icon: 'success', timer: 1500, showConfirmButton: false });
    }
};



// Diagnostic Functions
window.openDiagnostic = (idx) => {
    const o = appData.find(off => off.id === activeOfficeId);
    if (!o) return;
    const item = o.inventory[idx];
    if (!item) return;

    diagnosticIndex = idx;
    const diagSection = document.getElementById('diag-integrated-section');
    if (diagSection) diagSection.style.display = 'block';
    if (dom.viewEquip) dom.viewEquip.style.display = 'none';

    const titleEl = document.getElementById('diag-title');
    const subtitleEl = document.getElementById('diag-subtitle');
    if (titleEl) titleEl.textContent = ` ${t(currentLang, 'diagTitle')}`;
    if (subtitleEl) subtitleEl.textContent = `${item.assetTag} - ${item.model}`;
    
    if (!item.diagnostics) {
        item.diagnostics = { hardware: {}, software: {}, notes: '' };
    }
    const notesInput = document.getElementById('diag-notes-input');
    if (notesInput) notesInput.value = item.diagnostics.notes || '';

    const container = document.getElementById('diag-grid-container');
    if (container) {
        container.innerHTML = '';
        DIAG_STRUCTURE.forEach(cat => {
            const section = document.createElement('div');
            section.className = 'diag-card';
            
            const allChecked = cat.groups.every(g => g.items.every(it => (item.diagnostics[cat.category] || {})[it.id] === true));

            section.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 0.5rem; margin-bottom: 1.5rem;">
                    <h3 style="color: var(--primary); margin: 0;">${t(currentLang, cat.category)}</h3>
                    <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: #64748b;">
                        <label for="master-${cat.category}" style="cursor: pointer; font-weight: 500;">${t(currentLang, 'checkAll')}</label>
                        <input type="checkbox" id="master-${cat.category}" ${allChecked ? 'checked' : ''} 
                            style="width: 18px; height: 18px; cursor: pointer;"
                            onchange="toggleCategoryMaster('${cat.category}', this.checked)">
                    </div>
                </div>`;
            
            cat.groups.forEach(group => {
                const groupDiv = document.createElement('div');
                groupDiv.style.marginBottom = '1.5rem';
                groupDiv.innerHTML = `<h4 style="margin: 0 0 0.8rem 0; color: #475569; font-size: 0.95rem; display: flex; align-items: center; gap: 0.5rem;">
                    <span style="width: 8px; height: 8px; border-radius: 50%; background: var(--primary);"></span> ${t(currentLang, group.key)}</h4>`;
                
                const itemsList = document.createElement('div');
                itemsList.style.display = 'flex';
                itemsList.style.flexDirection = 'column';
                itemsList.style.gap = '0.75rem';
                itemsList.style.paddingLeft = '1.2rem';

                group.items.forEach(it => {
                    const isOk = (item.diagnostics[cat.category] || {})[it.id] === true;
                    const itemDiv = document.createElement('div');
                    itemDiv.className = 'diag-item-row';
                    itemDiv.style.display = 'flex';
                    itemDiv.style.alignItems = 'flex-start';
                    itemDiv.style.gap = '0.75rem';
                    
                    itemDiv.innerHTML = `
                        <input type="checkbox" id="diag-${cat.category}-${it.id}" ${isOk ? 'checked' : ''} 
                            style="width: 18px; height: 18px; margin-top: 3px; cursor: pointer;"
                            onchange="updateDiagState('${cat.category}', '${it.id}', this.checked)">
                        <label for="diag-${cat.category}-${it.id}" style="cursor: pointer; flex: 1;">
                            <div style="font-weight: 600; font-size: 0.9rem; color: var(--text-main);">${t(currentLang, it.label)}</div>
                            <div style="font-size: 0.8rem; color: #64748b; line-height: 1.3;">${t(currentLang, it.desc)}</div>
                        </label>`;
                    itemsList.appendChild(itemDiv);
                });
                groupDiv.appendChild(itemsList);
                section.appendChild(groupDiv);
            });
            container.appendChild(section);
        });
    }
};

window.updateDiagState = (cat, it, val) => {
    const o = appData.find(off => off.id === activeOfficeId);
    if (o && o.inventory[diagnosticIndex]) {
        if (!o.inventory[diagnosticIndex].diagnostics) o.inventory[diagnosticIndex].diagnostics = { hardware:{}, software:{}, notes:'' };
        o.inventory[diagnosticIndex].diagnostics[cat][it] = val;

        // Auto-update master checkbox state
        const catStruct = DIAG_STRUCTURE.find(c => c.category === cat);
        if (catStruct) {
            const allChecked = catStruct.groups.every(g => g.items.every(itemIt => (o.inventory[diagnosticIndex].diagnostics[cat] || {})[itemIt.id] === true));
            const masterCb = document.getElementById(`master-${cat}`);
            if (masterCb) masterCb.checked = allChecked;
        }
    }
};

window.toggleCategoryMaster = (catName, val) => {
    const o = appData.find(off => off.id === activeOfficeId);
    if (!o || !o.inventory[diagnosticIndex]) return;
    const item = o.inventory[diagnosticIndex];
    if (!item.diagnostics) item.diagnostics = { hardware: {}, software: {}, notes: '' };
    if (!item.diagnostics[catName]) item.diagnostics[catName] = {};
    
    const catStruct = DIAG_STRUCTURE.find(c => c.category === catName);
    if (catStruct) {
        catStruct.groups.forEach(g => {
            g.items.forEach(it => {
                item.diagnostics[catName][it.id] = val;
            });
        });
    }
    openDiagnostic(diagnosticIndex);
};

window.saveIntegratedDiagnosticFlow = async () => {
    const o = appData.find(off => off.id === activeOfficeId);
    if (o && o.inventory[diagnosticIndex]) {
        const notesInput = document.getElementById('diag-notes-input');
        if (notesInput) o.inventory[diagnosticIndex].diagnostics.notes = notesInput.value;
        await saveOffice(o);
        closeIntegratedDiagnostic();
        renderTable();
        if (typeof Swal !== 'undefined') Swal.fire({ title: t(currentLang, 'successMsg'), icon: 'success', timer: 1200, showConfirmButton: false });
    }
};

window.closeIntegratedDiagnostic = () => {
    diagnosticIndex = null;
    const diagSection = document.getElementById('diag-integrated-section');
    if (diagSection) diagSection.style.display = 'none';
    if (dom.viewEquip) dom.viewEquip.style.display = 'block';
};

// Maintenance Results Functions
window.openMaintenanceResult = (idx) => {
    const o = appData.find(off => off.id === activeOfficeId);
    if (!o) return;
    const item = o.inventory[idx];
    if (!item) return;

    resultIndex = idx;
    const resultSection = document.getElementById('result-integrated-section');
    if (resultSection) resultSection.style.display = 'block';
    if (dom.viewEquip) dom.viewEquip.style.display = 'none';

    const titleEl = document.getElementById('result-title');
    const subtitleEl = document.getElementById('result-subtitle');
    if (titleEl) titleEl.textContent = `✅ ${t(currentLang, 'maintResult')}`;
    if (subtitleEl) subtitleEl.textContent = `${item.assetTag} - ${item.model}`;

    if (!item.maintenanceResult) {
        item.maintenanceResult = { status: 'Pendiente', date: new Date().toISOString().split('T')[0], notes: '', resolvedItems: [] };
    }

    const statusEl = document.getElementById('result-status');
    const dateEl = document.getElementById('result-date');
    const notesEl = document.getElementById('result-notes-input');
    if (statusEl) statusEl.value = item.maintenanceResult.status || 'Pendiente';
    if (dateEl) dateEl.value = item.maintenanceResult.date || '';
    if (notesEl) notesEl.value = item.maintenanceResult.notes || '';

    const container = document.getElementById('result-items-container');
    if (container) {
        container.innerHTML = '';
        const diagObj = item.diagnostics || {};
        const resolvedItems = item.maintenanceResult.resolvedItems || [];

        DIAG_STRUCTURE.forEach(cat => {
            // Collect only failed items for this category
            let hasFailedItems = false;
            const catFailedGroups = [];

            cat.groups.forEach(group => {
                const failedInGroup = [];
                group.items.forEach(it => {
                    const isOk = (diagObj[cat.category] || {})[it.id] === true;
                    if (!isOk) {
                        failedInGroup.push(it);
                        hasFailedItems = true;
                    }
                });
                if (failedInGroup.length > 0) {
                    catFailedGroups.push({ group, failedItems: failedInGroup });
                }
            });

            if (!hasFailedItems) return;

            // Build category card (like diagnostic view)
            const section = document.createElement('div');
            section.className = 'diag-card';

            // Check if all failed items in this category are resolved
            const allResolved = catFailedGroups.every(g =>
                g.failedItems.every(it => resolvedItems.includes(`${cat.category}:${it.id}`))
            );

            section.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 0.5rem; margin-bottom: 1.5rem;">
                    <h3 style="color: ${allResolved ? '#059669' : '#dc2626'}; margin: 0;">${allResolved ? '✅' : '⚠️'} ${t(currentLang, cat.category)}</h3>
                    <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: #64748b;">
                        <label for="resolve-master-${cat.category}" style="cursor: pointer; font-weight: 500;">${t(currentLang, 'checkAll')}</label>
                        <input type="checkbox" id="resolve-master-${cat.category}" ${allResolved ? 'checked' : ''} 
                            style="width: 18px; height: 18px; cursor: pointer;"
                            onchange="toggleResolveCategoryMaster('${cat.category}', this.checked)">
                    </div>
                </div>`;

            catFailedGroups.forEach(({ group, failedItems }) => {
                const groupDiv = document.createElement('div');
                groupDiv.style.marginBottom = '1.5rem';
                groupDiv.innerHTML = `<h4 style="margin: 0 0 0.8rem 0; color: #475569; font-size: 0.95rem; display: flex; align-items: center; gap: 0.5rem;">
                    <span style="width: 8px; height: 8px; border-radius: 50%; background: #dc2626;"></span> ${t(currentLang, group.key)}</h4>`;

                const itemsList = document.createElement('div');
                itemsList.style.display = 'flex';
                itemsList.style.flexDirection = 'column';
                itemsList.style.gap = '0.75rem';
                itemsList.style.paddingLeft = '1.2rem';

                failedItems.forEach(it => {
                    const isResolved = resolvedItems.includes(`${cat.category}:${it.id}`);
                    const itemDiv = document.createElement('div');
                    itemDiv.className = 'diag-item-row';
                    itemDiv.style.display = 'flex';
                    itemDiv.style.alignItems = 'flex-start';
                    itemDiv.style.gap = '0.75rem';
                    itemDiv.style.padding = '0.5rem 0.75rem';
                    itemDiv.style.borderRadius = '8px';
                    itemDiv.style.background = isResolved ? '#d1fae5' : '#fee2e2';
                    itemDiv.style.border = isResolved ? '1px solid #34d399' : '1px solid #fca5a5';
                    itemDiv.style.transition = 'all 0.2s ease';

                    itemDiv.innerHTML = `
                        <input type="checkbox" id="resolve-${cat.category}-${it.id}" ${isResolved ? 'checked' : ''} 
                            style="width: 18px; height: 18px; margin-top: 3px; cursor: pointer;"
                            onchange="toggleResolvedItem('${cat.category}', '${it.id}', this.checked)">
                        <label for="resolve-${cat.category}-${it.id}" style="cursor: pointer; flex: 1;">
                            <div style="font-weight: 600; font-size: 0.9rem; color: ${isResolved ? '#065f46' : '#991b1b'};">${isResolved ? '✅' : '❌'} ${t(currentLang, it.label)}</div>
                            <div style="font-size: 0.8rem; color: #64748b; line-height: 1.3;">${t(currentLang, it.desc)}</div>
                        </label>`;
                    itemsList.appendChild(itemDiv);
                });
                groupDiv.appendChild(itemsList);
                section.appendChild(groupDiv);
            });
            container.appendChild(section);
        });
    }
};

window.toggleResolvedItem = (cat, key, val) => {
    const o = appData.find(off => off.id === activeOfficeId);
    if (o && o.inventory[resultIndex]) {
        const id = `${cat}:${key}`;
        if (!o.inventory[resultIndex].maintenanceResult.resolvedItems) o.inventory[resultIndex].maintenanceResult.resolvedItems = [];
        const items = o.inventory[resultIndex].maintenanceResult.resolvedItems;
        if (val && !items.includes(id)) items.push(id);
        else if (!val && items.includes(id)) o.inventory[resultIndex].maintenanceResult.resolvedItems = items.filter(x => x !== id);
        openMaintenanceResult(resultIndex); // Refresh colors
    }
};

window.toggleResolveCategoryMaster = (catName, val) => {
    const o = appData.find(off => off.id === activeOfficeId);
    if (o && o.inventory[resultIndex]) {
        const item = o.inventory[resultIndex];
        if (!item.maintenanceResult.resolvedItems) item.maintenanceResult.resolvedItems = [];
        const diagObj = item.diagnostics || {};
        const catStruct = DIAG_STRUCTURE.find(c => c.category === catName);
        if (!catStruct) return;

        catStruct.groups.forEach(group => {
            group.items.forEach(it => {
                const isOk = (diagObj[catName] || {})[it.id] === true;
                if (!isOk) {
                    const id = `${catName}:${it.id}`;
                    if (val && !item.maintenanceResult.resolvedItems.includes(id)) {
                        item.maintenanceResult.resolvedItems.push(id);
                    } else if (!val && item.maintenanceResult.resolvedItems.includes(id)) {
                        item.maintenanceResult.resolvedItems = item.maintenanceResult.resolvedItems.filter(x => x !== id);
                    }
                }
            });
        });
        openMaintenanceResult(resultIndex); // Refresh
    }
};

window.saveMaintenanceResult = async () => {
    const o = appData.find(off => off.id === activeOfficeId);
    if (o && o.inventory[resultIndex]) {
        const statusEl = document.getElementById('result-status');
        const dateEl = document.getElementById('result-date');
        const notesEl = document.getElementById('result-notes-input');
        if (statusEl) o.inventory[resultIndex].maintenanceResult.status = statusEl.value;
        if (dateEl) o.inventory[resultIndex].maintenanceResult.date = dateEl.value;
        if (notesEl) o.inventory[resultIndex].maintenanceResult.notes = notesEl.value;
        await saveOffice(o);
        closeMaintenanceResult();
        renderTable();
        if (typeof Swal !== 'undefined') Swal.fire({ title: t(currentLang, 'successMsg'), icon: 'success', timer: 1200, showConfirmButton: false });
    }
};

window.closeMaintenanceResult = () => {
    resultIndex = null;
    const resultSection = document.getElementById('result-integrated-section');
    if (resultSection) resultSection.style.display = 'none';
    if (dom.viewEquip) dom.viewEquip.style.display = 'block';
};


// Export functions for HTML
window.exportToCSV = () => {
    const o = appData.find(off => off.id === activeOfficeId);
    if (!o || o.inventory.length === 0) return;
    
    let csv = "Asset Tag,Type,Model,Serial,Status,User,Notes\n";
    o.inventory.forEach(item => {
        csv += `"${item.assetTag}","${item.type}","${item.model}","${item.serial}","${item.status}","${item.user}","${item.notes}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `Inventory_${o.company}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
};

window.exportToPDF = () => {
    const o = appData.find(off => off.id === activeOfficeId);
    if (!o || o.inventory.length === 0) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });
    const currentLang = localStorage.getItem('pocketITCheckLang') || 'es';

    // 1. Calculate Stats
    const total = o.inventory.length;
    const active = o.inventory.filter(i => i.status === 'Activo').length;
    const stock = o.inventory.filter(i => i.status === 'Stock').length;
    const repair = o.inventory.filter(i => i.status === 'Reparación').length;
    const decom = o.inventory.filter(i => i.status === 'Baja').length;

    const stats = [
        tPdf(currentLang, 'pdfSummaryBoxTitle'),
        `${tPdf(currentLang, 'pdfTotal')}: ${total} | ${tPdf(currentLang, 'Activo')}: ${active} | ${tPdf(currentLang, 'Stock')}: ${stock}`,
        `${tPdf(currentLang, 'Reparación')}: ${repair} | ${tPdf(currentLang, 'Baja')}: ${decom}`
    ];

    // 2. Header (Type A with Stats)
    const title = tPdf(currentLang, 'pdfInventoryTitle');
    const rightLines = [
        `${tPdf(currentLang, 'pdfDateCol')}: ${o.auditDate || new Date().toISOString().split('T')[0]}`
    ];
    let y = drawHeaderTypeA(doc, title, [5, 150, 105], rightLines, currentLang, stats);

    // 3. Subheader (Office Info)
    y = drawSubheader(doc, o, y + 5, currentLang);

    // 4. Inventory Table
    const tableData = o.inventory.map(item => {
        const specs = item.specs || {};
        const parts = [];
        if (specs.dyn_os) parts.push(`${t(currentLang, 'os')}: ${specs.dyn_os}`);
        if (specs.dyn_cpu) parts.push(`${t(currentLang, 'cpu')}: ${specs.dyn_cpu}`);
        if (specs.dyn_ram) parts.push(`${t(currentLang, 'ram')}: ${specs.dyn_ram}`);
        if (specs.dyn_storage) parts.push(`${t(currentLang, 'storage')}: ${specs.dyn_storage}`);
        if (specs.dyn_mac) parts.push(`${t(currentLang, 'mac')}: ${specs.dyn_mac}`);
        if (item.notes) parts.push(`${t(currentLang, 'extraNotes')}: ${item.notes}`);
        
        let specStr = parts.join(' | ');
        if (item.purchaseDate || item.warrantyDate) {
            specStr += `\n[${t(currentLang, 'purchaseDateLabel')}: ${item.purchaseDate || '-'} - ${t(currentLang, 'warrantyUntilLabel')}: ${item.warrantyDate || '-'}]`;
        }

        return [
            item.assetTag || '-',
            t(currentLang, item.status) || item.status,
            `${t(currentLang, item.type)}\n${item.model}`,
            `S/N: ${item.serial || '-'}\nUsu: ${item.user || '-'}`,
            specStr
        ];
    });

    doc.autoTable({
        startY: y + 2,
        head: [[
            tPdf(currentLang, 'pdfColID'),
            tPdf(currentLang, 'pdfColStatus'),
            tPdf(currentLang, 'pdfColCatMod'),
            tPdf(currentLang, 'pdfColSNAsig'),
            tPdf(currentLang, 'pdfColSpecs')
        ]],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [5, 150, 105], textColor: 255, fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 7, textColor: [30, 41, 59] },
        columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 18 },
            2: { cellWidth: 38 },
            3: { cellWidth: 38 },
            4: { cellWidth: 'auto' }
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 14, right: 14 }
    });

    // 5. Signatures
    drawModelSignatures(doc, doc.lastAutoTable.finalY + 10, o, currentLang);

    // 6. Page Numbers
    addModelPageNumbers(doc, currentLang);

    doc.save(`Inventory_${o.company}_${new Date().toISOString().split('T')[0]}.pdf`);
};

window.generateMasterMaintenancePlanPDF = () => {
    const o = appData.find(off => off.id === activeOfficeId);
    if (!o || o.inventory.length === 0) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' }); // Landscape for plan
    const currentLang = localStorage.getItem('pocketITCheckLang') || 'es';

    // 1. Filter failed items
    const failedItems = o.inventory.map(item => {
        const issues = [];
        const actions = [];
        const diagObj = item.diagnostics || {};
        DIAG_STRUCTURE.forEach(cat => {
            cat.groups.forEach(group => {
                group.items.forEach(it => {
                    const isOk = (diagObj[cat.category] || {})[it.id] === true;
                    if (!isOk) {
                        const explicitIssue = `[${t(currentLang, cat.category)} / ${t(currentLang, group.key)}] ${t(currentLang, `desc_${it.id}`)}`;
                        issues.push(explicitIssue);
                        actions.push(`${t(currentLang, `act_${it.id}`)}`);
                    }
                });
            });
        });
        return issues.length > 0 ? { ...item, issues, actions } : null;
    }).filter(x => x !== null);

    // 2. Stats & Header (Type B)
    const stats = [
        `${tPdf(currentLang, 'pdfSummaryBoxTitle')}`,
        `${tPdf(currentLang, 'pdfTotalItems')}: ${o.inventory.length}`,
        `${tPdf(currentLang, 'pdfSummaryActivos')}: ${failedItems.length} ${tPdf(currentLang, 'pdfPending')}`
    ];
    let y = drawHeaderTypeB(doc, tPdf(currentLang, 'pdfMasterPlanTitle'), o, stats, currentLang);
    y = drawSubheader(doc, o, y + 5, currentLang);

    // 3. Table
    const tableData = failedItems.map(it => [
        `${it.assetTag}\n${it.model}`,
        t(currentLang, it.status),
        `${t(currentLang, it.location || '-')}\n${it.user || '-'}`,
        it.issues.length > 0 ? '• ' + it.issues.join('\n• ') : '',
        it.actions.length > 0 ? '• ' + it.actions.join('\n• ') : ''
    ]);

    doc.autoTable({
        startY: y + 2,
        head: [[
            tPdf(currentLang, 'pdfCategory') + '/' + tPdf(currentLang, 'pdfModel'),
            tPdf(currentLang, 'pdfEquipStatus'),
            tPdf(currentLang, 'pdfLocAssign'),
            tPdf(currentLang, 'pdfProbs'),
            tPdf(currentLang, 'pdfReqActions')
        ]],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [5, 150, 105], fontSize: 8 },
        columnStyles: {
            0: { cellWidth: 35 },
            1: { cellWidth: 20 },
            2: { cellWidth: 40 },
            3: { cellWidth: 60 },
            4: { cellWidth: 100 }
        },
        styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' }
    });

    drawModelSignatures(doc, doc.lastAutoTable.finalY + 10, o, currentLang);
    addModelPageNumbers(doc, currentLang);
    doc.save(`MaintenancePlan_${o.company}_${new Date().toISOString().split('T')[0]}.pdf`);
};

window.generateResultsReportPDF = () => {
    const o = appData.find(off => off.id === activeOfficeId);
    if (!o || o.inventory.length === 0) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });
    const currentLang = localStorage.getItem('pocketITCheckLang') || 'es';

    // 1. Process data for results
    let totalIssues = 0;
    let resolvedIssues = 0;

    const resultsData = o.inventory.map(item => {
        const diagObj = item.diagnostics || {};
        const result = item.maintenanceResult || { status: 'Pendiente', resolvedItems: [] };
        
        const originalProbs = [];
        const actionsDone = [];

        DIAG_STRUCTURE.forEach(cat => {
            cat.groups.forEach(group => {
                group.items.forEach(it => {
                    const isOk = (diagObj[cat.category] || {})[it.id] === true;
                    if (!isOk) {
                        totalIssues++;
                        const label = `[${t(currentLang, cat.category)} / ${t(currentLang, group.key)}] ${t(currentLang, `desc_${it.id}`)}`;
                        originalProbs.push(label);
                        if (result.resolvedItems && result.resolvedItems.includes(`${cat.category}:${it.id}`)) {
                            resolvedIssues++;
                            actionsDone.push(label);
                        }
                    }
                });
            });
        });

        return {
            asset: `${item.assetTag}\n${item.model}`,
            probs: originalProbs.length > 0 ? '• ' + originalProbs.join('\n• ') : '-',
            actions: actionsDone.length > 0 ? '• ' + actionsDone.join('\n• ') : '-',
            status: t(currentLang, result.status || 'Pendiente'),
            notes: result.notes || '-'
        };
    });

    const completionRate = totalIssues > 0 ? Math.round((resolvedIssues / totalIssues) * 100) : 100;

    // 2. Stats & Header
    const stats = [
        `${tPdf(currentLang, 'pdfSummaryBoxTitle')}`,
        `${tPdf(currentLang, 'pdfTotalItems')}: ${o.inventory.length} | ${tPdf(currentLang, 'pdfResolvedCount')}: ${resolvedIssues}`,
        `${tPdf(currentLang, 'pdfCompletionRate')}: ${completionRate}%`
    ];
    let y = drawHeaderTypeB(doc, tPdf(currentLang, 'pdfResultsTitle'), o, stats, currentLang);
    y = drawSubheader(doc, o, y + 5, currentLang);

    // 3. Table
    doc.autoTable({
        startY: y + 2,
        head: [[
            tPdf(currentLang, 'pdfCategory') + '/' + tPdf(currentLang, 'pdfModel'),
            tPdf(currentLang, 'pdfOrigDiag'),
            tPdf(currentLang, 'pdfDoneActs'),
            tPdf(currentLang, 'pdfStatus'),
            tPdf(currentLang, 'pdfNotes')
        ]],
        body: resultsData.map(r => [r.asset, r.probs, r.actions, r.status, r.notes]),
        theme: 'grid',
        headStyles: { fillColor: [5, 150, 105], fontSize: 8 },
        columnStyles: {
            0: { cellWidth: 35 },
            1: { cellWidth: 55 },
            2: { cellWidth: 55 },
            3: { cellWidth: 25 },
            4: { cellWidth: 80 }
        },
        styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' }
    });

    drawModelSignatures(doc, doc.lastAutoTable.finalY + 10, o, currentLang);
    addModelPageNumbers(doc, currentLang);
    doc.save(`MaintenanceReport_${o.company}_${new Date().toISOString().split('T')[0]}.pdf`);
};


