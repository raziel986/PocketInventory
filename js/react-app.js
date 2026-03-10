/**
 * react-app.js - Zero-Build React Entry Point
 */

const { useState, useEffect, useMemo } = React;

// Import logic from existing modules (adjusted for root-relative paths for Babel in browser)
import { getAllOffices, saveOffice, deleteOffice, migrateFromLocalStorage } from './js/db.js';
import { translations, t } from './js/translations.js';
import { DIAG_SCHEMA } from './js/diagnostic.js';

// --- Components ---

const Sidebar = ({ view, setView, activeOffice, onBack }) => {
    return (
        <div className="sidebar p-3">
             <div className="brand-card glass-card mb-4">
                <div className="d-flex justify-content-between align-items-start">
                    <div className="brand d-flex gap-2">
                        <img src="img/logo.png" alt="Logo" className="w-24 h-24 mb-4" />
                        <div>
                            <div className="h4 m-0"><span className="text-primary">Pocket</span>IT<span className="text-success">Check</span></div>
                            <small className="text-muted fw-bold" style={{fontSize: '0.6rem'}}>Inventory | Diagnostics | Maintenance</small>
                        </div>
                    </div>
                </div>
            </div>

            {view === 'offices' ? (
                <div className="glass-card p-3">
                    <h5 className="mb-3">🏢 Nueva Oficina</h5>
                    {/* Office Form would go here */}
                    <p className="text-muted small">Cargando formulario...</p>
                </div>
            ) : (
                <div className="glass-card p-3">
                    <button className="btn btn-outline-secondary btn-sm mb-3 w-100" onClick={onBack}>
                        <i className="lucide-arrow-left"></i> Volver
                    </button>
                    {activeOffice && (
                        <div className="office-summary p-2 bg-light rounded small mb-3">
                            <div className="fw-bold">🏢 {activeOffice.company}</div>
                            <div>📍 {activeOffice.location}</div>
                        </div>
                    )}
                    <h5 className="mb-3">💻 Nuevo Equipo</h5>
                    {/* Equipment Form would go here */}
                </div>
            )}
        </div>
    );
};

