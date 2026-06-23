import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { toast, ToastContainer } from 'react-toastify';
import { get_withdrawals } from '../../utils/thunkApis';
import apiInstance from '../../utils/apiInstance';
import {
  PageHeader, FilterSelect, TableCard, TableHead, ActionBtn,
  Pagination, EmptyRow, LoadingRow, StatusBadge, formatDate, formatCurrency, PrimaryBtn
} from '../../components/common/PageTable';

const WithdrawalsList = () => {
  const dispatch = useDispatch();
  const [data, setData] = useState({ list: [], total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { payload } = await dispatch(get_withdrawals({ page, limit: 10, status }));
      if (payload) setData(payload);
    } catch {
      toast.error('Failed to load withdrawals');
    } finally {
      setLoading(false);
    }
  }, [dispatch, page, status]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAction = async (newStatus) => {
    if (!modal) return;
    setUpdating(true);
    try {
      await apiInstance.put(`/withdrawals/${modal.id}/status`, { status: newStatus, remarks });
      toast.success(`Withdrawal ${newStatus}`);
      setModal(null);
      setRemarks('');
      fetchData();
    } catch {
      toast.error('Failed to update withdrawal');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div>
      <ToastContainer position="top-right" autoClose={2500} />
      <PageHeader title="Withdrawal Requests" subtitle={`${data.total} total requests`} />

      <TableCard>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6' }}>
          <FilterSelect
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(1); }}
            options={[
              { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' }
            ]}
            placeholder="All Status"
          />
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <TableHead columns={['Sr. No.', 'Provider', 'Amount', 'Bank', 'Account', 'IFSC', 'Status', 'Date', 'Actions']} />
            <tbody>
              {loading && <LoadingRow cols={9} />}
              {!loading && !data.list?.length && <EmptyRow cols={9} message="No withdrawal requests" />}
              {!loading && data.list?.map((w, i) => (
                <tr key={w.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', color: '#9ca3af', fontSize: '13px' }}>{(page - 1) * 10 + i + 1}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: '600', fontSize: '14px', color: '#111827' }}>{w.provider?.name}</div>
                    <div style={{ color: '#6b7280', fontSize: '12px' }}>{w.provider?.email}</div>
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: '700', color: '#f97316' }}>{formatCurrency(w.amount)}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151' }}>{w.bankName ?? w.bank_name ?? '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151' }}>{w.accountNumber ?? w.account_number ?? '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151', fontFamily: 'ui-monospace, monospace' }}>{w.ifscCode ?? w.ifsc_code ?? '—'}</td>
                  <td style={{ padding: '12px 16px' }}><StatusBadge status={w.status} /></td>
                  <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '13px' }}>{formatDate(w.createdAt)}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {w.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <ActionBtn icon="check_circle" color="#10b981" title="Approve" onClick={() => setModal(w)} />
                        <ActionBtn icon="cancel" color="#ef4444" title="Reject" onClick={() => setModal({ ...w, rejectMode: true })} />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={data.totalPages} onPage={setPage} />
      </TableCard>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', width: '420px' }}>
            <h6 style={{ margin: '0 0 8px', fontWeight: '700', color: '#111827' }}>
              {modal.rejectMode ? 'Reject' : 'Approve'} Withdrawal
            </h6>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>
              Amount: <strong>{formatCurrency(modal.amount)}</strong> for {modal.provider?.name}
            </p>
            <textarea
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="Remarks (optional)"
              rows={3}
              style={{ width: '100%', padding: '10px', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', resize: 'none', boxSizing: 'border-box', marginBottom: '16px' }}
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => { setModal(null); setRemarks(''); }} style={{ padding: '9px 18px', border: '1px solid #e5e7eb', borderRadius: '10px', background: '#fff', cursor: 'pointer' }}>Cancel</button>
              <PrimaryBtn
                label={updating ? 'Processing...' : (modal.rejectMode ? 'Reject' : 'Approve')}
                disabled={updating}
                onClick={() => handleAction(modal.rejectMode ? 'rejected' : 'approved')}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WithdrawalsList;
