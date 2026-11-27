import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import apiInstance from '../../utils/apiInstance';
import { PageHeader, StatusBadge, formatDate } from '../../components/common/PageTable';
import { usePermissions } from '../../utils/permissions';
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

const ReportDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = usePermissions();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [status, setStatus] = useState('pending');
  const [adminRemarks, setAdminRemarks] = useState('');

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiInstance.get(`/reports/${id}`);
      if (res.data?.success && res.data?.body) {
        const data = res.data.body;
        setReport(data);
        setStatus(data.status || 'pending');
        setAdminRemarks(data.adminRemarks || '');
      } else {
        toast.error('Failed to load report details');
      }
    } catch (err) {
      console.error(err);
      toast.error('Report not found or error loading details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleUpdate = async (newStatus) => {
    const statusToSave = newStatus || status;
    setUpdating(true);
    try {
      await apiInstance.put(`/reports/${id}`, {
        status: statusToSave,
        adminRemarks: adminRemarks
      });
      toast.success('Report updated successfully');
      setStatus(statusToSave);
      fetchDetail();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update report');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
        <i className="material-icons" style={{ fontSize: '36px', animation: 'spin 1s linear infinite' }}>autorenew</i>
        <p style={{ marginTop: '12px', fontSize: '14px' }}>Loading report details...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div style={{ padding: '32px' }}>
        <div style={cardStyle}>
          <h5>Report Not Found</h5>
          <button onClick={() => navigate('/reports')} className="btn btn-primary mt-3">
            Back to Reports
          </button>
        </div>
      </div>
    );
  }

  const reporter = report.reporter || {};
  const target = report.targetDetails || {};

  return (
    <div>
      <ToastContainer position="top-right" autoClose={2500} />

      {/* Top Header & Breadcrumb */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => navigate('/reports')}
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
            style={{ borderRadius: '8px', padding: '7px 14px', background: '#fff' }}
          >
            <i className="material-icons" style={{ fontSize: '18px' }}>arrow_back</i>
            Back to Reports
          </button>
          <div>
            <h4 style={{ margin: 0, fontWeight: '700', color: '#0f172a' }}>
              Report #{report.id}
            </h4>
            <div style={{ fontSize: '12px', color: '#64748b' }}>
              Submitted on {formatDate(report.createdAt)}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <StatusBadge status={report.status} />
          {can('reports', 'edit') && (
            <>
              {report.status !== 'resolved' && (
                <button
                  type="button"
                  onClick={() => handleUpdate('resolved')}
                  disabled={updating}
                  className="btn btn-sm btn-success d-flex align-items-center gap-1"
                  style={{ borderRadius: '8px', padding: '8px 16px', fontWeight: '600' }}
                >
                  <i className="material-icons" style={{ fontSize: '16px' }}>check_circle</i>
                  Mark Resolved
                </button>
              )}
              {report.status !== 'rejected' && (
                <button
                  type="button"
                  onClick={() => handleUpdate('rejected')}
                  disabled={updating}
                  className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1"
                  style={{ borderRadius: '8px', padding: '8px 16px', fontWeight: '600' }}
                >
                  <i className="material-icons" style={{ fontSize: '16px' }}>cancel</i>
                  Reject Report
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="row">
        {/* Left Column: Complaint Details & Reported Entity */}
        <div className="col-lg-8">
          {/* Reason / Complaint Card */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <i className="material-icons" style={{ fontSize: '22px', color: '#ef4444' }}>report_problem</i>
              <h6 style={{ margin: 0, fontWeight: '700', color: '#111827' }}>Report Summary & Violation Reason</h6>
            </div>

            <div style={{
              background: '#fef2f2',
              border: '1px solid #fee2e2',
              borderRadius: '12px',
              padding: '16px 20px',
              color: '#991b1b',
              fontSize: '14px',
              lineHeight: '1.6',
              marginBottom: '20px'
            }}>
              <strong>Complaint Reason:</strong>
              <div style={{ marginTop: '6px', fontSize: '14px', color: '#1f2937' }}>
                {report.reason || 'No specific explanation provided.'}
              </div>
            </div>

            <InfoRow label="Report ID" value={`#${report.id}`} />
            <InfoRow label="Target Type" value={<span style={{ textTransform: 'uppercase', fontWeight: '700', color: '#6366f1' }}>{report.reportType}</span>} />
            <InfoRow label="Reference ID" value={`#${report.referenceId}`} />
            <InfoRow label="Reported On" value={formatDate(report.createdAt)} />
            <InfoRow label="Current Status" value={<StatusBadge status={report.status} />} />
          </div>

          {/* Reported Entity Card */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="material-icons" style={{ fontSize: '22px', color: '#6366f1' }}>
                  {report.reportType === 'user' ? 'person' : report.reportType === 'post' ? 'image' : 'event_available'}
                </i>
                <h6 style={{ margin: 0, fontWeight: '700', color: '#111827' }}>
                  Reported {report.reportType?.toUpperCase()} Details
                </h6>
              </div>

              {report.reportType === 'user' && target?.id && (
                <Link to={`/usersView/${target.id}`} className="btn btn-xs btn-outline-primary" style={{ borderRadius: '6px' }}>
                  View Full Profile
                </Link>
              )}
              {report.reportType === 'post' && target?.id && (
                <Link to={`/posts/${target.id}`} className="btn btn-xs btn-outline-primary" style={{ borderRadius: '6px' }}>
                  View Full Post
                </Link>
              )}
              {(report.reportType === 'job' || report.reportType === 'booking') && target?.id && (
                <Link to={`/bookings/${target.id}`} className="btn btn-xs btn-outline-primary" style={{ borderRadius: '6px' }}>
                  View Booking
                </Link>
              )}
            </div>

            {/* If Reported is a User */}
            {report.reportType === 'user' && (
              target?.id ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px 0 20px 0', borderBottom: '1px solid #f3f4f6' }}>
                    <div style={{
                      width: '60px', height: '60px', borderRadius: '50%',
                      background: '#ede9fe', color: '#6d28d9',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: '700', fontSize: '20px', overflow: 'hidden'
                    }}>
                      {target.profileImage ? (
                        <img
                          src={target.profileImage.startsWith('http') ? target.profileImage : `${imageBaseUrl}${target.profileImage}`}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        (target.name || 'U').charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '16px', color: '#111827' }}>{target.name}</div>
                      <div style={{ color: '#6b7280', fontSize: '13px' }}>{target.email}</div>
                      <div style={{ color: '#9ca3af', fontSize: '12px' }}>Role: <span style={{ textTransform: 'capitalize' }}>{target.role}</span> | Status: <span style={{ textTransform: 'capitalize' }}>{target.status}</span></div>
                    </div>
                  </div>
                  <InfoRow label="User ID" value={`#${target.id}`} />
                  <InfoRow label="Phone Number" value={target.phone} />
                  <InfoRow label="Account Created" value={formatDate(target.createdAt)} />
                </div>
              ) : (
                <div style={{ color: '#9ca3af', fontSize: '13px', padding: '16px 0' }}>
                  Target user #{report.referenceId} details could not be found or has been removed.
                </div>
              )
            )}

            {/* If Reported is a Post */}
            {report.reportType === 'post' && (
              target?.id ? (
                <div>
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '6px' }}>Post Caption:</div>
                    <div style={{ fontSize: '14px', color: '#111827', background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                      {target.caption || 'No caption'}
                    </div>
                  </div>
                  {target.hashtags && (
                    <InfoRow label="Hashtags" value={<span style={{ color: '#6366f1' }}>{target.hashtags}</span>} />
                  )}
                  {target.user && (
                    <InfoRow label="Post Author" value={
                      <Link to={`/usersView/${target.user.id}`} style={{ color: '#6366f1', textDecoration: 'none', fontWeight: '600' }}>
                        {target.user.name} ({target.user.email})
                      </Link>
                    } />
                  )}
                  <InfoRow label="Post Status" value={target.status} />
                  <InfoRow label="Posted On" value={formatDate(target.createdAt)} />

                  {/* Post Media Gallery */}
                  {Array.isArray(target.media) && target.media.length > 0 && (
                    <div style={{ marginTop: '16px' }}>
                      <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>Attached Media:</div>
                      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        {target.media.map((m, idx) => {
                          const src = m.media || m.url || m.image;
                          const fullUrl = src && src.startsWith('http') ? src : `${imageBaseUrl}${src}`;
                          return (
                            <div key={idx} style={{ width: '100px', height: '100px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                              <img src={fullUrl} alt="media" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ color: '#9ca3af', fontSize: '13px', padding: '16px 0' }}>
                  Target post #{report.referenceId} details could not be found or has been removed.
                </div>
              )
            )}

            {/* If Reported is a Job / Booking */}
            {(report.reportType === 'job' || report.reportType === 'booking') && (
              target?.id ? (
                <div>
                  <InfoRow label="Booking Number" value={<strong>#{target.bookingNumber || target.id}</strong>} />
                  <InfoRow label="Booking Status" value={<StatusBadge status={target.bookingStatus} />} />
                  <InfoRow label="Booking Amount" value={`$${target.amount || 0}`} />
                  <InfoRow label="Customer" value={target.user ? `${target.user.name} (${target.user.email})` : '—'} />
                  <InfoRow label="Provider" value={target.provider ? `${target.provider.name} (${target.provider.email})` : '—'} />
                </div>
              ) : (
                <div style={{ color: '#9ca3af', fontSize: '13px', padding: '16px 0' }}>
                  Target booking #{report.referenceId} details could not be found.
                </div>
              )
            )}
          </div>
        </div>

        {/* Right Column: Reporter Profile & Resolution Notes */}
        <div className="col-lg-4">
          {/* Reporter Profile */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <i className="material-icons" style={{ fontSize: '20px', color: '#6366f1' }}>person_outline</i>
              <h6 style={{ margin: 0, fontWeight: '700', color: '#111827' }}>Reporter Information</h6>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%',
                background: '#e0e7ff', color: '#4338ca',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: '700', fontSize: '18px'
              }}>
                {(reporter.name || 'R').charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '14px', color: '#111827' }}>{reporter.name || 'Anonymous / Unknown'}</div>
                <div style={{ color: '#6b7280', fontSize: '12px' }}>{reporter.email || 'No email'}</div>
                <div style={{ color: '#9ca3af', fontSize: '11px', textTransform: 'capitalize' }}>Role: {reporter.role || 'User'}</div>
              </div>
            </div>

            <InfoRow label="Phone" value={reporter.phone || '—'} />
            <InfoRow label="User ID" value={reporter.id ? `#${reporter.id}` : '—'} />

            {reporter.id && (
              <div style={{ marginTop: '16px' }}>
                <Link to={`/usersView/${reporter.id}`} className="btn btn-sm btn-outline-primary w-100" style={{ borderRadius: '8px' }}>
                  View Reporter Profile
                </Link>
              </div>
            )}
          </div>

          {/* Admin Resolution & Remarks */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <i className="material-icons" style={{ fontSize: '20px', color: '#10b981' }}>edit_note</i>
              <h6 style={{ margin: 0, fontWeight: '700', color: '#111827' }}>Admin Resolution & Remarks</h6>
            </div>

            <div className="mb-3">
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px', display: 'block' }}>
                Update Status
              </label>
              <select
                className="form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{ borderRadius: '8px', padding: '10px 14px', fontSize: '14px' }}
              >
                <option value="pending">Pending</option>
                <option value="resolved">Resolved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div className="mb-3">
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px', display: 'block' }}>
                Admin Notes / Remarks
              </label>
              <textarea
                className="form-control"
                rows="4"
                placeholder="Enter actions taken, notes or conclusion regarding this report..."
                value={adminRemarks}
                onChange={(e) => setAdminRemarks(e.target.value)}
                style={{ borderRadius: '8px', padding: '10px 14px', fontSize: '14px' }}
              />
            </div>

            {can('reports', 'edit') && (
              <button
                type="button"
                onClick={() => handleUpdate()}
                disabled={updating}
                className="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-1"
                style={{
                  borderRadius: '8px',
                  padding: '10px 16px',
                  fontWeight: '600',
                  background: 'linear-gradient(135deg, #f91942 0%, #6366f1 100%)',
                  border: 'none'
                }}
              >
                <i className="material-icons" style={{ fontSize: '18px' }}>save</i>
                {updating ? 'Saving...' : 'Save Resolution'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportDetailPage;
