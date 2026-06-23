import React, { useState, useEffect, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import apiInstance from "../../utils/apiInstance";
import { get_cms } from "../../utils/thunkApis";
import { TableCard } from "../../components/common/PageTable";

const CommunityGuidelines = () => {
  const slug = "community_guidelines";
  const dispatch = useDispatch();
  const cms = useSelector((state) => state.users.cms);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fetchingError, setFetchingError] = useState(null);
  const [error, setError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);

  const quillModules = useMemo(() => ({
    toolbar: [
      [{ header: "1" }, { header: "2" }, { font: [] }],
      [{ list: "ordered" }, { list: "bullet" }],
      ["bold", "italic", "underline"],
      ["link"],
      [{ color: [] }, { background: [] }],
      [{ align: [] }],
      ["clean"]
    ]
  }), []);

  useEffect(() => {
    const fetchContent = async () => {
      try {
        setLoading(true);
        await dispatch(get_cms(slug));
      } catch (error) {
        setFetchingError("An error occurred while fetching data.");
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, [dispatch]);

  useEffect(() => {
    if (cms?.type === slug) {
      setTitle(cms?.title || "Community Guidelines");
      setDescription(cms?.content || "<p><br></p>");
    }
  }, [cms]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const tempElement = document.createElement("div");
    tempElement.innerHTML = description;
    const plainText = tempElement.textContent || tempElement.innerText;

    if (!plainText.trim()) {
      setError("Content cannot be empty.");
      return;
    }

    setError("");
    setSubmitError("");

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("content", description);
      formData.append("slug", slug);
      formData.append("title", title);
      await apiInstance.put("/updateCms", formData);
      toast.success("Community Guidelines updated successfully");
    } catch (error) {
      setSubmitError("Error submitting. Please try again.");
      toast.error("Error submitting. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (fetchingError) {
    return <div>{fetchingError}<br />Please try again later.</div>;
  }

  return (
    <>
      <ToastContainer position="top-right" autoClose={2000} hideProgressBar />
      <div className="mb-4">
        <h4 className="fw-bold mb-1">Community Guidelines</h4>
        <p className="text-muted mb-0">Manage Community Guidelines page content</p>
      </div>

      <TableCard>
        <form onSubmit={handleSubmit} style={{ padding: "24px", position: "relative" }}>
          {loading && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
              <div className="spinner-border" role="status" style={{ width: "50px", height: "50px", color: "#f97316" }} />
            </div>
          )}

          <div style={{ marginBottom: "28px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "600", color: "#111827" }}>Content</label>
            <div style={{ border: "1px solid #e5e7eb", borderRadius: "12px", overflow: "hidden", background: "#fff" }}>
              <ReactQuill theme="snow" value={description} onChange={setDescription} modules={quillModules} style={{ height: "320px", marginBottom: "50px" }} />
            </div>
            {description.trim() === "<p><br></p>" && <div style={{ color: "#ef4444", fontSize: "13px", marginTop: "10px" }}>Content cannot be empty.</div>}
            {error && <div style={{ color: "#ef4444", fontSize: "13px", marginTop: "10px" }}>{error}</div>}
            {submitError && <div style={{ color: "#ef4444", fontSize: "13px", marginTop: "10px" }}>{submitError}</div>}
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" className="btn btn-primary" style={{ minWidth: "120px" }}>Update</button>
          </div>
        </form>
      </TableCard>

      <style>{`
        .ql-toolbar.ql-snow { border: none !important; border-bottom: 1px solid #e5e7eb !important; }
        .ql-container.ql-snow { border: none !important; font-size: 14px; }
        .ql-editor { min-height: 250px; color: #333 !important; }
      `}</style>
    </>
  );
};

export default CommunityGuidelines;
