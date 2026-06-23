import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  formatDate
} from '../../components/common/PageTable';

import { contact_us_list } from '../../utils/thunkApis';
import apiInstance from '../../utils/apiInstance';

const ContactUs = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [userType, setUserType] = useState('');

  const [data, setData] = useState({
    list: [],
    total: 0,
    totalPages: 1
  });

  const [loading, setLoading] = useState(true);

  const limit = 10;

  const fetchData = useCallback(async () => {
    try {
      setLoading(page === 1 && !data.list.length);

      const { payload } = await dispatch(
        contact_us_list({
          page,
          limit,
          search,
          user_type: userType
        })
      );

      setData({
        list: payload?.contactUs_list || [],
        total: payload?.total || 0,
        totalPages: payload?.totalPages || 1
      });
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }, [dispatch, page, search, userType]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchData();

      const params = {
        page,
        search
      };

      if (userType) {
        params.user_type = userType;
      }

      setSearchParams(params, {
        replace: true
      });
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [page, search, userType]);

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'Delete Message?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#9ca3af',
      confirmButtonText: 'Yes, delete it!'
    });

    if (!result.isConfirmed) return;

    try {
      await apiInstance.delete(`/deleteContactUs/${id}`);

      Swal.fire(
        'Deleted!',
        'Message has been deleted.',
        'success'
      );

      setData((prev) => ({
        ...prev,
        list: prev.list.filter(
          (item) => item.id !== id
        )
      }));
    } catch (error) {
      Swal.fire(
        'Error!',
        error?.response?.data?.message ||
          'Error deleting message',
        'error'
      );
    }
  };

  return (
    <div>
      <PageHeader
        title="Contact Us / Support"
        subtitle={`${data.total} total queries`}
      />

      <TableCard>
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #f3f4f6',
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap'
            }}
          >
            <FilterSelect
              value={userType}
              onChange={(e) => {
                setPage(1);
                setUserType(e.target.value);
              }}
              options={[
                {
                  value: 'user',
                  label: 'Users'
                },
                {
                  value: 'provider',
                  label: 'Providers'
                }
              ]}
              placeholder="All Queries"
            />

            <SearchBar
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              placeholder="Search queries..."
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
                'S No.',
                'Subject',
                'User',
                'User Type',
                'Status',
                'Created',
                'Actions'
              ]}
            />

            <tbody>
              {loading && <LoadingRow cols={7} />}

              {!loading && !data.list?.length && (
                <EmptyRow
                  cols={7}
                  message="No queries found"
                />
              )}

              {!loading &&
                data.list?.map((ticket, index) => (
                  <tr
                    key={ticket.id}
                    style={{
                      borderBottom:
                        '1px solid #f3f4f6'
                    }}
                  >
                    <td
                      style={{
                        padding: '14px 16px',
                        color: '#374151',
                        fontSize: '13px'
                      }}
                    >
                      {index +
                        1 +
                        (page - 1) * limit}
                    </td>

                    <td
                      style={{
                        padding: '14px 16px',
                        color: '#111827',
                        fontWeight: '600',
                        fontSize: '13px',
                        maxWidth: '250px'
                      }}
                    >
                      {ticket?.subject || '—'}
                    </td>

                    <td
                      style={{
                        padding: '14px 16px'
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: '600',
                            color: '#111827',
                            fontSize: '14px'
                          }}
                        >
                          {ticket?.user?.name ||
                            'Unknown User'}
                        </div>

                        <div
                          style={{
                            color: '#9ca3af',
                            fontSize: '12px'
                          }}
                        >
                          {ticket?.user?.email ||
                            ticket?.user_id}
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
                      {ticket?.user?.role ===
                      'owner'
                        ? 'Garage Owner'
                        : ticket?.user?.role ===
                          'user'
                        ? 'User'
                        : '—'}
                    </td>

                    <td
                      style={{
                        padding: '14px 16px'
                      }}
                    >
                      <StatusBadge
                        status={
                          ticket?.status ||
                          'pending'
                        }
                      />
                    </td>

                    <td
                      style={{
                        padding: '14px 16px',
                        color: '#6b7280',
                        fontSize: '13px'
                      }}
                    >
                      {formatDate(
                        ticket?.createdAt
                      )}
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
                              `/viewContactUs/${ticket.id}`
                            )
                          }
                        />

                        <ActionBtn
                          icon="delete"
                          color="#ef4444"
                          title="Delete"
                          onClick={() =>
                            handleDelete(ticket.id)
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
    </div>
  );
};

export default ContactUs;