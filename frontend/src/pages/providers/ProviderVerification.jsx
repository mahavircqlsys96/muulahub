import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import apiInstance from '../../utils/apiInstance';
import { StatusBadge, formatDate, ImageModal } from '../../components/common/PageTable';
import { imageBaseUrl } from '../../services/api';

const backBtnStyle = {
  background: 'linear-gradient(90deg,#3b82f6,#60a5fa)',
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
};

const ProviderVerification = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
   const [remarks, setRemarks] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  const [previewTitle, setPreviewTitle] = useState('');

  const load = async () => {
    try {
      const res = await apiInstance.get(`/providers/${id}`);
      setProvider(res.data?.body);
    } catch {
      toast.error('Failed to load provider');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    load();
  }, [id]);

  const handleStatusUpdate = async (status) => {
    setUpdating(true);
    try {
      await apiInstance.put('/updateProviderStatus', { providerId: id, status, remarks });
      toast.success(`Provider ${status} successfully`);
      await load();
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
        <div className="spinner-border" style={{ color: '#f97316' }} />
      </div>
    );
  }

  if (!provider) {
    return <div style={{ padding: '24px' }}>Provider not found</div>;
  }

  const verifications = provider.verifications || [];

  return (
    <div style={{ color: '#111827' }}>
      <ToastContainer position="top-right" autoClose={2500} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button type="button" onClick={() => navigate(`/providers/${id}`)} style={backBtnStyle}>
          <i className="material-icons" style={{ fontSize: '18px' }}>arrow_back</i>
          Back
        </button>
        <h5 style={{ margin: 0, fontWeight: '700', color: '#111827' }}>Provider verification</h5>
        <span style={{ color: '#6b7280', fontSize: '14px' }}>{provider.name}</span>
      </div>

      {provider.providerStatus === 'pending' && (
        <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: '20px', marginBottom: '20px' }}>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Remarks (optional)"
            rows={2}
            style={{ width: '100%', maxWidth: '560px', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: '10px', marginTop: '12px', flexWrap: 'wrap' }}>
            <button type="button" disabled={updating} onClick={() => handleStatusUpdate('approved')} style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: '#dcfce7', color: '#16a34a', fontWeight: '600', cursor: 'pointer' }}>
              Approve provider
            </button>
            <button type="button" disabled={updating} onClick={() => handleStatusUpdate('rejected')} style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', background: '#fee2e2', color: '#dc2626', fontWeight: '600', cursor: 'pointer' }}>
              Reject provider
            </button>
          </div>
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: '20px' }}>
        <h6 style={{ fontWeight: '700', color: '#111827', marginBottom: '16px' }}>KYC documents</h6>
        {!verifications.length && (
          <p style={{ color: '#6b7280', margin: 0 }}>No verification documents uploaded.</p>
        )}
        {verifications.map((v) => (
          <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 0', borderBottom: '1px solid #f3f4f6' }}>
            <i className="material-icons" style={{ color: '#f97316', fontSize: '26px' }}>description</i>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '600', fontSize: '15px' }}>{v.documentType}</div>
              <div style={{ color: '#9ca3af', fontSize: '13px' }}>{formatDate(v.createdAt)}</div>
            </div>
            <StatusBadge status={v.verificationStatus} />
            {v.documentImage && (
              <button
                type="button"
                onClick={() => {
                  setPreviewImage(`${imageBaseUrl}${v.documentImage}`);
                  setPreviewTitle(v.documentType);
                }}
                style={{ background: '#f3f4f6', border: 'none', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '13px', color: '#374151' }}
              >
                View document
              </button>
            )}
          </div>
        ))}
      </div>
      <ImageModal
        src={previewImage}
        alt={previewTitle}
        onClose={() => setPreviewImage(null)}
      />
    </div>
  );
};

export default ProviderVerification;
