/**
 * react-app.js - Zero-Build React Entry Point
 */

const { useState, useEffect, useMemo } = React;

// Import logic from existing modules (adjusted for root-relative paths for Babel in browser)
import { getAllOffices, saveOffice, deleteOffice, migrateFromLocalStorage } from './js/db.js';
import { translations, t } from './js/translations.js';
import { DIAG_SCHEMA } from './js/diagnostic.js';

// --- Components ---

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError(error) { return { hasError: true }; }
    componentDidCatch(error, errorInfo) { console.error("React Error:", error, errorInfo); }
    render() {
        if (this.state.hasError) {
            return (
                <div className="p-5 text-center">
                    <h2 className="text-danger">Something went wrong.</h2>
                    <button className="btn btn-primary mt-3" onClick={() => window.location.reload()}>Reload App</button>
                </div>
            );
        }
        return this.props.children;
    }
}

const Sidebar = ({ view, setView, activeOffice, onBack, lang, onToggleLang, onSaveOffice, onAddEquipment, editingOffice, editingEquip, onCancelEdit }) => {
    return (
        <div className="sidebar p-3 bg-white border-end shadow-sm" style={{width: '320px', minWidth: '320px'}}>
            <div className="brand-card glass-card mb-4 p-3 border rounded text-center shadow-sm position-relative">
                <div className="position-absolute top-0 end-0 p-2">
                    <div className="form-check form-switch px-0">
                        <input className="form-check-input ms-0" type="checkbox" checked={lang === 'en'} onChange={onToggleLang} style={{cursor: 'pointer'}} />
                        <div className="small fw-bold">{lang.toUpperCase()}</div>
                    </div>
                </div>
                <img src="img/logo.png" className="w-25 mb-2" alt="Logo" />
                <h4 className="m-0 text-primary fw-bold">PocketITCheck</h4>
                <small className="text-muted" style={{fontSize: '0.65rem'}}>{t(lang, 'appSlogan')}</small>
            </div>

            {view === 'offices' ? (
                <div className="glass-card p-3 border rounded shadow-sm">
                    <h5 className="mb-3 small fw-bold">🏢 {editingOffice ? t(lang, 'editOffice') : t(lang, 'newOffice')}</h5>
                    <OfficeForm lang={lang} onSave={onSaveOffice} initialData={editingOffice} onCancel={onCancelEdit} />
                </div>
            ) : (
                <div className="glass-card p-3 border rounded shadow-sm">
                    <button className="btn btn-outline-secondary btn-sm mb-3 w-100 fw-bold" onClick={onBack}>
                        ⬅ {t(lang, 'backToOffices')}
                    </button>
                    {activeOffice && (
                        <div className="office-summary p-2 bg-light rounded small mb-3 border">
                            <div className="fw-bold text-truncate text-primary">🏢 {activeOffice.company}</div>
                            <div className="text-muted text-truncate" style={{fontSize: '0.7rem'}}>📍 {activeOffice.location}</div>
                            <div className="text-muted text-truncate" style={{fontSize: '0.7rem'}}>👥 {activeOffice.auditor}</div>
                        </div>
                    )}
                    <h5 className="mb-3 small fw-bold">💻 {editingEquip ? t(lang, 'editEquipment') : t(lang, 'newEquipment')}</h5>
                    <EquipmentForm lang={lang} activeOffice={activeOffice} onSave={onAddEquipment} initialData={editingEquip} onCancel={onCancelEdit} />
                </div>
            )}
        </div>
    );
};

