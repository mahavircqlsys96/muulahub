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
  formatCurrency,
  getCurrencySymbol,
  ImageModal,
} from '../../components/common/PageTable';

import { toast, ToastContainer } from 'react-toastify';
import Swal from 'sweetalert2';
import { imageBaseUrl } from '../../services/api';
import { get_user_details } from '../../utils/thunkApis';
import apiInstance from '../../utils/apiInstance';
import { usePermissions } from '../../utils/permissions';

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
  const { can } = usePermissions();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const [licenseActionLoading, setLicenseActionLoading] = useState(false);
  const [blueTickActionLoading, setBlueTickActionLoading] = useState(false);

  const limit = 5;

  const [bookingTab, setBookingTab] = useState('user'); // 'user' | 'host'
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

  const [userCategories, setUserCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  const fetchUserCategories = useCallback(async () => {
    if (!id) return;
    try {
      setCategoriesLoading(true);
      const res = await apiInstance.get(`/userCategories/${id}`);
      const body = res.data?.body;
      if (Array.isArray(body)) {
        setUserCategories(body);
      }
    } catch (e) {
      console.log('Error fetching user categories:', e);
    } finally {
      setCategoriesLoading(false);
    }
  }, [id]);

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
        `/bookings?userId=${id}&role=${bookingTab}&page=${bookingsPage}&limit=${limit}`
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
  }, [id, bookingTab, bookingsPage, limit]);

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

  const handleToggleBlueTick = async () => {
    const isCurrentlyVerified = userDetails?.isVerified === 1 || userDetails?.isVerified === true || userDetails?.isVerified === '1';
    const nextStatus = isCurrentlyVerified ? 0 : 1;

    const result = await Swal.fire({
      title: isCurrentlyVerified ? 'Remove Blue Tick?' : 'Grant Verified Blue Tick?',
      text: isCurrentlyVerified
        ? `Are you sure you want to remove the verified badge from ${userDetails?.name || 'this user'}?`
        : `Are you sure you want to grant the verified blue tick badge to ${userDetails?.name || 'this user'}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#9ca3af',
      confirmButtonText: isCurrentlyVerified ? 'Yes, remove' : 'Yes, verify user'
    });

    if (!result.isConfirmed) return;

    try {
      setBlueTickActionLoading(true);
      await apiInstance.put(`/updateBlueTickStatus/${id}`, { isVerified: nextStatus });
      toast.success(nextStatus === 1 ? 'User verified with blue tick' : 'Blue tick verification removed');
      fetchUserDetails();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update blue tick status');
    } finally {
      setBlueTickActionLoading(false);
    }
  };

  const handleUpdateLicenseStatus = async (status) => {
    let rejectionReason = null;

    if (status === 'Rejected') {
      const { value: text, isConfirmed } = await Swal.fire({
        title: 'Reject Driving License',
        input: 'textarea',
        inputLabel: 'Rejection Reason (visible to user)',
        inputPlaceholder: 'Please enter reason for rejection (e.g. Blurry photo, expired license)...',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#9ca3af',
        confirmButtonText: 'Confirm Reject',
        inputValidator: (value) => {
          if (!value || !value.trim()) {
            return 'Please enter a rejection reason.';
          }
        }
      });

      if (!isConfirmed) return;
      rejectionReason = text ? text.trim() : '';
    } else {
      const confirmText = status === 'Approved'
        ? `Are you sure you want to APPROVE the driving license for ${userDetails?.name || 'this user'}?`
        : `Are you sure you want to reset the license status to PENDING?`;

      const result = await Swal.fire({
        title: `${status} License?`,
        text: confirmText,
        icon: status === 'Approved' ? 'success' : 'question',
        showCancelButton: true,
        confirmButtonColor: status === 'Approved' ? '#16a34a' : '#d97706',
        cancelButtonColor: '#9ca3af',
        confirmButtonText: `Yes, ${status}`
      });

      if (!result.isConfirmed) return;
    }

    try {
      setLicenseActionLoading(true);
      await apiInstance.put(`/updateLicenseApproval/${id}`, {
        status,
        rejectionReason
      });
      toast.success(`License status updated to ${status}`);
      fetchUserDetails();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update license approval status');
    } finally {
      setLicenseActionLoading(false);
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

  useEffect(() => {
    if (!id) return;
    fetchUserCategories();
  }, [id, fetchUserCategories]);

  useEffect(() => {
    const list = userDetails?.userCategories || userDetails?.categories;
    if (Array.isArray(list) && list.length > 0) {
      setUserCategories(list);
    }
  }, [userDetails]);

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
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <span>{userDetails?.name || '—'}</span>
                  {(userDetails?.isVerified === 1 || userDetails?.isVerified === true || userDetails?.isVerified === '1') && (
                    <i
                      className="material-icons"
                      style={{ fontSize: '22px', color: '#2563eb' }}
                      title="Verified User (Blue Tick)"
                    >
                      verified
                    </i>
                  )}
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
                    Verified Badge (Blue Tick)
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background:
                          userDetails?.isVerified === 1 || userDetails?.isVerified === true || userDetails?.isVerified === '1'
                            ? '#eff6ff'
                            : '#f9fafb',
                        color:
                          userDetails?.isVerified === 1 || userDetails?.isVerified === true || userDetails?.isVerified === '1'
                            ? '#1d4ed8'
                            : '#6b7280',
                        border:
                          userDetails?.isVerified === 1 || userDetails?.isVerified === true || userDetails?.isVerified === '1'
                            ? '1px solid #bfdbfe'
                            : '1px solid #e5e7eb',
                      }}
                    >
                      <i
                        className="material-icons"
                        style={{
                          fontSize: '15px',
                          color:
                            userDetails?.isVerified === 1 || userDetails?.isVerified === true || userDetails?.isVerified === '1'
                              ? '#2563eb'
                              : '#9ca3af',
                        }}
                      >
                        {userDetails?.isVerified === 1 || userDetails?.isVerified === true || userDetails?.isVerified === '1'
                          ? 'verified'
                          : 'radio_button_unchecked'}
                      </i>
                      {userDetails?.isVerified === 1 || userDetails?.isVerified === true || userDetails?.isVerified === '1'
                        ? 'Verified'
                        : 'Not Verified'}
                    </span>

                    {can('users', 'edit') && (
                      <button
                        type="button"
                        disabled={blueTickActionLoading}
                        onClick={handleToggleBlueTick}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '8px',
                          border: '1px solid #d1d5db',
                          background: '#fff',
                          fontSize: '12px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          color: '#374151',
                        }}
                      >
                        {userDetails?.isVerified === 1 || userDetails?.isVerified === true || userDetails?.isVerified === '1'
                          ? 'Remove'
                          : 'Verify'}
                      </button>
                    )}
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
                    License Approval Status
                  </div>
                  <div>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background:
                          userDetails?.isApproved === 'Approved'
                            ? '#dcfce7'
                            : userDetails?.isApproved === 'Rejected'
                              ? '#fee2e2'
                              : '#fef3c7',
                        color:
                          userDetails?.isApproved === 'Approved'
                            ? '#15803d'
                            : userDetails?.isApproved === 'Rejected'
                              ? '#b91c1c'
                              : '#b45309',
                      }}
                    >
                      <i className="material-icons" style={{ fontSize: '15px' }}>
                        {userDetails?.isApproved === 'Approved'
                          ? 'check_circle'
                          : userDetails?.isApproved === 'Rejected'
                            ? 'cancel'
                            : 'hourglass_empty'}
                      </i>
                      {userDetails?.isApproved || 'Pending'}
                    </span>
                    {userDetails?.isApproved === 'Rejected' && userDetails?.licenseRejectionReason && (
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#b91c1c',
                          marginTop: '4px',
                          fontStyle: 'italic',
                        }}
                      >
                        Reason: {userDetails.licenseRejectionReason}
                      </div>
                    )}
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
                    Phone
                  </div>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#111827',
                    }}
                  >
                    {(userDetails?.countryCode || userDetails?.country_code) && userDetails?.phone
                      ? `${userDetails.countryCode || userDetails.country_code} ${userDetails.phone}`
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
                    Login Type
                  </div>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#111827',
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
                          userDetails?.loginType === 'google'
                            ? '#fee2e2'
                            : userDetails?.loginType === 'apple'
                              ? '#f3f4f6'
                              : userDetails?.loginType === 'facebook'
                                ? '#dbeafe'
                                : '#e0e7ff',
                        color:
                          userDetails?.loginType === 'google'
                            ? '#dc2626'
                            : userDetails?.loginType === 'apple'
                              ? '#111827'
                              : userDetails?.loginType === 'facebook'
                                ? '#1d4ed8'
                                : '#4338ca',
                      }}
                    >
                      {userDetails?.loginType || 'email'}
                    </span>
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

                {/* <div>
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
                </div> */}

                <div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#9ca3af',
                      marginBottom: '4px',
                    }}
                  >
                    Currency
                  </div>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: '#111827',
                      textTransform: 'uppercase',
                    }}
                  >
                    {userDetails?.currency
                      ? `${userDetails.currency.toUpperCase()}${getCurrencySymbol(userDetails.currency) ? ` (${getCurrencySymbol(userDetails.currency)})` : ''}`
                      : '—'}
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
                    {userDetails?.currency
                      ? `${getCurrencySymbol(userDetails.currency)}${Number(userDetails?.total_spent ?? 0).toFixed(2)}`
                      : userDetails?.total_spent !== undefined && userDetails?.total_spent !== null
                        ? `${Number(userDetails.total_spent).toFixed(2)}`
                        : '0.00'}
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

                <div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#9ca3af',
                      marginBottom: '6px',
                    }}
                  >
                    Selected Categories
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {categoriesLoading ? (
                      <span style={{ fontSize: '12px', color: '#9ca3af' }}>Loading...</span>
                    ) : userCategories && userCategories.length > 0 ? (
                      userCategories.map((uc, idx) => {
                        const cat = uc.category || uc;
                        const isPrimary = uc.isPrimary === 1 || uc.isPrimary === true;
                        const catName = uc.categoryName || cat?.categoryName || 'Category';
                        return (
                          <span
                            key={uc.id || cat?.id || cat?.categoryId || idx}
                            style={{
                              fontSize: '12px',
                              padding: '4px 10px',
                              borderRadius: '16px',
                              background: isPrimary ? '#dbeafe' : '#f3f4f6',
                              color: isPrimary ? '#1d4ed8' : '#374151',
                              fontWeight: isPrimary ? '600' : '500',
                              border: isPrimary ? '1px solid #bfdbfe' : '1px solid #e5e7eb',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            {catName}
                            {isPrimary && (
                              <span style={{ fontSize: '10px', opacity: 0.8 }}>(Primary)</span>
                            )}
                          </span>
                        );
                      })
                    ) : (
                      <span style={{ fontSize: '14px', color: '#9ca3af' }}>—</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </TableCard>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* ── License Verification CARD ── */}
          <TableCard>
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="material-icons" style={{ color: '#2563eb', fontSize: '22px' }}>
                  badge
                </i>
                <h3 style={sectionTitleStyle}>License Verification</h3>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '700',
                    background:
                      userDetails?.isApproved === 'Approved'
                        ? '#dcfce7'
                        : userDetails?.isApproved === 'Rejected'
                          ? '#fee2e2'
                          : '#fef3c7',
                    color:
                      userDetails?.isApproved === 'Approved'
                        ? '#15803d'
                        : userDetails?.isApproved === 'Rejected'
                          ? '#b91c1c'
                          : '#b45309',
                  }}
                >
                  <i className="material-icons" style={{ fontSize: '16px' }}>
                    {userDetails?.isApproved === 'Approved'
                      ? 'check_circle'
                      : userDetails?.isApproved === 'Rejected'
                        ? 'cancel'
                        : 'hourglass_empty'}
                  </i>
                  {userDetails?.isApproved || 'Pending'}
                </span>

                {userDetails?.licenseSubmittedAt && (
                  <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                    Submitted {formatDate(userDetails.licenseSubmittedAt)}
                  </span>
                )}
              </div>
            </div>

            <div style={{ padding: '20px' }}>
              {userDetails?.isApproved === 'Rejected' && userDetails?.licenseRejectionReason && (
                <div
                  style={{
                    padding: '12px 16px',
                    marginBottom: '18px',
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    color: '#991b1b',
                    fontSize: '13px',
                  }}
                >
                  <i
                    className="material-icons"
                    style={{ fontSize: '18px', color: '#dc2626', marginTop: '1px' }}
                  >
                    info
                  </i>
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: '2px' }}>
                      Rejection Reason (Visible to User)
                    </div>
                    <div>{userDetails.licenseRejectionReason}</div>
                  </div>
                </div>
              )}

              {/* License Front & Back Images */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '20px',
                  marginBottom: '20px',
                }}
              >
                {/* Front Image */}
                <div
                  style={{
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                      License Front Image
                    </span>
                    {userDetails?.licenseFront && (
                      <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: '600' }}>
                        Uploaded
                      </span>
                    )}
                  </div>

                  {userDetails?.licenseFront ? (
                    <div style={{ position: 'relative', textAlign: 'center' }}>
                      <img
                        src={
                          userDetails.licenseFront.startsWith('http')
                            ? userDetails.licenseFront
                            : `${imageBaseUrl}${userDetails.licenseFront}`
                        }
                        alt="License Front"
                        style={{
                          width: '100%',
                          height: '180px',
                          objectFit: 'contain',
                          background: '#fff',
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                          cursor: 'zoom-in',
                        }}
                        onClick={() => {
                          const src = userDetails.licenseFront.startsWith('http')
                            ? userDetails.licenseFront
                            : `${imageBaseUrl}${userDetails.licenseFront}`;
                          setPreviewImage(src);
                          setPreviewTitle(`${userDetails?.name || 'User'} - License Front`);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const src = userDetails.licenseFront.startsWith('http')
                            ? userDetails.licenseFront
                            : `${imageBaseUrl}${userDetails.licenseFront}`;
                          setPreviewImage(src);
                          setPreviewTitle(`${userDetails?.name || 'User'} - License Front`);
                        }}
                        style={{
                          marginTop: '8px',
                          background: 'transparent',
                          border: 'none',
                          color: '#2563eb',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <i className="material-icons" style={{ fontSize: '16px' }}>
                          zoom_in
                        </i>
                        Preview Full Image
                      </button>
                    </div>
                  ) : (
                    <div
                      style={{
                        height: '180px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#9ca3af',
                        background: '#fff',
                        borderRadius: '8px',
                        border: '1px dashed #d1d5db',
                        gap: '6px',
                      }}
                    >
                      <i
                        className="material-icons"
                        style={{ fontSize: '32px', color: '#d1d5db' }}
                      >
                        image_not_supported
                      </i>
                      <span style={{ fontSize: '13px' }}>Front image not uploaded</span>
                    </div>
                  )}
                </div>

                {/* Back Image */}
                <div
                  style={{
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                      License Back Image
                    </span>
                    {userDetails?.licenseBack && (
                      <span style={{ fontSize: '11px', color: '#16a34a', fontWeight: '600' }}>
                        Uploaded
                      </span>
                    )}
                  </div>

                  {userDetails?.licenseBack ? (
                    <div style={{ position: 'relative', textAlign: 'center' }}>
                      <img
                        src={
                          userDetails.licenseBack.startsWith('http')
                            ? userDetails.licenseBack
                            : `${imageBaseUrl}${userDetails.licenseBack}`
                        }
                        alt="License Back"
                        style={{
                          width: '100%',
                          height: '180px',
                          objectFit: 'contain',
                          background: '#fff',
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                          cursor: 'zoom-in',
                        }}
                        onClick={() => {
                          const src = userDetails.licenseBack.startsWith('http')
                            ? userDetails.licenseBack
                            : `${imageBaseUrl}${userDetails.licenseBack}`;
                          setPreviewImage(src);
                          setPreviewTitle(`${userDetails?.name || 'User'} - License Back`);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const src = userDetails.licenseBack.startsWith('http')
                            ? userDetails.licenseBack
                            : `${imageBaseUrl}${userDetails.licenseBack}`;
                          setPreviewImage(src);
                          setPreviewTitle(`${userDetails?.name || 'User'} - License Back`);
                        }}
                        style={{
                          marginTop: '8px',
                          background: 'transparent',
                          border: 'none',
                          color: '#2563eb',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <i className="material-icons" style={{ fontSize: '16px' }}>
                          zoom_in
                        </i>
                        Preview Full Image
                      </button>
                    </div>
                  ) : (
                    <div
                      style={{
                        height: '180px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#9ca3af',
                        background: '#fff',
                        borderRadius: '8px',
                        border: '1px dashed #d1d5db',
                        gap: '6px',
                      }}
                    >
                      <i
                        className="material-icons"
                        style={{ fontSize: '32px', color: '#d1d5db' }}
                      >
                        image_not_supported
                      </i>
                      <span style={{ fontSize: '13px' }}>Back image not uploaded</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Admin Actions for License & Blue Tick */}
              {can('users', 'edit') && (
                <div
                  style={{
                    paddingTop: '16px',
                    borderTop: '1px solid #e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                    Verification Actions:
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <button
                      type="button"
                      disabled={licenseActionLoading || userDetails?.isApproved === 'Approved'}
                      onClick={() => handleUpdateLicenseStatus('Approved')}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '10px',
                        border: 'none',
                        background:
                          userDetails?.isApproved === 'Approved' ? '#86efac' : '#16a34a',
                        color: '#fff',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor:
                          userDetails?.isApproved === 'Approved' ? 'default' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <i className="material-icons" style={{ fontSize: '16px' }}>
                        check
                      </i>
                      Approve License
                    </button>

                    <button
                      type="button"
                      disabled={licenseActionLoading || userDetails?.isApproved === 'Rejected'}
                      onClick={() => handleUpdateLicenseStatus('Rejected')}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '10px',
                        border: 'none',
                        background:
                          userDetails?.isApproved === 'Rejected' ? '#fca5a5' : '#dc2626',
                        color: '#fff',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor:
                          userDetails?.isApproved === 'Rejected' ? 'default' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <i className="material-icons" style={{ fontSize: '16px' }}>
                        close
                      </i>
                      Reject License
                    </button>

                    <button
                      type="button"
                      disabled={licenseActionLoading || userDetails?.isApproved === 'Pending'}
                      onClick={() => handleUpdateLicenseStatus('Pending')}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '10px',
                        border: '1px solid #d97706',
                        background: '#fff',
                        color: '#d97706',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor:
                          userDetails?.isApproved === 'Pending' ? 'default' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <i className="material-icons" style={{ fontSize: '16px' }}>
                        schedule
                      </i>
                      Set Pending
                    </button>

                    <button
                      type="button"
                      disabled={blueTickActionLoading}
                      onClick={handleToggleBlueTick}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '10px',
                        border: 'none',
                        background:
                          userDetails?.isVerified === 1 ||
                            userDetails?.isVerified === true ||
                            userDetails?.isVerified === '1'
                            ? '#4b5563'
                            : '#2563eb',
                        color: '#fff',
                        fontSize: '13px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <i className="material-icons" style={{ fontSize: '16px' }}>
                        verified
                      </i>
                      {userDetails?.isVerified === 1 ||
                        userDetails?.isVerified === true ||
                        userDetails?.isVerified === '1'
                        ? 'Remove Blue Tick'
                        : 'Grant Blue Tick'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </TableCard>

          <TableCard>
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="material-icons" style={{ color: '#3b82f6', fontSize: '20px' }}>
                  category
                </i>
                <h3 style={sectionTitleStyle}>Selected Services Categories</h3>
              </div>
              {userCategories.length > 0 && (
                <span
                  style={{
                    background: '#eff6ff',
                    color: '#2563eb',
                    fontSize: '12px',
                    fontWeight: '600',
                    padding: '3px 10px',
                    borderRadius: '12px',
                  }}
                >
                  {userCategories.length} {userCategories.length === 1 ? 'Category' : 'Categories'}
                </span>
              )}
            </div>
            <div style={{ padding: '20px' }}>
              {categoriesLoading ? (
                <div style={{ padding: '24px', textAlign: 'center' }}>
                  <div className="spinner-border text-primary" role="status" style={{ width: '24px', height: '24px' }} />
                </div>
              ) : userCategories && userCategories.length > 0 ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: '12px',
                  }}
                >
                  {userCategories.map((uc, idx) => {
                    const cat = uc.category || uc;
                    const isPrimary = uc.isPrimary === 1 || uc.isPrimary === true;
                    const catName = uc.categoryName || cat?.categoryName || 'Category';
                    const rawImage = uc.image || cat?.image;
                    const catImg = rawImage
                      ? rawImage.startsWith('http')
                        ? rawImage
                        : `${imageBaseUrl}${rawImage}`
                      : null;

                    return (
                      <div
                        key={uc.id || cat?.id || cat?.categoryId || idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '12px 14px',
                          background: isPrimary ? 'rgba(59,130,246,0.05)' : '#f9fafb',
                          border: isPrimary
                            ? '1px solid rgba(59,130,246,0.3)'
                            : '1px solid #e5e7eb',
                          borderRadius: '12px',
                        }}
                      >
                        {catImg ? (
                          <img
                            src={catImg}
                            alt={catName}
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '8px',
                              objectFit: 'cover',
                            }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '8px',
                              background: '#e0e7ff',
                              color: '#4f46e5',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                          >
                            <i className="material-icons" style={{ fontSize: '20px' }}>
                              category
                            </i>
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: '14px',
                              fontWeight: '600',
                              color: '#111827',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={catName}
                          >
                            {catName}
                          </div>
                          {isPrimary && (
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: '700',
                                textTransform: 'uppercase',
                                color: '#2563eb',
                                background: '#dbeafe',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                display: 'inline-block',
                                marginTop: '3px',
                              }}
                            >
                              Primary Category
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div
                  style={{
                    color: '#6b7280',
                    fontSize: '14px',
                    textAlign: 'center',
                    padding: '10px 0',
                  }}
                >
                  No service categories selected
                </div>
              )}
            </div>
          </TableCard>

          <TableCard>
            <div
              style={{
                padding: '20px',
                borderBottom: '1px solid #f3f4f6',
              }}
            >
              <h3 style={sectionTitleStyle}>Bank Details</h3>
            </div>
            <div style={{ padding: '20px' }}>
              {userDetails?.bankDetails ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Bank Name</div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                      {userDetails.bankDetails.bankName || '—'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Account Holder</div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                      {userDetails.bankDetails.accountHolderName || '—'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Account Number</div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                      {userDetails.bankDetails.accountNumber || '—'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '4px' }}>Routing Number</div>
                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                      {userDetails.bankDetails.routingNumber || '—'}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ color: '#6b7280', fontSize: '14px', textAlign: 'center', padding: '10px 0' }}>No bank details provided</div>
              )}
            </div>
          </TableCard>

          <TableCard>
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <h3 style={sectionTitleStyle}>Bookings</h3>
                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                  {bookingTab === 'user' ? 'Bookings made as a customer' : 'Bookings received as a host'}
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  background: '#f3f4f6',
                  padding: '4px',
                  borderRadius: '10px',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setBookingTab('user');
                    setBookingsPage(1);
                  }}
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: '600',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s',
                    background: bookingTab === 'user' ? '#fff' : 'transparent',
                    color: bookingTab === 'user' ? '#2563eb' : '#6b7280',
                    boxShadow:
                      bookingTab === 'user'
                        ? '0 1px 3px rgba(0,0,0,0.1)'
                        : 'none',
                  }}
                >
                  <i className="material-icons" style={{ fontSize: '16px' }}>
                    person
                  </i>
                  As Users Booking
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBookingTab('host');
                    setBookingsPage(1);
                  }}
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: '600',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s',
                    background: bookingTab === 'host' ? '#fff' : 'transparent',
                    color: bookingTab === 'host' ? '#2563eb' : '#6b7280',
                    boxShadow:
                      bookingTab === 'host'
                        ? '0 1px 3px rgba(0,0,0,0.1)'
                        : 'none',
                  }}
                >
                  <i className="material-icons" style={{ fontSize: '16px' }}>
                    storefront
                  </i>
                  As Host Booking
                </button>
              </div>
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
                    'Category',
                    bookingTab === 'user' ? 'Host' : 'Customer',
                    'Status',
                    'Amount',
                    'Date',
                  ]}
                />
                <tbody>
                  {bookingsLoading && <LoadingRow cols={7} />}
                  {!bookingsLoading && bookings.length === 0 && (
                    <EmptyRow
                      cols={7}
                      message={
                        bookingTab === 'user'
                          ? 'No bookings found as user'
                          : 'No bookings found as host'
                      }
                    />
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
                            fontWeight: '600',
                          }}
                          title={b.bookingNumber || ''}
                        >
                          {b.bookingNumber ? `#${b.bookingNumber}` : '—'}
                        </td>
                        <td
                          style={{
                            padding: '14px 16px',
                            fontSize: '13px',
                            color: '#374151',
                          }}
                          title={b.category?.categoryName || b.categoryName || b.service?.title || ''}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {b.category?.image && (
                              <img
                                src={`${imageBaseUrl}${b.category.image}`}
                                alt=""
                                style={{ width: '24px', height: '24px', borderRadius: '4px', objectFit: 'cover' }}
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            )}
                            <span style={{ fontWeight: '500' }}>
                              {b.category?.categoryName || b.categoryName || b.service?.title || '—'}
                            </span>
                          </div>
                        </td>
                        <td
                          style={{
                            padding: '14px 16px',
                            fontSize: '13px',
                            color: '#374151',
                          }}
                          title={
                            bookingTab === 'user'
                              ? b.provider?.name || ''
                              : b.user?.name || ''
                          }
                        >
                          {bookingTab === 'user' ? (
                            <div>
                              <div style={{ fontWeight: '500' }}>{b.provider?.name || '—'}</div>
                              {b.provider?.email && (
                                <div style={{ color: '#9ca3af', fontSize: '11px' }}>
                                  {b.provider.email}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div>
                              <div style={{ fontWeight: '500' }}>{b.user?.name || '—'}</div>
                              {b.user?.email && (
                                <div style={{ color: '#9ca3af', fontSize: '11px' }}>
                                  {b.user.email}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '14px 16px' }} title={b.bookingStatus || ''}>
                          <StatusBadge status={b.displayStatus || (b.bookingStatus === 'active' || b.bookingStatus === 'ongoing' ? 'ongoing' : b.bookingStatus)} />
                        </td>
                        <td
                          style={{
                            padding: '14px 16px',
                            fontSize: '13px',
                            color: '#374151',
                            fontWeight: '600',
                          }}
                          title={formatCurrency(b.amount, b.currency || userDetails?.currency)}
                        >
                          {formatCurrency(b.amount, b.currency || userDetails?.currency)}
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
                    'Category',
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
                          }}
                          title={p.category?.categoryName || p.categoryName || ''}
                        >
                          {p.category?.categoryName || p.categoryName ? (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              {p.category?.image && (
                                <img
                                  src={p.category.image.startsWith('http') ? p.category.image : `${imageBaseUrl}${p.category.image}`}
                                  alt=""
                                  style={{ width: '20px', height: '20px', borderRadius: '4px', objectFit: 'cover' }}
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                />
                              )}
                              <span style={{ fontWeight: '500', color: '#111827' }}>
                                {p.category?.categoryName || p.categoryName}
                              </span>
                            </div>
                          ) : p.categoryId ? (
                            <span style={{ color: '#6b7280' }}>Category #{p.categoryId}</span>
                          ) : (
                            <span style={{ color: '#9ca3af' }}>—</span>
                          )}
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
