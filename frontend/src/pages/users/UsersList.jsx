import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import Swal from 'sweetalert2';

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
  StatusBadge,
  formatDate,
  ImageModal
} from '../../components/common/PageTable';

import { get_user_list } from '../../utils/thunkApis';
import apiInstance from '../../utils/apiInstance';
import { imageBaseUrl } from '../../services/api';
import { usePermissions } from '../../utils/permissions';

const UserList = () => {
  const { can } = usePermissions();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [approvalFilter, setApprovalFilter] = useState('');
  const [verificationFilter, setVerificationFilter] = useState('');

  const [data, setData] = useState({
    list: [],
    total: 0,
    totalPages: 1
  });

  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(null);
  const [blueTickLoading, setBlueTickLoading] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [previewTitle, setPreviewTitle] = useState('');

  const limit = 10;
  const role = 'user';

  const fetchData = useCallback(async () => {
    try {
      setLoading(page === 1 && !data.list.length);

      const { payload } = await dispatch(
        get_user_list({
          page,
          limit,
          search,
          role,
          approvalStatus: approvalFilter,
          verificationStatus: verificationFilter
        })
      );

      setData({
        list: payload?.user_list || [],
        total: payload?.total || 0,
        totalPages: payload?.totalPages || 1
      });
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [dispatch, page, search, approvalFilter, verificationFilter]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchData();

      setSearchParams(
        {
          page,
          search,
          approvalStatus: approvalFilter,
          verificationStatus: verificationFilter
        },
        { replace: true }
      );
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [page, search, approvalFilter, verificationFilter]);

  const handleToggleBlueTick = async (id, newVerified) => {
    setBlueTickLoading(id);
    try {
      await apiInstance.put(`/updateBlueTickStatus/${id}`, { isVerified: newVerified });
      toast.success(newVerified === 1 ? 'User verified with blue tick' : 'Blue tick verification removed');
      setData((prev) => ({
        ...prev,
        list: prev.list.map((item) =>
          item.id === id ? { ...item, isVerified: newVerified } : item
        )
      }));
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to update blue tick status');
    } finally {
      setBlueTickLoading(null);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    setStatusLoading(id);

    try {
      await apiInstance.put(`/toggleUserStatus/${id}`, { status: newStatus });

      toast.success(`User status updated successfully`);

      setData((prev) => ({
        ...prev,
        list: prev.list.map((item) =>
          item.id === id
            ? {
                ...item,
                status: newStatus
              }
            : item
        )
      }));
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          'Failed to update status'
      );
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
      await apiInstance.delete(`/deleteUser/${id}`);

      toast.success('User deleted successfully');

      setData((prev) => ({
        ...prev,
        list: prev.list.filter(
          (item) => item.id !== id
        )
      }));
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          'Failed to delete user'
      );
    }
  };

  return (
    <div>
      <ToastContainer
        position="top-right"
        autoClose={2500}
      />

      <PageHeader
        title="Users"
        subtitle={`${data.total} total users`}
        action={
          <button
            onClick={() =>
              navigate('/usersListDeleted')
            }
            style={{
              background:
                'linear-gradient(90deg,#3b82f6,#60a5fa)',
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
              style={{
                fontSize: '18px',
                verticalAlign: 'middle',
                marginRight: '6px'
              }}
            >
              delete
            </i>
            Deleted Users
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
            placeholder="Search users by name, email, phone..."
          />

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <FilterSelect
              value={approvalFilter}
              onChange={(e) => {
                setPage(1);
                setApprovalFilter(e.target.value);
              }}
              options={[
                { value: '', label: 'All License Statuses' },
                { value: 'Pending', label: 'License: Pending' },
                { value: 'Approved', label: 'License: Approved' },
                { value: 'Rejected', label: 'License: Rejected' },
              ]}
            />

            <FilterSelect
              value={verificationFilter}
              onChange={(e) => {
                setPage(1);
                setVerificationFilter(e.target.value);
              }}
              options={[
                { value: '', label: 'All Verification' },
                { value: 'verified', label: 'Blue Tick: Verified' },
                { value: 'unverified', label: 'Blue Tick: Not Verified' },
              ]}
            />
          </div>
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
                'Sr. No.',
                'User',
                'Phone',
                'License Status',
                'Blue Tick',
                'Login Type',
                'Bookings',
                'Status',
                'Joined',
                'Actions'
              ]}
            />

            <tbody>
              {loading && <LoadingRow cols={10} />}

              {!loading && !data.list?.length && (
                <EmptyRow
                  cols={10}
                  message="No users found"
                />
              )}

              {!loading &&
                data.list?.map((user, index) => {
                  const isVerifiedUser = user.isVerified === 1 || user.isVerified === true || user.isVerified === '1';
                  const licenseStatus = user.isApproved || 'Pending';

                  return (
                    <tr
                      key={user.id}
                      style={{
                        borderBottom: '1px solid #f3f4f6'
                      }}
                    >
                      <td
                        style={{
                          padding: '14px 16px',
                          color: '#9ca3af',
                          fontSize: '13px'
                        }}
                      >
                        {(page - 1) * limit + index + 1}
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
                              user.profileImage || user.profile_picture
                                ? `${imageBaseUrl}${user.profileImage || user.profile_picture}`
                                : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                    user.name || 'U'
                                  )}&background=3b82f6&color=fff`
                            }
                            alt={user.name}
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '10px',
                              objectFit: 'cover',
                              cursor: 'zoom-in'
                            }}
                            onClick={() => {
                              const src = user.profileImage || user.profile_picture
                                ? `${imageBaseUrl}${user.profileImage || user.profile_picture}`
                                : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'U')}&background=3b82f6&color=fff`;
                              setPreviewImage(src);
                              setPreviewTitle(user.name);
                            }}
                          />

                          <div>
                            <div
                              style={{
                                fontWeight: '600',
                                color: '#111827',
                                fontSize: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <span>{user.name}</span>
                              {isVerifiedUser && (
                                <i
                                  className="material-icons"
                                  style={{
                                    fontSize: '16px',
                                    color: '#2563eb',
                                    lineHeight: 1
                                  }}
                                  title="Verified User (Blue Tick)"
                                >
                                  verified
                                </i>
                              )}
                            </div>

                            <div
                              style={{
                                color: '#9ca3af',
                                fontSize: '12px'
                              }}
                            >
                              {user.email}
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
                        {user.phone ? (
                          <span>
                            {(user.countryCode || user.country_code) ? (
                              <span style={{ color: '#6b7280', marginRight: '4px', fontWeight: '500' }}>
                                {user.countryCode || user.country_code}
                              </span>
                            ) : null}
                            {user.phone}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* License Approval Status */}
                      <td
                        style={{
                          padding: '14px 16px'
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span
                            title={licenseStatus === 'Rejected' && user.licenseRejectionReason ? `Reason: ${user.licenseRejectionReason}` : ''}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 9px',
                              borderRadius: '20px',
                              fontSize: '12px',
                              fontWeight: '600',
                              width: 'fit-content',
                              background:
                                licenseStatus === 'Approved'
                                  ? '#dcfce7'
                                  : licenseStatus === 'Rejected'
                                  ? '#fee2e2'
                                  : '#fef3c7',
                              color:
                                licenseStatus === 'Approved'
                                  ? '#15803d'
                                  : licenseStatus === 'Rejected'
                                  ? '#b91c1c'
                                  : '#b45309'
                            }}
                          >
                            <i
                              className="material-icons"
                              style={{ fontSize: '14px' }}
                            >
                              {licenseStatus === 'Approved' ? 'check_circle' : licenseStatus === 'Rejected' ? 'cancel' : 'hourglass_empty'}
                            </i>
                            {licenseStatus}
                          </span>

                          {(user.licenseFront || user.licenseBack) && (
                            <span style={{ fontSize: '11px', color: '#6b7280' }}>
                              Docs uploaded
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Blue Tick Verification Status & Toggle */}
                      <td
                        style={{
                          padding: '14px 16px'
                        }}
                      >
                        <button
                          type="button"
                          disabled={!can('users', 'edit') || blueTickLoading === user.id}
                          onClick={() => handleToggleBlueTick(user.id, isVerifiedUser ? 0 : 1)}
                          title={can('users', 'edit') ? (isVerifiedUser ? 'Click to remove Blue Tick' : 'Click to grant Blue Tick') : ''}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            border: isVerifiedUser ? '1px solid #bfdbfe' : '1px solid #e5e7eb',
                            fontSize: '12px',
                            fontWeight: '600',
                            background: isVerifiedUser ? '#eff6ff' : '#f9fafb',
                            color: isVerifiedUser ? '#1d4ed8' : '#6b7280',
                            cursor: can('users', 'edit') ? 'pointer' : 'default',
                            transition: 'all 0.2s'
                          }}
                        >
                          {blueTickLoading === user.id ? (
                            <span className="spinner-border spinner-border-sm" style={{ width: '12px', height: '12px' }} />
                          ) : (
                            <i
                              className="material-icons"
                              style={{
                                fontSize: '15px',
                                color: isVerifiedUser ? '#2563eb' : '#9ca3af'
                              }}
                            >
                              {isVerifiedUser ? 'verified' : 'radio_button_unchecked'}
                            </i>
                          )}
                          {isVerifiedUser ? 'Verified' : 'Unverified'}
                        </button>
                      </td>

                      <td
                        style={{
                          padding: '14px 16px',
                          color: '#374151',
                          fontSize: '13px'
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textTransform: 'capitalize',
                            background:
                              user.loginType === 'google'
                                ? '#fee2e2'
                                : user.loginType === 'apple'
                                ? '#f3f4f6'
                                : user.loginType === 'facebook'
                                ? '#dbeafe'
                                : '#e0e7ff',
                            color:
                              user.loginType === 'google'
                                ? '#dc2626'
                                : user.loginType === 'apple'
                                ? '#111827'
                                : user.loginType === 'facebook'
                                ? '#1d4ed8'
                                : '#4338ca'
                          }}
                        >
                          {user.loginType || 'email'}
                        </span>
                      </td>

                      <td
                        style={{
                          padding: '14px 16px',
                          color: '#374151',
                          fontSize: '13px'
                        }}
                      >
                        {user.total_bookings ?? 0}
                      </td>

                      <td
                        style={{
                          padding: '14px 16px'
                        }}
                      >
                        {statusLoading === user.id ? (
                          <div
                            className="spinner-border spinner-border-sm text-primary"
                            role="status"
                          />
                        ) : (
                          <select
                            value={user.status || 'active'}
                            disabled={!can('users', 'edit')}
                            onChange={(e) => handleStatusChange(user.id, e.target.value)}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '8px',
                              border: '1px solid #e5e7eb',
                              outline: 'none',
                              fontSize: '12px',
                              background: user.status === 'blocked' ? '#fee2e2' : user.status === 'inactive' ? '#f3f4f6' : '#dcfce7',
                              color: user.status === 'blocked' ? '#dc2626' : user.status === 'inactive' ? '#6b7280' : '#16a34a',
                              fontWeight: '600',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="blocked">Blocked</option>
                          </select>
                        )}
                      </td>

                      <td
                        style={{
                          padding: '14px 16px',
                          color: '#6b7280',
                          fontSize: '13px'
                        }}
                      >
                        {formatDate(user.createdAt)}
                      </td>

                      <td
                        style={{
                          padding: '14px 16px'
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            gap: '6px'
                          }}
                        >
                          <ActionBtn
                            icon="visibility"
                            color="#3b82f6"
                            title="View"
                            onClick={() =>
                              navigate(
                                `/usersView/${user.id}?page=${page}&search=${search}`
                              )
                            }
                          />

                          {can('users', 'delete') && (
                            <ActionBtn
                              icon="delete"
                              color="#ef4444"
                              title="Delete"
                              onClick={() =>
                                handleDelete(user.id)
                              }
                            />
                          )}
                        </div>
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

      <ImageModal
        src={previewImage}
        alt={previewTitle}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  );
};

export default UserList;