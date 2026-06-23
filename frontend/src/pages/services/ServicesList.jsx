import React, { useEffect, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import apiInstance from '../../utils/apiInstance';
import {
  PageHeader, SearchBar, FilterSelect, TableCard, TableHead,
  ActionBtn, Pagination, EmptyRow, LoadingRow, StatusBadge, formatDate, formatCurrency, ImageModal
} from '../../components/common/PageTable';
import { imageBaseUrl } from '../../services/api';

const ServicesList = () => {
  const [data, setData] = useState({ list: [], total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [previewTitle, setPreviewTitle] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = `/services?page=${page}&limit=10&search=${search}`;
      if (status) url += `&status=${status}`;
      const res = await apiInstance.get(url);
      const body = res.data?.body;
      setData({ list: body?.list || body?.data || [], total: body?.total || 0, totalPages: body?.totalPages || 1 });
    } catch { toast.error('Failed to load services'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [page, search, status]);

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await apiInstance.put(`/services/${id}/status`, { status: newStatus });
      toast.success('Status updated');
      fetchData();
    } catch { toast.error('Failed to update'); }
  };

  return (
    <div>
      <ToastContainer position="top-right" autoClose={2500} />
      <PageHeader title="Services" subtitle={`${data.total} total services`} />

      <TableCard>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <SearchBar value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search services..." />
          <FilterSelect
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(1); }}
            options={[{ value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }]}
            placeholder="All Status"
          />
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <TableHead columns={['Sr. No.', 'Service', 'Provider', 'Category', 'Price', 'Status', 'Created', 'Actions']} />
            <tbody>
              {loading && <LoadingRow cols={8} />}
              {!loading && !data.list?.length && <EmptyRow cols={8} message="No services found" />}
              {!loading && data.list?.map((s, i) => (
                <tr key={s.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '14px 16px', color: '#9ca3af', fontSize: '13px' }}>{(page - 1) * 10 + i + 1}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {s.serviceImage ? (
                        <img
                          src={`${imageBaseUrl}${s.serviceImage}`}
                          alt={s.title}
                          style={{ width: '38px', height: '38px', borderRadius: '8px', objectFit: 'cover', cursor: 'zoom-in' }}
                          onClick={() => {
                            setPreviewImage(`${imageBaseUrl}${s.serviceImage}`);
                            setPreviewTitle(s.title);
                          }}
                        />
                      ) : (
                        <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <i className="material-icons" style={{ color: '#f97316', fontSize: '20px' }}>build</i>
                        </div>
                      )}
                      <div style={{ fontWeight: '600', color: '#111827', fontSize: '14px' }}>{s.title}</div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#374151', fontSize: '13px' }}>{s.provider?.name || '—'}</td>
                  <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: '13px' }}>{s.category?.categoryName || '—'}</td>
                  <td style={{ padding: '14px 16px', fontWeight: '600', color: '#111827', fontSize: '14px' }}>{formatCurrency(s.price)}</td>
                  <td style={{ padding: '14px 16px' }}><StatusBadge status={s.status} /></td>
                  <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: '13px' }}>{formatDate(s.createdAt)}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {s.status === 'pending' && (
                        <>
                          <ActionBtn icon="check_circle" color="#10b981" title="Approve" onClick={() => handleStatusUpdate(s.id, 'approved')} />
                          <ActionBtn icon="cancel" color="#ef4444" title="Reject" onClick={() => handleStatusUpdate(s.id, 'rejected')} />
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

export default ServicesList;
