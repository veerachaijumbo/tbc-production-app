import { useState, useEffect } from 'react';
import { LogOut, BarChart3, Package, AlertCircle, CheckCircle, Plus, Minus, X, Loader2, Inbox, Beaker, Trash2, Zap, TrendingUp, TrendingDown, AlertTriangle, Pencil, Save, History, Filter, Download } from 'lucide-react';
import { useDatabase } from '../hooks/useDatabase';
import { useAuth } from '../context/AuthContext';
import { exportToExcel, formatDateForExcel } from '../utils/exportToExcel';

const QUICK_PARAMS = [
  { parameter: 'Mooney Viscosity', specification: '45-55' },
  { parameter: 'Specific Gravity', specification: '1.15-1.20' },
  { parameter: 'Tensile Strength', specification: '≥10 MPa' },
];

const QUICK_ADD_TYPES = ['P2', 'P3'];

export default function DashboardPage({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [showLotForm, setShowLotForm] = useState(false);
  const [showQCForm, setShowQCForm] = useState(false);
  const [showStockForm, setShowStockForm] = useState(false);
  const [showEditLotForm, setShowEditLotForm] = useState(false);
  const [showEditMaterialForm, setShowEditMaterialForm] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  const [selectedLot, setSelectedLot] = useState(null);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [stockMovementType, setStockMovementType] = useState('in');
  const [lotToDelete, setLotToDelete] = useState(null);
  
  const [productionLots, setProductionLots] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [finishedProducts, setFinishedProducts] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);  // Phase 7
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Phase 7: History filters
  const [historyFilterMaterial, setHistoryFilterMaterial] = useState('all');
  const [historyFilterType, setHistoryFilterType] = useState('all');

  const db = useDatabase();
  const { user: authUser } = useAuth();

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [lots, materials, products, movements] = await Promise.all([
        db.getProductionLots(),
        db.getRawMaterials(),
        db.getFinishedProducts(),
        db.getStockMovements(),  // Phase 7
      ]);

      if (lots.data) setProductionLots(lots.data);
      if (materials.data) setRawMaterials(materials.data);
      if (products.data) setFinishedProducts(products.data);
      if (movements.data) setStockMovements(movements.data);
    } catch (err) {
      setError('Failed to load data: ' + err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openQCForm = (lot) => { setSelectedLot(lot); setShowQCForm(true); };
  const openStockForm = (material, type) => { setSelectedMaterial(material); setStockMovementType(type); setShowStockForm(true); };
  const openEditLotForm = (lot) => { setSelectedLot(lot); setShowEditLotForm(true); };
  const openEditMaterialForm = (material) => { setSelectedMaterial(material); setShowEditMaterialForm(true); };
  const requestDeleteLot = (lot) => { setLotToDelete(lot); setShowConfirmDialog(true); };

  const confirmDeleteLot = async () => {
    if (!lotToDelete) return;
    try {
      const { error } = await db.deleteProductionLot(lotToDelete.id);
      if (error) setError('Failed to delete: ' + error.message);
      else { setShowConfirmDialog(false); setLotToDelete(null); loadData(); }
    } catch (err) {
      setError('Error: ' + err.message);
    }
  };

  const draftLots = productionLots.filter(l => l.status === 'draft');
  const releasedLots = productionLots.filter(l => l.status === 'released');
  const archivedLots = productionLots.filter(l => l.status === 'archived');
  const lowStockMaterials = rawMaterials.filter(m => Number(m.stock) <= Number(m.reorder_point || 0));

  // Phase 7: Filtered history
  const filteredMovements = stockMovements.filter(m => {
    if (historyFilterMaterial !== 'all' && m.raw_material_id !== historyFilterMaterial) return false;
    if (historyFilterType !== 'all' && m.movement_type !== historyFilterType) return false;
    return true;
  });

  const stats = [
    { label: 'Production Lots', value: productionLots.length, color: '#3b82f6' },
    { label: 'Pending QC', value: draftLots.length, color: '#f59e0b' },
    { label: 'Low Stock', value: lowStockMaterials.length, color: '#ef4444' },
    { label: 'Finished Products', value: finishedProducts.length, color: '#8b5cf6' },
  ];

  const getStockClass = (material) => {
    const stock = Number(material.stock);
    const reorder = Number(material.reorder_point || 0);
    if (stock < 0) return 'stock-negative';
    if (stock <= reorder) return 'stock-low';
    return '';
  };

  // Phase 7: Get material name from ID
  const getMaterialName = (id) => {
    const mat = rawMaterials.find(m => m.id === id);
    return mat ? mat.name : id;
  };

  // Phase 7: Format date
  const formatDateTime = (isoString) => {
    if (!isoString) return '-';
    const d = new Date(isoString);
    return d.toLocaleString('th-TH', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  };

 // ========== Export Functions ==========
  const exportProductionLots = () => {
    const data = productionLots.map((lot) => ({
      'Lot Number': lot.lot_number,
      'Product': lot.product_id,
      'Product Type': lot.product_type_id,
      'Quantity (kg)': lot.quantity,
      'Status': lot.status,
      'Mfg Date': lot.mfg_date,
      'Exp Date': lot.exp_date,
      'Operator': lot.operator_name || '-',
      'QC Notes': lot.qc_notes || '-',
      'Created': formatDateForExcel(lot.created_at),
    }));
    exportToExcel(data, 'production-lots', 'Production Lots');
  };

  const exportMaterials = () => {
    const data = rawMaterials.map((mat) => ({
      'Material ID': mat.id,
      'Name': mat.name,
      'Stock': mat.stock,
      'Unit': mat.unit,
      'Reorder Point': mat.reorder_point || 0,
      'Pack Size': mat.pack_size || '-',
      'Status': Number(mat.stock) < 0 ? 'NEGATIVE' 
               : Number(mat.stock) <= Number(mat.reorder_point || 0) ? 'LOW' 
               : 'OK',
      'Description': mat.description || '-',
    }));
    exportToExcel(data, 'raw-materials', 'Raw Materials');
  };

  const exportHistory = () => {
    const data = filteredMovements.map((mv) => ({
      'Date/Time': formatDateForExcel(mv.created_at),
      'Movement #': mv.movement_number,
      'Material ID': mv.raw_material_id,
      'Material Name': getMaterialName(mv.raw_material_id),
      'Type': mv.movement_type === 'in' ? 'IN' : 'OUT',
      'Quantity': mv.movement_type === 'in' ? `+${mv.quantity}` : `-${mv.quantity}`,
      'Balance After': mv.balance_after,
      'Reference': mv.reference_number || '-',
      'Recorded By': mv.recorded_by_name || '-',
    }));
    exportToExcel(data, 'stock-movements-history', 'Stock History');
  }; 

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>TBC Production Manager</h1>
          <p>Production Management System v7.0.0</p>
        </div>
        <div className="header-right">
          <div className="user-info">
            <span className="user-name">{user.name}</span>
            <span className="user-role">{user.role.toUpperCase()}</span>
          </div>
          <button className="logout-button" onClick={onLogout}>
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </header>

      <nav className="dashboard-nav">
        {['overview', 'production', 'materials', 'qc', 'history'].map((tab) => (
          <button
            key={tab}
            className={`nav-button ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </nav>

      <main className="dashboard-content">
        {error && (
          <div className="error-banner">
            ⚠️ {error}
            <button onClick={loadData} className="retry-btn">Retry</button>
          </div>
        )}

        {loading && (
          <div className="loading-state">
            <Loader2 className="spinner" size={32} />
            <p>Loading data...</p>
          </div>
        )}

        {!loading && activeTab === 'overview' && (
          <div>
            <h2>Dashboard Overview</h2>
            <div className="stats-grid">
              {stats.map((stat) => (
                <div key={stat.label} className="stat-card" style={{ borderLeftColor: stat.color }}>
                  <div className="stat-value">{stat.value}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              ))}
            </div>

            {lowStockMaterials.length > 0 && (
              <div className="alert-card warning" style={{ marginTop: '1.5rem' }}>
                <AlertTriangle size={24} />
                <div>
                  <h3>Low Stock Alert</h3>
                  <p>{lowStockMaterials.length} material(s) are at or below reorder point</p>
                </div>
                <button className="secondary-button" onClick={() => setActiveTab('materials')}>
                  View Materials
                </button>
              </div>
            )}
          </div>
        )}

        {!loading && activeTab === 'production' && (
          <div>
            <div className="section-header">
              <h2>Production Lots</h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="secondary-button" onClick={exportProductionLots} disabled={productionLots.length === 0}>
                  <Download size={18} />
                  Export Excel
                </button>
                <button className="primary-button" onClick={() => setShowLotForm(true)}>
                  <Plus size={18} />
                  New Lot
                </button>
              </div>
            </div>

            {productionLots.length === 0 ? (
              <div className="empty-state">
                <Inbox size={48} />
                <h3>No Production Lots Yet</h3>
                <p>Create your first production lot to get started</p>
                <button className="primary-button" onClick={() => setShowLotForm(true)}>
                  <Plus size={18} />Create First Lot
                </button>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Lot Number</th>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Status</th>
                      <th>Mfg Date</th>
                      <th>Exp Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productionLots.map((lot) => (
                      <tr key={lot.id}>
                        <td className="font-bold">{lot.lot_number}</td>
                        <td>{lot.product_id}</td>
                        <td>{lot.quantity} kg</td>
                        <td><span className={`status-badge status-${lot.status}`}>{lot.status}</span></td>
                        <td>{lot.mfg_date}</td>
                        <td>{lot.exp_date}</td>
                        <td>
                          <div className="action-buttons">
                            <button className="edit-btn" onClick={() => openEditLotForm(lot)} title="Edit"><Pencil size={14} /></button>
                            <button className="delete-btn" onClick={() => requestDeleteLot(lot)} title="Delete"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {!loading && activeTab === 'materials' && (
          <div>
            <div className="section-header">
              <h2>Raw Materials Stock</h2>
              <div className="materials-summary">
                <span>Total: <strong>{rawMaterials.length}</strong></span>
                {lowStockMaterials.length > 0 && (
                  <span className="warning-text">
                    <AlertTriangle size={14} /> Low: <strong>{lowStockMaterials.length}</strong>
                  </span>
                )}
              </div>
            </div>

            {rawMaterials.length === 0 ? (
              <div className="empty-state">
                <Package size={48} />
                <h3>No Materials</h3>
                <p>No raw materials in the system yet</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Material ID</th>
                      <th>Name</th>
                      <th>Stock</th>
                      <th>Unit</th>
                      <th>Reorder Point</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rawMaterials.map((mat) => {
                      const stock = Number(mat.stock);
                      const reorder = Number(mat.reorder_point || 0);
                      const isLow = stock <= reorder;
                      const isNegative = stock < 0;
                      return (
                        <tr key={mat.id} className={getStockClass(mat)}>
                          <td className="font-bold">{mat.id}</td>
                          <td>{mat.name}</td>
                          <td className="font-bold">{stock}</td>
                          <td>{mat.unit}</td>
                          <td>{reorder}</td>
                          <td>
                            {isNegative ? <span className="status-badge status-archived">NEGATIVE</span>
                             : isLow ? <span className="status-badge status-draft">LOW</span>
                             : <span className="status-badge status-released">OK</span>}
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button className="stock-in-btn" onClick={() => openStockForm(mat, 'in')}><Plus size={14} />In</button>
                              <button className="stock-out-btn" onClick={() => openStockForm(mat, 'out')}><Minus size={14} />Out</button>
                              <button className="edit-btn" onClick={() => openEditMaterialForm(mat)} title="Edit"><Pencil size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {!loading && activeTab === 'qc' && (
          <div>
            <h2>Quality Control</h2>
            <div className="qc-info">
              <div className="qc-card pending"><AlertCircle size={32} /><h3>Pending Tests</h3><p className="qc-number">{draftLots.length}</p></div>
              <div className="qc-card passed"><CheckCircle size={32} /><h3>Released</h3><p className="qc-number">{releasedLots.length}</p></div>
              <div className="qc-card archived"><X size={32} /><h3>Archived</h3><p className="qc-number">{archivedLots.length}</p></div>
            </div>
            <div className="section-header" style={{ marginTop: '2rem' }}>
              <h3>Lots Awaiting QC Testing</h3>
            </div>
            {draftLots.length === 0 ? (
              <div className="empty-state"><CheckCircle size={48} /><h3>All caught up!</h3><p>No lots are waiting for QC testing</p></div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr><th>Lot Number</th><th>Product</th><th>Type</th><th>Quantity</th><th>Mfg Date</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {draftLots.map((lot) => (
                      <tr key={lot.id}>
                        <td className="font-bold">{lot.lot_number}</td>
                        <td>{lot.product_id}</td>
                        <td><span className="product-type-tag">{lot.product_type_id}</span></td>
                        <td>{lot.quantity} kg</td>
                        <td>{lot.mfg_date}</td>
                        <td><button className="test-button" onClick={() => openQCForm(lot)}><Beaker size={16} />Test</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Phase 7: History Tab */}
        {!loading && activeTab === 'history' && (
          <div>
            <div className="section-header">
              <h2>
                <History size={24} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />
                Stock Movement History
              </h2>
              <div className="materials-summary">
                <span>Total: <strong>{filteredMovements.length}</strong> records</span>
              </div>
            </div>

            {/* Filters */}
            <div className="filter-bar">
              <div className="filter-group">
                <label><Filter size={14} /> Material:</label>
                <select value={historyFilterMaterial} onChange={(e) => setHistoryFilterMaterial(e.target.value)}>
                  <option value="all">All Materials</option>
                  {rawMaterials.map((mat) => (
                    <option key={mat.id} value={mat.id}>{mat.id} - {mat.name}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Type:</label>
                <div className="filter-buttons">
                  <button
                    className={`filter-btn ${historyFilterType === 'all' ? 'active' : ''}`}
                    onClick={() => setHistoryFilterType('all')}
                  >All</button>
                  <button
                    className={`filter-btn filter-in ${historyFilterType === 'in' ? 'active' : ''}`}
                    onClick={() => setHistoryFilterType('in')}
                  ><TrendingUp size={14} /> In</button>
                  <button
                    className={`filter-btn filter-out ${historyFilterType === 'out' ? 'active' : ''}`}
                    onClick={() => setHistoryFilterType('out')}
                  ><TrendingDown size={14} /> Out</button>
                </div>
              </div>

              {(historyFilterMaterial !== 'all' || historyFilterType !== 'all') && (
                <button
                  className="secondary-button"
                  onClick={() => { setHistoryFilterMaterial('all'); setHistoryFilterType('all'); }}
                >
                  <X size={14} />
                  Clear Filters
                </button>
              )}
            </div>

            {filteredMovements.length === 0 ? (
              <div className="empty-state">
                <History size={48} />
                <h3>No Movement Records</h3>
                <p>{stockMovements.length === 0 ? 'No stock movements yet' : 'No records match the current filters'}</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date/Time</th>
                      <th>Movement #</th>
                      <th>Material</th>
                      <th>Type</th>
                      <th>Quantity</th>
                      <th>Balance After</th>
                      <th>Reference</th>
                      <th>Recorded By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMovements.map((mv) => (
                      <tr key={mv.id}>
                        <td>{formatDateTime(mv.created_at)}</td>
                        <td className="font-bold">{mv.movement_number}</td>
                        <td>
                          <div className="material-cell">
                            <strong>{mv.raw_material_id}</strong>
                            <span className="material-name-small">{getMaterialName(mv.raw_material_id)}</span>
                          </div>
                        </td>
                        <td>
                          {mv.movement_type === 'in' ? (
                            <span className="movement-type-tag in"><TrendingUp size={12} /> IN</span>
                          ) : (
                            <span className="movement-type-tag out"><TrendingDown size={12} /> OUT</span>
                          )}
                        </td>
                        <td className={mv.movement_type === 'in' ? 'qty-in' : 'qty-out'}>
                          {mv.movement_type === 'in' ? '+' : '-'}{mv.quantity}
                        </td>
                        <td className="font-bold">{mv.balance_after}</td>
                        <td>{mv.reference_number || '-'}</td>
                        <td>{mv.recorded_by_name || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="dashboard-footer">
        <p>TBC Production Manager &copy; 2026 | Supabase-powered</p>
      </footer>

      {showLotForm && (
        <ProductionLotForm products={finishedProducts} authUser={authUser}
          onClose={() => setShowLotForm(false)}
          onSuccess={() => { setShowLotForm(false); loadData(); }}
          createLot={db.createProductionLot} />
      )}

      {showQCForm && selectedLot && (
        <QCTestForm lot={selectedLot} authUser={authUser}
          createTest={db.createQCTestResult} updateLot={db.updateProductionLot}
          onClose={() => { setShowQCForm(false); setSelectedLot(null); }}
          onSuccess={() => { setShowQCForm(false); setSelectedLot(null); loadData(); }} />
      )}

      {showStockForm && selectedMaterial && (
        <StockMovementForm material={selectedMaterial} movementType={stockMovementType} authUser={authUser}
          createMovement={db.createStockMovement} updateStock={db.updateRawMaterialStock}
          onClose={() => { setShowStockForm(false); setSelectedMaterial(null); }}
          onSuccess={() => { setShowStockForm(false); setSelectedMaterial(null); loadData(); }} />
      )}

      {showEditLotForm && selectedLot && (
        <EditLotForm lot={selectedLot} products={finishedProducts} updateLot={db.updateProductionLot}
          onClose={() => { setShowEditLotForm(false); setSelectedLot(null); }}
          onSuccess={() => { setShowEditLotForm(false); setSelectedLot(null); loadData(); }} />
      )}

      {showEditMaterialForm && selectedMaterial && (
        <EditMaterialForm material={selectedMaterial} updateMaterial={db.updateRawMaterial}
          onClose={() => { setShowEditMaterialForm(false); setSelectedMaterial(null); }}
          onSuccess={() => { setShowEditMaterialForm(false); setSelectedMaterial(null); loadData(); }} />
      )}

      {showConfirmDialog && lotToDelete && (
        <ConfirmDialog title="Delete Production Lot?"
          message={`Are you sure you want to delete lot "${lotToDelete.lot_number}"? This action cannot be undone.`}
          confirmText="Yes, Delete" cancelText="Cancel" danger={true}
          onConfirm={confirmDeleteLot}
          onCancel={() => { setShowConfirmDialog(false); setLotToDelete(null); }} />
      )}
    </div>
  );
}

// ===================================================
// Production Lot Form
// ===================================================
function ProductionLotForm({ products, authUser, onClose, onSuccess, createLot }) {
  const today = new Date().toISOString().split('T')[0];
  const oneYearLater = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const generateLotNumber = () => {
    const now = new Date();
    return `LOT-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${now.toTimeString().slice(0, 5).replace(':', '')}`;
  };

  const [formData, setFormData] = useState({
    lot_number: generateLotNumber(), product_id: products[0]?.id || '',
    product_type_id: products[0]?.product_type_id || '', quantity: 100,
    mfg_date: today, exp_date: oneYearLater, status: 'draft', qc_notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleProductChange = (productId) => {
    const product = products.find(p => p.id === productId);
    setFormData({ ...formData, product_id: productId, product_type_id: product?.product_type_id || '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.lot_number.trim()) { setError('Lot number is required'); return; }
    if (!formData.product_id) { setError('Please select a product'); return; }
    if (formData.quantity <= 0) { setError('Quantity must be greater than 0'); return; }
    setSubmitting(true);
    try {
      const payload = {
        ...formData, quantity: Number(formData.quantity),
        qc_notes: formData.qc_notes || null, operator_id: authUser?.id || null,
        operator_name: authUser?.user_metadata?.full_name || authUser?.email?.split('@')[0] || null,
      };
      const { error: insertError } = await createLot(payload);
      if (insertError) setError('Failed to create lot: ' + insertError.message);
      else onSuccess();
    } catch (err) {
      setError('Error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Production Lot</h2>
          <button className="close-button" onClick={onClose}><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label>Lot Number *</label>
              <input type="text" value={formData.lot_number} onChange={(e) => setFormData({ ...formData, lot_number: e.target.value })} disabled={submitting} />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} disabled={submitting}>
                <option value="draft">Draft</option><option value="released">Released</option><option value="archived">Archived</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Product *</label>
            <select value={formData.product_id} onChange={(e) => handleProductChange(e.target.value)} disabled={submitting}>
              {products.length === 0 && <option value="">No products available</option>}
              {products.map((p) => <option key={p.id} value={p.id}>{p.id} - {p.name}</option>)}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Quantity (kg) *</label>
              <input type="number" min="0" step="0.01" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} disabled={submitting} />
            </div>
            <div className="form-group">
              <label>Product Type</label>
              <input type="text" value={formData.product_type_id} readOnly style={{ background: '#f5f5f5' }} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Mfg Date *</label>
              <input type="date" value={formData.mfg_date} onChange={(e) => setFormData({ ...formData, mfg_date: e.target.value })} disabled={submitting} />
            </div>
            <div className="form-group">
              <label>Exp Date *</label>
              <input type="date" value={formData.exp_date} onChange={(e) => setFormData({ ...formData, exp_date: e.target.value })} disabled={submitting} />
            </div>
          </div>
          <div className="form-group">
            <label>Notes (optional)</label>
            <textarea rows="3" value={formData.qc_notes} onChange={(e) => setFormData({ ...formData, qc_notes: e.target.value })} disabled={submitting} />
          </div>
          {error && <div className="error-message">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="submit" className="primary-button" disabled={submitting}>
              {submitting ? <><Loader2 size={18} className="spinner" />Saving...</> : <><Plus size={18} />Create Lot</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===================================================
// QC Test Form
// ===================================================
function QCTestForm({ lot, authUser, createTest, updateLot, onClose, onSuccess }) {
  const isQuickAddType = QUICK_ADD_TYPES.includes(lot.product_type_id);
  const initialParams = isQuickAddType
    ? QUICK_PARAMS.map((p, idx) => ({ id: Date.now() + idx, parameter: p.parameter, specification: p.specification, test_result: '', status: 'pass' }))
    : [{ id: Date.now(), parameter: '', specification: '', test_result: '', status: 'pass' }];

  const [params, setParams] = useState(initialParams);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const addCustomParam = () => setParams([...params, { id: Date.now(), parameter: '', specification: '', test_result: '', status: 'pass' }]);
  const addQuickParam = (qp) => setParams([...params, { id: Date.now(), parameter: qp.parameter, specification: qp.specification, test_result: '', status: 'pass' }]);
  const updateParam = (id, field, value) => setParams(params.map(p => (p.id === id ? { ...p, [field]: value } : p)));
  const removeParam = (id) => setParams(params.filter(p => p.id !== id));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (params.length === 0) { setError('Please add at least one test parameter'); return; }
    const invalidParams = params.filter(p => !p.parameter.trim() || !p.test_result.trim());
    if (invalidParams.length > 0) { setError('Please fill in Parameter and Test Result for all rows'); return; }
    setSubmitting(true);
    try {
      for (const param of params) {
        const payload = {
          lot_id: lot.id, parameter: param.parameter.trim(),
          specification: param.specification.trim() || null, test_result: param.test_result.trim(),
          status: param.status, notes: notes.trim() || null, tested_by: authUser?.id || null,
        };
        const { error: insertError } = await createTest(payload);
        if (insertError) throw new Error('Failed to save test: ' + insertError.message);
      }
      const hasFail = params.some(p => p.status === 'fail');
      const newStatus = hasFail ? 'archived' : 'released';
      const { error: updateError } = await updateLot(lot.id, {
        status: newStatus, qc_approved_by: authUser?.id || null,
        qc_approved_at: new Date().toISOString(), qc_notes: notes.trim() || null,
      });
      if (updateError) throw new Error('Tests saved but failed to update lot status: ' + updateError.message);
      onSuccess();
    } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2><Beaker size={20} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />QC Test - {lot.lot_number}</h2>
          <button className="close-button" onClick={onClose}><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="lot-info-box">
            <div><strong>Product:</strong> {lot.product_id}</div>
            <div><strong>Type:</strong> {lot.product_type_id}</div>
            <div><strong>Quantity:</strong> {lot.quantity} kg</div>
            <div><strong>Mode:</strong> {isQuickAddType ? '⚡ Quick Add' : '✏️ Custom Add'}</div>
          </div>
          <div className="form-group">
            <label><Zap size={16} style={{ display: 'inline', verticalAlign: 'middle' }} /> Quick Add Standard Parameters:</label>
            <div className="quick-buttons">
              {QUICK_PARAMS.map((qp) => (
                <button key={qp.parameter} type="button" className="quick-add-btn" onClick={() => addQuickParam(qp)} disabled={submitting}>
                  <Plus size={14} />{qp.parameter}
                </button>
              ))}
              <button type="button" className="quick-add-btn custom" onClick={addCustomParam} disabled={submitting}>
                <Plus size={14} />Custom Parameter
              </button>
            </div>
          </div>
          <div className="form-group">
            <label>Test Parameters ({params.length})</label>
            {params.length === 0 ? <div className="empty-params"><p>No parameters added.</p></div> : (
              <div className="params-list">
                {params.map((param, idx) => (
                  <div key={param.id} className="param-row">
                    <div className="param-number">#{idx + 1}</div>
                    <div className="param-fields">
                      <input type="text" placeholder="Parameter name *" value={param.parameter} onChange={(e) => updateParam(param.id, 'parameter', e.target.value)} disabled={submitting} />
                      <input type="text" placeholder="Specification" value={param.specification} onChange={(e) => updateParam(param.id, 'specification', e.target.value)} disabled={submitting} />
                      <input type="text" placeholder="Test result *" value={param.test_result} onChange={(e) => updateParam(param.id, 'test_result', e.target.value)} disabled={submitting} />
                      <select value={param.status} onChange={(e) => updateParam(param.id, 'status', e.target.value)} disabled={submitting} className={`status-select status-${param.status}`}>
                        <option value="pass">✓ Pass</option><option value="fail">✗ Fail</option>
                      </select>
                    </div>
                    <button type="button" className="delete-row-btn" onClick={() => removeParam(param.id)} disabled={submitting}><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="form-group">
            <label>QC Notes (optional)</label>
            <textarea rows="3" value={notes} onChange={(e) => setNotes(e.target.value)} disabled={submitting} />
          </div>
          {params.length > 0 && (
            <div className={`result-preview ${params.some(p => p.status === 'fail') ? 'fail' : 'pass'}`}>
              <strong>Result:</strong> {params.some(p => p.status === 'fail') ? '✗ Lot will be ARCHIVED' : '✓ Lot will be RELEASED'}
            </div>
          )}
          {error && <div className="error-message">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="submit" className="primary-button" disabled={submitting || params.length === 0}>
              {submitting ? <><Loader2 size={18} className="spinner" />Saving...</> : <><CheckCircle size={18} />Save & Update Status</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===================================================
// Stock Movement Form
// ===================================================
function StockMovementForm({ material, movementType, authUser, createMovement, updateStock, onClose, onSuccess }) {
  const isStockIn = movementType === 'in';
  const currentStock = Number(material.stock);
  const generateMovementNumber = () => {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const time = now.toTimeString().slice(0, 8).replace(/:/g, '');
    return `${isStockIn ? 'IN' : 'OUT'}-${date}-${time}`;
  };

  const [formData, setFormData] = useState({ movement_number: generateMovementNumber(), quantity: '', reference_number: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const qty = Number(formData.quantity) || 0;
  const balanceAfter = isStockIn ? currentStock + qty : currentStock - qty;
  const willGoNegative = balanceAfter < 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.movement_number.trim()) { setError('Movement number is required'); return; }
    if (qty <= 0) { setError('Quantity must be greater than 0'); return; }
    setSubmitting(true);
    try {
      const movementPayload = {
        movement_number: formData.movement_number, raw_material_id: material.id,
        movement_type: movementType, quantity: qty, balance_after: balanceAfter,
        reference_number: formData.reference_number.trim() || null,
        notes: formData.notes.trim() || null, recorded_by: authUser?.id || null,
        recorded_by_name: authUser?.user_metadata?.full_name || authUser?.email?.split('@')[0] || null,
      };
      const { error: movementError } = await createMovement(movementPayload);
      if (movementError) throw new Error('Failed to record movement: ' + movementError.message);
      const { error: updateError } = await updateStock(material.id, balanceAfter);
      if (updateError) throw new Error('Movement saved but failed to update stock: ' + updateError.message);
      onSuccess();
    } catch (err) { setError(err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            {isStockIn ? <><TrendingUp size={20} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle', color: '#10b981' }} />Stock In</>
                       : <><TrendingDown size={20} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle', color: '#f59e0b' }} />Stock Out</>}
            {' - '}{material.id}
          </h2>
          <button className="close-button" onClick={onClose}><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="lot-info-box">
            <div><strong>Material:</strong> {material.name}</div>
            <div><strong>Current Stock:</strong> {currentStock} {material.unit}</div>
            <div><strong>Reorder Point:</strong> {material.reorder_point || 0} {material.unit}</div>
            <div><strong>Action:</strong> {isStockIn ? '📥 Adding' : '📤 Removing'}</div>
          </div>
          <div className="form-group">
            <label>Movement Number *</label>
            <input type="text" value={formData.movement_number} onChange={(e) => setFormData({ ...formData, movement_number: e.target.value })} disabled={submitting} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Quantity ({material.unit}) *</label>
              <input type="number" min="0" step="0.01" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} disabled={submitting} autoFocus />
            </div>
            <div className="form-group">
              <label>Balance After</label>
              <input type="text" value={`${balanceAfter} ${material.unit}`} readOnly style={{ background: willGoNegative ? '#fee2e2' : '#f0fdf4', color: willGoNegative ? '#991b1b' : '#065f46', fontWeight: 700 }} />
            </div>
          </div>
          {willGoNegative && qty > 0 && (
            <div className="alert-card warning">
              <AlertTriangle size={20} />
              <div>
                <strong>Warning: Stock will go negative!</strong>
                <p style={{ margin: 0, fontSize: '0.875rem' }}>Available: {currentStock}, removing {qty}. Result: {balanceAfter}</p>
              </div>
            </div>
          )}
          <div className="form-group">
            <label>Reference Number (optional)</label>
            <input type="text" value={formData.reference_number} onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })} disabled={submitting} />
          </div>
          <div className="form-group">
            <label>Notes (optional)</label>
            <textarea rows="3" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} disabled={submitting} />
          </div>
          {error && <div className="error-message">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="submit" className={isStockIn ? 'primary-button' : 'primary-button warning-btn'} disabled={submitting || qty <= 0}>
              {submitting ? <><Loader2 size={18} className="spinner" />Saving...</> : isStockIn ? <><Plus size={18} />Add Stock</> : <><Minus size={18} />Remove Stock</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===================================================
// Edit Lot Form
// ===================================================
function EditLotForm({ lot, products, updateLot, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    lot_number: lot.lot_number, product_id: lot.product_id,
    product_type_id: lot.product_type_id, quantity: lot.quantity,
    mfg_date: lot.mfg_date, exp_date: lot.exp_date,
    status: lot.status, qc_notes: lot.qc_notes || '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleProductChange = (productId) => {
    const product = products.find(p => p.id === productId);
    setFormData({ ...formData, product_id: productId, product_type_id: product?.product_type_id || '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.lot_number.trim()) { setError('Lot number is required'); return; }
    if (formData.quantity <= 0) { setError('Quantity must be greater than 0'); return; }
    setSubmitting(true);
    try {
      const payload = { ...formData, quantity: Number(formData.quantity), qc_notes: formData.qc_notes || null };
      const { error: updateError } = await updateLot(lot.id, payload);
      if (updateError) setError('Failed to update: ' + updateError.message);
      else onSuccess();
    } catch (err) { setError('Error: ' + err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2><Pencil size={20} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />Edit Lot - {lot.lot_number}</h2>
          <button className="close-button" onClick={onClose}><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label>Lot Number *</label>
              <input type="text" value={formData.lot_number} onChange={(e) => setFormData({ ...formData, lot_number: e.target.value })} disabled={submitting} />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} disabled={submitting}>
                <option value="draft">Draft</option><option value="released">Released</option><option value="archived">Archived</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Product *</label>
            <select value={formData.product_id} onChange={(e) => handleProductChange(e.target.value)} disabled={submitting}>
              {products.map((p) => <option key={p.id} value={p.id}>{p.id} - {p.name}</option>)}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Quantity (kg) *</label>
              <input type="number" min="0" step="0.01" value={formData.quantity} onChange={(e) => setFormData({ ...formData, quantity: e.target.value })} disabled={submitting} />
            </div>
            <div className="form-group">
              <label>Product Type</label>
              <input type="text" value={formData.product_type_id} readOnly style={{ background: '#f5f5f5' }} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Mfg Date *</label>
              <input type="date" value={formData.mfg_date} onChange={(e) => setFormData({ ...formData, mfg_date: e.target.value })} disabled={submitting} />
            </div>
            <div className="form-group">
              <label>Exp Date *</label>
              <input type="date" value={formData.exp_date} onChange={(e) => setFormData({ ...formData, exp_date: e.target.value })} disabled={submitting} />
            </div>
          </div>
          <div className="form-group">
            <label>Notes</label>
            <textarea rows="3" value={formData.qc_notes} onChange={(e) => setFormData({ ...formData, qc_notes: e.target.value })} disabled={submitting} />
          </div>
          {error && <div className="error-message">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="submit" className="primary-button" disabled={submitting}>
              {submitting ? <><Loader2 size={18} className="spinner" />Saving...</> : <><Save size={18} />Save Changes</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===================================================
// Edit Material Form
// ===================================================
function EditMaterialForm({ material, updateMaterial, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    name: material.name, unit: material.unit,
    pack_size: material.pack_size || 25, reorder_point: material.reorder_point || 0,
    description: material.description || '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.name.trim()) { setError('Name is required'); return; }
    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(), unit: formData.unit.trim() || 'kg',
        pack_size: Number(formData.pack_size) || 25, reorder_point: Number(formData.reorder_point) || 0,
        description: formData.description.trim() || null,
      };
      const { error: updateError } = await updateMaterial(material.id, payload);
      if (updateError) setError('Failed to update: ' + updateError.message);
      else onSuccess();
    } catch (err) { setError('Error: ' + err.message); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2><Pencil size={20} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />Edit Material - {material.id}</h2>
          <button className="close-button" onClick={onClose}><X size={24} /></button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="lot-info-box">
            <div><strong>Material ID:</strong> {material.id}</div>
            <div><strong>Current Stock:</strong> {material.stock} {material.unit}</div>
          </div>
          <div className="form-group">
            <label>Name *</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} disabled={submitting} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Unit</label>
              <input type="text" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} disabled={submitting} />
            </div>
            <div className="form-group">
              <label>Pack Size</label>
              <input type="number" min="0" step="0.01" value={formData.pack_size} onChange={(e) => setFormData({ ...formData, pack_size: e.target.value })} disabled={submitting} />
            </div>
          </div>
          <div className="form-group">
            <label>Reorder Point</label>
            <input type="number" min="0" step="0.01" value={formData.reorder_point} onChange={(e) => setFormData({ ...formData, reorder_point: e.target.value })} disabled={submitting} />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea rows="3" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} disabled={submitting} />
          </div>
          {error && <div className="error-message">{error}</div>}
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="submit" className="primary-button" disabled={submitting}>
              {submitting ? <><Loader2 size={18} className="spinner" />Saving...</> : <><Save size={18} />Save Changes</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===================================================
// Confirm Dialog
// ===================================================
function ConfirmDialog({ title, message, confirmText, cancelText, danger, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 style={{ color: danger ? '#dc2626' : '#1f2937' }}>
            {danger && <AlertTriangle size={20} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />}
            {title}
          </h2>
          <button className="close-button" onClick={onCancel}><X size={24} /></button>
        </div>
        <div className="modal-form">
          <p style={{ fontSize: '1rem', color: '#4b5563', margin: 0, padding: '0.5rem 0' }}>{message}</p>
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onCancel}>{cancelText || 'Cancel'}</button>
            <button type="button" className={danger ? 'primary-button danger-btn' : 'primary-button'} onClick={onConfirm}>
              {danger && <Trash2 size={18} />}
              {confirmText || 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}