const DiagnosticSuite = ({ item, onSave, onCancel, lang }) => {
    if (!item) return null;
    const [diagData, setDiagData] = useState(item.diagnostics || { hardware: {}, software: {} });
    const [notes, setNotes] = useState(item.diagNotes || '');

    const toggleCheck = (group, id) => {
        if (!diagData[group]) return;
        const pass = diagData[group][id] !== false;
        setDiagData({
            ...diagData,
            [group]: { ...diagData[group], [id]: !pass }
        });
    };

    return (
        <div className="diagnostic-container">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 className="text-primary m-0 fw-bold">🩺 {t(lang, 'integratedDiag')}: {item.assetTag}</h3>
                <button className="btn btn-outline-danger btn-sm px-3" onClick={onCancel}>{t(lang, 'cancelEdit') || 'X'}</button>
            </div>
            
            <div className="row g-3">
                {Object.keys(DIAG_SCHEMA).map(groupKey => (
                    <div className="col-12 col-xl-6" key={groupKey}>
                        <div className="diag-section glass-card h-100 p-3 shadow-sm border rounded">
                            <h5 className="diag-group-title mb-3 fw-bold text-dark">
                                {DIAG_SCHEMA[groupKey].icon} {t(lang, groupKey).toUpperCase()}
                            </h5>
                            <div className="diag-cards-grid d-flex flex-column gap-2">
                                {DIAG_SCHEMA[groupKey].sections.map(section => {
                                    const isFail = diagData[groupKey][section.id] === false;
                                    return (
                                        <div className={`diag-card p-2 border rounded d-flex align-items-center gap-3 transition-all ${isFail ? 'bg-danger-subtle border-danger' : 'bg-success-subtle border-success'}`} key={section.id}>
                                            <span className="fs-4">{section.icon}</span>
                                            <div className="flex-grow-1">
                                                <div className="fw-bold small">{t(lang, section.id) || section.title}</div>
                                                <div className="text-muted" style={{fontSize: '0.6rem'}}>{section.standards.join(' | ')}</div>
                                            </div>
                                            <div className="form-check form-switch m-0">
                                                <input className="form-check-input cursor-pointer" type="checkbox" checked={!isFail} onChange={() => toggleCheck(groupKey, section.id)} />
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
                <label className="fw-bold mb-2 small">{t(lang, 'observationsLabel') || 'Observaciones'}:</label>
                <textarea className="form-control shadow-sm" value={notes} onChange={e => setNotes(e.target.value)} rows="3"></textarea>
            </div>

            <button className="btn btn-primary w-100 mt-4 py-3 fw-bold shadow-sm" onClick={() => onSave(diagData, notes)}>
                💾 {t(lang, 'saveChanges')}
            </button>
        </div>
    );
};

// --- Main Content Manager ---

const MainContent = ({ view, offices, activeOffice, onSelectOffice, onOpenDiag, onEditOffice, onDeleteOffice, onEditEquip, onDeleteEquip, lang }) => {
    if (view === 'diagnostic') return null;

    return (
        <div className="p-3">
            {view === 'offices' ? (
                <div className="glass-card p-4 shadow-sm border rounded bg-white">
                    <h2 className="mb-4 d-flex justify-content-between align-items-center">
                        <span className="fw-bold">📋 {t(lang, 'officeManagerSub')}</span>
                        <span className="badge bg-primary rounded-pill small px-3">{offices.length} {t(lang, 'officesCount')}</span>
                    </h2>
                    <div className="table-responsive">
                        <table className="table table-hover align-middle border-top">
                            <thead className="table-light">
                                <tr className="small text-muted text-uppercase">
                                    <th>{t(lang, 'companyLabel')}</th>
                                    <th>{t(lang, 'locationLabel')}</th>
                                    <th>{t(lang, 'techAuditor')}</th>
                                    <th className="text-center">{t(lang, 'equips')}</th>
                                    <th className="text-center">{t(lang, 'actionsLabel')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {offices.length === 0 ? (
                                    <tr><td colSpan="5" className="text-center p-5 text-muted fst-italic">{t(lang, 'noData') || 'No data'}</td></tr>
                                ) : (
                                    offices.map(o => (
                                        <tr key={o.id}>
                                            <td>
                                                <div className="fw-bold text-primary">{o.company}</div>
                                                <small className="text-muted" style={{fontSize: '0.7rem'}}>{o.depto}</small>
                                            </td>
                                            <td className="small">{o.location}</td>
                                            <td className="small">{o.auditor}</td>
                                            <td className="text-center">
                                                <span className="badge bg-indigo-100 text-indigo-700 rounded-pill">{o.inventory.length}</span>
                                            </td>
                                            <td className="text-center">
                                                <div className="d-flex justify-content-center gap-1">
                                                    <button className="btn btn-sm btn-info text-white shadow-sm" onClick={() => onSelectOffice(o.id)} title={t(lang, 'open')}>📂</button>
                                                    <button className="btn btn-sm btn-warning text-dark shadow-sm" onClick={() => onEditOffice(o)} title={t(lang, 'edit')}>✏️</button>
                                                    <button className="btn btn-sm btn-danger shadow-sm" onClick={() => onDeleteOffice(o.id)} title={t(lang, 'delete')}>🗑️</button>
                                                </div>
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
                        <div className="d-flex align-items-center gap-3">
                            <h2 className="m-0 fw-bold text-dark">💻 {activeOffice?.company}</h2>
                            <span className="badge bg-light text-muted border px-2 py-1">{activeOffice?.depto}</span>
                        </div>
                        <div className="d-flex gap-2">
                             <button className="btn btn-sm btn-outline-success shadow-sm px-3 fw-bold" onClick={() => alert('Exporting PDF...')}>📄 PDF</button>
                             <span className="badge bg-secondary p-2 rounded">{activeOffice?.inventory.length} {t(lang, 'items')}</span>
                        </div>
                    </div>
                    <div className="table-responsive">
                        <table className="table table-hover align-middle border-top">
                            <thead className="table-light">
                                <tr className="small text-muted text-uppercase">
                                    <th>{t(lang, 'assetTagLabel')}</th>
                                    <th>{t(lang, 'infoGeneral')}</th>
                                    <th>{t(lang, 'assignmentLabel')}</th>
                                    <th className="text-center">{t(lang, 'statusLabel')}</th>
                                    <th className="text-center">{t(lang, 'integratedDiag')}</th>
                                    <th className="text-center">{t(lang, 'actionsLabel')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeOffice?.inventory.map((item, idx) => {
                                    const isDiagDone = item.diagnostics && Object.keys(item.diagnostics.hardware || {}).length > 0;
                                    return (
                                        <tr key={idx}>
                                            <td><code className="fw-bold text-dark bg-light px-2 py-1 rounded border small">{item.assetTag}</code></td>
                                            <td>
                                                <div className="fw-bold small">{item.model}</div>
                                                <small className="text-muted" style={{fontSize: '0.7rem'}}>S/N: {item.serial}</small>
                                            </td>
                                            <td><div className="small fw-bold text-secondary">{item.user}</div></td>
                                            <td className="text-center">
                                                <span className={`badge small ${item.status === 'Activo' ? 'bg-success' : 'bg-warning text-dark'}`}>
                                                    {t(lang, item.status) || item.status}
                                                </span>
                                            </td>
                                            <td className="text-center">
                                                <button className={`btn btn-sm shadow-sm ${isDiagDone ? 'btn-primary' : 'btn-outline-primary'}`} style={{fontSize: '0.75rem'}} onClick={() => onOpenDiag(idx)}>
                                                    {isDiagDone ? '✅' : '🩺'} {t(lang, 'review') || 'Revisar'}
                                                </button>
                                            </td>
                                            <td className="text-center">
                                                <div className="d-flex justify-content-center gap-1">
                                                    <button className="btn btn-sm btn-link text-warning p-0" onClick={() => onEditEquip(idx)} title={t(lang, 'edit')}>✏️</button>
                                                    <button className="btn btn-sm btn-link text-danger p-0" onClick={() => onDeleteEquip(idx)} title={t(lang, 'delete')}>🗑️</button>
                                                </div>
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

const MobileNav = ({ view, setView, lang }) => {
    return (
        <nav className="mobile-nav fixed-bottom d-md-none bg-white border-top d-flex justify-content-around p-2 shadow">
            <button className={`nav-item border-0 bg-transparent flex-column d-flex align-items-center ${view === 'offices' ? 'text-primary' : 'text-muted'}`} onClick={() => setView('offices')}>
                <span className="fs-4">🏢</span>
                <small style={{fontSize: '0.6rem'}} className="fw-bold">{t(lang, 'offices') || 'Oficinas'}</small>
            </button>
            <button className={`nav-item border-0 bg-transparent flex-column d-flex align-items-center ${view === 'inventory' ? 'text-primary' : 'text-muted'}`} onClick={() => setView('inventory')}>
                <span className="fs-4">💻</span>
                <small style={{fontSize: '0.6rem'}} className="fw-bold">{t(lang, 'items') || 'Equipos'}</small>
            </button>
            <button className={`nav-item border-0 bg-transparent flex-column d-flex align-items-center ${view === 'diagnostic' ? 'text-primary' : 'text-muted'}`} onClick={() => setView('diagnostic')}>
                <span className="fs-4">🩺</span>
                <small style={{fontSize: '0.6rem'}} className="fw-bold">{t(lang, 'integratedDiag') || 'Diag'}</small>
            </button>
        </nav>
    );
};

// --- Forms ---

const OfficeForm = ({ onSave, lang, initialData, onCancel }) => {
    const [formData, setFormData] = useState({
        company: '', depto: '', location: '', auditor: '', auditorCompany: '', date: new Date().toISOString().split('T')[0], manager: '', managerTitle: ''
    });

    useEffect(() => {
        if (initialData) setFormData(initialData);
        else setFormData({ company: '', depto: '', location: '', auditor: '', auditorCompany: '', date: new Date().toISOString().split('T')[0], manager: '', managerTitle: '' });
    }, [initialData]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
        if (!initialData) setFormData({ company: '', depto: '', location: '', auditor: '', auditorCompany: '', date: new Date().toISOString().split('T')[0], manager: '', managerTitle: '' });
    };

    return (
        <form onSubmit={handleSubmit} className="p-1">
            <div className="mb-2">
                <label className="form-label small mb-0 fw-bold">{t(lang, 'companyLabel')}</label>
                <input type="text" className="form-control form-control-sm" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} required />
            </div>
            <div className="row g-2 mb-2">
                <div className="col-6">
                    <label className="form-label small mb-0 fw-bold">{t(lang, 'deptLabel')}</label>
                    <input type="text" className="form-control form-control-sm" value={formData.depto} onChange={e => setFormData({...formData, depto: e.target.value})} />
                </div>
                <div className="col-6">
                    <label className="form-label small mb-0 fw-bold">{t(lang, 'locationLabel')}</label>
                    <input type="text" className="form-control form-control-sm" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} required />
                </div>
            </div>
            <div className="mb-2">
                <label className="form-label small mb-0 fw-bold">{t(lang, 'auditorLabel')}</label>
                <input type="text" className="form-control form-control-sm" value={formData.auditor} onChange={e => setFormData({...formData, auditor: e.target.value})} required />
            </div>
            <div className="row g-2 mb-2">
                <div className="col-6">
                    <label className="form-label small mb-0 fw-bold">{t(lang, 'auditCompanyLabel')}</label>
                    <input type="text" className="form-control form-control-sm" value={formData.auditorCompany} onChange={e => setFormData({...formData, auditorCompany: e.target.value})} />
                </div>
                <div className="col-6">
                    <label className="form-label small mb-0 fw-bold">{t(lang, 'auditDateLabel')}</label>
                    <input type="date" className="form-control form-control-sm" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
            </div>
            <div className="mb-2 text-start">
                <label className="form-label small mb-0 fw-bold">{t(lang, 'managerLabel')}</label>
                <div className="row g-2">
                   <div className="col-7"><input type="text" className="form-control form-control-sm" placeholder="Nombre" value={formData.manager} onChange={e => setFormData({...formData, manager: e.target.value})} required /></div>
                   <div className="col-5"><input type="text" className="form-control form-control-sm" placeholder="Cargo" value={formData.managerTitle} onChange={e => setFormData({...formData, managerTitle: e.target.value})} required /></div>
                </div>
            </div>
            <div className="d-flex gap-2 mt-3">
                <button type="submit" className="btn btn-success btn-sm flex-grow-1 fw-bold shadow-sm">{initialData ? t(lang, 'saveChanges') : t(lang, 'registerOffice')}</button>
                {initialData && <button type="button" className="btn btn-outline-secondary btn-sm fw-bold" onClick={onCancel}>{t(lang, 'close')}</button>}
            </div>
        </form>
    );
};

const EquipmentForm = ({ activeOffice, onSave, lang, initialData, onCancel }) => {
    const [formData, setFormData] = useState({
        type: 'Laptop', model: '', serial: '', assetTag: '', status: 'Activo', user: '', notes: '', purchaseDate: '', warrantyUntil: ''
    });

    useEffect(() => {
        if (initialData) setFormData(initialData);
        else setFormData({ type: 'Laptop', model: '', serial: '', assetTag: '', status: 'Activo', user: '', notes: '', purchaseDate: '', warrantyUntil: '' });
    }, [initialData]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
        if (!initialData) setFormData({ type: 'Laptop', model: '', serial: '', assetTag: '', status: 'Activo', user: '', notes: '', purchaseDate: '', warrantyUntil: '' });
    };

    return (
        <form onSubmit={handleSubmit} className="p-1">
            <div className="mb-2">
                <label className="form-label small mb-0 fw-bold">{t(lang, 'categoryLabel')}</label>
                <select className="form-select form-select-sm" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} required>
                    <option value="Laptop">Laptop</option>
                    <option value="Desktop">Desktop</option>
                    <option value="Monitor">Monitor</option>
                    <option value="Printer">Printer</option>
                    <option value="Periférico">Periférico</option>
                </select>
            </div>
            <div className="mb-2">
                <label className="form-label small mb-0 fw-bold">{t(lang, 'modelLabel')}</label>
                <input type="text" className="form-control form-control-sm" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} required />
            </div>
            <div className="row g-2 mb-2">
                <div className="col-6">
                    <label className="form-label small mb-0 fw-bold">{t(lang, 'serialLabel')}</label>
                    <input type="text" className="form-control form-control-sm" value={formData.serial} onChange={e => setFormData({...formData, serial: e.target.value})} required />
                </div>
                <div className="col-6">
                    <label className="form-label small mb-0 fw-bold">{t(lang, 'assetTagLabel')}</label>
                    <input type="text" className="form-control form-control-sm" value={formData.assetTag} onChange={e => setFormData({...formData, assetTag: e.target.value})} required />
                </div>
            </div>
            <div className="mb-2">
                <label className="form-label small mb-0 fw-bold">{t(lang, 'assignmentLabel')}</label>
                <input type="text" className="form-control form-control-sm" value={formData.user} onChange={e => setFormData({...formData, user: e.target.value})} placeholder="Usuario / Ubicación" />
            </div>
            <div className="row g-2 mb-2">
                <div className="col-6">
                    <label className="form-label small mb-0 fw-bold">{t(lang, 'purchaseDateLabel')}</label>
                    <input type="date" className="form-control form-control-sm" value={formData.purchaseDate} onChange={e => setFormData({...formData, purchaseDate: e.target.value})} />
                </div>
                <div className="col-6">
                    <label className="form-label small mb-0 fw-bold">{t(lang, 'warrantyUntilLabel')}</label>
                    <input type="date" className="form-control form-control-sm" value={formData.warrantyUntil} onChange={e => setFormData({...formData, warrantyUntil: e.target.value})} />
                </div>
            </div>
            <div className="mb-2">
                <label className="form-label small mb-0 fw-bold">{t(lang, 'statusLabel')}</label>
                <select className="form-select form-select-sm" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} required>
                    <option value="Activo">Activo</option>
                    <option value="Stock">Stock</option>
                    <option value="Reparación">Reparación</option>
                    <option value="Baja">Baja</option>
                </select>
            </div>
            <div className="mb-2">
                <label className="form-label small mb-0 fw-bold">{t(lang, 'extraNotes')}</label>
                <textarea className="form-control form-control-sm" rows="1" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}></textarea>
            </div>
            <div className="d-flex gap-2 mt-3">
                <button type="submit" className="btn btn-primary btn-sm flex-grow-1 fw-bold shadow-sm">{initialData ? t(lang, 'saveChanges') : t(lang, 'addEquipment')}</button>
                {initialData && <button type="button" className="btn btn-outline-secondary btn-sm fw-bold" onClick={onCancel}>{t(lang, 'close')}</button>}
            </div>
        </form>
    );
};

// --- App Root ---

const App = () => {
    const [offices, setOffices] = useState([]);
    const [view, setView] = useState('offices');
    const [loading, setLoading] = useState(true);
    const [activeOfficeId, setActiveOfficeId] = useState(null);
    const [activeEquipIndex, setActiveEquipIndex] = useState(null);
    const [editingOffice, setEditingOffice] = useState(null);
    const [editingEquip, setEditingEquip] = useState(null);
    
    const getInitialLang = () => {
        const saved = localStorage.getItem('pocketITCheckLang');
        return (saved === 'es' || saved === 'en') ? saved : 'es';
    };
    const [lang, setLang] = useState(getInitialLang());

    useEffect(() => {
        const init = async () => {
            await migrateFromLocalStorage();
            const data = await getAllOffices();
            setOffices(data);
            setLoading(false);
        };
        init();
    }, []);

    const activeOffice = useMemo(() => offices.find(o => o.id === activeOfficeId), [offices, activeOfficeId]);

    const toggleLang = () => {
        const newLang = lang === 'es' ? 'en' : 'es';
        setLang(newLang);
        localStorage.setItem('pocketITCheckLang', newLang);
    };

    const handleSaveOffice = async (officeData) => {
        let updatedOffices;
        if (editingOffice) {
            updatedOffices = offices.map(o => o.id === editingOffice.id ? { ...o, ...officeData } : o);
            setEditingOffice(null);
        } else {
            const newOffice = { ...officeData, id: Date.now().toString(), inventory: [] };
            updatedOffices = [...offices, newOffice];
        }
        setOffices(updatedOffices);
        const officeToSave = updatedOffices.find(o => o.id === (editingOffice?.id || updatedOffices[updatedOffices.length-1].id));
        await saveOffice(officeToSave);
        Swal.fire({ title: t(lang, 'officeSaved') || 'Guardado', icon: 'success', timer: 1000, showConfirmButton: false });
    };

    const handleDeleteOffice = async (id) => {
        const result = await Swal.fire({
            title: t(lang, 'sureConfirm'), icon: 'warning', showCancelButton: true,
            confirmButtonColor: '#ef4444', confirmButtonText: t(lang, 'deleteBtn')
        });
        if (result.isConfirmed) {
            await deleteOffice(id);
            setOffices(offices.filter(o => o.id !== id));
            if (activeOfficeId === id) setActiveOfficeId(null);
            Swal.fire({ title: t(lang, 'deletedMsg'), icon: 'success', timer: 1000, showConfirmButton: false });
        }
    };

    const handleAddEquipment = async (item) => {
        if (!activeOffice) return;
        const updatedInventory = [...activeOffice.inventory];
        if (editingEquip !== null) {
            updatedInventory[activeEquipIndex] = { ...updatedInventory[activeEquipIndex], ...item };
            setEditingEquip(null);
            setActiveEquipIndex(null);
        } else {
            updatedInventory.push({ ...item, diagnostics: { hardware: {}, software: {} } });
        }
        
        const updatedOffice = { ...activeOffice, inventory: updatedInventory };
        await saveOffice(updatedOffice);
        setOffices(offices.map(o => o.id === activeOffice.id ? updatedOffice : o));
        Swal.fire({ title: t(lang, editingEquip !== null ? 'saveChanges' : 'itemAdded'), icon: 'success', timer: 1000, showConfirmButton: false });
    };

    const handleDeleteEquip = async (index) => {
        if (!activeOffice) return;
        const result = await Swal.fire({
            title: t(lang, 'sureConfirm'), icon: 'warning', showCancelButton: true,
            confirmButtonColor: '#ef4444', confirmButtonText: t(lang, 'deleteBtn')
        });
        if (result.isConfirmed) {
            const updatedInventory = activeOffice.inventory.filter((_, i) => i !== index);
            const updatedOffice = { ...activeOffice, inventory: updatedInventory };
            await saveOffice(updatedOffice);
            setOffices(offices.map(o => o.id === activeOffice.id ? updatedOffice : o));
            Swal.fire({ title: t(lang, 'deletedMsg'), icon: 'success', timer: 1000, showConfirmButton: false });
        }
    };

    const handleSaveDiagnostic = async (diagData, notes) => {
        if (!activeOffice) return;
        const updatedInventory = [...activeOffice.inventory];
        updatedInventory[activeEquipIndex] = { ...updatedInventory[activeEquipIndex], diagnostics: diagData, diagNotes: notes };
        const updatedOffice = { ...activeOffice, inventory: updatedInventory };
        await saveOffice(updatedOffice);
        setOffices(offices.map(o => o.id === activeOffice.id ? updatedOffice : o));
        setView('inventory');
        Swal.fire({ title: t(lang, 'diagSaved'), icon: 'success', timer: 1000, showConfirmButton: false });
    };

    if (loading) return null;

    return (
        <ErrorBoundary>
            <div className="d-flex flex-column flex-md-row min-vh-100 bg-light">
                {view !== 'diagnostic' && (
                    <Sidebar 
                        view={view} 
                        setView={setView} 
                        activeOffice={activeOffice} 
                        onBack={() => { setView('offices'); setActiveOfficeId(null); setEditingEquip(null); }} 
                        lang={lang} 
                        onToggleLang={toggleLang}
                        onSaveOffice={handleSaveOffice}
                        onAddEquipment={handleAddEquipment}
                        editingOffice={editingOffice}
                        editingEquip={editingEquip}
                        onCancelEdit={() => { setEditingOffice(null); setEditingEquip(null); setActiveEquipIndex(null); }}
                    />
                )}

                <main className="flex-grow-1 overflow-auto">
                    {view === 'diagnostic' && activeOffice?.inventory[activeEquipIndex] ? (
                        <DiagnosticSuite 
                            item={activeOffice.inventory[activeEquipIndex]} 
                            lang={lang}
                            onSave={handleSaveDiagnostic} 
                            onCancel={() => setView('inventory')} 
                        />
                    ) : (
                        <MainContent 
                            view={view} 
                            offices={offices} 
                            activeOffice={activeOffice} 
                            onSelectOffice={(id) => { setActiveOfficeId(id); setView('inventory'); }}
                            onOpenDiag={(idx) => { setActiveEquipIndex(idx); setView('diagnostic'); }}
                            onEditOffice={(o) => { setEditingOffice(o); window.scrollTo(0, 0); }}
                            onDeleteOffice={handleDeleteOffice}
                            onEditEquip={(idx) => { setEditingEquip(activeOffice.inventory[idx]); setActiveEquipIndex(idx); window.scrollTo(0, 0); }}
                            onDeleteEquip={handleDeleteEquip}
                            lang={lang} 
                        />
                    )}
                </main>
                <MobileNav view={view} setView={setView} lang={lang} />
            </div>
        </ErrorBoundary>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
