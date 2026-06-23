import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import { get_bookings } from '../../utils/thunkApis';
import {
  PageHeader, SearchBar, FilterSelect, TableCard, TableHead,
  ActionBtn, Pagination, EmptyRow, LoadingRow, StatusBadge, formatDate, formatCurrency
} from '../../components/common/PageTable';

const BookingsListPage = () => {
  const dispatch = useDispatch();
  const [data, setData] = useState({ list: [], total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { payload } = await dispatch(get_bookings({ page, limit: 10, search, status }));
      if (payload) setData(payload);
    } catch { toast.error('Failed to load bookings'); }
    finally { setLoading(false); }
  }, [dispatch, page, search, status]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const statusColors = {
    pending: { bg: '#fef9c3', color: '#ca8a04' },
    accepted: { bg: '#dbeafe', color: '#1d4ed8' },
    completed: { bg: '#dcfce7', color: '#16a34a' },
    cancelled: { bg: '#fee2e2', color: '#dc2626' },
  };

  const paymentColors = {
    paid: { bg: '#dcfce7', color: '#16a34a' },
    pending: { bg: '#fef9c3', color: '#ca8a04' },
    failed: { bg: '#fee2e2', color: '#dc2626' },
  };

  return (
    <div>
      <ToastContainer position="top-right" autoClose={2500} />
      <PageHeader title="Bookings" subtitle={`${data.total} total bookings`} />

      {/* Status summary */}
      <div className="row mb-3">
        {['pending', 'accepted', 'completed', 'cancelled'].map(s => (
          <div key={s} className="col-6 col-md-3 mb-2">
            <button
              onClick={() => { setStatus(status === s ? '' : s); setPage(1); }}
              style={{
                width: '100%',
                padding: '12px',
                border: '2px solid',
                borderColor: status === s ? statusColors[s].color : '#e5e7eb',
                borderRadius: '12px',
                background: status === s ? statusColors[s].bg : '#fff',
                color: status === s ? statusColors[s].color : '#374151',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '13px',
                textTransform: 'capitalize',
                transition: 'all 0.2s'
              }}
            >
              {s}
            </button>
          </div>
        ))}
      </div>

      <TableCard>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <SearchBar value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search booking #..." />
          <FilterSelect
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(1); }}
            options={[
              { value: 'pending', label: 'Pending' },
              { value: 'accepted', label: 'Accepted' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' }
            ]}
            placeholder="All Status"
          />
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <TableHead columns={['Sr. No.', 'Booking #', 'Customer', 'Provider', 'Service', 'Date', 'Amount', 'Status', 'Payment', 'Actions']} />
            <tbody>
              {loading && <LoadingRow cols={10} />}
              {!loading && !data.list?.length && <EmptyRow cols={10} message="No bookings found" />}
              {!loading && data.list?.map((b, i) => (
                <tr key={b.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', color: '#9ca3af', fontSize: '13px' }}>{(page - 1) * 10 + i + 1}</td>
                  <td style={{ padding: '12px 16px', fontWeight: '600', color: '#111827', fontSize: '13px' }}>#{b.bookingNumber}</td>
                  <td style={{ padding: '12px 16px', color: '#374151', fontSize: '13px' }}>
                    <div>{b.user?.name}</div>
                    <div style={{ color: '#9ca3af', fontSize: '11px' }}>{b.user?.email}</div>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#374151', fontSize: '13px' }}>{b.provider?.name}</td>
                  <td style={{ padding: '12px 16px', color: '#374151', fontSize: '13px' }}>{b.service?.title}</td>
                  <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '13px' }}>{formatDate(b.bookingDate)}</td>
                  <td style={{ padding: '12px 16px', fontWeight: '600', color: '#111827', fontSize: '13px' }}>{formatCurrency(b.amount)}</td>
                  <td style={{ padding: '12px 16px' }}><StatusBadge status={b.bookingStatus} map={statusColors} /></td>
                  <td style={{ padding: '12px 16px' }}><StatusBadge status={b.paymentStatus} map={paymentColors} /></td>
                  <td style={{ padding: '12px 16px' }}>
                    <Link to={`/bookings/${b.id}`}>
                      <ActionBtn icon="visibility" color="#3b82f6" title="View" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={data.totalPages} onPage={setPage} />
      </TableCard>
    </div>
  );
};

export default BookingsListPage;
