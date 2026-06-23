import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';

import {
  PageHeader,
  TableCard,
  TableHead,
  EmptyRow,
  LoadingRow,
  StatusBadge,
  Pagination,
  formatDate,
  ImageModal,
} from '../../components/common/PageTable';

import { toast, ToastContainer } from 'react-toastify';
import { imageBaseUrl } from '../../services/api';
import { get_user_details } from '../../utils/thunkApis';
import apiInstance from '../../utils/apiInstance';

const sectionTitleStyle = {
  margin: 0,
  fontSize: '18px',
  fontWeight: '700',
  color: '#111827',
};

const backBtnStyle = {
  background: 'linear-gradient(90deg,#3b82f6,#60a5fa)',
  color: '#fff',
  border: 'none',
  borderRadius: '10px',
  padding: '9px 18px',
  fontSize: '14px',
  fontWeight: '600',
  cursor: 'pointer',
};

const UsersView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const userDetails = useSelector((state) => state.users.userDetails);
  const role = 'user';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  const [previewTitle, setPreviewTitle] = useState('');

  const limit = 5;

  const [bookings, setBookings] = useState([]);
  const [bookingsPage, setBookingsPage] = useState(1);
  const [bookingsTotalPages, setBookingsTotalPages] = useState(1);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  const [posts, setPosts] = useState([]);
  const [postsPage, setPostsPage] = useState(1);
  const [postsTotalPages, setPostsTotalPages] = useState(1);
  const [postsLoading, setPostsLoading] = useState(false);

  const [followers, setFollowers] = useState([]);
  const [followersPage, setFollowersPage] = useState(1);
  const [followersTotalPages, setFollowersTotalPages] = useState(1);
  const [followersLoading, setFollowersLoading] = useState(false);

  const [following, setFollowing] = useState([]);
  const [followingPage, setFollowingPage] = useState(1);
  const [followingTotalPages, setFollowingTotalPages] = useState(1);
  const [followingLoading, setFollowingLoading] = useState(false);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      await dispatch(get_user_details({ id, role }));
    } catch {
      setError('An error occurred while fetching user details');
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = useCallback(async () => {
    try {
      setBookingsLoading(true);
      const res = await apiInstance.get(
        `/bookings?userId=${id}&page=${bookingsPage}&limit=${limit}`
      );
      const body = res.data?.body;
      setBookings(body?.list || []);
      setBookingsTotalPages(body?.totalPages || 1);
    } catch (e) {
      console.error(e);
      setBookings([]);
      setBookingsTotalPages(1);
    } finally {
      setBookingsLoading(false);
    }
  }, [id, bookingsPage, limit]);

  const fetchPosts = useCallback(async () => {
    try {
      setPostsLoading(true);
      const res = await apiInstance.get(
        `/posts?userId=${id}&page=${postsPage}&limit=${limit}`
      );
      const body = res.data?.body;
      setPosts(body?.list || []);
      setPostsTotalPages(body?.totalPages || 1);
    } catch (e) {
      console.error(e);
      setPosts([]);
      setPostsTotalPages(1);
    } finally {
      setPostsLoading(false);
    }
  }, [id, postsPage, limit]);

  const fetchFollowers = useCallback(async () => {
    try {
      setFollowersLoading(true);
      const res = await apiInstance.get(
        `/userFollowers/${id}?page=${followersPage}&limit=${limit}`
      );
      const body = res.data?.body;
      setFollowers(body?.list || []);
      setFollowersTotalPages(body?.totalPages || 1);
    } catch (e) {
      console.error(e);
      setFollowers([]);
      setFollowersTotalPages(1);
    } finally {
      setFollowersLoading(false);
    }
  }, [id, followersPage, limit]);

  const fetchFollowing = useCallback(async () => {
    try {
      setFollowingLoading(true);
      const res = await apiInstance.get(
        `/userFollowing/${id}?page=${followingPage}&limit=${limit}`
      );
      const body = res.data?.body;
      setFollowing(body?.list || []);
      setFollowingTotalPages(body?.totalPages || 1);
    } catch (e) {
      console.error(e);
      setFollowing([]);
      setFollowingTotalPages(1);
    } finally {
      setFollowingLoading(false);
    }
  }, [id, followingPage, limit]);

  useEffect(() => {
    fetchUserDetails();
  }, [id]);

  const handleStatusChange = async (e) => {
    const newStatus = e.target.value;
    try {
      await apiInstance.put(`/toggleUserStatus/${id}`, { status: newStatus });
      toast.success('User status updated successfully');
      fetchUserDetails();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  useEffect(() => {
    if (!id) return;
    fetchBookings();
  }, [id, fetchBookings]);

  useEffect(() => {
    if (!id) return;
    fetchPosts();
  }, [id, fetchPosts]);

  useEffect(() => {
    if (!id) return;
    fetchFollowers();
  }, [id, fetchFollowers]);

  useEffect(() => {
    if (!id) return;
    fetchFollowing();
  }, [id, fetchFollowing]);

  const profileImage =
    userDetails?.profileImage || userDetails?.profile_picture;

  const captionPreview = (text, max = 48) => {
    if (!text) return '—';
    const t = String(text).replace(/\s+/g, ' ').trim();
    return t.length > max ? `${t.slice(0, max)}…` : t;
  };

  if (error) {
    return (
      <div style={{ padding: '20px', color: '#ef4444' }}>
        {error}
      </div>
    );
  }

  return (
    <div>
      <ToastContainer position="top-right" autoClose={2500} />
      <PageHeader
        title="User Details"
        subtitle={userDetails?.email || ''}
        action={
          <button type="button" onClick={() => navigate(-1)} style={backBtnStyle}>
            <i
              className="material-icons"
              style={{
                fontSize: '18px',
                verticalAlign: 'middle',
                marginRight: '6px',
              }}
            >
              arrow_back
            </i>
            Back
          </button>
        }
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px,380px) 1fr',
          gap: '20px',
          alignItems: 'start',
        }}
      >
        <TableCard>
          {loading ? (
            <div style={{ padding: '50px', textAlign: 'center' }}>
              <div className="spinner-border text-primary" role="status" />
            </div>
          ) : (
            <div style={{ padding: '24px' }}>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <img
                  src={
                    profileImage
                      ? `${imageBaseUrl}${profileImage}`
                      : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          userDetails?.name || 'U'
                        )}&background=3b82f6&color=fff`
                  }
                  alt="profile"
                  style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '20px',
                    objectFit: 'cover',
                    border: '4px solid rgba(59,130,246,0.12)',
                    cursor: 'zoom-in'
                  }}
                  onClick={() => {
                    const src = profileImage
                      ? `${imageBaseUrl}${profileImage}`
                      : `https://ui-avatars.com/api/?name=${encodeURIComponent(userDetails?.name || 'U')}&background=3b82f6&color=fff`;
                    setPreviewImage(src);
                    setPreviewTitle(userDetails?.name || '');
                  }}
                />

                <h3
                  style={{
                    marginTop: '16px',
                    marginBottom: '4px',
                    fontSize: '22px',
                    fontWeight: '700',
                    color: '#111827',
                  }}
                >
                  {userDetails?.name || '—'}
                </h3>

                <div style={{ color: '#6b7280', fontSize: '14px' }}>
                  {userDetails?.email}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#9ca3af',
                      marginBottom: '4px',
                    }}
                  >
                    Phone
                  </div>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#111827',
                    }}
                  >
                    {userDetails?.country_code && userDetails?.phone
                      ? `${userDetails.country_code} ${userDetails.phone}`
                      : userDetails?.phone || '—'}
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#9ca3af',
                      marginBottom: '4px',
                    }}
                  >
                    Date of Birth
                  </div>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#111827',
                    }}
                  >
                    {userDetails?.dateOfBirth ? formatDate(userDetails.dateOfBirth) : '—'}
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#9ca3af',
                      marginBottom: '4px',
                    }}
                  >
                    Status
                  </div>
                  <select
                    value={userDetails?.status || 'active'}
                    onChange={handleStatusChange}
                    style={{
                      padding: '6px 10px',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      outline: 'none',
                      fontSize: '12px',
                      background: userDetails?.status === 'blocked' ? '#fee2e2' : userDetails?.status === 'inactive' ? '#f3f4f6' : '#dcfce7',
                      color: userDetails?.status === 'blocked' ? '#dc2626' : userDetails?.status === 'inactive' ? '#6b7280' : '#16a34a',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#9ca3af',
                      marginBottom: '4px',
                    }}
                  >
                    Referral Code
                  </div>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#111827',
                    }}
                  >
                    {userDetails?.referralCode || '—'}
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#9ca3af',
                      marginBottom: '4px',
                    }}
                  >
                    Used Refer Code
                  </div>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#111827',
                    }}
                  >
                    {userDetails?.referrer?.referralCode || '—'}
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#9ca3af',
                      marginBottom: '4px',
                    }}
                  >
                    Money Spent
                  </div>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#111827',
                    }}
                  >
                    {userDetails?.total_spent !== undefined
                      ? `$${Number(userDetails.total_spent).toFixed(2)}`
                      : '$0.00'}
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#9ca3af',
                      marginBottom: '4px',
                    }}
                  >
                    Registered On
                  </div>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#111827',
                    }}
                  >
                    {userDetails?.createdAt
                      ? new Date(userDetails.createdAt).toLocaleString()
                      : '—'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </TableCard>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <TableCard>
            <div
              style={{
                padding: '20px',
                borderBottom: '1px solid #f3f4f6',
              }}
            >
              <h3 style={sectionTitleStyle}>Bookings</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                }}
              >
                <TableHead
                  columns={[
                    'S No.',
                    'Booking #',
                    'Title',
                    'Provider',
                    'Status',
                    'Amount',
                    'Date',
                  ]}
                />
                <tbody>
                  {bookingsLoading && <LoadingRow cols={7} />}
                  {!bookingsLoading && bookings.length === 0 && (
                    <EmptyRow cols={7} message="No bookings found" />
                  )}
                  {!bookingsLoading &&
                    bookings.map((b, index) => (
                      <tr
                        key={b.id}
                        style={{ borderBottom: '1px solid #f3f4f6' }}
                      >
                        <td
                          style={{
                            padding: '14px 16px',
                            fontSize: '13px',
                            color: '#374151',
                          }}
                        >
                          {(bookingsPage - 1) * limit + index + 1}
                        </td>
                        <td
                          style={{
                            padding: '14px 16px',
                            fontSize: '13px',
                            color: '#374151',
                          }}
                          title={b.bookingNumber || ''}
                        >
                          {b.bookingNumber || '—'}
                        </td>
                        <td
                          style={{
                            padding: '14px 16px',
                            fontSize: '13px',
                            color: '#374151',
                          }}
                          title={b.service?.title || ''}
                        >
                          {b.service?.title || '—'}
                        </td>
                        <td
                          style={{
                            padding: '14px 16px',
                            fontSize: '13px',
                            color: '#374151',
                          }}
                          title={b.provider?.name || ''}
                        >
                          {b.provider?.name || '—'}
                        </td>
                        <td style={{ padding: '14px 16px' }} title={b.bookingStatus || ''}>
                          <StatusBadge status={b.bookingStatus} />
                        </td>
                        <td
                          style={{
                            padding: '14px 16px',
                            fontSize: '13px',
                            color: '#374151',
                          }}
                          title={b.amount != null ? `$${Number(b.amount).toFixed(2)}` : ''}
                        >
                          {b.amount != null ? `$${Number(b.amount).toFixed(2)}` : '—'}
                        </td>
                        <td
                          style={{
                            padding: '14px 16px',
                            fontSize: '13px',
                            color: '#6b7280',
                          }}
                          title={formatDate(b.createdAt)}
                        >
                          {formatDate(b.createdAt)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={bookingsPage}
              totalPages={bookingsTotalPages}
              onPage={setBookingsPage}
            />
          </TableCard>

          <TableCard>
            <div
              style={{
                padding: '20px',
                borderBottom: '1px solid #f3f4f6',
              }}
            >
              <h3 style={sectionTitleStyle}>Follows</h3>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0',
                borderBottom: '1px solid #f3f4f6',
              }}
            >
              <div style={{ borderRight: '1px solid #f3f4f6' }}>
                <div
                  style={{
                    padding: '12px 16px',
                    background: '#f9fafb',
                    fontWeight: '600',
                    fontSize: '13px',
                    color: '#374151',
                  }}
                >
                  Followers
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                    }}
                  >
                    <TableHead columns={['User', 'Phone', 'Since']} />
                    <tbody>
                      {followersLoading && <LoadingRow cols={3} />}
                      {!followersLoading && followers.length === 0 && (
                        <EmptyRow cols={3} message="No followers" />
                      )}
                      {!followersLoading &&
                        followers.map((row) => {
                          const u = row.follower;
                          return (
                            <tr
                              key={row.id}
                              style={{ borderBottom: '1px solid #f3f4f6' }}
                            >
                              <td
                                style={{ padding: '12px 16px', fontSize: '13px' }}
                                title={`${u?.name || ''} (${u?.email || ''})`}
                              >
                                {u?.name || '—'}
                                <div style={{ color: '#9ca3af', fontSize: '12px' }}>
                                  {u?.email || ''}
                                </div>
                              </td>
                              <td
                                style={{
                                  padding: '12px 16px',
                                  fontSize: '13px',
                                  color: '#374151',
                                }}
                                title={u?.phone || ''}
                              >
                                {u?.phone || '—'}
                              </td>
                              <td
                                style={{
                                  padding: '12px 16px',
                                  fontSize: '12px',
                                  color: '#6b7280',
                                }}
                                title={formatDate(row.createdAt)}
                              >
                                {formatDate(row.createdAt)}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  page={followersPage}
                  totalPages={followersTotalPages}
                  onPage={setFollowersPage}
                />
              </div>

              <div>
                <div
                  style={{
                    padding: '12px 16px',
                    background: '#f9fafb',
                    fontWeight: '600',
                    fontSize: '13px',
                    color: '#374151',
                  }}
                >
                  Following
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                    }}
                  >
                    <TableHead columns={['User', 'Phone', 'Since']} />
                    <tbody>
                      {followingLoading && <LoadingRow cols={3} />}
                      {!followingLoading && following.length === 0 && (
                        <EmptyRow cols={3} message="Not following anyone" />
                      )}
                      {!followingLoading &&
                        following.map((row) => {
                          const u = row.following;
                          return (
                            <tr
                              key={row.id}
                              style={{ borderBottom: '1px solid #f3f4f6' }}
                            >
                              <td
                                style={{ padding: '12px 16px', fontSize: '13px' }}
                                title={`${u?.name || ''} (${u?.email || ''})`}
                              >
                                {u?.name || '—'}
                                <div style={{ color: '#9ca3af', fontSize: '12px' }}>
                                  {u?.email || ''}
                                </div>
                              </td>
                              <td
                                style={{
                                  padding: '12px 16px',
                                  fontSize: '13px',
                                  color: '#374151',
                                }}
                                title={u?.phone || ''}
                              >
                                {u?.phone || '—'}
                              </td>
                              <td
                                style={{
                                  padding: '12px 16px',
                                  fontSize: '12px',
                                  color: '#6b7280',
                                }}
                                title={formatDate(row.createdAt)}
                              >
                                {formatDate(row.createdAt)}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  page={followingPage}
                  totalPages={followingTotalPages}
                  onPage={setFollowingPage}
                />
              </div>
            </div>
          </TableCard>

          <TableCard>
            <div
              style={{
                padding: '20px',
                borderBottom: '1px solid #f3f4f6',
              }}
            >
              <h3 style={sectionTitleStyle}>Posts</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                }}
              >
                <TableHead
                  columns={[
                    'S No.',
                    'Type',
                    'Title',
                    'Hashtags',
                    'Likes',
                    'Comments',
                    'Status',
                    'Posted',
                  ]}
                />
                <tbody>
                  {postsLoading && <LoadingRow cols={8} />}
                  {!postsLoading && posts.length === 0 && (
                    <EmptyRow cols={8} message="No posts found" />
                  )}
                  {!postsLoading &&
                    posts.map((p, index) => (
                      <tr
                        key={p.id}
                        style={{ borderBottom: '1px solid #f3f4f6' }}
                      >
                        <td
                          style={{
                            padding: '14px 16px',
                            fontSize: '13px',
                            color: '#9ca3af',
                          }}
                        >
                          {(postsPage - 1) * limit + index + 1}
                        </td>
                        <td
                          style={{
                            padding: '14px 16px',
                            fontSize: '13px',
                            color: '#374151',
                          }}
                          title={p.postType || ''}
                        >
                          {p.postType || '—'}
                        </td>
                        <td
                          style={{
                            padding: '14px 16px',
                            fontSize: '13px',
                            color: '#374151',
                            maxWidth: '220px',
                          }}
                          title={p.caption || ''}
                        >
                          {captionPreview(p.caption)}
                        </td>
                        <td
                          style={{
                            padding: '14px 16px',
                            fontSize: '13px',
                            color: '#3b82f6',
                            maxWidth: '120px',
                          }}
                          title={p.hashtags || ''}
                        >
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.hashtags || '—'}
                          </div>
                        </td>
                        <td
                          style={{
                            padding: '14px 16px',
                            fontSize: '13px',
                            color: '#374151',
                          }}
                          title={String(p.likesCount ?? 0)}
                        >
                          {p.likesCount ?? 0}
                        </td>
                        <td
                          style={{
                            padding: '14px 16px',
                            fontSize: '13px',
                            color: '#374151',
                          }}
                          title={String(p.commentsCount ?? 0)}
                        >
                          {p.commentsCount ?? 0}
                        </td>
                        <td style={{ padding: '14px 16px' }} title={p.status || ''}>
                          <StatusBadge status={p.status} />
                        </td>
                        <td
                          style={{
                            padding: '14px 16px',
                            fontSize: '13px',
                            color: '#6b7280',
                          }}
                          title={formatDate(p.createdAt)}
                        >
                          {formatDate(p.createdAt)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={postsPage}
              totalPages={postsTotalPages}
              onPage={setPostsPage}
            />
          </TableCard>
        </div>
      </div>

      <ImageModal
        src={previewImage}
        alt={previewTitle}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  );
};

export default UsersView;