const DiagnosticSuite = ({ item, onSave, onCancel }) => {
    const [diagData, setDiagData] = useState(item.diagnostics || { hardware: {}, software: {} });
    const [notes, setNotes] = useState(item.diagNotes || '');

    const toggleCheck = (group, id) => {
        const pass = diagData[group][id] !== false; // default true if undefined
        setDiagData({
            ...diagData,
            [group]: { ...diagData[group], [id]: !pass }
        });
    };

    return (
        <div className="diagnostic-container">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 className="text-primary m-0">🩺 Diagnóstico: {item.assetTag}</h3>
                <button className="btn btn-outline-danger btn-sm" onClick={onCancel}>Cerrar</button>
            </div>
            
            <div className="row g-3">
                {Object.keys(DIAG_SCHEMA).map(groupKey => (
                    <div className="col-12 col-xl-6" key={groupKey}>
                        <div className="diag-section glass-card h-100 p-3">
                            <h5 className="diag-group-title mb-3">
                                {DIAG_SCHEMA[groupKey].icon} {DIAG_SCHEMA[groupKey].title.toUpperCase()}
                            </h5>
                            <div className="diag-cards-grid d-flex flex-column gap-2">
                                {DIAG_SCHEMA[groupKey].sections.map(section => {
                                    const isFail = diagData[groupKey][section.id] === false;
                                    return (
                                        <div className={`diag-card p-2 border rounded d-flex align-items-center gap-3 ${isFail ? 'bg-danger-subtle' : 'bg-success-subtle'}`} key={section.id}>
                                            <span className="fs-4">{section.icon}</span>
                                            <div className="flex-grow-1">
                                                <div className="fw-bold small">{section.title}</div>
                                                <div className="text-muted" style={{fontSize: '0.65rem'}}>{section.standards.join(' | ')}</div>
                                            </div>
                                            <div className="form-check form-switch m-0">
                                                <input className="form-check-input" type="checkbox" checked={!isFail} onChange={() => toggleCheck(groupKey, section.id)} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-4">
                <label className="fw-bold mb-2">📝 Observaciones:</label>
                <textarea className="form-control" value={notes} onChange={e => setNotes(e.target.value)} rows="3"></textarea>
            </div>

            <button className="btn btn-primary w-100 mt-4 py-2 fw-bold" onClick={() => onSave(diagData, notes)}>
                💾 Guardar Diagnóstico y Actualizar Activo
            </button>
        </div>
    );
};

// --- Main Content Manager ---

const MainContent = ({ view, offices, activeOffice, onSelectOffice, onOpenDiag, lang }) => {
    if (view === 'diagnostic') return null;

    return (
        <div className="p-3">
            {view === 'offices' ? (
                <div className="glass-card p-4 shadow-sm border rounded bg-white">
                    <h2 className="mb-4 d-flex justify-content-between align-items-center">
                        <span>📋 {t(lang, 'officeManagerSub')}</span>
                        <span className="badge bg-indigo-100 text-primary rounded-pill small">{offices.length} {t(lang, 'officesCount')}</span>
                    </h2>
                    <div className="table-responsive">
                        <table className="table table-hover align-middle border-top">
                            <thead className="table-light">
                                <tr>
                                    <th>{t(lang, 'companyLabel')}</th>
                                    <th>{t(lang, 'locationLabel')}</th>
                                    <th className="text-center">{t(lang, 'equips')}</th>
                                    <th className="text-center">{t(lang, 'actionsLabel')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {offices.length === 0 ? (
                                    <tr><td colSpan="4" className="text-center p-5 text-muted fst-italic">{t(lang, 'noData') || 'No data'}</td></tr>
                                ) : (
                                    offices.map(o => (
                                        <tr key={o.id}>
                                            <td>
                                                <div className="fw-bold text-primary">{o.company}</div>
                                                <small className="text-muted">{o.depto}</small>
                                            </td>
                                            <td>{o.location}</td>
                                            <td className="text-center">
                                                <span className="badge bg-primary rounded-pill">{o.inventory.length}</span>
                                            </td>
                                            <td className="text-center">
                                                <button className="btn btn-sm btn-info text-white shadow-sm" onClick={() => onSelectOffice(o.id)}>
                                                    📂 {t(lang, 'open') || 'Open'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="glass-card p-4 shadow-sm border rounded bg-white">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h2 className="m-0 text-dark">💻 {activeOffice?.company}</h2>
                        <div className="d-flex gap-2">
                             <button className="btn btn-sm btn-outline-success" onClick={() => alert('Exporting PDF...')}>📄 PDF</button>
                             <span className="badge bg-secondary p-2">{activeOffice?.inventory.length} {t(lang, 'items')}</span>
                        </div>
                    </div>
                    <div className="table-responsive">
                        <table className="table table-hover align-middle border-top">
                            <thead className="table-light">
                                <tr>
                                    <th>{t(lang, 'assetTagLabel')}</th>
                                    <th>{t(lang, 'infoGeneral')}</th>
                                    <th className="text-center">{t(lang, 'statusLabel')}</th>
                                    <th className="text-center">{t(lang, 'integratedDiag')}</th>
                                    <th className="text-center">{t(lang, 'actionsLabel')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeOffice?.inventory.map((item, idx) => {
                                    const isDiagDone = item.diagnostics && Object.keys(item.diagnostics.hardware).length > 0;
                                    return (
                                        <tr key={idx}>
                                            <td><code className="fw-bold text-dark bg-light px-2 py-1 rounded border">{item.assetTag}</code></td>
                                            <td>
                                                <div className="fw-bold">{item.model}</div>
                                                <small className="text-muted">{item.serial}</small>
                                            </td>
                                            <td className="text-center">
                                                <span className={`badge ${item.status === 'Activo' ? 'bg-success' : 'bg-warning text-dark'}`}>
                                                    {t(lang, item.status) || item.status}
                                                </span>
                                            </td>
                                            <td className="text-center">
                                                <button className={`btn btn-sm ${isDiagDone ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => onOpenDiag(idx)}>
                                                    {isDiagDone ? '✅' : '🩺'} {t(lang, 'integratedDiag')}
                                                </button>
                                            </td>
                                            <td className="text-center">
                                                <button className="btn btn-sm btn-link text-danger">🗑️</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

const MobileNav = ({ view, setView }) => {
    return (
        <nav className="mobile-nav fixed-bottom d-md-none bg-white border-top d-flex justify-content-around p-2">
            <button className={`nav-item border-0 bg-transparent ${view === 'offices' ? 'active' : ''}`} onClick={() => setView('offices')}>
                <span className="nav-icon d-block">🏢</span>
                <small className="nav-label">Oficinas</small>
            </button>
            <button className={`nav-item border-0 bg-transparent ${view === 'inventory' ? 'active' : ''}`} onClick={() => setView('inventory')}>
                <span className="nav-icon d-block">💻</span>
                <small className="nav-label">Equipos</small>
            </button>
            <button className={`nav-item border-0 bg-transparent ${view === 'diagnostic' ? 'active' : ''}`} onClick={() => setView('diagnostic')}>
                <span className="nav-icon d-block">🩺</span>
                <small className="nav-label">Diagnóstico</small>
            </button>
        </nav>
    );
};

// --- Forms ---

const OfficeForm = ({ onSave }) => {
    const [formData, setFormData] = useState({
        company: '', depto: '', location: '', auditor: '', auditorCompany: '', date: new Date().toISOString().split('T')[0], manager: '', managerTitle: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ ...formData, id: Date.now().toString(), inventory: [] });
        setFormData({ company: '', depto: '', location: '', auditor: '', auditorCompany: '', date: new Date().toISOString().split('T')[0], manager: '', managerTitle: '' });
    };

    return (
        <form onSubmit={handleSubmit} className="p-2">
            <div className="mb-2">
                <label className="form-label small mb-1">Empresa *</label>
                <input type="text" className="form-control form-control-sm" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} required />
            </div>
            <div className="mb-2">
                <label className="form-label small mb-1">Ubicación *</label>
                <input type="text" className="form-control form-control-sm" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} required />
            </div>
            <button type="submit" className="btn btn-success btn-sm w-100 mt-2">Registrar Oficina</button>
        </form>
    );
};

const EquipmentForm = ({ activeOffice, onSave }) => {
    const [formData, setFormData] = useState({
        type: '', model: '', serial: '', assetTag: '', status: 'Activo', user: '', notes: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
        setFormData({ type: '', model: '', serial: '', assetTag: '', status: 'Activo', user: '', notes: '' });
    };

    return (
        <form onSubmit={handleSubmit} className="p-2">
            <div className="mb-2">
                <label className="form-label small mb-1">Categoría</label>
                <select className="form-select form-select-sm" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} required>
                    <option value="">Seleccionar...</option>
                    <option value="Laptop">Laptop</option>
                    <option value="Desktop">Desktop</option>
                    <option value="Monitor">Monitor</option>
                </select>
            </div>
            <div className="mb-2">
                <label className="form-label small mb-1">Modelo</label>
                <input type="text" className="form-control form-control-sm" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} required />
            </div>
            <div className="mb-2">
                <label className="form-label small mb-1">Asset Tag</label>
                <input type="text" className="form-control form-control-sm" value={formData.assetTag} onChange={e => setFormData({...formData, assetTag: e.target.value})} required />
            </div>
            <button type="submit" className="btn btn-primary btn-sm w-100 mt-2">Añadir Equipo</button>
        </form>
    );
};

// --- App Root ---

const App = () => {
    const [offices, setOffices] = useState([]);
    const [activeOfficeId, setActiveOfficeId] = useState(null);
    const [view, setView] = useState('offices');
    const [loading, setLoading] = useState(true);
    const [activeEquipIndex, setActiveEquipIndex] = useState(null);
    const [lang, setLang] = useState(localStorage.getItem('pocketITCheckLang') || 'es');

    useEffect(() => {
        const init = async () => {
            await migrateFromLocalStorage();
            const data = await getAllOffices();
            setOffices(data);
            setLoading(false);
        };
        init();
    }, []);

    const toggleLang = () => {
        const newLang = lang === 'es' ? 'en' : 'es';
        setLang(newLang);
        localStorage.setItem('pocketITCheckLang', newLang);
    };

    const handleSaveOffice = async (office) => {
        await saveOffice(office);
        setOffices([...offices, office]);
        Swal.fire({ title: t(lang, 'officeSaved') || 'Guardado', icon: 'success', timer: 1000, showConfirmButton: false });
    };

    // ... updated render to use lang and toggle ...
    // Note: I will update the components below to use the t function

    const handleAddEquipment = async (item) => {
        const office = offices.find(o => o.id === activeOfficeId);
        if (!office) return;
        const updatedOffice = { ...office, inventory: [...office.inventory, item] };
        await saveOffice(updatedOffice);
        setOffices(offices.map(o => o.id === activeOfficeId ? updatedOffice : o));
        Swal.fire({ title: 'Equipo Añadido', icon: 'success', timer: 1000, showConfirmButton: false });
    };

    const handleSaveDiag = async (diagData, notes) => {
        const office = offices.find(o => o.id === activeOfficeId);
        if (!office || activeEquipIndex === null) return;
        
        const inventory = [...office.inventory];
        inventory[activeEquipIndex] = { ...inventory[activeEquipIndex], diagnostics: diagData, diagNotes: notes };
        
        const updatedOffice = { ...office, inventory };
        await saveOffice(updatedOffice);
        setOffices(offices.map(o => o.id === activeOfficeId ? updatedOffice : o));
        
        Swal.fire({ title: 'Diagnóstico Guardado', icon: 'success', timer: 1000, showConfirmButton: false });
        setView('inventory');
        setActiveEquipIndex(null);
    };

    const activeOffice = useMemo(() => offices.find(o => o.id === activeOfficeId), [offices, activeOfficeId]);
    const activeEquip = activeOffice && activeEquipIndex !== null ? activeOffice.inventory[activeEquipIndex] : null;

    if (loading) return null;

    return (
        <div className="d-flex flex-column flex-md-row min-vh-100 bg-light">
            {/* Sidebar Oculto en vista de Diagnóstico para enfoque total */}
            {view !== 'diagnostic' && (
                <div className="sidebar p-3 bg-white border-end shadow-sm" style={{width: '300px'}}>
                    <div className="brand-card glass-card mb-4 p-3 border rounded text-center shadow-sm">
                        <img src="img/logo.png" className="w-25 mb-2" alt="Logo" />
                        <h4 className="m-0 text-primary fw-bold">PocketITCheck</h4>
                        <small className="text-muted">Inventory & Standard Audit</small>
                    </div>
                    {view === 'offices' ? (
                        <div className="glass-card"><OfficeForm onSave={handleSaveOffice} /></div>
                    ) : (
                        <div>
                            <button className="btn btn-sm btn-outline-secondary mb-3 w-100 py-2" onClick={() => setView('offices')}>⬅ Volver a Oficinas</button>
                            <div className="glass-card shadow-sm"><EquipmentForm activeOffice={activeOffice} onSave={handleAddEquipment} /></div>
                        </div>
                    )}
                </div>
            )}
            
            <main className="flex-grow-1 overflow-auto p-4">
                {view === 'diagnostic' ? (
                    <DiagnosticSuite 
                        item={activeEquip} 
                        onSave={handleSaveDiag} 
                        onCancel={() => { setView('inventory'); setActiveEquipIndex(null); }} 
                    />
                ) : (
                    <MainContent 
                        view={view} 
                        offices={offices} 
                        activeOffice={activeOffice}
                        onSelectOffice={(id) => { setActiveOfficeId(id); setView('inventory'); }}
                        onOpenDiag={(idx) => { setActiveEquipIndex(idx); setView('diagnostic'); }}
                    />
                )}
            </main>
            <MobileNav view={view} setView={setView} />
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
