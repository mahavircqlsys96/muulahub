import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { toast, ToastContainer } from 'react-toastify';
import { get_posts } from '../../utils/thunkApis';
import apiInstance from '../../utils/apiInstance';
import {
  PageHeader, SearchBar, FilterSelect, TableCard, TableHead, ActionBtn,
  Pagination, EmptyRow, LoadingRow, StatusBadge, formatDate, ImageModal
} from '../../components/common/PageTable';
import { imageBaseUrl } from '../../services/api';

const PostsList = () => {
  const dispatch = useDispatch();
  const [data, setData] = useState({ list: [], total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [previewTitle, setPreviewTitle] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { payload } = await dispatch(get_posts({ page, limit: 10, search, status }));
      if (payload) setData(payload);
    } catch {
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [dispatch, page, search, status]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateStatus = async (id, newStatus) => {
    try {
      await apiInstance.put(`/posts/${id}/status`, { status: newStatus });
      toast.success('Post updated');
      fetchData();
    } catch {
      toast.error('Failed to update post');
    }
  };

  const deletePost = async (id) => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await apiInstance.delete(`/posts/${id}`);
      toast.success('Post deleted');
      fetchData();
    } catch {
      toast.error('Failed to delete post');
    }
  };

  return (
    <div>
      <ToastContainer position="top-right" autoClose={2500} />
      <PageHeader title="Posts Moderation" subtitle={`${data.total} total posts`} />

      <TableCard>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <SearchBar value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search captions..." />
          <FilterSelect
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(1); }}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'reported', label: 'Reported' },
              { value: 'deleted', label: 'Deleted' }
            ]}
            placeholder="All Status"
          />
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <TableHead columns={['Sr. No.', 'User', 'Type', 'Caption', 'Hashtags', 'Likes', 'Comments', 'Status', 'Date', 'Actions']} />
            <tbody>
              {loading && <LoadingRow cols={10} />}
              {!loading && !data.list?.length && <EmptyRow cols={10} message="No posts found" />}
              {!loading && data.list?.map((p, i) => (
                <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', color: '#9ca3af', fontSize: '13px' }}>{(page - 1) * 10 + i + 1}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>{p.user?.name}</div>
                    <div style={{ color: '#9ca3af', fontSize: '12px' }}>{p.user?.email}</div>
                  </td>
                  <td style={{ padding: '12px 16px', textTransform: 'capitalize', fontSize: '13px' }}>{p.postType}</td>
                  <td style={{ padding: '12px 16px', maxWidth: '220px' }}>
                    <div style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.caption || '—'}
                    </div>
                    {p.media && p.postType === 'photo' && (
                      <img
                        src={`${imageBaseUrl}${p.media}`}
                        alt=""
                        style={{ width: '40px', height: '40px', borderRadius: '6px', objectFit: 'cover', marginTop: '4px', cursor: 'zoom-in' }}
                        onClick={() => {
                          setPreviewImage(`${imageBaseUrl}${p.media}`);
                          setPreviewTitle(p.caption || 'Photo');
                        }}
                      />
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: '#3b82f6', maxWidth: '150px' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.hashtags || ''}>
                      {p.hashtags || '—'}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>{p.likesCount ?? 0}</td>
                  <td style={{ padding: '12px 16px' }}>{p.commentsCount ?? 0}</td>
                  <td style={{ padding: '12px 16px' }}><StatusBadge status={p.status} /></td>
                  <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '13px' }}>{formatDate(p.createdAt)}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {p.status !== 'active' && (
                        <ActionBtn icon="check_circle" color="#10b981" title="Activate" onClick={() => updateStatus(p.id, 'active')} />
                      )}
                      {p.status !== 'deleted' && (
                        <ActionBtn icon="delete" color="#ef4444" title="Delete" onClick={() => deletePost(p.id)} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={data.totalPages} onPage={setPage} />
      </TableCard>

      <ImageModal
        src={previewImage}
        alt={previewTitle}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  );
};

export default PostsList;
