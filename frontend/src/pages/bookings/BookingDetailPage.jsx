import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import apiInstance from '../../utils/apiInstance';
import { StatusBadge, formatDate, formatCurrency } from '../../components/common/PageTable';

const InfoRow = ({ label, value }) => (
  <div style={{ display: 'flex', padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
    <div style={{ width: '160px', color: '#6b7280', fontSize: '13px' }}>{label}</div>
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

const BookingDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

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

  const updateStatus = async (status) => {
    setUpdating(true);
    try {
      await apiInstance.put(`/bookings/${id}/status`, { status });
      toast.success(`Booking marked as ${status}`);
      fetchBooking();
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

  if (!booking) return <div>Booking not found</div>;

  return (
    <div>
      <ToastContainer position="top-right" autoClose={2500} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
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
        <StatusBadge status={booking.bookingStatus} />
      </div>

      <div className="row">
        <div className="col-lg-8 mb-4">
          <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <h6 style={{ fontWeight: '700', marginBottom: '12px' }}>Booking Details</h6>
            <InfoRow label="Booking Number" value={`#${booking.bookingNumber}`} />
            <InfoRow label="Service" value={booking.service?.title} />
            <InfoRow label="Date" value={formatDate(booking.bookingDate)} />
            <InfoRow label="Time" value={booking.bookingTime} />
            <InfoRow label="Amount" value={formatCurrency(booking.amount)} />
            <InfoRow label="Payment Status" value={<StatusBadge status={booking.paymentStatus} />} />
            <InfoRow label="Booking Status" value={<StatusBadge status={booking.bookingStatus} />} />
            <InfoRow label="Created" value={formatDate(booking.createdAt)} />
          </div>

          {booking.payment && (
            <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginTop: '16px' }}>
              <h6 style={{ fontWeight: '700', marginBottom: '12px' }}>Payment Details</h6>
              <InfoRow label="Transaction ID" value={booking.payment.transactionId} />
              <InfoRow label="Method" value={booking.payment.paymentMethod} />
              <InfoRow label="Total Amount" value={formatCurrency(booking.payment.amount)} />
              <InfoRow label="Admin Commission" value={formatCurrency(booking.payment.adminCommission)} />
              <InfoRow label="Provider Amount" value={formatCurrency(booking.payment.providerAmount)} />
              <InfoRow label="Status" value={<StatusBadge status={booking.payment.paymentStatus} />} />
            </div>
          )}
        </div>

        <div className="col-lg-4">
          <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: '16px' }}>
            <h6 style={{ fontWeight: '700', marginBottom: '12px' }}>Customer</h6>
            <InfoRow label="Name" value={booking.user?.name} />
            <InfoRow label="Email" value={booking.user?.email} />
            <InfoRow label="Phone" value={booking.user?.phone} />
          </div>

          <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: '16px' }}>
            <h6 style={{ fontWeight: '700', marginBottom: '12px' }}>Provider</h6>
            <InfoRow label="Name" value={booking.provider?.name} />
            <InfoRow label="Email" value={booking.provider?.email} />
            <InfoRow label="Phone" value={booking.provider?.phone} />
          </div>

          {booking.bookingStatus !== 'completed' && booking.bookingStatus !== 'cancelled' && (
            <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <h6 style={{ fontWeight: '700', marginBottom: '12px' }}>Update Status</h6>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {['accepted', 'completed', 'cancelled'].map(s => (
                  <button
                    key={s}
                    disabled={updating || booking.bookingStatus === s}
                    onClick={() => updateStatus(s)}
                    style={{
                      padding: '10px',
                      border: 'none',
                      borderRadius: '8px',
                      background: booking.bookingStatus === s ? '#f3f4f6' : 'linear-gradient(90deg,#f97316,#fb923c)',
                      color: booking.bookingStatus === s ? '#9ca3af' : '#fff',
                      fontWeight: '600',
                      cursor: booking.bookingStatus === s ? 'default' : 'pointer',
                      textTransform: 'capitalize'
                    }}
                  >
                    Mark as {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingDetailPage;
