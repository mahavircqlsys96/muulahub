import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { toast, ToastContainer } from 'react-toastify';
import { get_categories } from '../../utils/thunkApis';
import apiInstance from '../../utils/apiInstance';
import {
  PageHeader, SearchBar, TableCard, TableHead,
  ActionBtn, Pagination, EmptyRow, LoadingRow, StatusBadge, formatDate, ImageModal
} from '../../components/common/PageTable';
import { imageBaseUrl } from '../../services/api';

const btnBlue = {
  background: 'linear-gradient(90deg,#3b82f6,#60a5fa)',
  color: '#fff',
  border: 'none',
  borderRadius: '10px',
  padding: '9px 18px',
  fontSize: '14px',
  fontWeight: '600',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  boxShadow: '0 2px 8px rgba(59,130,246,0.35)',
};

const btnBlueOutline = {
  ...btnBlue,
  background: '#eff6ff',
  color: '#2563eb',
  border: '1px solid #93c5fd',
  boxShadow: 'none',
};

const CategoriesList = () => {
  const dispatch = useDispatch();
  const [data, setData] = useState({ list: [], total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(null);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ categoryName: '' });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const fileInputRef = useRef(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { payload } = await dispatch(get_categories({ page, limit: 10, search }));
      if (payload) setData(payload);
    } catch { toast.error('Failed to load categories'); }
    finally { setLoading(false); }
  }, [dispatch, page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openModal = (cat = null) => {
    setEditing(cat);
    setImageFile(null);
    setForm({ categoryName: cat?.categoryName || '' });
    setImagePreview(cat?.image ? `${imageBaseUrl}${cat.image}` : null);
    setModal(true);
  };

  const closeModal = () => {
    setImagePreview((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
      return null;
    });
    setImageFile(null);
    setModal(false);
  };

  const onPickImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreview((prev) => {
      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
      return url;
    });
  };

  const handleSave = async () => {
    if (!form.categoryName.trim()) return toast.error('Category name required');
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('categoryName', form.categoryName.trim());
      if (imageFile) fd.append('image', imageFile);

      if (editing) {
        await apiInstance.put(`/categories/${editing.id}`, fd);
        toast.success('Category updated');
      } else {
        await apiInstance.post('/categories', fd);
        toast.success('Category created');
      }
      closeModal();
      fetchData();
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this category?')) return;
    try {
      await apiInstance.delete(`/categories/${id}`);
      toast.success('Deleted');
      fetchData();
    } catch { toast.error('Failed to delete'); }
  };

  const handleToggle = async (id, currentStatus) => {
    setStatusLoading(id);
    try {
      await apiInstance.put(`/categories/${id}/toggle`);
      toast.success(
        `Category ${
          currentStatus ? 'deactivated' : 'activated'
        } successfully`
      );
      setData((prev) => ({
        ...prev,
        list: prev.list.map((item) =>
          item.id === id
            ? {
                ...item,
                status: item.status ? 0 : 1
              }
            : item
        )
      }));
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          'Failed to toggle status'
      );
    } finally {
      setStatusLoading(null);
    }
  };

  const modalSurfaceStyle = {
    background: '#fff',
    color: '#111827',
    borderRadius: '16px',
    padding: '24px',
    width: '100%',
    maxWidth: '440px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  };

  return (
    <div>
      <ToastContainer position="top-right" autoClose={2500} />
      <PageHeader
        title="Service Categories"
        subtitle={`${data.total} categories`}
        action={(
          <button type="button" onClick={() => openModal()} style={btnBlue}>
            <i className="material-icons" style={{ fontSize: '18px' }}>add</i>
            Add Category
          </button>
        )}
      />

      <TableCard>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6' }}>
          <SearchBar value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search categories..." />
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <TableHead columns={['#', 'Image', 'Category Name', 'Status', 'Created', 'Actions']} />
            <tbody>
              {loading && <LoadingRow cols={6} />}
              {!loading && !data.list?.length && <EmptyRow cols={6} message="No categories found" />}
              {!loading && data.list?.map((cat, i) => (
                <tr key={cat.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '14px 16px', color: '#9ca3af', fontSize: '13px' }}>{(page - 1) * 10 + i + 1}</td>
                  <td style={{ padding: '14px 16px' }}>
                    {cat.image ? (
                      <img
                        src={`${imageBaseUrl}${cat.image}`}
                        alt={cat.categoryName}
                        style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover', cursor: 'zoom-in' }}
                        onClick={() => {
                          setPreviewImage(`${imageBaseUrl}${cat.image}`);
                          setPreviewTitle(cat.categoryName);
                        }}
                      />
                    ) : (
                      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="material-icons" style={{ color: '#9ca3af', fontSize: '22px' }}>category</i>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: '600', color: '#111827', fontSize: '14px' }}>{cat.categoryName}</td>
                  <td style={{ padding: '14px 16px' }}>
                    {statusLoading === cat.id ? (
                      <div
                        className="spinner-border spinner-border-sm text-primary"
                        role="status"
                      />
                    ) : (
                      <div
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleToggle(cat.id, cat.status)}
                      >
                        <StatusBadge
                          status={cat.status ? 'active' : 'inactive'}
                        />
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: '13px' }}>{formatDate(cat.createdAt)}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <ActionBtn icon="edit" color="#f97316" title="Edit" onClick={() => openModal(cat)} />
                      <ActionBtn icon="delete" color="#ef4444" title="Delete" onClick={() => handleDelete(cat.id)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={data.totalPages} onPage={setPage} />
      </TableCard>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={modalSurfaceStyle}>
            <h6 style={{ margin: '0 0 8px', fontWeight: '700', color: '#111827', fontSize: '18px' }}>
              {editing ? 'Edit Category' : 'Add Category'}
            </h6>
            <p style={{ margin: '0 0 20px', fontSize: '13px', color: '#6b7280' }}>
              Optional category image. Name is required.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '6px' }}>Category name *</label>
              <input
                value={form.categoryName}
                onChange={e => setForm({ ...form, categoryName: e.target.value })}
                placeholder="e.g. Plumber, Electrician"
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', outline: 'none', boxSizing: 'border-box', background: '#fff', color: '#111827' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '6px' }}>Category image</label>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onPickImage} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ ...btnBlueOutline, padding: '9px 16px' }}
                >
                  <i className="material-icons" style={{ fontSize: '18px' }}>image</i>
                  Choose image
                </button>
                {imagePreview && (
                  <img src={imagePreview} alt="Preview" style={{ width: '56px', height: '56px', borderRadius: '10px', objectFit: 'cover', border: '1px solid #e5e7eb' }} />
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={closeModal} style={{ padding: '9px 18px', border: '1px solid #e5e7eb', borderRadius: '10px', background: '#fff', cursor: 'pointer', fontSize: '14px', color: '#374151', fontWeight: '500' }}>Cancel</button>
              <button type="button" onClick={handleSave} disabled={saving} style={{ ...btnBlue, opacity: saving ? 0.7 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
      <ImageModal
        src={previewImage}
        alt={previewTitle}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  );
};

export default CategoriesList;
