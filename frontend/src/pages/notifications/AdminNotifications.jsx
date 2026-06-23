import React, { useState, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import apiInstance from '../../utils/apiInstance';
import { PageHeader, PrimaryBtn } from '../../components/common/PageTable';

const AdminNotifications = () => {
  const [form, setForm] = useState({ title: '', message: '', target: 'all', countryId: '', cityId: '', categoryId: '' });
  const [sending, setSending] = useState(false);

  const [countries, setCountries] = useState([]);
  const [cities, setCities] = useState([]);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchCountries();
    fetchCities();
    fetchCategories();
  }, []);

  const fetchCountries = async () => {
    try {
      const res = await apiInstance.get("/locations/countries");
      if (res.data.success) setCountries(res.data.body || []);
    } catch (err) { }
  };

  const fetchCities = async () => {
    try {
      const res = await apiInstance.get("/locations/cities");
      if (res.data.success) setCities(res.data.body || []);
    } catch (err) { }
  };

  const fetchCategories = async () => {
    try {
      const res = await apiInstance.get("/categories");
      if (res.data.success) setCategories(res.data.body || []);
    } catch (err) { }
  };

  const handleSend = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      return toast.error('Title and message are required');
    }
    setSending(true);
    try {
      const res = await apiInstance.post('/notifications/bulk', form);
      toast.success(res.data?.message || 'Notification sent');
      setForm({ title: '', message: '', target: 'all', countryId: '', cityId: '', categoryId: '' });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <ToastContainer position="top-right" autoClose={2500} />
      <PageHeader title="Send Notifications" subtitle="Push and in-app notifications to users" />

      <div style={{ maxWidth: '560px' }}>
        <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Target Audience</label>
            <select
              value={form.target}
              onChange={e => setForm({ ...form, target: e.target.value })}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', background: '#f9fafb' }}
            >
              <option value="all">All Users</option>
              <option value="users">Users Only</option>
              <option value="providers">Providers Only</option>
              <option value="country">Specific Country</option>
              <option value="city">Specific City</option>
              <option value="category">Specific Service Category</option>
            </select>
          </div>

          {form.target === 'country' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Select Country</label>
              <select
                value={form.countryId}
                onChange={e => setForm({ ...form, countryId: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', background: '#f9fafb' }}
              >
                <option value="">Select Country...</option>
                {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          {form.target === 'city' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Select City</label>
              <select
                value={form.cityId}
                onChange={e => setForm({ ...form, cityId: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', background: '#f9fafb' }}
              >
                <option value="">Select City...</option>
                {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          {form.target === 'category' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Select Category</label>
              <select
                value={form.categoryId}
                onChange={e => setForm({ ...form, categoryId: e.target.value })}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', background: '#f9fafb' }}
              >
                <option value="">Select Category...</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Title *</label>
            <input
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="Notification title"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Message *</label>
            <textarea
              value={form.message}
              onChange={e => setForm({ ...form, message: e.target.value })}
              placeholder="Notification message"
              rows={4}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #e5e7eb', borderRadius: '10px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>

          <PrimaryBtn icon="send" label={sending ? 'Sending...' : 'Send Notification'} onClick={handleSend} disabled={sending} />
        </div>

        <div style={{ marginTop: '24px', background: 'rgba(255,77,109,0.08)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,77,109,0.2)' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <i className="material-icons" style={{ color: '#ff4d6d', fontSize: '22px' }}>info</i>
            <div>
              <div style={{ fontWeight: '600', color: '#111827', fontSize: '14px' }}>Automatic Notifications</div>
              <div style={{ color: '#6b7280', fontSize: '13px', marginTop: '4px' }}>
                System automatically sends notifications for bookings, payments, withdrawals, and post reports.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminNotifications;
