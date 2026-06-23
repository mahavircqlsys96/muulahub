import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import { get_payments } from '../../utils/thunkApis';
import apiInstance from '../../utils/apiInstance';
import {
  PageHeader, SearchBar, FilterSelect, TableCard, TableHead,
  Pagination, EmptyRow, LoadingRow, StatusBadge, formatDate, formatCurrency
} from '../../components/common/PageTable';

const PaymentsList = () => {
  const dispatch = useDispatch();
  const [data, setData] = useState({ list: [], total: 0, totalPages: 1 });
  const [stats, setStats] = useState({});
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ payload }, statsRes] = await Promise.all([
        dispatch(get_payments({ page, limit: 10, search, status })),
        apiInstance.get('/payments/stats')
      ]);
      if (payload) setData(payload);
      setStats(statsRes.data?.body || {});
    } catch {
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  }, [dispatch, page, search, status]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const statCards = [
    { label: 'Admin Revenue', value: formatCurrency(stats.adminRevenue), color: '#ff4d6d' },
    { label: 'Provider Payout', value: formatCurrency(stats.providerPayout), color: '#10b981' },
    { label: 'Total Volume', value: formatCurrency(stats.totalVolume), color: '#f97316' },
  ];

  return (
    <div>
      <ToastContainer position="top-right" autoClose={2500} />
      <PageHeader title="Payments" subtitle={`${data.total} transactions`} />

      <div className="row mb-4">
        {statCards.map(s => (
          <div key={s.label} className="col-md-4 mb-3">
            <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <div style={{ color: '#6b7280', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase' }}>{s.label}</div>
              <div style={{ fontSize: '26px', fontWeight: '700', color: s.color, marginTop: '4px' }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      <TableCard>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <SearchBar value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search transaction ID..." />
          <FilterSelect
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(1); }}
            options={[
              { value: 'success', label: 'Success' },
              { value: 'pending', label: 'Pending' },
              { value: 'failed', label: 'Failed' }
            ]}
            placeholder="All Status"
          />
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <TableHead columns={['Sr. No.', 'Transaction', 'Customer', 'Booking', 'Amount', 'Commission', 'Provider', 'Status', 'Date']} />
            <tbody>
              {loading && <LoadingRow cols={9} />}
              {!loading && !data.list?.length && <EmptyRow cols={9} message="No payments found" />}
              {!loading && data.list?.map((p, i) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', color: '#9ca3af', fontSize: '13px' }}>{(page - 1) * 10 + i + 1}</td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: '#374151' }}>{p.transactionId || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px' }}>{p.payer?.name || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px' }}>
                    {p.booking?.id ? (
                      <Link to={`/bookings/${p.booking.id}`} style={{ color: '#3b82f6' }}>
                        #{p.booking.bookingNumber}
                      </Link>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: '600' }}>{formatCurrency(p.amount)}</td>
                  <td style={{ padding: '12px 16px', color: '#ff4d6d' }}>{formatCurrency(p.adminCommission)}</td>
                  <td style={{ padding: '12px 16px' }}>{formatCurrency(p.providerAmount)}</td>
                  <td style={{ padding: '12px 16px' }}><StatusBadge status={p.paymentStatus} /></td>
                  <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '13px' }}>{formatDate(p.createdAt)}</td>
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

export default PaymentsList;
