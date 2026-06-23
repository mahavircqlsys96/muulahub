import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import apiInstance from '../../utils/apiInstance';
import { StatusBadge, formatDate, formatCurrency, ImageModal } from '../../components/common/PageTable';
import { imageBaseUrl } from '../../services/api';

/** Same gradient as the Back button */
const headerBlueGradient = 'linear-gradient(90deg,#3b82f6,#60a5fa)';

const InfoRow = ({ label, value }) => (
  <div style={{ display: 'flex', padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
    <div style={{ width: '180px', color: '#6b7280', fontSize: '13px', flexShrink: 0 }}>{label}</div>
    <div style={{ color: '#111827', fontSize: '14px', fontWeight: '500', flex: 1 }}>{value || '—'}</div>
  </div>
);

const ProviderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const photoInputRef = useRef(null);
   const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  const [previewTitle, setPreviewTitle] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);

  const fetchProvider = async () => {
    try {
      const res = await apiInstance.get(`/providers/${id}`);
      const provData = res.data?.body;
      setProvider(provData);
      if (provData?.providerCategories) {
        setSelectedCategoryIds(provData.providerCategories.map(pc => pc.categoryId));
      }
    } catch { toast.error('Failed to load provider'); }
    finally { setLoading(false); }
  };

  const fetchCategories = async () => {
    try {
      const res = await apiInstance.get('/categories');
      setCategories(res.data?.body?.list || []);
    } catch { toast.error('Failed to load categories'); }
  };

  useEffect(() => { 
    fetchProvider(); 
    fetchCategories();
  }, [id]);

  const handleCategoryToggle = (catId) => {
    setSelectedCategoryIds(prev => 
      prev.includes(catId) ? prev.filter(cat => cat !== catId) : [...prev, catId]
    );
  };

  const handleSaveCategories = async () => {
    setUpdating(true);
    try {
      await apiInstance.put(`/providers/${id}/categories`, { categoryIds: selectedCategoryIds });
      toast.success('Categories updated successfully');
      fetchProvider();
    } catch {
      toast.error('Failed to update categories');
    } finally {
      setUpdating(false);
    }
  };

  const handleProfilePhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const fd = new FormData();
    fd.append('profileImage', file);
    try {
      await apiInstance.put(`/providers/${id}/avatar`, fd);
      toast.success('Profile photo updated');
      fetchProvider();
    } catch {
      toast.error('Failed to upload image');
    }
  };

  const handleStatusUpdate = async (status) => {
    setUpdating(true);
    try {
      await apiInstance.put('/updateProviderStatus', { providerId: id, status, remarks });
      toast.success(`Provider ${status} successfully`);
      fetchProvider();
    } catch { toast.error('Failed to update status'); }
    finally { setUpdating(false); }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
      <div className="spinner-border" style={{ color: '#3b82f6' }} />
    </div>
  );

  if (!provider) return <div>Provider not found</div>;

  return (
    <div>
      <ToastContainer position="top-right" autoClose={2500} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            background: headerBlueGradient,
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            padding: '9px 18px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <i className="material-icons" style={{ fontSize: '18px', verticalAlign: 'middle' }}>arrow_back</i>
          Back
        </button>
        <h5 style={{ margin: 0, fontWeight: '700', color: '#111827' }}>Provider Details</h5>
      </div>

      <div className="row">
        <div className="col-lg-4 mb-4">
          {/* Profile Card */}
          <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden', marginBottom: '16px' }}>
            <div style={{ background: headerBlueGradient, padding: '30px 20px', textAlign: 'center' }}>
              <img
                src={provider.profileImage ? `${imageBaseUrl}${provider.profileImage}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(provider.name || 'P')}&background=fff&color=3b82f6&size=100`}
                alt={provider.name}
                style={{ width: '80px', height: '80px', borderRadius: '50%', border: '3px solid #fff', objectFit: 'cover', cursor: 'zoom-in' }}
                onClick={() => {
                  const src = provider.profileImage ? `${imageBaseUrl}${provider.profileImage}` : `https://ui-avatars.com/api/?name=${encodeURIComponent(provider.name || 'P')}&background=fff&color=3b82f6&size=100`;
                  setPreviewImage(src);
                  setPreviewTitle(provider.name);
                }}
              />
              <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleProfilePhoto} />
              <div style={{ marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.45)',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Change profile photo
                </button>
              </div>
              <h5 style={{ margin: '12px 0 4px', color: '#fff', fontWeight: '700' }}>{provider.name}</h5>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.8)', fontSize: '13px' }}>{provider.email}</p>
              <div style={{ marginTop: '12px' }}><StatusBadge status={provider.providerStatus} /></div>
            </div>
            <div style={{ padding: '16px 20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                {[
                  { label: 'Completed Jobs', value: provider.completedJobs || 0, icon: 'check_circle', color: '#10b981' },
                  { label: 'Total Earnings', value: formatCurrency(provider.totalEarning), icon: 'payments', color: '#ff4d6d' },
                  { label: 'Wallet', value: formatCurrency(provider.walletAmount), icon: 'account_balance_wallet', color: '#f97316' },
                  { label: 'Withdrawn', value: formatCurrency(provider.withdrawnAmount), icon: 'trending_up', color: '#3b82f6' },
                ].map(s => (
                  <div key={s.label} style={{ background: '#f9fafb', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                    <i className="material-icons" style={{ color: s.color, fontSize: '22px' }}>{s.icon}</i>
                    <div style={{ fontWeight: '700', fontSize: '16px', color: '#111827' }}>{s.value}</div>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Status Actions */}
              {provider.providerStatus === 'pending' && (
                <div>
                  <div style={{ marginBottom: '8px' }}>
                    <textarea
                      value={remarks}
                      onChange={e => setRemarks(e.target.value)}
                      placeholder="Remarks (optional)"
                      rows={2}
                      style={{ width: '100%', padding: '8px', border: '1px solid #e5e7eb', borderRadius: '8px', fontSize: '13px', resize: 'none', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => handleStatusUpdate('approved')}
                      disabled={updating}
                      style={{ flex: 1, background: '#dcfce7', color: '#16a34a', border: 'none', borderRadius: '8px', padding: '9px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                    >
                      <i className="material-icons" style={{ fontSize: '16px', verticalAlign: 'middle' }}>check_circle</i> Approve
                    </button>
                    <button
                      onClick={() => handleStatusUpdate('rejected')}
                      disabled={updating}
                      style={{ flex: 1, background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '8px', padding: '9px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
                    >
                      <i className="material-icons" style={{ fontSize: '16px', verticalAlign: 'middle' }}>cancel</i> Reject
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-8">
          {/* Details */}
          <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: '20px', marginBottom: '16px' }}>
            <h6 style={{ fontWeight: '700', color: '#111827', marginBottom: '12px' }}>Provider Information</h6>
            <InfoRow label="Phone" value={provider.phone} />
            <InfoRow label="Country Code" value={provider.countryCode} />
            <InfoRow label="Address" value={provider.address} />
            <InfoRow label="Account Status" value={<StatusBadge status={provider.status} />} />
            <InfoRow label="Provider Status" value={<StatusBadge status={provider.providerStatus} />} />
            <InfoRow label="Hourly Price" value={formatCurrency(provider.hourly_price)} />
            <InfoRow label="Wallet Balance" value={formatCurrency(provider.walletAmount)} />
            <InfoRow label="Total Earnings" value={formatCurrency(provider.totalEarning)} />
            <InfoRow label="Joined" value={formatDate(provider.createdAt)} />
          </div>

          {/* Service Profile & Categories */}
          <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: '20px', marginBottom: '16px' }}>
            <h6 style={{ fontWeight: '700', color: '#111827', marginBottom: '12px' }}>Service Categories</h6>
            <div style={{ marginBottom: '16px' }}>
              <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '12px' }}>Select categories for this provider:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {categories.map(cat => (
                  <label key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: selectedCategoryIds.includes(cat.id) ? '#eff6ff' : '#f3f4f6', color: selectedCategoryIds.includes(cat.id) ? '#2563eb' : '#374151', padding: '6px 12px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px', border: selectedCategoryIds.includes(cat.id) ? '1px solid #bfdbfe' : '1px solid transparent', transition: 'all 0.2s' }}>
                    <input 
                      type="checkbox" 
                      style={{ cursor: 'pointer' }}
                      checked={selectedCategoryIds.includes(cat.id)}
                      onChange={() => handleCategoryToggle(cat.id)}
                    />
                    {cat.categoryName}
                  </label>
                ))}
              </div>
              <button
                type="button"
                onClick={handleSaveCategories}
                disabled={updating}
                style={{
                  marginTop: '16px',
                  background: 'linear-gradient(90deg,#3b82f6,#60a5fa)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {updating ? 'Saving...' : 'Update Categories'}
              </button>
            </div>
          </div>

          {/* Portfolio Images */}
          <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: '20px', marginBottom: '16px' }}>
            <h6 style={{ fontWeight: '700', color: '#111827', marginBottom: '12px' }}>Portfolio Images</h6>
            {!provider.portfolio_images?.length ? (
              <p style={{ color: '#6b7280', fontSize: '14px', margin: '0' }}>No portfolio images available.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px' }}>
                {provider.portfolio_images.map((img) => (
                  <img
                    key={img.id}
                    src={img.image_url?.startsWith('http') ? img.image_url : `${imageBaseUrl}${img.image_url}`}
                    alt="Portfolio"
                    style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: '8px', cursor: 'zoom-in', border: '1px solid #e5e7eb' }}
                    onClick={() => {
                      setPreviewImage(img.image_url?.startsWith('http') ? img.image_url : `${imageBaseUrl}${img.image_url}`);
                      setPreviewTitle("Portfolio Image");
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Verifications */}
          <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <h6 style={{ fontWeight: '700', color: '#111827', margin: 0 }}>KYC Documents</h6>
              <button
                type="button"
                onClick={() => navigate(`/providers/${id}/verification`)}
                style={{
                  background: 'linear-gradient(90deg,#3b82f6,#60a5fa)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '8px 14px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <i className="material-icons" style={{ fontSize: '18px' }}>verified_user</i>
                Verification page
              </button>
            </div>
            {!provider.verifications?.length && (
              <p style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 8px' }}>No verification documents uploaded yet.</p>
            )}
            {provider.verifications?.map(v => (
                <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <i className="material-icons" style={{ color: '#f97316', fontSize: '24px' }}>description</i>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '500', color: '#111827', fontSize: '14px' }}>{v.documentType}</div>
                    <div style={{ color: '#9ca3af', fontSize: '12px' }}>{formatDate(v.createdAt)}</div>
                  </div>
                  <StatusBadge status={v.verificationStatus} />
                  {v.documentImage && (
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewImage(`${imageBaseUrl}${v.documentImage}`);
                        setPreviewTitle(v.documentType);
                      }}
                      style={{ background: '#f3f4f6', border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '12px', color: '#374151' }}
                    >
                      View Doc
                    </button>
                  )}
                </div>
            ))}
          </div>
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

export default ProviderDetail;
