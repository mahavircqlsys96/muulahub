import React, { useState, useEffect } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";

import apiInstance from "../../utils/apiInstance";
import { PageHeader, TableCard } from "../../components/common/PageTable";

const FraudMonitoring = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await apiInstance.get("/fraud-alerts");
      if (res.data.success) {
        setAlerts(res.data.body || []);
      }
    } catch (err) {
      toast.error("Error fetching fraud alerts");
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    if (severity === 'High') return { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444' };
    if (severity === 'Medium') return { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b' };
    return { bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6' };
  };

  return (
    <>
      <ToastContainer position="top-right" autoClose={2000} hideProgressBar />
      
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">Fraud Monitoring</h4>
          <p className="text-muted mb-0">Detect unusual patterns and suspicious activity</p>
        </div>
        <button className="btn btn-outline-secondary d-flex align-items-center gap-2" onClick={fetchAlerts} disabled={loading}>
          <i className="material-icons" style={{ fontSize: "20px" }}>refresh</i>
          Refresh Logs
        </button>
      </div>

      <div className="row mb-4">
        <div className="col-lg-3">
          <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ color: '#6b7280', fontSize: '13px', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase' }}>Active Alerts</div>
            <div style={{ fontSize: '32px', fontWeight: '800', color: '#111827' }}>{alerts.length}</div>
          </div>
        </div>
        <div className="col-lg-3">
          <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ color: '#6b7280', fontSize: '13px', fontWeight: '600', marginBottom: '8px', textTransform: 'uppercase' }}>High Severity</div>
            <div style={{ fontSize: '32px', fontWeight: '800', color: '#ef4444' }}>{alerts.filter(a => a.severity === 'High').length}</div>
          </div>
        </div>
      </div>

      <TableCard>
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead className="table-light">
              <tr>
                <th className="px-4 py-3 border-0">User Involved</th>
                <th className="px-4 py-3 border-0">Flag Reason</th>
                <th className="px-4 py-3 border-0">Details</th>
                <th className="px-4 py-3 border-0">Severity</th>
                <th className="px-4 py-3 border-0">Detected On</th>
                <th className="px-4 py-3 border-0 text-end">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </td>
                </tr>
              ) : alerts.length > 0 ? (
                alerts.map(alert => {
                  const sColor = getSeverityColor(alert.severity);
                  return (
                    <tr key={alert.id}>
                      <td className="px-4 py-3">
                        <div style={{ fontWeight: '600', color: '#1f2937', fontSize: '14px' }}>{alert.user.name}</div>
                        <div style={{ color: '#6b7280', fontSize: '12px' }}>{alert.user.email} (ID: {alert.user.id})</div>
                      </td>
                      <td className="px-4 py-3">
                        <span style={{ fontWeight: '600', color: '#374151', fontSize: '14px' }}>{alert.reason}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span style={{ color: '#4b5563', fontSize: '13px' }}>{alert.details}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span style={{
                          padding: '6px 12px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: sColor.bg,
                          color: sColor.text
                        }}>
                          {alert.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div style={{ fontSize: '13px', color: '#4b5563' }}>
                          {new Date(alert.date).toLocaleDateString()}
                        </div>
                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                          {new Date(alert.date).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-end">
                        <button 
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => navigate(`/usersView/${alert.user.id}`)}
                        >
                          Review User
                        </button>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-5 text-muted">
                    <i className="material-icons mb-2" style={{ fontSize: '48px', color: '#d1d5db' }}>verified_user</i>
                    <div>No fraudulent activity detected!</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </TableCard>
    </>
  );
};

export default FraudMonitoring;
