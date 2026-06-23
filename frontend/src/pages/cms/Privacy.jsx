import React, { useState, useEffect, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import apiInstance from "../../utils/apiInstance";
import { get_cms } from "../../utils/thunkApis";

import {
  PageHeader,
  TableCard
} from "../../components/common/PageTable";

const Privacy = () => {
  const slug = "privacy_policy";

  const dispatch = useDispatch();

  const cms = useSelector((state) => state.users.cms);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [fetchingError, setFetchingError] = useState(null);
  const [error, setError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [loading, setLoading] = useState(false);

  const quillModules = useMemo(
    () => ({
      toolbar: [
        [{ header: "1" }, { header: "2" }, { font: [] }],
        [{ list: "ordered" }, { list: "bullet" }],
        ["bold", "italic", "underline"],
        ["link"],
        [{ color: [] }, { background: [] }],
        [{ align: [] }],
        ["clean"]
      ]
    }),
    []
  );

  useEffect(() => {
    const fetchAboutUs = async () => {
      try {
        setLoading(true);

        await dispatch(get_cms(slug));
      } catch (error) {
        setFetchingError(
          "An error occurred while fetching the about us data."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAboutUs();
  }, [dispatch]);

  useEffect(() => {
    if (cms?.type === slug) {
      setTitle(cms?.title || "");
      setDescription(cms?.content || "<p><br></p>");
    }
  }, [cms]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const tempElement = document.createElement("div");
    tempElement.innerHTML = description;

    const plainText =
      tempElement.textContent || tempElement.innerText;

    if (!plainText.trim()) {
      setError("About Us section cannot be empty.");
      return;
    }

    if (!cms?.id) {
      setError("Something went wrong! Please try again.");
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

      toast.success("About Us updated successfully");
    } catch (error) {
      setSubmitError(
        "Error submitting About Us. Please try again."
      );

      toast.error(
        "Error submitting About Us. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  if (fetchingError) {
    return (
      <div>
        {fetchingError}
        <br />
        Please try again later.
      </div>
    );
  }

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={2000}
        hideProgressBar
      />


      <TableCard>
        <form
          onSubmit={handleSubmit}
          style={{
            padding: "24px",
            position: "relative"
          }}
        >
          {loading && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(255,255,255,0.7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 100
              }}
            >
              <div
                className="spinner-border"
                role="status"
                style={{
                  width: "50px",
                  height: "50px",
                  color: "#f97316"
                }}
              />
            </div>
          )}

       

          <div
            style={{
              marginBottom: "28px"
            }}
          >
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontSize: "14px",
                fontWeight: "600",
                color: "#111827"
              }}
            >
              Content
            </label>

            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                overflow: "hidden",
                background: "#fff"
              }}
            >
              <ReactQuill
                theme="snow"
                value={description}
                onChange={setDescription}
                modules={quillModules}
                style={{
                  height: "320px",
                  marginBottom: "50px"
                }}
              />
            </div>

            {description.trim() === "<p><br></p>" && (
              <div
                style={{
                  color: "#ef4444",
                  fontSize: "13px",
                  marginTop: "10px"
                }}
              >
                About Us section cannot be empty.
              </div>
            )}

            {error && (
              <div
                style={{
                  color: "#ef4444",
                  fontSize: "13px",
                  marginTop: "10px"
                }}
              >
                {error}
              </div>
            )}

            {submitError && (
              <div
                style={{
                  color: "#ef4444",
                  fontSize: "13px",
                  marginTop: "10px"
                }}
              >
                {submitError}
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end"
            }}
          >
            <div className="row">
                  <div className="col-12 d-flex justify-content-end">
                    <button
                      type="submit"
                      className="btn bg-info"
                      style={{ color: "white" }}
                    >
                      Update
                    </button>
                  </div>
                </div>
          </div>
        </form>
      </TableCard>

      <style>
        {`
          .ql-toolbar.ql-snow {
            border: none !important;
            border-bottom: 1px solid #e5e7eb !important;
          }

          .ql-container.ql-snow {
            border: none !important;
            font-size: 14px;
          }

          .ql-editor {
            min-height: 250px;
            color: #333 !important;
          }
        `}
      </style>
    </>
  );
};

export default Privacy;