import React, { useEffect, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import apiInstance from '../../utils/apiInstance';
import { PageHeader, TableCard, TableHead, EmptyRow, LoadingRow, Pagination, StatusBadge, formatCurrency, formatDate, ActionBtn, ImageModal } from '../../components/common/PageTable';
import { imageBaseUrl } from '../../services/api';

const DisputesList = () => {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [status, setStatus] = useState('');
  
  const [resolvingId, setResolvingId] = useState(null);
  const [resolveStatus, setResolveStatus] = useState('resolved');
  const [resolveAmount, setResolveAmount] = useState('');
  const [resolveNotes, setResolveNotes] = useState('');
  const [previewImage, setPreviewImage] = useState(null);

  const fetchDisputes = async () => {
    setLoading(true);
    try {
      const res = await apiInstance.get('/disputes', { params: { page, limit: 10, status } });
      setDisputes(res.data?.body?.list || []);
      setTotalPages(res.data?.body?.totalPages || 1);
    } catch {
      toast.error('Failed to load disputes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, [page, status]);

  const handleResolve = async () => {
    if (!resolvingId) return;
    try {
      await apiInstance.put(`/disputes/${resolvingId}/resolve`, {
        status: resolveStatus,
        amount: resolveAmount,
        adminNotes: resolveNotes
      });
      toast.success('Dispute resolved successfully');
      setResolvingId(null);
      fetchDisputes();
    } catch {
      toast.error('Failed to resolve dispute');
    }
  };

  return (
    <div>
      <ToastContainer position="top-right" autoClose={2500} />
      <PageHeader 
        title="Disputes Management" 
        subtitle="Manage booking disputes, refunds, and escrow releases"
      />
      
      <div style={{ marginBottom: '16px', display: 'flex', gap: '12px' }}>
        <select 
          value={status} 
          onChange={e => setStatus(e.target.value)}
          style={{ padding: '8px', borderRadius: '8px', border: '1px solid #e5e7eb', outline: 'none' }}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="resolved">Resolved</option>
          <option value="refunded">Refunded to User</option>
          <option value="partial_refund">Partial Refund</option>
          <option value="escrow_released">Escrow Released</option>
        </select>
      </div>

      <TableCard>
        <div className="table-responsive">
          <table className="table mb-0" style={{ minWidth: '1000px' }}>
            <TableHead columns={['ID', 'Booking', 'User', 'Provider', 'Reason', 'Amount', 'Status', 'Date', 'Actions']} />
            <tbody>
              {loading ? <LoadingRow cols={9} /> : disputes.length === 0 ? <EmptyRow cols={9} /> : disputes.map(d => (
                <tr key={d.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '16px', verticalAlign: 'middle', color: '#6b7280', fontSize: '13px' }}>#{d.id}</td>
                  <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                    <div style={{ fontWeight: '500', color: '#111827', fontSize: '13px' }}>{d.booking?.bookingNumber}</div>
                    <div style={{ color: '#9ca3af', fontSize: '12px' }}>{formatCurrency(d.booking?.amount)}</div>
                  </td>
                  <td style={{ padding: '16px', verticalAlign: 'middle', fontSize: '13px' }}>{d.user?.name}</td>
                  <td style={{ padding: '16px', verticalAlign: 'middle', fontSize: '13px' }}>{d.provider?.name}</td>
                  <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                    <div style={{ fontSize: '13px', color: '#111827', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.reason}>{d.reason}</div>
                  </td>
                  <td style={{ padding: '16px', verticalAlign: 'middle', fontSize: '13px', fontWeight: '500' }}>{formatCurrency(d.amount)}</td>
                  <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                    <StatusBadge status={d.status} />
                  </td>
                  <td style={{ padding: '16px', verticalAlign: 'middle', fontSize: '13px', color: '#6b7280' }}>{formatDate(d.createdAt)}</td>
                  <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {d.evidenceImage && (
                        <ActionBtn icon="image" title="View Evidence" onClick={() => setPreviewImage(`${imageBaseUrl}${d.evidenceImage}`)} color="#3b82f6" />
                      )}
                      {d.status === 'pending' && (
                        <ActionBtn icon="gavel" title="Resolve Dispute" onClick={() => {
                          setResolvingId(d.id);
                          setResolveAmount(d.amount);
                          setResolveStatus('refunded');
                          setResolveNotes('');
                        }} color="#f59e0b" />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onPage={setPage} />
      </TableCard>

      {/* Resolve Modal */}
      {resolvingId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050 }}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '400px', maxWidth: '90%' }}>
            <h5 style={{ marginTop: 0, marginBottom: '16px', fontWeight: '600' }}>Resolve Dispute</h5>
            
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#374151', fontWeight: '500' }}>Resolution</label>
              <select 
                value={resolveStatus}
                onChange={e => setResolveStatus(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #e5e7eb', outline: 'none' }}
              >
                <option value="refunded">Full Refund to User</option>
                <option value="escrow_released">Release Escrow to Provider</option>
                <option value="partial_refund">Partial Refund (Split)</option>
              </select>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#374151', fontWeight: '500' }}>Amount (for User)</label>
              <input 
                type="number"
                value={resolveAmount}
                onChange={e => setResolveAmount(e.target.value)}
                style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #e5e7eb', outline: 'none' }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#374151', fontWeight: '500' }}>Admin Notes</label>
              <textarea 
                value={resolveNotes}
                onChange={e => setResolveNotes(e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #e5e7eb', outline: 'none', resize: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setResolvingId(null)}
                style={{ padding: '8px 16px', border: 'none', background: '#f3f4f6', color: '#374151', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleResolve}
                style={{ padding: '8px 16px', border: 'none', background: '#3b82f6', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <ImageModal src={previewImage} onClose={() => setPreviewImage(null)} />
    </div>
  );
};

export default DisputesList;
