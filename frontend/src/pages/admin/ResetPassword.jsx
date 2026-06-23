import React, { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import apiInstance from "../../utils/apiInstance";
import "./Login.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

const ResetPassword = () => {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 5) {
      toast.error("Password must be at least 5 characters");
      return;
    }
    setLoading(true);
    try {
      await apiInstance.post("/resetPassword", { token, newPassword: password });
      localStorage.setItem("resetpass", "1");
      navigate("/");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Reset failed");
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
                          <input
                            type="password"
                            className="form-control"
                            required
                            placeholder="New password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                          />
                        </div>
                        <div className="text-center">
                          <button type="submit" className="btn bg-info py-2 text-white w-100 my-4 mb-2" disabled={loading || !token}>
                            {loading ? "Saving…" : "Reset password"}
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

export default ResetPassword;
