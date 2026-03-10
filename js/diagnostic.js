/**
 * diagnostic.js - PocketITCheck Advanced Diagnostic Module
 * Aligned with ITIL, NIST, and IEEE standards.
 */

import { t } from './translations.js';

export const DIAG_SCHEMA = {
    hardware: {
        title: "hardware",
        icon: "🔌",
        sections: [
            { 
                id: "power", 
                title: "diagN_power", 
                icon: "⚡", 
                desc: "desc_cable",
                standards: ["IEEE 1621", "ACPI v6.0"]
            },
            { 
                id: "storage", 
                title: "diagN_storage", 
                icon: "💾", 
                desc: "desc_smart",
                standards: ["S.M.A.R.T. Industry Std", "ISO/IEC 27040"]
            },
            { 
                id: "ram", 
                title: "diagN_ram", 
                icon: "🧠", 
                desc: "desc_test",
                standards: ["JEDEC JESD204", "MemTest86+ Patterns"]
            },
            { 
                id: "temp", 
                title: "diagN_temp", 
                icon: "🌡️", 
                desc: "desc_fan",
                standards: ["TDP/T-Case Calibration", "IEC 60068"]
            },
            { 
                id: "clean", 
                title: "diagN_clean", 
                icon: "🧹", 
                desc: "desc_int",
                standards: ["IPC-A-610G (Cleanliness)"]
            }
        ]
    },
    software: {
        title: "software",
        icon: "🛡️",
        sections: [
            { 
                id: "os", 
                title: "diagN_os", 
                icon: "🪟", 
                desc: "desc_sfc",
                standards: ["MS Best Practices", "ISO/IEC 27002"]
            },
            { 
                id: "security", 
                title: "diagN_security", 
                icon: "🛡️", 
                desc: "desc_av",
                standards: ["NIST SP 800-53", "CVE Compliance"]
            },
            { 
                id: "performance", 
                title: "diagN_performance", 
                icon: "🚀", 
                desc: "desc_drv",
                standards: ["ITIL Service Operation", "WHQL Certification"]
            },
            { 
                id: "license", 
                title: "diagN_license", 
                icon: "🔑", 
                desc: "desc_win",
                standards: ["SAM (Software Asset Management)", "ISO/IEC 19770"]
            }
        ]
    }
};

/**
 * Generates the diagnostic UI structure
 */
export function renderDiagnosticGrid(container, currentLang, data = {}, onToggle) {
    container.innerHTML = '';
    
    Object.keys(DIAG_SCHEMA).forEach(groupKey => {
        const group = DIAG_SCHEMA[groupKey];
        const sectionDiv = document.createElement('div');
        sectionDiv.className = 'diag-section';
        
        sectionDiv.innerHTML = `
            <h3 class="diag-group-title">
                ${group.icon} ${t(currentLang, group.title)}
            </h3>
            <div class="diag-cards-grid"></div>
        `;
        
        const grid = sectionDiv.querySelector('.diag-cards-grid');
        
        group.sections.forEach(item => {
            const card = document.createElement('div');
            card.className = `diag-card ${data[groupKey] && data[groupKey][item.id] === false ? 'fail' : 'pass'}`;
            
            const isFail = data[groupKey] && data[groupKey][item.id] === false;
            
            card.innerHTML = `
                <div class="diag-card-header">
                    <span class="diag-card-icon">${item.icon}</span>
                    <div class="diag-card-info">
                        <span class="diag-card-title">${t(currentLang, item.title)}</span>
                        <span class="diag-card-standard">${item.standards.join(' | ')}</span>
                    </div>
                    <label class="diag-toggle">
                        <input type="checkbox" ${!isFail ? 'checked' : ''} onchange="window.handleDiagToggle('${groupKey}', '${item.id}', this.checked)">
                        <span class="diag-slider"></span>
                    </label>
                </div>
                <p class="diag-card-desc">${t(currentLang, item.desc)}</p>
            `;
            
            grid.appendChild(card);
        });
        
        container.appendChild(sectionDiv);
    });
}
