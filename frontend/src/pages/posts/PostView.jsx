import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import apiInstance from '../../utils/apiInstance';
import { PageHeader, TableCard, StatusBadge, formatDate, ImageModal } from '../../components/common/PageTable';
import { imageBaseUrl } from '../../services/api';

const cardStyle = {
  background: '#fff',
  borderRadius: '16px',
  padding: '24px',
  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  marginBottom: '20px'
};

const InfoRow = ({ label, value }) => (
  <div style={{ display: 'flex', padding: '12px 0', borderBottom: '1px solid #f3f4f6', alignItems: 'center' }}>
    <div style={{ width: '150px', color: '#6b7280', fontSize: '13px', flexShrink: 0 }}>{label}</div>
    <div style={{ flex: 1, color: '#111827', fontSize: '14px', fontWeight: '500' }}>{value || '—'}</div>
  </div>
);

const ToggleBadge = ({ active, labelOn = 'Enabled', labelOff = 'Disabled' }) => {
  const isOn = active === 'on' || active === true || active === 1;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '3px 10px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '600',
        background: isOn ? '#dcfce7' : '#fee2e2',
        color: isOn ? '#16a34a' : '#dc2626'
      }}
    >
      <i className="material-icons" style={{ fontSize: '14px' }}>
        {isOn ? 'check_circle' : 'cancel'}
      </i>
      {isOn ? labelOn : labelOff}
    </span>
  );
};

