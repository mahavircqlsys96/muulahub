import React, { useState } from "react";
import { Link } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import apiInstance from "../../utils/apiInstance";
import "./Login.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiInstance.post("/forgotPassword", { email });
      toast.success("If this email is registered, a reset link will be sent.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ToastContainer />
      <div className="parkez-auth-page bg-gray-200">
        <main className="main-content mt-0">
          <div className="page-header align-items-start min-vh-100" style={{ backgroundImage: "url('/loginBackground.jpg')" }}>
            <span className="mask bg-gradient-dark opacity-6" />
            <div className="container my-auto">
              <div className="row">
                <div className="col-lg-4 col-md-8 col-12 mx-auto parkez-auth-card">
                  <div className="card z-index-0 fadeIn3 fadeInBottom">
                    <div className="card-headers p-0 mt-n4 mx-3 z-index-2">
                      <div className="parkez-auth-header shadow-dark border-radius-lg py-3 pe-1 mt-4">
                        <div className="text-center">
                          <img src="/logo-parkez.png" alt="Muulahub" style={{ height: 120, width: "auto", maxWidth: "100%", padding: "0 16px", objectFit: "contain" }} />
                        </div>
                      </div>
                    </div>
                    <div className="card-body">
                      <form onSubmit={submit} className="text-start">
                        <div className="input-group input-group-outline mt-3">
                          <input type="email" className="form-control" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value.trim())} />
                        </div>
                        <div className="text-center">
                          <button type="submit" className="btn bg-info py-2 text-white w-100 my-4 mb-2" disabled={loading}>
                            {loading ? "Sending…" : "Send reset link"}
                          </button>
                          <Link to="/" className="text-info">
                            Back to login
                          </Link>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default ForgotPassword;
