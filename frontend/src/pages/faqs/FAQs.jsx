import React, { useState, useEffect } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import apiInstance from "../../utils/apiInstance";
import { PageHeader, TableCard, Modal, PrimaryBtn } from "../../components/common/PageTable";

const FAQs = () => {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [showModal, setShowModal] = useState(false);
  const [currentFaq, setCurrentFaq] = useState(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  useEffect(() => {
    fetchFaqs();
  }, []);

  const fetchFaqs = async () => {
    try {
      setLoading(true);
      const res = await apiInstance.get("/faqs");
      if (res.data.status) {
        setFaqs(res.data.data);
      }
    } catch (err) {
      toast.error("Error fetching FAQs");
    } finally {
      setLoading(false);
    }
  };

  const handleAddClick = () => {
    setCurrentFaq(null);
    setQuestion("");
    setAnswer("");
    setShowModal(true);
  };

  const handleEditClick = (faq) => {
    setCurrentFaq(faq);
    setQuestion(faq.question);
    setAnswer(faq.answer);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!question || !answer) {
      toast.error("Question and answer are required");
      return;
    }
    
    try {
      setLoading(true);
      if (currentFaq) {
        await apiInstance.put(`/faqs/${currentFaq.id}`, { question, answer });
        toast.success("FAQ updated successfully");
      } else {
        await apiInstance.post("/faqs", { question, answer });
        toast.success("FAQ added successfully");
      }
      setShowModal(false);
      fetchFaqs();
    } catch (err) {
      toast.error("Error saving FAQ");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await apiInstance.put(`/faqs/status/${id}`);
      toast.success("FAQ status updated");
      fetchFaqs();
    } catch (err) {
      toast.error("Error updating status");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this FAQ?")) return;
    try {
      await apiInstance.delete(`/faqs/${id}`);
      toast.success("FAQ deleted successfully");
      fetchFaqs();
    } catch (err) {
      toast.error("Error deleting FAQ");
    }
  };

  return (
    <>
      <ToastContainer position="top-right" autoClose={2000} hideProgressBar />
      
      <PageHeader 
        title="FAQs" 
        subtitle="Manage frequently asked questions" 
        action={<PrimaryBtn icon="add" label="Add FAQ" onClick={handleAddClick} />}
      />

      <TableCard>
        {loading && faqs.length === 0 ? (
          <div className="p-4 text-center">Loading...</div>
        ) : (
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead className="table-light">
                <tr>
                  <th className="px-4 py-3 border-0">Question</th>
                  <th className="px-4 py-3 border-0">Answer</th>
                  <th className="px-4 py-3 border-0">Status</th>
                  <th className="px-4 py-3 border-0 text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {faqs.map(faq => (
                  <tr key={faq.id}>
                    <td className="px-4 py-3"><strong>{faq.question}</strong></td>
                    <td className="px-4 py-3 text-muted">
                      {faq.answer.length > 50 ? faq.answer.substring(0, 50) + "..." : faq.answer}
                    </td>
                    <td className="px-4 py-3">
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          checked={faq.status === 'active'}
                          onChange={() => handleToggleStatus(faq.id)}
                          style={{ cursor: "pointer" }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-end">
                      <button className="btn btn-sm btn-light me-2" onClick={() => handleEditClick(faq)}>
                        <i className="material-icons" style={{ fontSize: "16px", color: "#f91942" }}>edit</i>
                      </button>
                      <button className="btn btn-sm btn-light" onClick={() => handleDelete(faq.id)}>
                        <i className="material-icons" style={{ fontSize: "16px", color: "#ef4444" }}>delete</i>
                      </button>
                    </td>
                  </tr>
                ))}
                {faqs.length === 0 && !loading && (
                  <tr>
                    <td colSpan="4" className="text-center py-4 text-muted">No FAQs found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </TableCard>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={currentFaq ? "Edit FAQ" : "Add FAQ"}>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Question</label>
            <input 
              type="text" 
              className="form-control" 
              value={question} 
              onChange={e => setQuestion(e.target.value)} 
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Answer</label>
            <textarea 
              className="form-control" 
              rows="4" 
              value={answer} 
              onChange={e => setAnswer(e.target.value)} 
              required
            ></textarea>
          </div>
          <div className="d-flex justify-content-end">
            <button type="button" className="btn btn-light me-2" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
};

export default FAQs;
