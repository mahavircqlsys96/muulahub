import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  formatDate,
  ImageModal
} from '../../components/common/PageTable';

import { get_user_list } from '../../utils/thunkApis';
import apiInstance from '../../utils/apiInstance';
import { imageBaseUrl } from '../../services/api';

const UserList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const [data, setData] = useState({
    list: [],
    total: 0,
    totalPages: 1
  });

  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(null);
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
          role
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
  }, [dispatch, page, search]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchData();

      setSearchParams(
        {
          page,
          search
        },
        { replace: true }
      );
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [page, search]);

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
            placeholder="Search users..."
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
                'Sr. No.',
                'User',
                'Phone',
                'Date of Birth',
                'Bookings',
                'Status',
                'Joined',
                'Actions'
              ]}
            />

            <tbody>
              {loading && <LoadingRow cols={8} />}

              {!loading && !data.list?.length && (
                <EmptyRow
                  cols={8}
                  message="No users found"
                />
              )}

              {!loading &&
                data.list?.map((user, index) => (
                  <tr
                    key={user.id}
                    style={{
                      borderBottom:
                        '1px solid #f3f4f6'
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
                            user.profileImage ||
                            user.profile_picture
                              ? `${imageBaseUrl}${
                                  user.profileImage ||
                                  user.profile_picture
                                }`
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
                              fontSize: '14px'
                            }}
                          >
                            {user.name}
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
                      {user.phone || '—'}
                    </td>

                    <td
                      style={{
                        padding: '14px 16px',
                        color: '#374151',
                        fontSize: '13px'
                      }}
                    >
                      {user.dateOfBirth ? formatDate(user.dateOfBirth) : '—'}
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

                        <ActionBtn
                          icon="delete"
                          color="#ef4444"
                          title="Delete"
                          onClick={() =>
                            handleDelete(user.id)
                          }
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

      <ImageModal
        src={previewImage}
        alt={previewTitle}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  );
};

export default UserList;