import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import apiInstance from "../../utils/apiInstance";
import ViewBackButton from "../../components/common/ViewBackButton";

const ViewContactUs = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [row, setRow] = useState(null);
  const [status, setStatus] = useState("pending");
  const [reply, setReply] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await apiInstance.get(`/contactUs/${id}`);
      const r = res.data?.body;
      setRow(r);
      setStatus(r?.status || "pending");
      setReply(r?.admin_reply || "");
    } catch (err) {
      console.error(err);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const save = async (e) => {
    e.preventDefault();
    try {
      await apiInstance.put(`/contactUs/${id}`, { status, admin_reply: reply });
      toast.success("Ticket updated");
      navigate("/contactUs");
    } catch {
      toast.error("Failed");
    }
  };

  if (!row) return <div className="p-4">Loading…</div>;

  return (
    <div className="container-fluid">
      <ToastContainer />
      <div className="card my-4">
        <div className="bg-info text-white px-3 py-2 d-flex justify-content-between align-items-center flex-wrap gap-2">
          <span>Support ticket #{row.id}</span>
          <ViewBackButton to="/contactUs" />
        </div>
        <form className="card-body" onSubmit={save}>
          <div className="row">
            <div className="col-md-4 mb-2">
              <label>User</label>
              <input className="form-control" disabled value={row.user ? `${row.user.name} (${row.user.email})` : row.user_id} />
            </div>
            <div className="col-md-4 mb-2">
              <label>User Type</label>
              <input className="form-control" disabled value={row.user?.role === 'owner' ? 'Garage Owner' : row.user?.role === 'user' ? 'User' : '—'} />
            </div>
            <div className="col-md-4 mb-2">
              <label>Issue Type</label>
              <input className="form-control text-capitalize" disabled value={row.type || ""} />
            </div>
            <div className="col-12 mb-2">
              <label>Subject</label>
              <input className="form-control" disabled value={row.subject} />
            </div>
            <div className="col-12 mb-2">
              <label>Message</label>
              <textarea className="form-control" rows={4} disabled value={row.message} />
            </div>
            <div className="col-md-6 mb-2">
              <label>Status</label>
              <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                {["pending", "in_progress", "resolved", "closed"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12 mb-2">
              <label>Admin reply</label>
              <textarea className="form-control" rows={4} value={reply} onChange={(e) => setReply(e.target.value)} />
            </div>
          </div>
          <button className="btn btn-info text-white" type="submit">
            Save
          </button>
        </form>
      </div>
    </div>
  );
};

export default ViewContactUs;
