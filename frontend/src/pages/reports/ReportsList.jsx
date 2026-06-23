import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { toast, ToastContainer } from 'react-toastify';
import { get_reports } from '../../utils/thunkApis';
import apiInstance from '../../utils/apiInstance';
import {
  PageHeader, FilterSelect, TableCard, TableHead, ActionBtn,
  Pagination, EmptyRow, LoadingRow, StatusBadge, formatDate
} from '../../components/common/PageTable';

const ReportsList = () => {
  const dispatch = useDispatch();
  const [data, setData] = useState({ list: [], total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [reportType, setReportType] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { payload } = await dispatch(get_reports({ page, limit: 10, reportType, status }));
      if (payload) setData(payload);
    } catch {
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [dispatch, page, reportType, status]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateReport = async (id, newStatus) => {
    try {
      await apiInstance.put(`/reports/${id}`, { status: newStatus });
      toast.success('Report updated');
      fetchData();
    } catch {
      toast.error('Failed to update report');
    }
  };

  return (
    <div>
      <ToastContainer position="top-right" autoClose={2500} />
      <PageHeader title="Reports" subtitle={`${data.total} total reports`} />

      <TableCard>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <FilterSelect
            value={reportType}
            onChange={e => { setReportType(e.target.value); setPage(1); }}
            options={[
              { value: 'user', label: 'User' },
              { value: 'post', label: 'Post' },
              { value: 'job', label: 'Job' }
            ]}
            placeholder="All Types"
          />
          <FilterSelect
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(1); }}
            options={[
              { value: 'pending', label: 'Pending' },
              { value: 'resolved', label: 'Resolved' },
              { value: 'rejected', label: 'Rejected' }
            ]}
            placeholder="All Status"
          />
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <TableHead columns={['Sr. No.', 'Reporter', 'Type', 'Reference ID', 'Reason', 'Status', 'Date', 'Actions']} />
            <tbody>
              {loading && <LoadingRow cols={8} />}
              {!loading && !data.list?.length && <EmptyRow cols={8} message="No reports found" />}
              {!loading && data.list?.map((r, i) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', color: '#9ca3af', fontSize: '13px' }}>{(page - 1) * 10 + i + 1}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>{r.reporter?.name || 'Unknown'}</div>
                    <div style={{ color: '#9ca3af', fontSize: '12px' }}>{r.reporter?.email}</div>
                  </td>
                  <td style={{ padding: '12px 16px', textTransform: 'capitalize', fontSize: '13px' }}>{r.reportType}</td>
                  <td style={{ padding: '12px 16px', fontSize: '13px' }}>#{r.referenceId}</td>
                  <td style={{ padding: '12px 16px', maxWidth: '240px', fontSize: '13px' }}>{r.reason}</td>
                  <td style={{ padding: '12px 16px' }}><StatusBadge status={r.status} /></td>
                  <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '13px' }}>{formatDate(r.createdAt)}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {r.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <ActionBtn icon="check_circle" color="#10b981" title="Resolve" onClick={() => updateReport(r.id, 'resolved')} />
                        <ActionBtn icon="cancel" color="#ef4444" title="Reject" onClick={() => updateReport(r.id, 'rejected')} />
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
    </div>
  );
};

export default ReportsList;
