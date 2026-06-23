import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import Swal from 'sweetalert2';

import {
  PageHeader,
  SearchBar,
  TableCard,
  TableHead,
  ActionBtn,
  Pagination,
  EmptyRow,
  LoadingRow,
  StatusBadge,
  formatDate
} from '../../components/common/PageTable';

import apiInstance from '../../utils/apiInstance';

const PromoCodes = () => {
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const [data, setData] = useState({
    list: [],
    total: 0,
    totalPages: 1
  });

  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    discountType: 'percentage',
    discountValue: '',
    maxUses: '',
    expiresAt: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const limit = 10;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiInstance.get(`/promo-codes?page=${page}&limit=${limit}&search=${search}`);
      const body = res.data?.body;
      setData({
        list: body?.list || [],
        total: body?.total || 0,
        totalPages: body?.totalPages || 1
      });
    } catch (error) {
      toast.error('Failed to load promo codes');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchData();
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [page, search]);

  const handleStatusChange = async (id, currentStatus) => {
    setStatusLoading(id);
    try {
      await apiInstance.put(`/promo-codes/${id}/toggle`);
      toast.success(`Promo code ${currentStatus === 'active' ? 'deactivated' : 'activated'} successfully`);
      fetchData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update status');
    } finally {
      setStatusLoading(null);
    }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#9ca3af',
      confirmButtonText: 'Yes, delete it!'
    });

    if (!result.isConfirmed) return;

    try {
      await apiInstance.delete(`/promo-codes/${id}`);
      toast.success('Promo code deleted successfully');
      fetchData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to delete promo code');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiInstance.post('/promo-codes', formData);
      toast.success('Promo code created successfully');
      setShowModal(false);
      setFormData({
        code: '',
        discountType: 'percentage',
        discountValue: '',
        maxUses: '',
        expiresAt: ''
      });
      fetchData();
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to create promo code');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <ToastContainer position="top-right" autoClose={2500} />

      <PageHeader
        title="Promo Codes"
        subtitle={`${data.total} total codes`}
        action={
          <button
            onClick={() => setShowModal(true)}
            style={{
              background: 'linear-gradient(90deg,#3b82f6,#60a5fa)',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              padding: '9px 18px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            <i
              className="material-icons"
              style={{ fontSize: '18px', verticalAlign: 'middle', marginRight: '6px' }}
            >
              add
            </i>
            Create Promo
          </button>
        }
      />

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
            placeholder="Search code..."
          />
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <TableHead
              columns={[
                'Code',
                'Discount',
                'Usage',
                'Expires At',
                'Status',
                'Created',
                'Actions'
              ]}
            />

            <tbody>
              {loading && <LoadingRow cols={7} />}

              {!loading && !data.list?.length && (
                <EmptyRow cols={7} message="No promo codes found" />
              )}

              {!loading &&
                data.list?.map((promo) => (
                  <tr key={promo.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '14px 16px', color: '#111827', fontWeight: '600', fontSize: '14px' }}>
                      {promo.code}
                    </td>

                    <td style={{ padding: '14px 16px', color: '#374151', fontSize: '13px' }}>
                      {promo.discountType === 'percentage'
                        ? `${promo.discountValue}%`
                        : `$${promo.discountValue}`}
                    </td>

                    <td style={{ padding: '14px 16px', color: '#374151', fontSize: '13px' }}>
                      {promo.usedCount} {promo.maxUses ? `/ ${promo.maxUses}` : ''}
                    </td>

                    <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: '13px' }}>
                      {promo.expiresAt ? formatDate(promo.expiresAt) : 'Never'}
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      {statusLoading === promo.id ? (
                        <div className="spinner-border spinner-border-sm text-primary" role="status" />
                      ) : (
                        <div
                          style={{ cursor: 'pointer' }}
                          onClick={() => handleStatusChange(promo.id, promo.status)}
                        >
                          <StatusBadge status={promo.status} />
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: '13px' }}>
                      {formatDate(promo.createdAt)}
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <ActionBtn
                          icon="delete"
                          color="#ef4444"
                          title="Delete"
                          onClick={() => handleDelete(promo.id)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          totalPages={data.totalPages}
          onPage={setPage}
        />
      </TableCard>

      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div style={{
            background: '#fff', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '400px'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Create Promo Code</h3>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#374151', marginBottom: '6px', fontWeight: '500' }}>Code</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  placeholder="e.g. SUMMER50"
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#374151', marginBottom: '6px', fontWeight: '500' }}>Discount Type</label>
                <select
                  value={formData.discountType}
                  onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#fff' }}
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed Amount ($)</option>
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#374151', marginBottom: '6px', fontWeight: '500' }}>Discount Value</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={formData.discountValue}
                  onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  placeholder={formData.discountType === 'percentage' ? 'e.g. 15' : 'e.g. 25.00'}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#374151', marginBottom: '6px', fontWeight: '500' }}>Max Uses (Optional)</label>
                <input
                  type="number"
                  min="1"
                  value={formData.maxUses}
                  onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                  placeholder="Leave empty for unlimited"
                />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#374151', marginBottom: '6px', fontWeight: '500' }}>Expires At (Optional)</label>
                <input
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontWeight: '500' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: '#fff', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: '500' }}
                >
                  {submitting ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default PromoCodes;
