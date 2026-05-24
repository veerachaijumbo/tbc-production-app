import { useState, useEffect } from 'react';
import { LogOut, BarChart3, Package, AlertCircle, CheckCircle, Plus, Minus, X, Loader2, Inbox, Beaker, Trash2, Zap, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { useDatabase } from '../hooks/useDatabase';
import { useAuth } from '../context/AuthContext';

// Quick Add Parameters - สำหรับ CMB (P2) และ EPDM (P3)
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
  const [selectedLot, setSelectedLot] = useState(null);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [stockMovementType, setStockMovementType] = useState('in');
  
  // Data states
  const [productionLots, setProductionLots] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [finishedProducts, setFinishedProducts] = useState([]);
  
  // UI states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const db = useDatabase();
  const { user: authUser } = useAuth();

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [lots, materials, products] = await Promise.all([
        db.getProductionLots(),
        db.getRawMaterials(),
        db.getFinishedProducts(),
      ]);

      if (lots.data) setProductionLots(lots.data);
      if (materials.data) setRawMaterials(materials.data);
      if (products.data) setFinishedProducts(products.data);
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

  const openQCForm = (lot) => {
    setSelectedLot(lot);
    setShowQCForm(true);
  };

  const openStockForm = (material, type) => {
    setSelectedMaterial(material);
    setStockMovementType(type);
    setShowStockForm(true);
  };

  const draftLots = productionLots.filter(l => l.status === 'draft');
  const releasedLots = productionLots.filter(l => l.status === 'released');
  const archivedLots = productionLots.filter(l => l.status === 'archived');
  const lowStockMaterials = rawMaterials.filter(m => Number(m.stock) <= Number(m.reorder_point || 0));

  const stats = [
    { label: 'Production Lots', value: productionLots.length, color: '#3b82f6' },
    { label: 'Pending QC', value: draftLots.length, color: '#f59e0b' },
    { label: 'Low Stock', value: lowStockMaterials.length, color: '#ef4444' },
    { label: 'Finished Products', value: finishedProducts.length, color: '#8b5cf6' },
  ];

  // Get stock status class for materials table
  const getStockClass = (material) => {
    const stock = Number(material.stock);
    const reorder = Number(material.reorder_point || 0);
    if (stock < 0) return 'stock-negative';
    if (stock <= reorder) return 'stock-low';
    return '';
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>TBC Production Manager</h1>
          <p>Production Management System v4.0.0</p>
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
        {['overview', 'production', 'materials', 'qc'].map((tab) => (
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

            {/* Low Stock Alert */}
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
              <button className="primary-button" onClick={() => setShowLotForm(true)}>
                <Plus size={18} />
                New Lot
              </button>
            </div>

            {productionLots.length === 0 ? (
              <div className="empty-state">
                <Inbox size={48} />
                <h3>No Production Lots Yet</h3>
                <p>Create your first production lot to get started</p>
                <button className="primary-button" onClick={() => setShowLotForm(true)}>
                  <Plus size={18} />
                  Create First Lot
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
                    </tr>
                  </thead>
                  <tbody>
                    {productionLots.map((lot) => (
                      <tr key={lot.id}>
                        <td className="font-bold">{lot.lot_number}</td>
                        <td>{lot.product_id}</td>
                        <td>{lot.quantity} kg</td>
                        <td>
                          <span className={`status-badge status-${lot.status}`}>
                            {lot.status}
                          </span>
                        </td>
                        <td>{lot.mfg_date}</td>
                        <td>{lot.exp_date}</td>
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
                            {isNegative ? (
                              <span className="status-badge status-archived">NEGATIVE</span>
                            ) : isLow ? (
                              <span className="status-badge status-draft">LOW</span>
                            ) : (
                              <span className="status-badge status-released">OK</span>
                            )}
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button className="stock-in-btn" onClick={() => openStockForm(mat, 'in')}>
                                <Plus size={14} />
                                In
                              </button>
                              <button className="stock-out-btn" onClick={() => openStockForm(mat, 'out')}>
                                <Minus size={14} />
                                Out
                              </button>
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
              <div className="qc-card pending">
                <AlertCircle size={32} />
                <h3>Pending Tests</h3>
                <p className="qc-number">{draftLots.length}</p>
              </div>
              <div className="qc-card passed">
                <CheckCircle size={32} />
                <h3>Released</h3>
                <p className="qc-number">{releasedLots.length}</p>
              </div>
              <div className="qc-card archived">
                <X size={32} />
                <h3>Archived</h3>
                <p className="qc-number">{archivedLots.length}</p>
              </div>
            </div>

            <div className="section-header" style={{ marginTop: '2rem' }}>
              <h3>Lots Awaiting QC Testing</h3>
            </div>

            {draftLots.length === 0 ? (
              <div className="empty-state">
                <CheckCircle size={48} />
                <h3>All caught up!</h3>
                <p>No lots are waiting for QC testing</p>
              </div>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Lot Number</th>
                      <th>Product</th>
                      <th>Type</th>
                      <th>Quantity</th>
                      <th>Mfg Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draftLots.map((lot) => (
                      <tr key={lot.id}>
                        <td className="font-bold">{lot.lot_number}</td>
                        <td>{lot.product_id}</td>
                        <td>
                          <span className="product-type-tag">{lot.product_type_id}</span>
                        </td>
                        <td>{lot.quantity} kg</td>
                        <td>{lot.mfg_date}</td>
                        <td>
                          <button className="test-button" onClick={() => openQCForm(lot)}>
                            <Beaker size={16} />
                            Test
                          </button>
                        </td>
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
        <ProductionLotForm
          products={finishedProducts}
          authUser={authUser}
          onClose={() => setShowLotForm(false)}
          onSuccess={() => {
            setShowLotForm(false);
            loadData();
          }}
          createLot={db.createProductionLot}
        />
      )}

      {showQCForm && selectedLot && (
        <QCTestForm
          lot={selectedLot}
          authUser={authUser}
          createTest={db.createQCTestResult}
          updateLot={db.updateProductionLot}
          onClose={() => {
            setShowQCForm(false);
            setSelectedLot(null);
          }}
          onSuccess={() => {
            setShowQCForm(false);
            setSelectedLot(null);
            loadData();
          }}
        />
      )}

      {showStockForm && selectedMaterial && (
        <StockMovementForm
          material={selectedMaterial}
          movementType={stockMovementType}
          authUser={authUser}
          createMovement={db.createStockMovement}
          updateStock={db.updateRawMaterialStock}
          onClose={() => {
            setShowStockForm(false);
            setSelectedMaterial(null);
          }}
          onSuccess={() => {
            setShowStockForm(false);
            setSelectedMaterial(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

// ===================================================
// Production Lot Form (Phase 2)
// ===================================================
function ProductionLotForm({ products, authUser, onClose, onSuccess, createLot }) {
  const today = new Date().toISOString().split('T')[0];
  const oneYearLater = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    .toISOString().split('T')[0];

  const generateLotNumber = () => {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const time = now.toTimeString().slice(0, 5).replace(':', '');
    return `LOT-${date}-${time}`;
  };

  const [formData, setFormData] = useState({
    lot_number: generateLotNumber(),
    product_id: products[0]?.id || '',
    product_type_id: products[0]?.product_type_id || '',
    quantity: 100,
    mfg_date: today,
    exp_date: oneYearLater,
    status: 'draft',
    qc_notes: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleProductChange = (productId) => {
    const product = products.find(p => p.id === productId);
    setFormData({
      ...formData,
      product_id: productId,
      product_type_id: product?.product_type_id || '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.lot_number.trim()) {
      setError('Lot number is required');
      return;
    }
    if (!formData.product_id) {
      setError('Please select a product');
      return;
    }
    if (formData.quantity <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        lot_number: formData.lot_number,
        product_id: formData.product_id,
        product_type_id: formData.product_type_id,
        quantity: Number(formData.quantity),
        mfg_date: formData.mfg_date,
        exp_date: formData.exp_date,
        status: formData.status,
        qc_notes: formData.qc_notes || null,
        operator_id: authUser?.id || null,
        operator_name: authUser?.user_metadata?.full_name || authUser?.email?.split('@')[0] || null,
      };

      const { error: insertError } = await createLot(payload);

      if (insertError) {
        setError('Failed to create lot: ' + insertError.message);
      } else {
        onSuccess();
      }
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
          <button className="close-button" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <div className="form-group">
              <label>Lot Number *</label>
              <input
                type="text"
                value={formData.lot_number}
                onChange={(e) => setFormData({ ...formData, lot_number: e.target.value })}
                disabled={submitting}
              />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                disabled={submitting}
              >
                <option value="draft">Draft</option>
                <option value="released">Released</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Product *</label>
            <select
              value={formData.product_id}
              onChange={(e) => handleProductChange(e.target.value)}
              disabled={submitting}
            >
              {products.length === 0 && <option value="">No products available</option>}
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.id} - {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Quantity (kg) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                disabled={submitting}
              />
            </div>
            <div className="form-group">
              <label>Product Type</label>
              <input
                type="text"
                value={formData.product_type_id}
                readOnly
                style={{ background: '#f5f5f5' }}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Mfg Date *</label>
              <input
                type="date"
                value={formData.mfg_date}
                onChange={(e) => setFormData({ ...formData, mfg_date: e.target.value })}
                disabled={submitting}
              />
            </div>
            <div className="form-group">
              <label>Exp Date *</label>
              <input
                type="date"
                value={formData.exp_date}
                onChange={(e) => setFormData({ ...formData, exp_date: e.target.value })}
                disabled={submitting}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Notes (optional)</label>
            <textarea
              rows="3"
              value={formData.qc_notes}
              onChange={(e) => setFormData({ ...formData, qc_notes: e.target.value })}
              disabled={submitting}
              placeholder="Any notes about this production lot..."
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={submitting}>
              {submitting ? (
                <><Loader2 size={18} className="spinner" />Saving...</>
              ) : (
                <><Plus size={18} />Create Lot</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===================================================
// QC Test Form (Phase 3)
// ===================================================
function QCTestForm({ lot, authUser, createTest, updateLot, onClose, onSuccess }) {
  const isQuickAddType = QUICK_ADD_TYPES.includes(lot.product_type_id);
  
  const initialParams = isQuickAddType
    ? QUICK_PARAMS.map((p, idx) => ({
        id: Date.now() + idx,
        parameter: p.parameter,
        specification: p.specification,
        test_result: '',
        status: 'pass',
      }))
    : [{ id: Date.now(), parameter: '', specification: '', test_result: '', status: 'pass' }];

  const [params, setParams] = useState(initialParams);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const addCustomParam = () => {
    setParams([...params, { id: Date.now(), parameter: '', specification: '', test_result: '', status: 'pass' }]);
  };

  const addQuickParam = (qp) => {
    setParams([...params, { id: Date.now(), parameter: qp.parameter, specification: qp.specification, test_result: '', status: 'pass' }]);
  };

  const updateParam = (id, field, value) => {
    setParams(params.map(p => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const removeParam = (id) => {
    setParams(params.filter(p => p.id !== id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (params.length === 0) {
      setError('Please add at least one test parameter');
      return;
    }

    const invalidParams = params.filter(p => !p.parameter.trim() || !p.test_result.trim());
    if (invalidParams.length > 0) {
      setError('Please fill in Parameter and Test Result for all rows');
      return;
    }

    setSubmitting(true);

    try {
      for (const param of params) {
        const payload = {
          lot_id: lot.id,
          parameter: param.parameter.trim(),
          specification: param.specification.trim() || null,
          test_result: param.test_result.trim(),
          status: param.status,
          notes: notes.trim() || null,
          tested_by: authUser?.id || null,
        };

        const { error: insertError } = await createTest(payload);
        if (insertError) {
          throw new Error('Failed to save test: ' + insertError.message);
        }
      }

      const hasFail = params.some(p => p.status === 'fail');
      const newStatus = hasFail ? 'archived' : 'released';

      const { error: updateError } = await updateLot(lot.id, {
        status: newStatus,
        qc_approved_by: authUser?.id || null,
        qc_approved_at: new Date().toISOString(),
        qc_notes: notes.trim() || null,
      });

      if (updateError) {
        throw new Error('Tests saved but failed to update lot status: ' + updateError.message);
      }

      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <Beaker size={20} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />
            QC Test - {lot.lot_number}
          </h2>
          <button className="close-button" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="lot-info-box">
            <div><strong>Product:</strong> {lot.product_id}</div>
            <div><strong>Type:</strong> {lot.product_type_id}</div>
            <div><strong>Quantity:</strong> {lot.quantity} kg</div>
            <div><strong>Mode:</strong> {isQuickAddType ? '⚡ Quick Add (Standard)' : '✏️ Custom Add (Free input)'}</div>
          </div>

          <div className="form-group">
            <label>
              <Zap size={16} style={{ display: 'inline', verticalAlign: 'middle' }} />
              {' '}Quick Add Standard Parameters:
            </label>
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
            {params.length === 0 ? (
              <div className="empty-params"><p>No parameters added. Click a button above to add.</p></div>
            ) : (
              <div className="params-list">
                {params.map((param, idx) => (
                  <div key={param.id} className="param-row">
                    <div className="param-number">#{idx + 1}</div>
                    <div className="param-fields">
                      <input type="text" placeholder="Parameter name *" value={param.parameter} onChange={(e) => updateParam(param.id, 'parameter', e.target.value)} disabled={submitting} />
                      <input type="text" placeholder="Specification" value={param.specification} onChange={(e) => updateParam(param.id, 'specification', e.target.value)} disabled={submitting} />
                      <input type="text" placeholder="Test result *" value={param.test_result} onChange={(e) => updateParam(param.id, 'test_result', e.target.value)} disabled={submitting} />
                      <select value={param.status} onChange={(e) => updateParam(param.id, 'status', e.target.value)} disabled={submitting} className={`status-select status-${param.status}`}>
                        <option value="pass">✓ Pass</option>
                        <option value="fail">✗ Fail</option>
                      </select>
                    </div>
                    <button type="button" className="delete-row-btn" onClick={() => removeParam(param.id)} disabled={submitting}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-group">
            <label>QC Notes (optional)</label>
            <textarea rows="3" value={notes} onChange={(e) => setNotes(e.target.value)} disabled={submitting} placeholder="Overall observations..." />
          </div>

          {params.length > 0 && (
            <div className={`result-preview ${params.some(p => p.status === 'fail') ? 'fail' : 'pass'}`}>
              <strong>Result:</strong>{' '}
              {params.some(p => p.status === 'fail') ? '✗ Lot will be ARCHIVED' : '✓ Lot will be RELEASED'}
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="submit" className="primary-button" disabled={submitting || params.length === 0}>
              {submitting ? (
                <><Loader2 size={18} className="spinner" />Saving...</>
              ) : (
                <><CheckCircle size={18} />Save & Update Status</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===================================================
// Stock Movement Form (Phase 4 - NEW!)
// ===================================================
function StockMovementForm({ material, movementType, authUser, createMovement, updateStock, onClose, onSuccess }) {
  const isStockIn = movementType === 'in';
  const currentStock = Number(material.stock);

  const generateMovementNumber = () => {
    const now = new Date();
    const date = now.toISOString().slice(0, 10).replace(/-/g, '');
    const time = now.toTimeString().slice(0, 8).replace(/:/g, '');
    const prefix = isStockIn ? 'IN' : 'OUT';
    return `${prefix}-${date}-${time}`;
  };

  const [formData, setFormData] = useState({
    movement_number: generateMovementNumber(),
    quantity: '',
    reference_number: '',
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Calculate balance after
  const qty = Number(formData.quantity) || 0;
  const balanceAfter = isStockIn ? currentStock + qty : currentStock - qty;
  const willGoNegative = balanceAfter < 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.movement_number.trim()) {
      setError('Movement number is required');
      return;
    }
    if (qty <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Insert stock_movements record
      const movementPayload = {
        movement_number: formData.movement_number,
        raw_material_id: material.id,
        movement_type: movementType,
        quantity: qty,
        balance_after: balanceAfter,
        reference_number: formData.reference_number.trim() || null,
        notes: formData.notes.trim() || null,
        recorded_by: authUser?.id || null,
        recorded_by_name: authUser?.user_metadata?.full_name || authUser?.email?.split('@')[0] || null,
      };

      const { error: movementError } = await createMovement(movementPayload);
      if (movementError) {
        throw new Error('Failed to record movement: ' + movementError.message);
      }

      // 2. Update raw_materials.stock
      const { error: updateError } = await updateStock(material.id, balanceAfter);
      if (updateError) {
        throw new Error('Movement saved but failed to update stock: ' + updateError.message);
      }

      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            {isStockIn ? (
              <><TrendingUp size={20} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle', color: '#10b981' }} />Stock In</>
            ) : (
              <><TrendingDown size={20} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle', color: '#f59e0b' }} />Stock Out</>
            )}
            {' - '}{material.id}
          </h2>
          <button className="close-button" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Material Info */}
          <div className="lot-info-box">
            <div><strong>Material:</strong> {material.name}</div>
            <div><strong>Current Stock:</strong> {currentStock} {material.unit}</div>
            <div><strong>Reorder Point:</strong> {material.reorder_point || 0} {material.unit}</div>
            <div><strong>Action:</strong> {isStockIn ? '📥 Adding stock' : '📤 Removing stock'}</div>
          </div>

          <div className="form-group">
            <label>Movement Number *</label>
            <input
              type="text"
              value={formData.movement_number}
              onChange={(e) => setFormData({ ...formData, movement_number: e.target.value })}
              disabled={submitting}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Quantity ({material.unit}) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                disabled={submitting}
                placeholder="0.00"
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Balance After</label>
              <input
                type="text"
                value={`${balanceAfter} ${material.unit}`}
                readOnly
                style={{ 
                  background: willGoNegative ? '#fee2e2' : '#f0fdf4',
                  color: willGoNegative ? '#991b1b' : '#065f46',
                  fontWeight: 700,
                }}
              />
            </div>
          </div>

          {/* Negative Stock Warning */}
          {willGoNegative && qty > 0 && (
            <div className="alert-card warning">
              <AlertTriangle size={20} />
              <div>
                <strong>Warning: Stock will go negative!</strong>
                <p style={{ margin: 0, fontSize: '0.875rem' }}>
                  Available: {currentStock} {material.unit}, but you're removing {qty} {material.unit}.
                  Result will be {balanceAfter} {material.unit}.
                </p>
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Reference Number (optional)</label>
            <input
              type="text"
              value={formData.reference_number}
              onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
              disabled={submitting}
              placeholder={isStockIn ? 'e.g., PO-2026-001, Invoice #' : 'e.g., Issue slip #, Lot ID'}
            />
          </div>

          <div className="form-group">
            <label>Notes (optional)</label>
            <textarea
              rows="3"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              disabled={submitting}
              placeholder={isStockIn ? 'Supplier, batch, condition...' : 'Purpose, lot used...'}
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button 
              type="submit" 
              className={isStockIn ? 'primary-button' : 'primary-button warning-btn'} 
              disabled={submitting || qty <= 0}
            >
              {submitting ? (
                <><Loader2 size={18} className="spinner" />Saving...</>
              ) : isStockIn ? (
                <><Plus size={18} />Add Stock</>
              ) : (
                <><Minus size={18} />Remove Stock</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}