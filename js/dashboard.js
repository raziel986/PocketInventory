/**
 * dashboard.js - PocketITCheck Analytics Dashboard
 */
import { t } from './translations.js';

let statusChart = null;
let typeChart = null;
let healthChart = null;

export function initDashboard(appData, currentLang) {
    updateCharts(appData, currentLang);
}

export function updateCharts(appData, currentLang) {
    if (!appData || appData.length === 0) return;
    const allItems = appData.reduce((acc, office) => acc.concat(office.inventory || []), []);
    
    renderStatusChart(allItems, currentLang);
    renderTypeChart(allItems, currentLang);
    renderHealthChart(appData, currentLang);
}

function renderStatusChart(items, lang) {
    const ctx = document.getElementById('statusChart').getContext('2d');
    const counts = {
        Activo: items.filter(i => i.status === 'Activo').length,
        Stock: items.filter(i => i.status === 'Stock').length,
        Reparación: items.filter(i => i.status === 'Reparación').length,
        Baja: items.filter(i => i.status === 'Baja').length
    };

    if (statusChart) statusChart.destroy();

    statusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: [t(lang, 'Activo'), t(lang, 'Stock'), t(lang, 'Reparación'), t(lang, 'Baja')],
            datasets: [{
                data: [counts.Activo, counts.Stock, counts.Reparación, counts.Baja],
                backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' }
            },
            cutout: '70%'
        }
    });
}

function renderTypeChart(items, lang) {
    const ctx = document.getElementById('typeChart').getContext('2d');
    const types = [...new Set(items.map(i => i.type))];
    const data = types.map(type => ({
        label: t(lang, type),
        count: items.filter(i => i.type === type).length
    }));

    if (typeChart) typeChart.destroy();

    typeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.label),
            datasets: [{
                label: t(lang, 'chartTypes'),
                data: data.map(d => d.count),
                backgroundColor: '#6366f1',
                borderRadius: 8
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { beginAtZero: true, grid: { display: false } },
                y: { grid: { display: false } }
            }
        }
    });
}

function renderHealthChart(appData, lang) {
    const ctx = document.getElementById('healthChart').getContext('2d');
    
    // Calculate health score per office (0-100)
    const labels = appData.map(o => o.company);
    const scores = appData.map(office => {
        if (office.inventory.length === 0) return 100;
        let totalPoints = 0;
        office.inventory.forEach(item => {
            let itemScore = 100;
            if (item.diagnostics) {
                const allSections = { ...item.diagnostics.hardware, ...item.diagnostics.software };
                let totalChecks = 0;
                let failChecks = 0;
                Object.keys(allSections).forEach(cat => {
                    if (allSections[cat] && typeof allSections[cat] === 'object') {
                        Object.keys(allSections[cat]).forEach(sub => {
                            totalChecks++;
                            if (allSections[cat][sub] === false) failChecks++;
                        });
                    }
                });
                if (totalChecks > 0) itemScore = ((totalChecks - failChecks) / totalChecks) * 100;
                else itemScore = 100; // No issues found or no checks done
            }
            totalPoints += itemScore;
        });
        return Math.round(totalPoints / office.inventory.length);
    });

    if (healthChart) healthChart.destroy();

    healthChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: t(lang, 'healthScore'),
                data: scores,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 6,
                pointBackgroundColor: '#10b981'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { min: 0, max: 100, ticks: { stepSize: 20 } },
                x: { grid: { display: false } }
            }
        }
    });
}
