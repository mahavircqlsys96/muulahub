import React, { useState, useEffect } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import apiInstance from "../../utils/apiInstance";
import { PageHeader, TableCard, Modal, StatusBadge } from "../../components/common/PageTable";

const LocationManagement = () => {
  const [activeTab, setActiveTab] = useState("countries"); // countries, states, cities
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  // Form state
  const [currentItem, setCurrentItem] = useState(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [countryId, setCountryId] = useState("");
  const [stateId, setStateId] = useState("");

  useEffect(() => {
    fetchCountries();
    fetchStates();
    fetchCities();
  }, []);

  const fetchCountries = async () => {
    try {
      const res = await apiInstance.get("/locations/countries");
      if (res.data.success) setCountries(res.data.body);
    } catch (err) { toast.error("Error fetching countries"); }
  };

  const fetchStates = async () => {
    try {
      const res = await apiInstance.get("/locations/states");
      if (res.data.success) setStates(res.data.body);
    } catch (err) { toast.error("Error fetching states"); }
  };

  const fetchCities = async () => {
    try {
      const res = await apiInstance.get("/locations/cities");
      if (res.data.success) setCities(res.data.body);
    } catch (err) { toast.error("Error fetching cities"); }
  };

  const handleAddClick = () => {
    setCurrentItem(null);
    setName("");
    setCode("");
    setCountryId("");
    setStateId("");
    setShowModal(true);
  };

  const handleEditClick = (item) => {
    setCurrentItem(item);
    setName(item.name);
    if (activeTab === "countries") setCode(item.code || "");
    if (activeTab === "states") setCountryId(item.countryId);
    if (activeTab === "cities") setStateId(item.stateId);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let url = `/locations/${activeTab}`;
      let data = { name };
      
      if (activeTab === "countries") data.code = code;
      if (activeTab === "states") data.countryId = countryId;
      if (activeTab === "cities") data.stateId = stateId;

      if (currentItem) {
        await apiInstance.put(`${url}/${currentItem.id}`, data);
        toast.success(`${activeTab.slice(0, -1)} updated successfully`);
      } else {
        await apiInstance.post(url, data);
        toast.success(`${activeTab.slice(0, -1)} added successfully`);
      }
      
      setShowModal(false);
      if (activeTab === "countries") fetchCountries();
      if (activeTab === "states") fetchStates();
      if (activeTab === "cities") fetchCities();
    } catch (err) {
      toast.error("Error saving data");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await apiInstance.put(`/locations/${activeTab}/status/${id}`);
      toast.success("Status updated");
      if (activeTab === "countries") fetchCountries();
      if (activeTab === "states") fetchStates();
      if (activeTab === "cities") fetchCities();
    } catch (err) {
      toast.error("Error updating status");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this?")) return;
    try {
      await apiInstance.delete(`/locations/${activeTab}/${id}`);
      toast.success("Deleted successfully");
      if (activeTab === "countries") fetchCountries();
      if (activeTab === "states") fetchStates();
      if (activeTab === "cities") fetchCities();
    } catch (err) {
      toast.error("Error deleting");
    }
  };

  const renderTable = () => {
    let data = [];
    if (activeTab === "countries") data = countries;
    if (activeTab === "states") data = states;
    if (activeTab === "cities") data = cities;

    return (
      <div className="table-responsive">
        <table className="table align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th className="px-4 py-3 border-0">Name</th>
              {activeTab === "countries" && <th className="px-4 py-3 border-0">Code</th>}
              {activeTab === "states" && <th className="px-4 py-3 border-0">Country</th>}
              {activeTab === "cities" && <th className="px-4 py-3 border-0">State</th>}
              <th className="px-4 py-3 border-0">Status</th>
              <th className="px-4 py-3 border-0 text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map(item => (
              <tr key={item.id}>
                <td className="px-4 py-3"><strong>{item.name}</strong></td>
                {activeTab === "countries" && <td className="px-4 py-3 text-muted">{item.code || "-"}</td>}
                {activeTab === "states" && (
                  <td className="px-4 py-3 text-muted">
                    {countries.find(c => c.id == item.countryId)?.name || "Unknown"}
                  </td>
                )}
                {activeTab === "cities" && (
                  <td className="px-4 py-3 text-muted">
                    {states.find(s => s.id == item.stateId)?.name || "Unknown"}
                  </td>
                )}
                <td className="px-4 py-3">
                  <div onClick={() => handleToggleStatus(item.id)} style={{ cursor: 'pointer', display: 'inline-block' }}>
                    <StatusBadge status={item.status || 'active'} />
                  </div>
                </td>
                <td className="px-4 py-3 text-end">
                  <button className="btn btn-sm btn-light me-2" onClick={() => handleEditClick(item)}>
                    <i className="material-icons" style={{ fontSize: "16px", color: "#f91942" }}>edit</i>
                  </button>
                  <button className="btn btn-sm btn-light" onClick={() => handleDelete(item.id)}>
                    <i className="material-icons" style={{ fontSize: "16px", color: "#ef4444" }}>delete</i>
                  </button>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center py-4 text-muted">No records found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <>
      <ToastContainer position="top-right" autoClose={2000} hideProgressBar />
      
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold mb-1">Location Management</h4>
          <p className="text-muted mb-0">Manage active markets</p>
        </div>
        <button className="btn btn-primary d-flex align-items-center gap-2" onClick={handleAddClick}>
          <i className="material-icons" style={{ fontSize: "20px" }}>add</i>
          Add {activeTab.slice(0, -1)}
        </button>
      </div>

      <div className="nav nav-pills mb-4">
        <button className={`nav-link ${activeTab === 'countries' ? 'active' : ''}`} onClick={() => setActiveTab('countries')}>Countries</button>
        <button className={`nav-link ${activeTab === 'states' ? 'active' : ''}`} onClick={() => setActiveTab('states')}>States</button>
        <button className={`nav-link ${activeTab === 'cities' ? 'active' : ''}`} onClick={() => setActiveTab('cities')}>Cities</button>
      </div>

      <TableCard>
        {renderTable()}
      </TableCard>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={currentItem ? `Edit ${activeTab.slice(0, -1)}` : `Add ${activeTab.slice(0, -1)}`}>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label">Name</label>
            <input 
              type="text" 
              className="form-control" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              required
            />
          </div>
          
          {activeTab === "countries" && (
            <div className="mb-3">
              <label className="form-label">Code (optional)</label>
              <input 
                type="text" 
                className="form-control" 
                value={code} 
                onChange={e => setCode(e.target.value)} 
              />
            </div>
          )}

          {activeTab === "states" && (
            <div className="mb-3">
              <label className="form-label">Country</label>
              <select className="form-select" value={countryId} onChange={e => setCountryId(e.target.value)} required>
                <option value="">Select Country</option>
                {countries.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {activeTab === "cities" && (
            <div className="mb-3">
              <label className="form-label">State</label>
              <select className="form-select" value={stateId} onChange={e => setStateId(e.target.value)} required>
                <option value="">Select State</option>
                {states.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({countries.find(c => c.id == s.countryId)?.name || ""})</option>
                ))}
              </select>
            </div>
          )}

          <div className="d-flex justify-content-end mt-4">
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

export default LocationManagement;
