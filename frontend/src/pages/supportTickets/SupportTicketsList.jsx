import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';

import {
  PageHeader,
  SearchBar,
  FilterSelect,
  TableCard,
  TableHead,
  ActionBtn,
  Pagination,
  EmptyRow,
  LoadingRow,
  formatDate
} from '../../components/common/PageTable';

import apiInstance from '../../utils/apiInstance';
import { imageBaseUrl } from '../../services/api';
import { usePermissions } from '../../utils/permissions';

const SupportTicketsList = () => {
  const { can } = usePermissions();
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [data, setData] = useState({
    list: [],
    total: 0,
    totalPages: 1,
    stats: { all: 0, pending: 0, resolved: 0, rejected: 0 }
  });

  const [loading, setLoading] = useState(true);
  const limit = 10;

  const fetchData = useCallback(async () => {
    try {
      setLoading(page === 1 && !data.list.length);

      const res = await apiInstance.get('/ticketList', {
        params: {
          page,
          limit,
          search,
          status: statusFilter
        }
      });

      const body = res.data?.body || {};
      setData({
        list: body.list || [],
        total: body.total || 0,
        totalPages: body.totalPages || 1,
        stats: body.stats || { all: 0, pending: 0, resolved: 0, rejected: 0 }
      });
    } catch (error) {
      console.error("fetch tickets error:", error);
      toast.error(error?.response?.data?.message || 'Failed to load support tickets');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchData();

      setSearchParams(
        {
          page,
          search,
          status: statusFilter
        },
        { replace: true }
      );
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [page, search, statusFilter]);

  const renderStatusBadge = (status) => {
    const isResolved = status === 'Resolved';
    const isRejected = status === 'Rejected';
    const isPending = !isResolved && !isRejected;

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 10px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: '600',
          background: isResolved ? '#dcfce7' : isRejected ? '#fee2e2' : '#fef3c7',
          color: isResolved ? '#15803d' : isRejected ? '#b91c1c' : '#b45309',
        }}
      >
        <i className="material-icons" style={{ fontSize: '14px' }}>
          {isResolved ? 'check_circle' : isRejected ? 'cancel' : 'hourglass_empty'}
        </i>
        {status || 'Pending'}
      </span>
    );
  };

  return (
    <div>
      <ToastContainer position="top-right" autoClose={2500} />

      <PageHeader
        title="Support Tickets"
        subtitle={`${data.total} total tickets reported by users`}
      />

      {/* ── Quick Stats Bar ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          marginBottom: '20px'
        }}
      >
        <div
          onClick={() => { setPage(1); setStatusFilter(''); }}
          style={{
            background: statusFilter === '' ? '#eff6ff' : '#fff',
            border: statusFilter === '' ? '2px solid #3b82f6' : '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '14px 16px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
        >
          <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>All Tickets</div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: '#111827', marginTop: '4px' }}>
            {data.stats.all}
          </div>
        </div>

        <div
          onClick={() => { setPage(1); setStatusFilter('Pending'); }}
          style={{
            background: statusFilter === 'Pending' ? '#fefce8' : '#fff',
            border: statusFilter === 'Pending' ? '2px solid #eab308' : '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '14px 16px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
        >
          <div style={{ fontSize: '12px', color: '#b45309', fontWeight: '500' }}>Pending</div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: '#b45309', marginTop: '4px' }}>
            {data.stats.pending}
          </div>
        </div>

        <div
          onClick={() => { setPage(1); setStatusFilter('Resolved'); }}
          style={{
            background: statusFilter === 'Resolved' ? '#f0fdf4' : '#fff',
            border: statusFilter === 'Resolved' ? '2px solid #22c55e' : '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '14px 16px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
        >
          <div style={{ fontSize: '12px', color: '#15803d', fontWeight: '500' }}>Resolved</div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: '#15803d', marginTop: '4px' }}>
            {data.stats.resolved}
          </div>
        </div>

        <div
          onClick={() => { setPage(1); setStatusFilter('Rejected'); }}
          style={{
            background: statusFilter === 'Rejected' ? '#fef2f2' : '#fff',
            border: statusFilter === 'Rejected' ? '2px solid #ef4444' : '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '14px 16px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
        >
          <div style={{ fontSize: '12px', color: '#b91c1c', fontWeight: '500' }}>Rejected</div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: '#b91c1c', marginTop: '4px' }}>
            {data.stats.rejected}
          </div>
        </div>
      </div>

      <TableCard>
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #f3f4f6',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap'
          }}
        >
          <SearchBar
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Search by ticket #, user, email, phone, subject..."
          />

          <FilterSelect
            value={statusFilter}
            onChange={(e) => {
              setPage(1);
              setStatusFilter(e.target.value);
            }}
            options={[
              { value: '', label: 'All Statuses' },
              { value: 'Pending', label: 'Status: Pending' },
              { value: 'Resolved', label: 'Status: Resolved' },
              { value: 'Rejected', label: 'Status: Rejected' },
            ]}
          />
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse'
            }}
          >
            <TableHead
              columns={[
                'Ticket #',
                'User Name',
                'Email',
                'Phone Number',
                'Subject',
                'Created Date',
                'Status',
                'Action'
              ]}
            />

            <tbody>
              {loading && <LoadingRow cols={8} />}

              {!loading && !data.list?.length && (
                <EmptyRow
                  cols={8}
                  message="No support tickets found"
                />
              )}

              {!loading &&
                data.list?.map((ticket) => {
                  const user = ticket.user || {};
                  return (
                    <tr
                      key={ticket.id}
                      style={{
                        borderBottom: '1px solid #f3f4f6'
                      }}
                    >
                      <td
                        style={{
                          padding: '14px 16px',
                          color: '#2563eb',
                          fontSize: '13px',
                          fontWeight: '700',
                          fontFamily: 'monospace'
                        }}
                      >
                        {ticket.ticketNumber}
                      </td>

                      <td
                        style={{
                          padding: '14px 16px'
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px'
                          }}
                        >
                          <img
                            src={
                              user.profileImage
                                ? (user.profileImage.startsWith('http') ? user.profileImage : `${imageBaseUrl}${user.profileImage}`)
                                : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                    user.name || 'U'
                                  )}&background=3b82f6&color=fff`
                            }
                            alt={user.name || 'User'}
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '10px',
                              objectFit: 'cover'
                            }}
                          />

                          <div>
                            <div
                              style={{
                                fontWeight: '600',
                                color: '#111827',
                                fontSize: '13px'
                              }}
                            >
                              {user.name || '—'}
                            </div>
                            <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                              User ID: #{ticket.userId}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td
                        style={{
                          padding: '14px 16px',
                          color: '#374151',
                          fontSize: '13px'
                        }}
                      >
                        {user.email || '—'}
                      </td>

                      <td
                        style={{
                          padding: '14px 16px',
                          color: '#374151',
                          fontSize: '13px'
                        }}
                      >
                        {user.phone ? (
                          <span>
                            {user.countryCode ? `${user.countryCode} ` : ''}
                            {user.phone}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td
                        style={{
                          padding: '14px 16px',
                          color: '#111827',
                          fontSize: '13px',
                          fontWeight: '500',
                          maxWidth: '240px'
                        }}
                      >
                        <div
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                          title={ticket.subject}
                        >
                          {ticket.subject}
                        </div>
                      </td>

                      <td
                        style={{
                          padding: '14px 16px',
                          color: '#6b7280',
                          fontSize: '13px',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {formatDate(ticket.createdAt)}
                      </td>

                      <td
                        style={{
                          padding: '14px 16px',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {renderStatusBadge(ticket.status)}
                      </td>

                      <td
                        style={{
                          padding: '14px 16px',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        <ActionBtn
                          icon="visibility"
                          color="#3b82f6"
                          title="View Ticket Details"
                          onClick={() => navigate(`/support-tickets/${ticket.id}`)}
                        />
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          totalPages={data.totalPages}
          onPage={setPage}
        />
      </TableCard>
    </div>
  );
};

export default SupportTicketsList;
