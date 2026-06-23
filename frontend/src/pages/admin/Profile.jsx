
import React, { useState, useEffect } from "react";
import apiInstance, { imageBaseUrl } from "../../utils/apiInstance";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import { useSelector, useDispatch } from "react-redux";
import { get_user_by_id } from "../../utils/thunkApis";

/* ─── design tokens ─────────────────────────────────────────── */
const S = {
  // page wrapper
  page: { padding: "0 0 40px" },

  // section header bar
  sectionBar: {
    background: "linear-gradient(90deg, #f91942, #ff4d6d)",
    borderRadius: "14px 14px 0 0",
    padding: "14px 24px",
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  sectionBarTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
    color: "#fff",
    letterSpacing: 0.3,
  },

  // card
  card: {
    background: "#fff",
    borderRadius: 16,
    boxShadow: "0 2px 24px rgba(0,0,0,0.07)",
    marginBottom: 28,
    overflow: "hidden",
  },
  cardBody: { padding: "32px 28px" },

  // form field
  formGroup: { marginBottom: 20 },
  label: {
    display: "block",
    marginBottom: 6,
    fontSize: 13,
    fontWeight: 600,
    color: "#374151",
    letterSpacing: 0.2,
  },
  input: {
    width: "100%",
    padding: "10px 14px",
    border: "1.5px solid #e5e7eb",
    borderRadius: 10,
    fontSize: 14,
    color: "#111827",
    background: "#fff",
    outline: "none",
    transition: "border-color .2s",
    boxSizing: "border-box",
  },
  inputDisabled: {
    width: "100%",
    padding: "10px 14px",
    border: "1.5px solid #e5e7eb",
    borderRadius: 10,
    fontSize: 14,
    color: "#6b7280",
    background: "#f9fafb",
    outline: "none",
    boxSizing: "border-box",
    cursor: "not-allowed",
  },
  errorText: { color: "#ef4444", fontSize: 12, marginTop: 4 },

  // avatar
  avatarWrap: {
    position: "relative",
    width: 130,
    height: 130,
    borderRadius: "50%",
    overflow: "hidden",
    border: "4px solid #f91942",
    boxShadow: "0 4px 20px rgba(249,25,66,.3)",
    cursor: "pointer",
    flexShrink: 0,
  },
  avatarImg: { width: "100%", height: "100%", objectFit: "cover" },
  avatarOverlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0,
    transition: "opacity .25s",
    color: "#fff",
    fontSize: 12,
    fontWeight: 600,
    gap: 4,
  },

  // primary button
  btn: {
    background: "linear-gradient(90deg, #f91942, #ff4d6d)",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "10px 28px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: 0.3,
    transition: "opacity .2s",
  },

  // stat chip
  chip: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    background: "rgba(249,25,66,0.1)",
    border: "1.5px solid rgba(249,25,66,0.3)",
    borderRadius: 20,
    padding: "4px 14px",
    fontSize: 13,
    color: "#f91942",
    fontWeight: 600,
  },
};

/* ─── helper subcomponents ───────────────────────────────────── */
const SectionHeader = ({ icon, title }) => (
  <div style={S.sectionBar}>
    <i className="material-icons" style={{ fontSize: 20, color: "#fff" }}>{icon}</i>
    <h5 style={S.sectionBarTitle}>{title}</h5>
  </div>
);

const FormInput = ({ label, id, error, inputStyle, ...props }) => (
  <div style={S.formGroup}>
    <label htmlFor={id} style={S.label}>{label}</label>
    <input id={id} style={inputStyle || S.input} {...props} />
    {error && <p style={S.errorText}>{error}</p>}
  </div>
);

