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
  ImageModal
} from '../../components/common/PageTable';

import { get_user_list_deleted } from '../../utils/thunkApis';
import apiInstance from '../../utils/apiInstance';
import { imageBaseUrl } from '../../services/api';

const UserListDeleted = () => {
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
  const [previewImage, setPreviewImage] = useState(null);
  const [previewTitle, setPreviewTitle] = useState('');

  const limit = 10;
  const role = 'user';

  const fetchData = useCallback(async () => {
    try {
      setLoading(page === 1 && !data.list.length);

      const { payload } = await dispatch(
        get_user_list_deleted({
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
      toast.error('Failed to load deleted users');
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

  const handleRestore = async (id) => {
    const result = await Swal.fire({
      title: 'Restore User?',
      text: 'This user account will be restored.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#9ca3af',
      confirmButtonText: 'Yes, restore!'
    });

    if (!result.isConfirmed) return;

    try {
      await apiInstance.put(`/restoreUser/${id}`);

      toast.success('User restored successfully');

      setData((prev) => ({
        ...prev,
        list: prev.list.filter(
          (item) => item.id !== id
        )
      }));
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          'Failed to restore user'
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
        title="Deleted Users"
        subtitle={`${data.total} deleted users`}
        action={
          <button
            onClick={() => navigate(-1)}
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
              arrow_back
            </i>
            Back
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
            placeholder="Search deleted users..."
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
                'Email',
                'Deleted At',
                'Actions'
              ]}
            />

            <tbody>
              {loading && <LoadingRow cols={5} />}

              {!loading && !data.list?.length && (
                <EmptyRow
                  cols={5}
                  message="No deleted users found"
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
                                )}&background=ef4444&color=fff`
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
                              : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'U')}&background=ef4444&color=fff`;
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
                            {user.phone || '—'}
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
                      {user.email}
                    </td>

                    <td
                      style={{
                        padding: '14px 16px',
                        color: '#6b7280',
                        fontSize: '13px'
                      }}
                    >
                      {user.deletedAt
                        ? new Date(
                            user.deletedAt
                          ).toLocaleDateString()
                        : '—'}
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
                          icon="restore"
                          color="#10b981"
                          title="Restore"
                          onClick={() =>
                            handleRestore(user.id)
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

export default UserListDeleted;