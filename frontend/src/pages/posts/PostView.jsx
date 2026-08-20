import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import apiInstance from '../../utils/apiInstance';
import { PageHeader, TableCard, StatusBadge, formatDate, ImageModal } from '../../components/common/PageTable';
import { imageBaseUrl } from '../../services/api';

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
      <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
        <div className="spinner-border" style={{ width: '3rem', height: '3rem', color: 'var(--primary)' }} />
      </div>
    );
  }

  if (!post) {
    return <div>Post not found.</div>;
  }

  const { user, media, recentComments } = post;

  return (
    <div>
      <ToastContainer position="top-right" autoClose={2500} />
      <PageHeader
        title="Post Details"
        action={
          <button onClick={() => navigate(-1)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontWeight: '600' }}>
            Back to Posts
          </button>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <TableCard>
          <div style={{ padding: '24px' }}>
            {/* Author Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid #f3f4f6' }}>
              <img
                src={user?.profileImage ? `${imageBaseUrl}${user.profileImage}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=f91942&color=fff`}
                alt="Author"
                style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <div>
                <h4 style={{ margin: '0 0 4px', fontWeight: '700' }}>{user?.name}</h4>
                <p style={{ margin: 0, color: '#6b7280' }}>{user?.email}</p>
              </div>
            </div>

            {/* Post Content */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', alignItems: 'center' }}>
                <StatusBadge status={post.status} />
                <span style={{ fontSize: '13px', color: '#6b7280', textTransform: 'capitalize', fontWeight: '600', background: '#f3f4f6', padding: '3px 10px', borderRadius: '20px' }}>{post.postType}</span>
                <span style={{ fontSize: '13px', color: '#9ca3af' }}>{formatDate(post.createdAt)}</span>
              </div>
              <p style={{ fontSize: '16px', lineHeight: '1.6', color: '#374151', whiteSpace: 'pre-wrap' }}>
                {post.caption || 'No caption provided.'}
              </p>
              {post.hashtags && (
                <p style={{ color: '#3b82f6', fontWeight: '500', marginTop: '12px' }}>{post.hashtags}</p>
              )}
            </div>

            {/* Media Gallery */}
            {media && media.length > 0 && (
              <div>
                <h5 style={{ fontWeight: '600', marginBottom: '16px' }}>Media</h5>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  {media.map((m, idx) => {
                    const isVideo = m.type === 'video';
                    const src = isVideo ? m.thumbnail : m.url;
                    const fullSrc = src?.startsWith('http') ? src : `${imageBaseUrl}${src}`;
                    const fullUrl = m.url?.startsWith('http') ? m.url : `${imageBaseUrl}${m.url}`;
                    return (
                      <div key={idx} style={{ position: 'relative' }}>
                        {isVideo ? (
                          <video 
                            src={fullUrl}
                            poster={fullSrc}
                            controls
                            style={{ width: '240px', height: '240px', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', background: '#000' }}
                          />
                        ) : (
                          <img
                            src={fullSrc}
                            alt={`Media ${idx + 1}`}
                            style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '12px', cursor: 'zoom-in', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                            onClick={() => setPreviewImage(fullUrl)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </TableCard>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Stats Card */}
          <TableCard>
            <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', textAlign: 'center' }}>
              <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '12px' }}>
                <i className="material-icons" style={{ color: '#f91942', fontSize: '28px', marginBottom: '8px' }}>favorite</i>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#111827' }}>{post.likesCount}</div>
                <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>Likes</div>
              </div>
              <div style={{ background: '#f9fafb', padding: '16px', borderRadius: '12px' }}>
                <i className="material-icons" style={{ color: '#3b82f6', fontSize: '28px', marginBottom: '8px' }}>chat_bubble</i>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#111827' }}>{post.commentsCount}</div>
                <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>Comments</div>
              </div>
            </div>
          </TableCard>

          {/* Recent Comments */}
          <TableCard>
            <div style={{ padding: '24px' }}>
              <h5 style={{ fontWeight: '600', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="material-icons" style={{ color: '#6b7280' }}>forum</i>
                Recent Comments
              </h5>
              {recentComments && recentComments.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {recentComments.map(c => (
                    <div key={c.id} style={{ display: 'flex', gap: '12px', borderBottom: '1px solid #f3f4f6', paddingBottom: '12px' }}>
                      <img
                        src={c.commenter?.profileImage ? (c.commenter.profileImage.startsWith('http') ? c.commenter.profileImage : `${imageBaseUrl}${c.commenter.profileImage}`) : `https://ui-avatars.com/api/?name=${encodeURIComponent(c.commenter?.name || 'U')}&background=e5e7eb&color=374151`}
                        alt=""
                        style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                          <span style={{ fontWeight: '600', fontSize: '14px', color: '#111827' }}>{c.commenter?.name}</span>
                          <span style={{ fontSize: '12px', color: '#9ca3af' }}>{formatDate(c.createdAt)}</span>
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#4b5563', lineHeight: '1.5' }}>
                          {c.comment}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#9ca3af', fontSize: '14px', textAlign: 'center', padding: '20px 0', margin: 0 }}>
                  No comments yet.
                </p>
              )}
            </div>
          </TableCard>
        </div>
      </div>

      <ImageModal src={previewImage} onClose={() => setPreviewImage(null)} />
    </div>
  );
};

export default PostView;
