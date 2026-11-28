import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import Swal from 'sweetalert2';

import {
  PageHeader,
  TableCard,
  formatDate
} from '../../components/common/PageTable';

import apiInstance from '../../utils/apiInstance';
import { imageBaseUrl } from '../../services/api';
import { usePermissions } from '../../utils/permissions';

const sectionTitleStyle = {
  margin: 0,
  fontSize: '17px',
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
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px'
};

const SupportTicketDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = usePermissions();

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchTicketDetail = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiInstance.get(`/ticketDetail/${id}`);
      setTicket(res.data?.body || null);
    } catch (err) {
      console.error(err);
      setError('Failed to load support ticket details.');
      toast.error(err?.response?.data?.message || 'Failed to load ticket details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) fetchTicketDetail();
  }, [id, fetchTicketDetail]);

  const handleUpdateStatus = async (newStatus) => {
    let remark = ticket?.adminRemark || '';

    if (newStatus === 'Rejected') {
      const { value: text, isConfirmed } = await Swal.fire({
        title: 'Reject Support Ticket',
        input: 'textarea',
        inputLabel: 'Rejection Reason (Required - visible to user)',
        inputPlaceholder: 'Please provide reason why this ticket cannot be resolved...',
        inputValue: ticket?.adminRemark || '',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#9ca3af',
        confirmButtonText: 'Confirm Reject',
        inputValidator: (value) => {
          if (!value || !value.trim()) {
            return 'A rejection reason is required.';
          }
        }
      });

      if (!isConfirmed) return;
      remark = text.trim();
    } else if (newStatus === 'Resolved') {
      const { value: text, isConfirmed } = await Swal.fire({
        title: 'Resolve Support Ticket',
        input: 'textarea',
        inputLabel: 'Resolution Notes / Remark (Optional)',
        inputPlaceholder: 'Add any remarks explaining how the issue was resolved...',
        inputValue: ticket?.adminRemark || '',
        showCancelButton: true,
        confirmButtonColor: '#16a34a',
        cancelButtonColor: '#9ca3af',
        confirmButtonText: 'Mark Resolved'
      });

      if (!isConfirmed) return;
      remark = text ? text.trim() : '';
    } else {
      // Pending
      const result = await Swal.fire({
        title: 'Move Ticket to Pending?',
        text: 'This will reset the ticket resolution status back to Pending.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#d97706',
        cancelButtonColor: '#9ca3af',
        confirmButtonText: 'Yes, Set Pending'
      });

      if (!result.isConfirmed) return;
    }

    try {
      setActionLoading(true);
      await apiInstance.post('/updateTicketStatus', {
        ticketId: ticket.id,
        status: newStatus,
        adminRemark: remark
      });

      toast.success(`Ticket marked as ${newStatus} successfully!`);
      fetchTicketDetail();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.message || 'Failed to update ticket status.');
    } finally {
      setActionLoading(false);
    }
  };

  const renderStatusBadge = (status) => {
    const isResolved = status === 'Resolved';
    const isRejected = status === 'Rejected';

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '5px 14px',
          borderRadius: '20px',
          fontSize: '13px',
          fontWeight: '700',
          background: isResolved ? '#dcfce7' : isRejected ? '#fee2e2' : '#fef3c7',
          color: isResolved ? '#15803d' : isRejected ? '#b91c1c' : '#b45309',
        }}
      >
        <i className="material-icons" style={{ fontSize: '16px' }}>
          {isResolved ? 'check_circle' : isRejected ? 'cancel' : 'hourglass_empty'}
        </i>
        {status || 'Pending'}
      </span>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center' }}>
        <div className="spinner-border text-primary" role="status" style={{ width: '40px', height: '40px' }} />
        <div style={{ marginTop: '12px', color: '#6b7280', fontSize: '14px' }}>Loading ticket details...</div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div style={{ padding: '30px' }}>
        <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '12px', padding: '20px', color: '#b91c1c' }}>
          <h4 style={{ margin: '0 0 8px' }}>Error</h4>
          <p style={{ margin: 0 }}>{error || 'Ticket could not be found.'}</p>
          <button type="button" onClick={() => navigate('/support-tickets')} style={{ ...backBtnStyle, marginTop: '16px' }}>
            Back to Tickets
          </button>
        </div>
      </div>
    );
  }

  const user = ticket.user || {};

  return (
    <div>
      <ToastContainer position="top-right" autoClose={2500} />

      <PageHeader
        title={`Support Ticket: ${ticket.ticketNumber}`}
        subtitle={`Submitted on ${formatDate(ticket.createdAt)}`}
        action={
          <button type="button" onClick={() => navigate('/support-tickets')} style={backBtnStyle}>
            <i className="material-icons" style={{ fontSize: '18px' }}>arrow_back</i>
            Back to Tickets
          </button>
        }
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(300px, 360px) 1fr',
          gap: '20px',
          alignItems: 'start'
        }}
      >
        {/* ── Left Column: User Information Card ── */}
        <TableCard>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="material-icons" style={{ color: '#3b82f6', fontSize: '20px' }}>person</i>
            <h3 style={sectionTitleStyle}>User Details</h3>
          </div>

          <div style={{ padding: '24px' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <img
                src={
                  user.profileImage
                    ? (user.profileImage.startsWith('http') ? user.profileImage : `${imageBaseUrl}${user.profileImage}`)
                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'U')}&background=3b82f6&color=fff`
                }
                alt={user.name || 'User'}
                style={{
                  width: '90px',
                  height: '90px',
                  borderRadius: '16px',
                  objectFit: 'cover',
                  border: '3px solid rgba(59,130,246,0.15)'
                }}
              />

              <h4 style={{ margin: '12px 0 2px', fontSize: '18px', fontWeight: '700', color: '#111827' }}>
                {user.name || '—'}
              </h4>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>
                {user.email || '—'}
              </div>

              {user.id && (
                <Link
                  to={`/usersView/${user.id}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginTop: '10px',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#2563eb',
                    textDecoration: 'none'
                  }}
                >
                  <i className="material-icons" style={{ fontSize: '15px' }}>open_in_new</i>
                  View User Profile
                </Link>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', borderTop: '1px solid #f3f4f6', paddingTop: '16px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: '600' }}>
                  User ID
                </div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#111827', marginTop: '2px' }}>
                  #{ticket.userId}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: '600' }}>
                  Phone Number
                </div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#111827', marginTop: '2px' }}>
                  {user.phone ? (
                    <span>
                      {user.countryCode ? `${user.countryCode} ` : ''}
                      {user.phone}
                    </span>
                  ) : (
                    '—'
                  )}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: '600' }}>
                  Account Status
                </div>
                <div style={{ marginTop: '2px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: '600',
                      background: user.status === 'active' ? '#dcfce7' : '#fee2e2',
                      color: user.status === 'active' ? '#16a34a' : '#dc2626'
                    }}
                  >
                    {user.status || 'Active'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </TableCard>

        {/* ── Right Column: Ticket Content & Resolution ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <TableCard>
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="material-icons" style={{ color: '#2563eb', fontSize: '22px' }}>
                  confirmation_number
                </i>
                <h3 style={sectionTitleStyle}>Ticket Information</h3>
              </div>

              <div>
                {renderStatusBadge(ticket.status)}
              </div>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase' }}>
                  Subject
                </div>
                <h2 style={{ margin: '6px 0 0', fontSize: '20px', fontWeight: '700', color: '#111827' }}>
                  {ticket.subject}
                </h2>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Description
                </div>
                <div
                  style={{
                    background: '#f9fafb',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '16px 20px',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    color: '#374151',
                    whiteSpace: 'pre-wrap',
                    minHeight: '120px'
                  }}
                >
                  {ticket.description}
                </div>
              </div>

              {/* Status Timestamps */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '14px',
                  padding: '14px 18px',
                  background: '#f9fafb',
                  borderRadius: '10px',
                  border: '1px solid #f3f4f6',
                  marginBottom: '20px'
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '600' }}>SUBMITTED AT</div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#111827', marginTop: '2px' }}>
                    {formatDate(ticket.createdAt)}
                  </div>
                </div>

                {ticket.resolvedAt && (
                  <div>
                    <div style={{ fontSize: '11px', color: '#15803d', fontWeight: '600' }}>RESOLVED AT</div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#15803d', marginTop: '2px' }}>
                      {formatDate(ticket.resolvedAt)}
                    </div>
                  </div>
                )}

                {ticket.rejectedAt && (
                  <div>
                    <div style={{ fontSize: '11px', color: '#b91c1c', fontWeight: '600' }}>REJECTED AT</div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#b91c1c', marginTop: '2px' }}>
                      {formatDate(ticket.rejectedAt)}
                    </div>
                  </div>
                )}
              </div>

              {/* Admin Remark / Response Banner */}
              {ticket.adminRemark && (
                <div
                  style={{
                    padding: '16px 20px',
                    borderRadius: '12px',
                    background: ticket.status === 'Resolved' ? '#f0fdf4' : ticket.status === 'Rejected' ? '#fef2f2' : '#f9fafb',
                    border: ticket.status === 'Resolved' ? '1px solid #bbf7d0' : ticket.status === 'Rejected' ? '1px solid #fecaca' : '1px solid #e5e7eb',
                    marginBottom: '24px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <i
                      className="material-icons"
                      style={{
                        fontSize: '18px',
                        color: ticket.status === 'Resolved' ? '#16a34a' : ticket.status === 'Rejected' ? '#dc2626' : '#6b7280'
                      }}
                    >
                      comment
                    </i>
                    <span style={{ fontWeight: '700', fontSize: '13px', color: '#111827' }}>
                      Admin Remark / Resolution Notes
                    </span>
                  </div>
                  <div style={{ fontSize: '14px', color: '#374151', lineHeight: '1.5' }}>
                    {ticket.adminRemark}
                  </div>
                </div>
              )}

              {/* ── Admin Action Buttons ── */}
              {can('support', 'edit') && (
                <div
                  style={{
                    paddingTop: '20px',
                    borderTop: '1px solid #e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                    Update Ticket Status:
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {ticket.status !== 'Resolved' && (
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => handleUpdateStatus('Resolved')}
                        style={{
                          padding: '8px 18px',
                          borderRadius: '10px',
                          border: 'none',
                          background: '#16a34a',
                          color: '#fff',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 6px rgba(22,163,74,0.2)'
                        }}
                      >
                        <i className="material-icons" style={{ fontSize: '16px' }}>check_circle</i>
                        Resolve Ticket
                      </button>
                    )}

                    {ticket.status !== 'Rejected' && (
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => handleUpdateStatus('Rejected')}
                        style={{
                          padding: '8px 18px',
                          borderRadius: '10px',
                          border: 'none',
                          background: '#dc2626',
                          color: '#fff',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          boxShadow: '0 2px 6px rgba(220,38,38,0.2)'
                        }}
                      >
                        <i className="material-icons" style={{ fontSize: '16px' }}>cancel</i>
                        Reject Ticket
                      </button>
                    )}

                    {ticket.status !== 'Pending' && (
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => handleUpdateStatus('Pending')}
                        style={{
                          padding: '8px 18px',
                          borderRadius: '10px',
                          border: '1px solid #d97706',
                          background: '#fff',
                          color: '#d97706',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <i className="material-icons" style={{ fontSize: '16px' }}>hourglass_empty</i>
                        Move to Pending
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </TableCard>
        </div>
      </div>
    </div>
  );
};

export default SupportTicketDetail;
