import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { Link, useSearchParams } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import { get_providers } from '../../utils/thunkApis';
import apiInstance from '../../utils/apiInstance';
import {
  PageHeader, SearchBar, FilterSelect, TableCard, TableHead,
  ActionBtn, Pagination, EmptyRow, LoadingRow, StatusBadge, formatDate, ImageModal
} from '../../components/common/PageTable';
import { imageBaseUrl } from '../../services/api';

const primaryActionBtnStyle = {
  background: 'linear-gradient(90deg,#3b82f6,#60a5fa)',
  color: '#fff',
  border: 'none',
  borderRadius: '10px',
  padding: '9px 18px',
  fontSize: '14px',
  fontWeight: '600',
  cursor: 'pointer',
};

const ProvidersList = () => {
  const dispatch = useDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState({ list: [], total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(() => searchParams.get('status') || '');
  const [loading, setLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [previewTitle, setPreviewTitle] = useState('');

  const statusFromUrl = searchParams.get('status') || '';

  useEffect(() => {
    setStatus(statusFromUrl);
    setPage(1);
  }, [statusFromUrl]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { payload } = await dispatch(get_providers({ page, limit: 10, search, status }));
      if (payload) setData(payload);
    } catch { toast.error('Failed to load providers'); }
    finally { setLoading(false); }
  }, [dispatch, page, search, status]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleStatusUpdate = async (providerId, newStatus) => {
    try {
      await apiInstance.put('/updateProviderStatus', { providerId, status: newStatus });
      toast.success(`Provider ${newStatus} successfully`);
      fetchData();
    } catch { toast.error('Failed to update status'); }
  };

  return (
    <div>
      <ToastContainer position="top-right" autoClose={2500} />
      <PageHeader
        title="Providers"
        subtitle={`${data.total} total providers`}
        action={
          status === 'pending' ? (
            <button
              type="button"
              onClick={() => {
                setStatus('');
                setPage(1);
                const next = new URLSearchParams(searchParams);
                next.delete('status');
                setSearchParams(next, { replace: true });
              }}
              style={primaryActionBtnStyle}
            >
              <i
                className="material-icons"
                style={{
                  fontSize: '18px',
                  verticalAlign: 'middle',
                  marginRight: '6px',
                }}
              >
                arrow_back
              </i>
              Back
            </button>
          ) : (
            <Link to="/providers?status=pending" style={{ textDecoration: 'none' }}>
              <button type="button" style={primaryActionBtnStyle}>
                <i className="material-icons" style={{ fontSize: '18px', verticalAlign: 'middle', marginRight: '6px' }}>pending_actions</i>
                Pending Verifications
              </button>
            </Link>
          )
        }
      />

      <TableCard>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <SearchBar value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search providers..." />
          <FilterSelect
            value={status}
            onChange={(e) => {
              const v = e.target.value;
              setStatus(v);
              setPage(1);
              const next = new URLSearchParams(searchParams);
              if (v) next.set('status', v);
              else next.delete('status');
              setSearchParams(next, { replace: true });
            }}
            options={[{ value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }]}
            placeholder="All Status"
          />
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <TableHead columns={['Sr. No.', 'Provider', 'Service', 'Status', 'Wallet', 'Joined', 'Actions']} />
            <tbody>
              {loading && <LoadingRow cols={7} />}
              {!loading && !data.list?.length && <EmptyRow cols={7} message="No providers found" />}
              {!loading && data.list?.map((p, i) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '14px 16px', color: '#9ca3af', fontSize: '13px' }}>{(page - 1) * 10 + i + 1}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img
                        src={p.profileImage ? `${imageBaseUrl}${p.profileImage}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name || 'P')}&background=f97316&color=fff`}
                        alt={p.name}
                        style={{ width: '38px', height: '38px', borderRadius: '10px', objectFit: 'cover', cursor: 'zoom-in' }}
                        onClick={() => {
                          const src = p.profileImage ? `${imageBaseUrl}${p.profileImage}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name || 'P')}&background=f97316&color=fff`;
                          setPreviewImage(src);
                          setPreviewTitle(p.name);
                        }}
                      />
                      <div>
                        <div style={{ fontWeight: '600', color: '#111827', fontSize: '14px' }}>{p.name}</div>
                        <div style={{ color: '#9ca3af', fontSize: '12px' }}>{p.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#374151', fontSize: '13px' }}>
                    {p.service?.title || <span style={{ color: '#9ca3af' }}>No service</span>}
                  </td>
                  <td style={{ padding: '14px 16px' }}><StatusBadge status={p.providerStatus} /></td>
                  <td style={{ padding: '14px 16px', color: '#374151', fontSize: '13px' }}>
                    ${parseFloat(p.walletAmount || 0).toFixed(2)}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: '13px' }}>{formatDate(p.createdAt)}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <Link to={`/providers/${p.id}`}>
                        <ActionBtn icon="visibility" color="#3b82f6" title="View" />
                      </Link>
                      {p.providerStatus === 'pending' && (
                        <>
                          <ActionBtn icon="check_circle" color="#10b981" title="Approve" onClick={() => handleStatusUpdate(p.id, 'approved')} />
                          <ActionBtn icon="cancel" color="#ef4444" title="Reject" onClick={() => handleStatusUpdate(p.id, 'rejected')} />
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={data.totalPages} onPage={setPage} />
      </TableCard>

      <ImageModal
        src={previewImage}
        alt={previewTitle}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  );
};

export default ProvidersList;
