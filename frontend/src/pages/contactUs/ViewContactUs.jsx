import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import apiInstance from "../../utils/apiInstance";
import { StatusBadge, formatDate } from "../../components/common/PageTable";
import { usePermissions } from "../../utils/permissions";

const cardStyle = {
  background: "#fff",
  borderRadius: "16px",
  padding: "24px",
  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
  marginBottom: "20px"
};

const InfoRow = ({ label, value }) => (
  <div style={{ display: "flex", padding: "12px 0", borderBottom: "1px solid #f3f4f6", alignItems: "center" }}>
    <div style={{ width: "150px", color: "#6b7280", fontSize: "13px", flexShrink: 0 }}>{label}</div>
    <div style={{ flex: 1, color: "#111827", fontSize: "14px", fontWeight: "500" }}>{value || "—"}</div>
  </div>
);

const ViewContactUs = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = usePermissions();

  const [row, setRow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("pending");
  const [reply, setReply] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiInstance.get(`/contactUs/${id}`);
      const r = res.data?.body;
      if (r) {
        setRow(r);
        setStatus(r?.status || "pending");
        setReply(r?.admin_reply || "");
      } else {
        toast.error("Support ticket not found");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load support ticket details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      await apiInstance.put(`/contactUs/${id}`, { status, admin_reply: reply });
      toast.success("Support ticket updated successfully");
      load();
    } catch {
      toast.error("Failed to update support ticket");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "32px", textAlign: "center", color: "#6b7280" }}>
        <i className="material-icons" style={{ fontSize: "36px", animation: "spin 1s linear infinite" }}>autorenew</i>
        <p style={{ marginTop: "12px", fontSize: "14px" }}>Loading support ticket...</p>
      </div>
    );
  }

  if (!row) {
    return (
      <div style={{ padding: "32px" }}>
        <div style={cardStyle}>
          <h5>Support Ticket Not Found</h5>
          <button onClick={() => navigate("/contactUs")} className="btn btn-primary mt-3">
            Back to Support
          </button>
        </div>
      </div>
    );
  }

  const user = row.user || {};
  const userName = user.name || row.name || "Guest User";
  const userEmail = user.email || row.email || "No email";
  const userPhone = user.phone || row.phone || "—";
  const userRole = user.role || (row.user_id ? "Registered User" : "Guest");

  return (
    <div>
      <ToastContainer position="top-right" autoClose={2500} />

      {/* Top Header & Breadcrumb */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={() => navigate("/contactUs")}
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
            style={{ borderRadius: "8px", padding: "7px 14px", background: "#fff" }}
          >
            <i className="material-icons" style={{ fontSize: "18px" }}>arrow_back</i>
            Back to Support
          </button>
          <div>
            <h4 style={{ margin: 0, fontWeight: "700", color: "#0f172a" }}>
              Support Ticket #{row.id}
            </h4>
            <div style={{ fontSize: "12px", color: "#64748b" }}>
              Submitted on {formatDate(row.createdAt)}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <StatusBadge status={row.status} />
        </div>
      </div>

      <div className="row">
        {/* Left Column: Ticket Message & Admin Reply */}
        <div className="col-lg-8">
          {/* Ticket Subject & Message Card */}
          <div style={cardStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <i className="material-icons" style={{ fontSize: "22px", color: "#6366f1" }}>chat</i>
              <h6 style={{ margin: 0, fontWeight: "700", color: "#111827" }}>Ticket Subject & Inquirer Message</h6>
            </div>

            <div style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "16px 20px",
              marginBottom: "20px"
            }}>
              <div style={{ fontSize: "13px", fontWeight: "700", color: "#475569", textTransform: "uppercase", marginBottom: "4px" }}>
                Subject:
              </div>
              <div style={{ fontSize: "16px", fontWeight: "600", color: "#0f172a", marginBottom: "12px" }}>
                {row.subject || (row.message ? (row.message.length > 80 ? row.message.substring(0, 80) + "..." : row.message) : "General Inquiry")}
              </div>

              <div style={{ fontSize: "13px", fontWeight: "700", color: "#475569", textTransform: "uppercase", marginBottom: "4px" }}>
                Message:
              </div>
              <div style={{ fontSize: "14px", color: "#1f2937", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
                {row.message || "No message content."}
              </div>
            </div>

            <InfoRow label="Ticket ID" value={`#${row.id}`} />
            <InfoRow label="Submitted At" value={formatDate(row.createdAt)} />
            <InfoRow label="Last Updated" value={formatDate(row.updatedAt)} />
            <InfoRow label="Ticket Status" value={<StatusBadge status={row.status} />} />
          </div>

          {/* Admin Response & Reply Card */}
          <div style={cardStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <i className="material-icons" style={{ fontSize: "22px", color: "#10b981" }}>reply</i>
              <h6 style={{ margin: 0, fontWeight: "700", color: "#111827" }}>Admin Response & Ticket Resolution</h6>
            </div>

            <form onSubmit={handleSave}>
              <div className="mb-3">
                <label style={{ fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px", display: "block" }}>
                  Ticket Status
                </label>
                <select
                  className="form-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  style={{ borderRadius: "8px", padding: "10px 14px", fontSize: "14px" }}
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div className="mb-3">
                <label style={{ fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px", display: "block" }}>
                  Admin Reply / Response Notes
                </label>
                <textarea
                  className="form-control"
                  rows={5}
                  placeholder="Type your official response to the user or resolution notes..."
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  style={{ borderRadius: "8px", padding: "12px 14px", fontSize: "14px" }}
                />
              </div>

              {can("support", "edit") && (
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary d-inline-flex align-items-center gap-1"
                  style={{
                    borderRadius: "8px",
                    padding: "10px 20px",
                    fontWeight: "600",
                    background: "linear-gradient(135deg, #f91942 0%, #6366f1 100%)",
                    border: "none"
                  }}
                >
                  <i className="material-icons" style={{ fontSize: "18px" }}>send</i>
                  {saving ? "Saving Response..." : "Save Response & Update Status"}
                </button>
              )}
            </form>
          </div>
        </div>

        {/* Right Column: User Profile Information */}
        <div className="col-lg-4">
          <div style={cardStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <i className="material-icons" style={{ fontSize: "20px", color: "#6366f1" }}>person_outline</i>
              <h6 style={{ margin: 0, fontWeight: "700", color: "#111827" }}>Inquirer Details</h6>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
              <div style={{
                width: "50px", height: "50px", borderRadius: "50%",
                background: "#e0e7ff", color: "#4338ca",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: "700", fontSize: "18px"
              }}>
                {userName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: "700", fontSize: "15px", color: "#111827" }}>{userName}</div>
                <div style={{ color: "#6b7280", fontSize: "13px" }}>{userEmail}</div>
                <div style={{ color: "#9ca3af", fontSize: "11px", textTransform: "capitalize" }}>
                  Role: {userRole}
                </div>
              </div>
            </div>

            <InfoRow label="User ID" value={user.id || row.user_id ? `#${user.id || row.user_id}` : "Guest"} />
            <InfoRow label="Phone" value={userPhone} />
            <InfoRow label="User Role" value={<span style={{ textTransform: "capitalize" }}>{userRole}</span>} />

            {(user.id || row.user_id) && (
              <div style={{ marginTop: "16px" }}>
                <Link to={`/usersView/${user.id || row.user_id}`} className="btn btn-sm btn-outline-primary w-100" style={{ borderRadius: "8px" }}>
                  View Registered Profile
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewContactUs;