/* ─── main component ─────────────────────────────────────────── */
const Profile = () => {
  const [data, setData] = useState({ name: "", email: "", phone: "", profile_picture: "", country_code: "" });
  const [imagePreview, setImagePreview] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [avatarHovered, setAvatarHovered] = useState(false);
  const [fetchingError, setFetchingError] = useState(null);
  const [settings, setSettings] = useState({ 
    admin_commission: "", 
    govt_tax: "", 
    contact_email: "", 
    contact_phone: "",
    withdrawal_fees: "",
    country_fees: "",
    promotional_fee_waivers: "",
    supported_currencies: ["USD"],
    tax_rules: "",
    payout_providers: ["Stripe Connect"]
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [id, setId] = useState(null);

  const user = useSelector((state) => state.users.user);
  const token = localStorage.getItem("token");
  const dispatch = useDispatch();

  /* decode id */
  useEffect(() => {
    if (!token) return;
    const decode = jwtDecode(token);
    setId(decode?.data?.id);
  }, [token]);

  /* populate form from redux */
  useEffect(() => {
    if (user) {
      setData(user);
      setImagePreview(user?.profile_picture ? `${imageBaseUrl}/${user.profile_picture}` : "/user.png");
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      setSettings({
        admin_commission: user.admin_commission || "",
        govt_tax: user.govt_tax || "",
        contact_email: user.contact_email || "",
        contact_phone: user.contact_phone || "",
        withdrawal_fees: user.withdrawal_fees || "",
        country_fees: user.country_fees || "",
        promotional_fee_waivers: user.promotional_fee_waivers || "",
        supported_currencies: user.supported_currencies ? (typeof user.supported_currencies === 'string' ? JSON.parse(user.supported_currencies) : user.supported_currencies) : ["USD"],
        tax_rules: user.tax_rules || "",
        payout_providers: user.payout_providers ? (typeof user.payout_providers === 'string' ? JSON.parse(user.payout_providers) : user.payout_providers) : ["Stripe Connect"]
      });
    }
  }, [user]);

  const fetchProfileData = async () => {
    if (!id) return;
    setLoading(true);
    try { await dispatch(get_user_by_id(id)); }
    catch { setFetchingError("An error occurred while fetching profile details..."); }
    finally { setLoading(false); }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) { setSelectedImage(file); setImagePreview(URL.createObjectURL(file)); }
  };

  const validateForm = () => {
    const fe = {};
    if (!data.name) fe.name = "Name is required";
    else if (!/^[A-Za-z\s]+$/.test(data.name)) fe.name = "Enter a valid name";
    else if (data.name.length > 30) fe.name = "Name must be within 30 characters";
    if (!data.phone) fe.phone = "Phone number is required";
    if (selectedImage && selectedImage.size > 1024 * 1024 * 20) fe.image = "Image size must be within 20 MB.";
    return fe;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fe = validateForm();
    if (Object.keys(fe).length > 0) { setErrors(fe); return; }
    setErrors({});
    setLoading(true);
    if (!id) return;
    const fd = new FormData();
    fd.append("name", data.name);
    fd.append("email", data.email);
    fd.append("phone", data.phone);
    fd.append("country_code", data.country_code);
    if (selectedImage) fd.append("profile_picture", selectedImage);
    try {
      await apiInstance.put("/updateProfile", fd);
      toast.success("Profile updated successfully");
      fetchProfileData();
    } catch { toast.error("Error updating profile"); }
    finally { setLoading(false); }
  };

  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData();
    fd.append("admin_commission", settings.admin_commission);
    fd.append("govt_tax", settings.govt_tax);
    fd.append("contact_email", settings.contact_email);
    fd.append("contact_phone", settings.contact_phone);
    fd.append("withdrawal_fees", settings.withdrawal_fees);
    fd.append("country_fees", settings.country_fees);
    fd.append("promotional_fee_waivers", settings.promotional_fee_waivers);
    fd.append("supported_currencies", JSON.stringify(settings.supported_currencies));
    fd.append("tax_rules", settings.tax_rules);
    fd.append("payout_providers", JSON.stringify(settings.payout_providers));
    try {
      await apiInstance.put("/updateProfile", fd);
      toast.success("Settings updated successfully");
      fetchProfileData();
    } catch { toast.error("Error updating settings"); }
    finally { setLoading(false); }
  };

  if (fetchingError) return (
    <div style={{ padding: 24, color: "#ef4444", fontWeight: 600 }}>
      ⚠ {fetchingError}
    </div>
  );

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />

      {/* ── page loading overlay ── */}
      {loading && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(255,255,255,0.55)",
          zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center"
        }}>
          <div style={{
            background: "#fff", borderRadius: 16, padding: "28px 40px",
            boxShadow: "0 8px 40px rgba(0,0,0,0.14)",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 14
          }}>
            <div style={{
              width: 44, height: 44, border: "4px solid rgba(249,25,66,0.2)",
              borderTopColor: "#f91942", borderRadius: "50%",
              animation: "spin 0.8s linear infinite"
            }} />
            <span style={{ color: "#f91942", fontWeight: 700, fontSize: 14 }}>Saving changes…</span>
          </div>
        </div>
      )}

      <div style={S.page}>

        {/* ══════════════════════════════════
            PROFILE CARD
        ══════════════════════════════════ */}
        <div style={S.card}>
          <SectionHeader icon="manage_accounts" title="Profile" />

          <div style={S.cardBody}>
            <form onSubmit={handleSubmit} noValidate encType="multipart/form-data">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 32, alignItems: "flex-start" }}>

                {/* ── Avatar column ── */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                  <label
                    htmlFor="avatar-upload"
                    style={S.avatarWrap}
                    onMouseEnter={() => setAvatarHovered(true)}
                    onMouseLeave={() => setAvatarHovered(false)}
                    title="Click to change photo"
                  >
                    <img
                      src={imagePreview || "/user.png"}
                      alt="Admin Avatar"
                      style={S.avatarImg}
                    />
                    <div style={{ ...S.avatarOverlay, opacity: avatarHovered ? 1 : 0 }}>
                      <i className="material-icons" style={{ fontSize: 26 }}>photo_camera</i>
                      <span>Change Photo</span>
                    </div>
                  </label>
                  <input
                    type="file"
                    id="avatar-upload"
                    accept=".jpg,.jpeg,.png"
                    style={{ display: "none" }}
                    onChange={handleImageChange}
                  />
                  {errors.image && <p style={S.errorText}>{errors.image}</p>}
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontWeight: 700, fontSize: 17, color: "#111827" }}>{data.name || "Admin"}</div>
                    <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>Administrator</div>
                  </div>
                  {/* admin badge */}
                  <div style={S.chip}>
                    <i className="material-icons" style={{ fontSize: 14 }}>verified</i>
                    Verified Admin
                  </div>
                </div>

                {/* ── Fields column ── */}
                <div style={{ flex: 1, minWidth: 260 }}>
                  <FormInput
                    label="Full Name"
                    id="name"
                    type="text"
                    placeholder="Enter your full name"
                    value={data.name}
                    onChange={(e) => setData(prev => ({ ...prev, name: e.target.value }))}
                    error={errors.name}
                  />

                  <div style={S.formGroup}>
                    <label style={S.label} htmlFor="phone-input">Phone Number</label>
                    <PhoneInput
                      defaultCountry="us"
                      value={`${data.country_code}${data.phone}`}
                      onChange={(value, country) =>
                        setData(prev => ({
                          ...prev,
                          country_code: `+${country.country.dialCode}`,
                          phone: value.replace(`+${country.country.dialCode}`, ""),
                        }))
                      }
                      style={{ width: "100%" }}
                      inputStyle={{
                        width: "100%",
                        height: 42,
                        border: "1.5px solid #e5e7eb",
                        borderLeft: "none",
                        borderRadius: "0 10px 10px 0",
                        fontSize: 14,
                        color: "#111827",
                        background: "#fff",
                      }}
                      countrySelectorStyle={{
                        height: 42,
                        border: "1.5px solid #e5e7eb",
                        borderRight: "none",
                        borderRadius: "10px 0 0 10px",
                      }}
                    />
                    {errors.phone && <p style={S.errorText}>{errors.phone}</p>}
                  </div>

                  <div style={S.formGroup}>
                    <label htmlFor="email" style={S.label}>Email Address</label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="email"
                        id="email"
                        readOnly
                        disabled
                        value={data.email}
                        style={{ ...S.inputDisabled, paddingRight: 40 }}
                      />
                      <i className="material-icons" style={{
                        position: "absolute", right: 12, top: "50%",
                        transform: "translateY(-50%)", fontSize: 18, color: "#d1d5db"
                      }}>lock</i>
                    </div>
                    <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>Email cannot be changed</p>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                    <button type="submit" style={S.btn} disabled={loading}>
                      <i className="material-icons" style={{ fontSize: 16, verticalAlign: "middle", marginRight: 6 }}>save</i>
                      {loading ? "Saving…" : "Update Profile"}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* ══════════════════════════════════
            GLOBAL SETTINGS CARD
        ══════════════════════════════════ */}
        <div style={S.card}>
          <SectionHeader icon="settings" title="Global Settings" />

          <div style={S.cardBody}>
            <form onSubmit={handleSettingsSubmit} noValidate>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 28px" }}>

                <div style={S.formGroup}>
                  <label style={S.label} htmlFor="admin-commission">
                    <i className="material-icons" style={{ fontSize: 15, verticalAlign: "middle", marginRight: 4, color: "#f91942" }}>percent</i>
                    Admin Commission (%)
                  </label>
                  <input
                    id="admin-commission"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="e.g. 10"
                    style={S.input}
                    value={settings.admin_commission}
                    onChange={(e) => setSettings({ ...settings, admin_commission: e.target.value })}
                  />
                </div>

                <div style={S.formGroup}>
                  <label style={S.label} htmlFor="govt-tax">
                    <i className="material-icons" style={{ fontSize: 15, verticalAlign: "middle", marginRight: 4, color: "#f91942" }}>account_balance</i>
                    Govt. Tax (%)
                  </label>
                  <input
                    id="govt-tax"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="e.g. 18"
                    style={S.input}
                    value={settings.govt_tax}
                    onChange={(e) => setSettings({ ...settings, govt_tax: e.target.value })}
                  />
                </div>

                <div style={S.formGroup}>
                  <label style={S.label} htmlFor="contact-email">
                    <i className="material-icons" style={{ fontSize: 15, verticalAlign: "middle", marginRight: 4, color: "#f91942" }}>mail_outline</i>
                    Contact Us Email
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    placeholder="support@example.com"
                    style={S.input}
                    value={settings.contact_email}
                    onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
                  />
                </div>

                <div style={S.formGroup}>
                  <label style={S.label} htmlFor="contact-phone">
                    <i className="material-icons" style={{ fontSize: 15, verticalAlign: "middle", marginRight: 4, color: "#f91942" }}>phone</i>
                    Contact Us Phone
                  </label>
                  <input
                    id="contact-phone"
                    type="text"
                    placeholder="+1 234 567 890"
                    style={S.input}
                    value={settings.contact_phone}
                    onChange={(e) => setSettings({ ...settings, contact_phone: e.target.value })}
                  />
                </div>

                <div style={S.formGroup}>
                  <label style={S.label} htmlFor="withdrawal-fees">
                    <i className="material-icons" style={{ fontSize: 15, verticalAlign: "middle", marginRight: 4, color: "#f91942" }}>money_off</i>
                    Withdrawal Fees (%)
                  </label>
                  <input
                    id="withdrawal-fees"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="e.g. 2.5"
                    style={S.input}
                    value={settings.withdrawal_fees}
                    onChange={(e) => setSettings({ ...settings, withdrawal_fees: e.target.value })}
                  />
                </div>

                <div style={S.formGroup}>
                  <label style={S.label} htmlFor="promotional-waivers">
                    <i className="material-icons" style={{ fontSize: 15, verticalAlign: "middle", marginRight: 4, color: "#f91942" }}>card_giftcard</i>
                    Promotional Fee Waivers (%)
                  </label>
                  <input
                    id="promotional-waivers"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="e.g. 5"
                    style={S.input}
                    value={settings.promotional_fee_waivers}
                    onChange={(e) => setSettings({ ...settings, promotional_fee_waivers: e.target.value })}
                  />
                </div>

                <div style={{ ...S.formGroup, gridColumn: "1 / -1" }}>
                  <label style={S.label} htmlFor="country-fees">
                    <i className="material-icons" style={{ fontSize: 15, verticalAlign: "middle", marginRight: 4, color: "#f91942" }}>public</i>
                    Country Fees (JSON format)
                  </label>
                  <textarea
                    id="country-fees"
                    placeholder='e.g. {"US": 2.5, "UK": 3.0}'
                    style={{ ...S.input, minHeight: "80px", resize: "vertical" }}
                    value={settings.country_fees}
                    onChange={(e) => setSettings({ ...settings, country_fees: e.target.value })}
                  />
                </div>
              </div>

              {/* info strip */}
              <div style={{
                background: "rgba(255,77,109,0.1)", border: "1.5px solid rgba(255,77,109,0.3)",
                borderRadius: 10, padding: "10px 16px",
                display: "flex", alignItems: "center", gap: 8,
                marginTop: 4, marginBottom: 20, fontSize: 13, color: "#5b21b6"
              }}>
                <i className="material-icons" style={{ fontSize: 18, color: "#ff4d6d" }}>info</i>
                Commission and tax rates apply to all new bookings immediately after saving.
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="submit" style={S.btn} disabled={loading}>
                  <i className="material-icons" style={{ fontSize: 16, verticalAlign: "middle", marginRight: 6 }}>tune</i>
                  {loading ? "Saving…" : "Update Settings"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ══════════════════════════════════
            FINANCIAL & PAYOUT SETTINGS CARD
        ══════════════════════════════════ */}
        <div style={S.card}>
          <SectionHeader icon="account_balance_wallet" title="Financial & Payout Settings" />

          <div style={S.cardBody}>
            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

              {/* Supported Currencies */}
              <div>
                <label style={{ ...S.label, fontSize: 15, marginBottom: 12 }}>
                  <i className="material-icons" style={{ fontSize: 18, verticalAlign: "middle", marginRight: 6, color: "#f91942" }}>payments</i>
                  Supported Currencies
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                  {["USD", "CAD", "GBP", "EUR", "XAF", "NGN", "KES", "ZAR"].map(curr => {
                    const isSelected = settings.supported_currencies.includes(curr);
                    return (
                      <div
                        key={curr}
                        onClick={() => {
                          const newCurrs = isSelected
                            ? settings.supported_currencies.filter(c => c !== curr)
                            : [...settings.supported_currencies, curr];
                          // ensure at least one currency is selected
                          if (newCurrs.length === 0) return toast.warn("At least one currency must be selected");
                          setSettings({ ...settings, supported_currencies: newCurrs });
                        }}
                        style={{
                          padding: "8px 16px",
                          borderRadius: 20,
                          border: `1.5px solid ${isSelected ? "#f91942" : "#e5e7eb"}`,
                          background: isSelected ? "rgba(249,25,66,0.1)" : "#fff",
                          color: isSelected ? "#f91942" : "#6b7280",
                          fontWeight: 600,
                          fontSize: 13,
                          cursor: "pointer",
                          transition: "all .2s",
                          display: "flex",
                          alignItems: "center",
                          gap: 6
                        }}
                      >
                        {isSelected && <i className="material-icons" style={{ fontSize: 16 }}>check_circle</i>}
                        {curr}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Payout Providers */}
              <div>
                <label style={{ ...S.label, fontSize: 15, marginBottom: 12 }}>
                  <i className="material-icons" style={{ fontSize: 18, verticalAlign: "middle", marginRight: 6, color: "#ff4d6d" }}>account_balance</i>
                  Payout Providers
                </label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                  {["Stripe Connect", "PayPal", "Wise", "Flutterwave", "Bank", "M-Pesa", "Mobile Money"].map(provider => {
                    const isSelected = settings.payout_providers.includes(provider);
                    return (
                      <div
                        key={provider}
                        onClick={() => {
                          const newProviders = isSelected
                            ? settings.payout_providers.filter(p => p !== provider)
                            : [...settings.payout_providers, provider];
                          setSettings({ ...settings, payout_providers: newProviders });
                        }}
                        style={{
                          padding: "8px 16px",
                          borderRadius: 20,
                          border: `1.5px solid ${isSelected ? "#ff4d6d" : "#e5e7eb"}`,
                          background: isSelected ? "rgba(255,77,109,0.1)" : "#fff",
                          color: isSelected ? "#ff4d6d" : "#6b7280",
                          fontWeight: 600,
                          fontSize: 13,
                          cursor: "pointer",
                          transition: "all .2s",
                          display: "flex",
                          alignItems: "center",
                          gap: 6
                        }}
                      >
                        {isSelected && <i className="material-icons" style={{ fontSize: 16 }}>check_circle</i>}
                        {provider}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tax Rules */}
              <div style={S.formGroup}>
                <label style={{ ...S.label, fontSize: 15, marginBottom: 12 }}>
                  <i className="material-icons" style={{ fontSize: 18, verticalAlign: "middle", marginRight: 6, color: "#10b981" }}>receipt_long</i>
                  Tax Management (VAT/GST/Country Rules)
                </label>
                <textarea
                  id="tax-rules"
                  placeholder='e.g. {"VAT": 20, "GST": 5, "exempt_countries": ["US"]}'
                  style={{ ...S.input, minHeight: "100px", resize: "vertical", fontFamily: "monospace" }}
                  value={settings.tax_rules}
                  onChange={(e) => setSettings({ ...settings, tax_rules: e.target.value })}
                />
                <p style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>
                  Enter tax configuration in JSON format. This will be used dynamically during checkout.
                </p>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="button" onClick={handleSettingsSubmit} style={{ ...S.btn, background: "linear-gradient(90deg, #10b981, #059669)" }} disabled={loading}>
                  <i className="material-icons" style={{ fontSize: 16, verticalAlign: "middle", marginRight: 6 }}>save</i>
                  {loading ? "Saving…" : "Save Financial Settings"}
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input:focus { border-color: #f91942 !important; box-shadow: 0 0 0 3px rgba(249,25,66,.12) !important; }
      `}</style>
    </>
  );
};

export default Profile;