const PostView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState(null);

  const fetchPost = useCallback(async () => {
    try {
      const res = await apiInstance.get(`/posts/${id}`);
      if (res.data?.success) {
        setPost(res.data.body);
      } else {
        toast.error('Failed to load post details');
      }
    } catch (err) {
      toast.error('Error fetching post');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPost();
  }, [fetchPost]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
        <div className="spinner-border" style={{ width: '3rem', height: '3rem', color: '#3b82f6' }} />
      </div>
    );
  }

  if (!post) {
    return <div style={{ padding: '24px' }}>Post not found.</div>;
  }

  const { user, media, recentComments, category } = post;

  return (
    <div>
      <ToastContainer position="top-right" autoClose={2500} />
      {previewImage && (
        <ImageModal
          src={previewImage}
          alt="Preview"
          onClose={() => setPreviewImage(null)}
        />
      )}

      {/* Header */}
      <PageHeader
        title={`Post Details #${post.id}`}
        subtitle={`Created on ${formatDate(post.createdAt)}`}
        action={
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <StatusBadge status={post.status} />
            <button
              onClick={() => navigate(-1)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                background: '#fff',
                cursor: 'pointer',
                fontWeight: '600',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <i className="material-icons" style={{ fontSize: '18px' }}>arrow_back</i>
              Back
            </button>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(300px, 1fr)', gap: '24px', alignItems: 'start' }}>
        {/* Left Column */}
        <div>
          {/* Author Card */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <img
                src={
                  user?.profileImage
                    ? `${imageBaseUrl}${user.profileImage}`
                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=3b82f6&color=fff`
                }
                alt={user?.name || 'Author'}
                style={{ width: '60px', height: '60px', borderRadius: '14px', objectFit: 'cover', border: '2px solid #f3f4f6' }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h5 style={{ margin: 0, fontWeight: '700', fontSize: '16px', color: '#111827' }}>{user?.name || 'Unknown Author'}</h5>
                  {user?.isProvider === 1 && (
                    <span style={{ fontSize: '11px', fontWeight: '600', color: '#f97316', background: '#fff7ed', padding: '2px 8px', borderRadius: '4px' }}>
                      Provider
                    </span>
                  )}
                </div>
                <div style={{ color: '#6b7280', fontSize: '13px', marginTop: '2px' }}>{user?.email || '—'}</div>
                {user?.phone && (
                  <div style={{ color: '#9ca3af', fontSize: '12px', marginTop: '2px' }}>
                    {user?.countryCode ? `${user.countryCode} ` : ''}{user.phone}
                  </div>
                )}
              </div>
              {user?.id && (
                <Link
                  to={`/usersView/${user.id}`}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    background: '#eff6ff',
                    color: '#2563eb',
                    fontSize: '12px',
                    fontWeight: '600',
                    textDecoration: 'none'
                  }}
                >
                  View Profile
                </Link>
              )}
            </div>
          </div>

          {/* Post Content & Details */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <h6 style={{ fontWeight: '700', margin: 0, fontSize: '16px', color: '#111827' }}>
                Post Information
              </h6>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#374151', textTransform: 'capitalize', fontWeight: '600', background: '#f3f4f6', padding: '3px 10px', borderRadius: '20px' }}>
                  Type: {post.type || post.postType || 'publish'}
                </span>
                <StatusBadge status={post.status} />
              </div>
            </div>

            {/* Caption */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase', marginBottom: '6px' }}>
                Caption
              </div>
              <div style={{ fontSize: '15px', lineHeight: '1.6', color: '#1f2937', whiteSpace: 'pre-wrap', background: '#f9fafb', padding: '14px', borderRadius: '10px' }}>
                {post.caption || 'No caption provided.'}
              </div>
            </div>

            {/* Hashtags */}
            {post.hashtags && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '600', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Hashtags
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {post.hashtags.split(/\s+/).filter(Boolean).map((h, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: '12px',
                        fontWeight: '500',
                        color: '#2563eb',
                        background: '#eff6ff',
                        padding: '3px 10px',
                        borderRadius: '12px'
                      }}
                    >
                      {h.startsWith('#') ? h : `#${h}`}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Category */}
            <InfoRow
              label="Category"
              value={
                category?.categoryName ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {category.image && (
                      <img
                        src={`${imageBaseUrl}${category.image}`}
                        alt=""
                        style={{ width: '24px', height: '24px', borderRadius: '4px', objectFit: 'cover' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                    <span style={{ fontWeight: '600' }}>{category.categoryName}</span>
                  </div>
                ) : post.categoryId ? (
                  `Category #${post.categoryId}`
                ) : (
                  '—'
                )
              }
            />

            {/* Location */}
            <InfoRow
              label="Location"
              value={
                post.location ? (
                  <div>
                    <div style={{ fontWeight: '500' }}>{post.location}</div>
                    {post.latitude && post.longitude && (
                      <a
                        href={`https://www.google.com/maps?q=${post.latitude},${post.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: '12px', color: '#2563eb', textDecoration: 'underline' }}
                      >
                        View on Google Maps ({Number(post.latitude).toFixed(4)}, {Number(post.longitude).toFixed(4)})
                      </a>
                    )}
                  </div>
                ) : (
                  '—'
                )
              }
            />

            {/* Post Settings / Options */}
            <InfoRow
              label="Allow Comments"
              value={<ToggleBadge active={post.allowComments} labelOn="Allowed" labelOff="Disabled" />}
            />
            <InfoRow
              label="Allow Shares"
              value={<ToggleBadge active={post.allowShares} labelOn="Allowed" labelOff="Disabled" />}
            />
            <InfoRow
              label="Save to Profile"
              value={<ToggleBadge active={post.saveToProfile} labelOn="Yes" labelOff="No" />}
            />

            {/* Scheduled Date/Time if any */}
            {(post.date || post.time) && (
              <InfoRow
                label="Scheduled For"
                value={`${post.date ? formatDate(post.date) : ''} ${post.time || ''}`}
              />
            )}

            <InfoRow label="Posted On" value={formatDate(post.createdAt)} />
          </div>

          {/* Media Gallery (Photos / Videos) */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h6 style={{ fontWeight: '700', margin: 0, fontSize: '16px', color: '#111827' }}>
                Photos & Videos
              </h6>
              {media && media.length > 0 && (
                <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>
                  {media.length} media item{media.length > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {media && media.length > 0 ? (
              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                {media.map((m, idx) => {
                  const isVideo = m.type === 'video';
                  const poster = m.thumbnail ? (m.thumbnail.startsWith('http') ? m.thumbnail : `${imageBaseUrl}${m.thumbnail}`) : null;
                  const fullUrl = m.url?.startsWith('http') ? m.url : `${imageBaseUrl}${m.url}`;
                  return (
                    <div
                      key={m.id || idx}
                      style={{
                        position: 'relative',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                      }}
                    >
                      {isVideo ? (
                        <div style={{ width: '280px', background: '#000', borderRadius: '12px', overflow: 'hidden' }}>
                          <video
                            src={fullUrl}
                            poster={poster}
                            controls
                            style={{ width: '100%', maxHeight: '280px', display: 'block', objectFit: 'contain' }}
                          />
                        </div>
                      ) : (
                        <img
                          src={fullUrl}
                          alt={`Post media ${idx + 1}`}
                          style={{
                            width: '140px',
                            height: '140px',
                            objectFit: 'cover',
                            cursor: 'zoom-in',
                            display: 'block'
                          }}
                          onClick={() => setPreviewImage(fullUrl)}
                          onError={(e) => { e.target.src = 'https://placehold.co/140x140?text=Image'; }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ color: '#9ca3af', fontSize: '13px', padding: '10px 0' }}>
                No photos or videos attached to this post
              </div>
            )}
          </div>
        </div>

        {/* Right Column (Engagements & Comments) */}
        <div>
          {/* Engagement Stats */}
          <div style={cardStyle}>
            <h6 style={{ fontWeight: '700', marginBottom: '16px', fontSize: '16px', color: '#111827' }}>
              Engagements
            </h6>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', textAlign: 'center' }}>
              <div style={{ background: '#fef2f2', padding: '16px', borderRadius: '12px' }}>
                <i className="material-icons" style={{ color: '#ef4444', fontSize: '26px' }}>favorite</i>
                <div style={{ fontSize: '22px', fontWeight: '700', color: '#111827', marginTop: '4px' }}>
                  {post.likesCount || 0}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>Likes</div>
              </div>

              <div style={{ background: '#eff6ff', padding: '16px', borderRadius: '12px' }}>
                <i className="material-icons" style={{ color: '#3b82f6', fontSize: '26px' }}>chat_bubble</i>
                <div style={{ fontSize: '22px', fontWeight: '700', color: '#111827', marginTop: '4px' }}>
                  {post.commentsCount || 0}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>Comments</div>
              </div>

              <div style={{ background: '#f5f3ff', padding: '16px', borderRadius: '12px' }}>
                <i className="material-icons" style={{ color: '#8b5cf6', fontSize: '26px' }}>bookmark</i>
                <div style={{ fontSize: '22px', fontWeight: '700', color: '#111827', marginTop: '4px' }}>
                  {post.bookmarksCount || 0}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>Bookmarks</div>
              </div>

              <div style={{ background: '#fffbeb', padding: '16px', borderRadius: '12px' }}>
                <i className="material-icons" style={{ color: '#f59e0b', fontSize: '26px' }}>flag</i>
                <div style={{ fontSize: '22px', fontWeight: '700', color: '#111827', marginTop: '4px' }}>
                  {post.reportsCount || 0}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>Reports</div>
              </div>
            </div>
          </div>

          {/* Comments Card */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h6 style={{ fontWeight: '700', margin: 0, fontSize: '16px', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="material-icons" style={{ color: '#3b82f6', fontSize: '20px' }}>forum</i>
                Comments
              </h6>
              {recentComments && recentComments.length > 0 && (
                <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>
                  {recentComments.length}
                </span>
              )}
            </div>

            {recentComments && recentComments.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '420px', overflowY: 'auto' }}>
                {recentComments.map((c) => {
                  const avatar = c.commenter?.profileImage
                    ? (c.commenter.profileImage.startsWith('http') ? c.commenter.profileImage : `${imageBaseUrl}${c.commenter.profileImage}`)
                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(c.commenter?.name || 'U')}&background=e5e7eb&color=374151`;
                  return (
                    <div key={c.id} style={{ display: 'flex', gap: '10px', borderBottom: '1px solid #f3f4f6', paddingBottom: '12px' }}>
                      <img
                        src={avatar}
                        alt=""
                        style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <span style={{ fontWeight: '600', fontSize: '13px', color: '#111827' }}>
                            {c.commenter?.name || 'User'}
                          </span>
                          <span style={{ fontSize: '11px', color: '#9ca3af' }}>{formatDate(c.createdAt)}</span>
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#4b5563', lineHeight: '1.4', wordBreak: 'break-word' }}>
                          {c.comment}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ color: '#9ca3af', fontSize: '13px', textAlign: 'center', padding: '24px 0' }}>
                No comments on this post
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostView;
