import React, { useEffect, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import apiInstance from '../../utils/apiInstance';
import { PageHeader, TableCard, TableHead, EmptyRow, LoadingRow, Pagination, StatusBadge, formatCurrency, SearchBar, ActionBtn } from '../../components/common/PageTable';

const WalletsList = () => {
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState(''); // '' = all, 'user', 'provider'
  
  const [updatingId, setUpdatingId] = useState(null);
  const [txType, setTxType] = useState('credit');
  const [txAmount, setTxAmount] = useState('');
  const [txDesc, setTxDesc] = useState('');
  const [showTxModal, setShowTxModal] = useState(false);

  const fetchWallets = async () => {
    setLoading(true);
    try {
      const res = await apiInstance.get('/wallets', { params: { page, limit: 10, search, role: roleFilter } });
      setWallets(res.data?.body?.list || []);
      setTotalPages(res.data?.body?.totalPages || 1);
    } catch {
      toast.error('Failed to load wallets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delay = setTimeout(fetchWallets, 300);
    return () => clearTimeout(delay);
  }, [page, search, roleFilter]);

  const handleToggleFreeze = async (id) => {
    try {
      const res = await apiInstance.put(`/wallets/${id}/freeze`);
      toast.success(res.data?.message || 'Wallet status updated');
      fetchWallets();
    } catch {
      toast.error('Failed to update wallet status');
    }
  };

  const handleManualTx = async () => {
    if (!updatingId || !txAmount || parseFloat(txAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    if (!txDesc) {
      toast.error('Description is required');
      return;
    }
    
    try {
      await apiInstance.post('/wallets/update', {
        userId: updatingId,
        amount: txAmount,
        type: txType,
        description: txDesc
      });
      toast.success('Transaction successful');
      setShowTxModal(false);
      fetchWallets();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Transaction failed');
    }
  };

  const openTxModal = (userId) => {
    setUpdatingId(userId);
    setTxType('credit');
    setTxAmount('');
    setTxDesc('');
    setShowTxModal(true);
  };

  return (
    <div>
      <ToastContainer position="top-right" autoClose={2500} />
      <PageHeader 
        title="Wallet Management" 
        subtitle="Manage user and provider wallet balances"
      />
      
      <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <SearchBar value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name or email" />
        <select 
          value={roleFilter} 
          onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
          style={{ padding: '8px', borderRadius: '10px', border: '1px solid #e5e7eb', outline: 'none', background: '#f9fafb' }}
        >
          <option value="">All Types</option>
          <option value="user">Users Only</option>
          <option value="provider">Providers Only</option>
        </select>
      </div>

      <TableCard>
        <div className="table-responsive">
          <table className="table mb-0" style={{ minWidth: '1000px' }}>
            <TableHead columns={['ID', 'User/Provider', 'Role', 'Wallet Balance', 'Pending', 'Withdrawn', 'Status', 'Actions']} />
            <tbody>
              {loading ? <LoadingRow cols={8} /> : wallets.length === 0 ? <EmptyRow cols={8} /> : wallets.map(w => (
                <tr key={w.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '16px', verticalAlign: 'middle', color: '#6b7280', fontSize: '13px' }}>#{w.id}</td>
                  <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                    <div style={{ fontWeight: '500', color: '#111827', fontSize: '13px' }}>{w.name}</div>
                    <div style={{ color: '#9ca3af', fontSize: '12px' }}>{w.email}</div>
                  </td>
                  <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                    <span style={{ fontSize: '12px', fontWeight: '500', color: w.isProvider ? '#ff4d6d' : '#3b82f6', background: w.isProvider ? '#ede9fe' : '#dbeafe', padding: '4px 8px', borderRadius: '6px' }}>
                      {w.isProvider ? 'Provider' : 'User'}
                    </span>
                  </td>
                  <td style={{ padding: '16px', verticalAlign: 'middle', fontSize: '14px', fontWeight: '600', color: '#10b981' }}>{formatCurrency(w.walletAmount)}</td>
                  <td style={{ padding: '16px', verticalAlign: 'middle', fontSize: '13px', color: '#f59e0b' }}>{formatCurrency(w.pendingAmount)}</td>
                  <td style={{ padding: '16px', verticalAlign: 'middle', fontSize: '13px', color: '#6b7280' }}>{formatCurrency(w.withdrawnAmount)}</td>
                  <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: w.isWalletFrozen ? '#dc2626' : '#16a34a', background: w.isWalletFrozen ? '#fee2e2' : '#dcfce7', padding: '4px 8px', borderRadius: '6px' }}>
                      {w.isWalletFrozen ? 'Frozen' : 'Active'}
                    </span>
                  </td>
                  <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <ActionBtn icon="account_balance_wallet" title="Credit/Debit" onClick={() => openTxModal(w.id)} color="#3b82f6" />
                      <ActionBtn icon={w.isWalletFrozen ? "lock_open" : "lock"} title={w.isWalletFrozen ? "Unfreeze" : "Freeze"} onClick={() => handleToggleFreeze(w.id)} color={w.isWalletFrozen ? "#16a34a" : "#dc2626"} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onPage={setPage} />
      </TableCard>

      {/* Credit/Debit Modal */}
      {showTxModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050 }}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '380px', maxWidth: '90%' }}>
            <h5 style={{ marginTop: 0, marginBottom: '16px', fontWeight: '600' }}>Manual Transaction</h5>
            
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#374151', fontWeight: '500' }}>Type</label>
              <select 
                value={txType}
                onChange={e => setTxType(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #e5e7eb', outline: 'none' }}
              >
                <option value="credit">Credit (Add Funds)</option>
                <option value="debit">Debit (Deduct Funds)</option>
              </select>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#374151', fontWeight: '500' }}>Amount</label>
              <input 
                type="number"
                value={txAmount}
                onChange={e => setTxAmount(e.target.value)}
                placeholder="0.00"
                style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #e5e7eb', outline: 'none' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#374151', fontWeight: '500' }}>Description</label>
              <input 
                type="text"
                value={txDesc}
                onChange={e => setTxDesc(e.target.value)}
                placeholder="Reason for transaction"
                style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #e5e7eb', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowTxModal(false)}
                style={{ padding: '8px 16px', border: 'none', background: '#f3f4f6', color: '#374151', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleManualTx}
                style={{ padding: '8px 16px', border: 'none', background: txType === 'credit' ? '#10b981' : '#ef4444', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}
              >
                {txType === 'credit' ? 'Credit Wallet' : 'Debit Wallet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletsList;
