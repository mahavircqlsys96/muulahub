import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import apiInstance from '../../utils/apiInstance';
import { imageBaseUrl } from '../../services/api';
import { StatusBadge, formatDate, formatCurrency, getCurrencySymbol, ImageModal } from '../../components/common/PageTable';

const InfoRow = ({ label, value }) => (
  <div style={{ display: 'flex', padding: '12px 0', borderBottom: '1px solid #f3f4f6', alignItems: 'center' }}>
    <div style={{ width: '160px', color: '#6b7280', fontSize: '13px', flexShrink: 0 }}>{label}</div>
    <div style={{ flex: 1, color: '#111827', fontSize: '14px', fontWeight: '500' }}>{value || '—'}</div>
  </div>
);

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

const cardStyle = {
  background: '#fff',
  borderRadius: '16px',
  padding: '20px',
  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  marginBottom: '20px'
};

const BookingDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState(null);

  const fetchBooking = async () => {
    try {
      const res = await apiInstance.get(`/bookings/${id}`);
      setBooking(res.data?.body);
    } catch {
      toast.error('Failed to load booking');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBooking(); }, [id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
        <div className="spinner-border" style={{ color: '#f97316' }} />
      </div>
    );
  }

  if (!booking) return <div style={{ padding: '24px' }}>Booking not found</div>;

  const displayStatus = booking.displayStatus || (
    booking.bookingStatus === 'active' || booking.bookingStatus === 'ongoing'
      ? 'ongoing'
      : (booking.counterPrice && parseFloat(booking.counterPrice) > 0 && booking.counterStatus === 'pending'
          ? 'Quote sent by host'
          : booking.bookingStatus)
  );
  const hasQuote = Boolean(booking.counterPrice && parseFloat(booking.counterPrice) > 0);

  return (
    <div>
      <ToastContainer position="top-right" autoClose={2500} />
      {previewImage && (
        <ImageModal
          src={previewImage}
          alt="Booking Image Preview"
          onClose={() => setPreviewImage(null)}
        />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button type="button" onClick={() => navigate('/bookings')} style={backBtnStyle}>
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
        <h5 style={{ margin: 0, fontWeight: '700' }}>Booking #{booking.bookingNumber}</h5>
        <StatusBadge status={displayStatus} />
        {booking.paymentStatus && <StatusBadge status={booking.paymentStatus} />}
      </div>

      <div className="row">
        {/* Left Column */}
        <div className="col-lg-8">
          {/* Booking Info Card */}
          <div style={cardStyle}>
            <h6 style={{ fontWeight: '700', marginBottom: '14px', fontSize: '16px', color: '#111827' }}>
              Booking Details
            </h6>

            <InfoRow label="Booking Number" value={`#${booking.bookingNumber}`} />

            <InfoRow
              label="Category"
              value={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {booking.category?.image && (
                    <img
                      src={`${imageBaseUrl}${booking.category.image}`}
                      alt=""
                      style={{ width: '28px', height: '28px', borderRadius: '6px', objectFit: 'cover' }}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  )}
                  <span>{booking.category?.categoryName || booking.categoryName || '—'}</span>
                </div>
              }
            />

            <InfoRow
              label="Service"
              value={booking.service?.title || booking.serviceTitle || booking.category?.categoryName || '—'}
            />

            {booking.service?.description && (
              <InfoRow label="Service Description" value={booking.service.description} />
            )}

            <InfoRow label="Booking Date" value={formatDate(booking.bookingDate)} />
            <InfoRow label="Booking Time" value={booking.bookingTime || '—'} />
            <InfoRow label="Amount" value={formatCurrency(booking.amount, booking.currency)} />
            <InfoRow label="Type" value={booking.bookingType === 2 ? 'Off-site' : 'On-site'} />
            
            <InfoRow
              label="Location"
              value={
                booking.location ? (
                  <div>
                    <div>{booking.location}</div>
                    {booking.latitude && booking.longitude && (
                      <a
                        href={`https://www.google.com/maps?q=${booking.latitude},${booking.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: '12px', color: '#3b82f6', textDecoration: 'underline' }}
                      >
                        View on Map ({Number(booking.latitude).toFixed(4)}, {Number(booking.longitude).toFixed(4)})
                      </a>
                    )}
                  </div>
                ) : (
                  '—'
                )
              }
            />

            <InfoRow label="Notes / Comment" value={booking.comment || booking.notes || '—'} />
            <InfoRow label="Booking Status" value={<StatusBadge status={displayStatus} />} />
            <InfoRow label="Payment Status" value={<StatusBadge status={booking.paymentStatus} />} />
            <InfoRow label="Created On" value={formatDate(booking.createdAt)} />
          </div>

          {/* Quote / Counter Offer Card (if host sent counter quote) */}
          {hasQuote && (
            <div style={{ ...cardStyle, borderLeft: '4px solid #7c3aed' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h6 style={{ fontWeight: '700', margin: 0, fontSize: '16px', color: '#111827' }}>
                  Host Quote / Counter Offer
                </h6>
                <StatusBadge
                  status={
                    booking.counterStatus === 'pending'
                      ? 'Quote sent by host'
                      : booking.counterStatus === 'accepted'
                      ? 'Quote accepted'
                      : booking.counterStatus === 'rejected'
                      ? 'Quote rejected'
                      : booking.counterStatus || 'Quote sent by host'
                  }
                />
              </div>

              {booking.counterPrice !== undefined && booking.counterPrice !== null && (
                <InfoRow label="Quote Price" value={formatCurrency(booking.counterPrice, booking.currency)} />
              )}
              {booking.counterDate && (
                <InfoRow label="Quote Date" value={formatDate(booking.counterDate)} />
              )}
              {booking.counterTime && (
                <InfoRow label="Quote Time" value={booking.counterTime} />
              )}
            </div>
          )}

          {/* Booking Photos / Images */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h6 style={{ fontWeight: '700', margin: 0, fontSize: '16px', color: '#111827' }}>
                Booking Photos
              </h6>
              {booking.bookingImages && booking.bookingImages.length > 0 && (
                <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>
                  {booking.bookingImages.length} photo{booking.bookingImages.length > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {booking.bookingImages && booking.bookingImages.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {booking.bookingImages.map((imgObj, idx) => {
                  const src = imgObj.image?.startsWith('http')
                    ? imgObj.image
                    : `${imageBaseUrl}${imgObj.image}`;
                  return (
                    <div
                      key={imgObj.id || idx}
                      style={{
                        position: 'relative',
                        width: '100px',
                        height: '100px',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                        cursor: 'pointer'
                      }}
                      onClick={() => setPreviewImage(src)}
                    >
                      <img
                        src={src}
                        alt={`Booking photo ${idx + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => { e.target.src = 'https://placehold.co/100x100?text=No+Image'; }}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ color: '#9ca3af', fontSize: '13px', padding: '10px 0' }}>
                No photos attached to this booking
              </div>
            )}
          </div>

          {/* Rating & Review Card */}
          <div style={cardStyle}>
            <h6 style={{ fontWeight: '700', marginBottom: '14px', fontSize: '16px', color: '#111827' }}>
              Rating & Review
            </h6>

            {booking.rating ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#f59e0b' }}>
                    {'★'.repeat(Math.round(booking.rating.rating || 0))}
                    {'☆'.repeat(5 - Math.round(booking.rating.rating || 0))}
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                    {booking.rating.rating} / 5
                  </span>
                </div>

                <div style={{ fontSize: '14px', color: '#374151', fontStyle: 'italic', marginBottom: '12px', background: '#f9fafb', padding: '12px', borderRadius: '8px' }}>
                  "{booking.rating.review || 'No written review'}"
                </div>

                {booking.rating.image && (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>Review Photo:</div>
                    <img
                      src={booking.rating.image?.startsWith('http') ? booking.rating.image : `${imageBaseUrl}${booking.rating.image}`}
                      alt="Review"
                      style={{ width: '80px', height: '80px', borderRadius: '8px', objectFit: 'cover', cursor: 'pointer' }}
                      onClick={() => setPreviewImage(booking.rating.image?.startsWith('http') ? booking.rating.image : `${imageBaseUrl}${booking.rating.image}`)}
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: '#9ca3af', fontSize: '13px', padding: '10px 0' }}>
                No rating or review submitted yet
              </div>
            )}
          </div>

          {/* Payment Card */}
          {booking.payment && (
            <div style={cardStyle}>
              <h6 style={{ fontWeight: '700', marginBottom: '12px', fontSize: '16px', color: '#111827' }}>Payment Details</h6>
              <InfoRow label="Transaction ID" value={booking.payment.transactionId} />
              <InfoRow label="Method" value={booking.payment.paymentMethod} />
              <InfoRow label="Total Amount" value={formatCurrency(booking.payment.amount, booking.currency)} />
              <InfoRow label="Admin Commission" value={formatCurrency(booking.payment.adminCommission, booking.currency)} />
              <InfoRow label="Provider Amount" value={formatCurrency(booking.payment.providerAmount, booking.currency)} />
              <InfoRow label="Status" value={<StatusBadge status={booking.payment.paymentStatus} />} />
            </div>
          )}
        </div>

        {/* Right Column (Customer & Provider) */}
        <div className="col-lg-4">
          {/* Customer Card */}
          <div style={cardStyle}>
            <h6 style={{ fontWeight: '700', marginBottom: '16px', fontSize: '16px', color: '#111827' }}>Customer</h6>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <img
                src={
                  booking.user?.profileImage
                    ? `${imageBaseUrl}${booking.user.profileImage}`
                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(booking.user?.name || 'U')}&background=3b82f6&color=fff`
                }
                alt={booking.user?.name || ''}
                style={{ width: '48px', height: '48px', borderRadius: '12px', objectFit: 'cover', cursor: 'pointer' }}
                onClick={() => setPreviewImage(booking.user?.profileImage ? `${imageBaseUrl}${booking.user.profileImage}` : null)}
              />
              <div>
                <div style={{ fontWeight: '600', color: '#111827', fontSize: '14px' }}>{booking.user?.name || '—'}</div>
                <div style={{ color: '#9ca3af', fontSize: '12px' }}>{booking.user?.email || '—'}</div>
              </div>
            </div>
            <InfoRow label="Phone" value={booking.user?.phone ? `${booking.user?.countryCode ? booking.user.countryCode + ' ' : ''}${booking.user.phone}` : '—'} />
            <InfoRow label="Currency" value={booking.user?.currency ? `${booking.user.currency.toUpperCase()} (${getCurrencySymbol(booking.user.currency)})` : '—'} />
          </div>

          {/* Provider / Host Card */}
          <div style={cardStyle}>
            <h6 style={{ fontWeight: '700', marginBottom: '16px', fontSize: '16px', color: '#111827' }}>Provider / Host</h6>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <img
                src={
                  booking.provider?.profileImage
                    ? `${imageBaseUrl}${booking.provider.profileImage}`
                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(booking.provider?.name || 'P')}&background=f97316&color=fff`
                }
                alt={booking.provider?.name || ''}
                style={{ width: '48px', height: '48px', borderRadius: '12px', objectFit: 'cover', cursor: 'pointer' }}
                onClick={() => setPreviewImage(booking.provider?.profileImage ? `${imageBaseUrl}${booking.provider.profileImage}` : null)}
              />
              <div>
                <div style={{ fontWeight: '600', color: '#111827', fontSize: '14px' }}>{booking.provider?.name || '—'}</div>
                <div style={{ color: '#9ca3af', fontSize: '12px' }}>{booking.provider?.email || '—'}</div>
              </div>
            </div>
            <InfoRow label="Phone" value={booking.provider?.phone ? `${booking.provider?.countryCode ? booking.provider.countryCode + ' ' : ''}${booking.provider.phone}` : '—'} />
            <InfoRow label="Currency" value={booking.provider?.currency ? `${booking.provider.currency.toUpperCase()} (${getCurrencySymbol(booking.provider.currency)})` : '—'} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingDetailPage;
