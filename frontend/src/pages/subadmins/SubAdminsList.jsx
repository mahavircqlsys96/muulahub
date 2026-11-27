import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import Swal from 'sweetalert2';
import apiInstance from '../../services/api';
import {
  PageHeader, SearchBar, FilterSelect, TableCard, TableHead,
  Pagination, EmptyRow, LoadingRow, StatusBadge, formatDate
} from '../../components/common/PageTable';

const ROLE_COLORS = {
  super_admin: { bg: '#fee2e2', color: '#b91c1c' },
  operations_admin: { bg: '#e0e7ff', color: '#3730a3' },
  finance_admin: { bg: '#dcfce7', color: '#15803d' },
  senior_content_moderator: { bg: '#fef3c7', color: '#b45309' },
  content_moderator: { bg: '#fef9c3', color: '#a16207' },
  support_supervisor: { bg: '#e0f2fe', color: '#0369a1' },
  support_agent: { bg: '#f0f9ff', color: '#0284c7' },
  verification_admin: { bg: '#f3e8ff', color: '#7e22ce' },
  marketing_admin: { bg: '#fce7f3', color: '#be185d' },
  analyst: { bg: '#f1f5f9', color: '#334155' },
};

const SubAdminsList = () => {
  const [data, setData] = useState({ list: [], total: 0, totalPages: 1 });
  const [roles, setRoles] = useState([]);
  const [catalog, setCatalog] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleId, setRoleId] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    userName: '',
    password: '',
    phone: '',
    countryCode: '+1',
    adminRoleId: '',
    status: 'active',
    useCustomPermissions: false,
    customPermissions: []
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [res, rolesRes] = await Promise.all([
        apiInstance.get('/subadmins', {
          params: { page, limit: 10, search, roleId, status }
        }),
        apiInstance.get('/roles')
      ]);
      if (res.data?.body) setData(res.data.body);
      if (rolesRes.data?.body) setRoles(rolesRes.data.body);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load sub-admins');
    } finally {
      setLoading(false);
    }
  }, [page, search, roleId, status]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Load Permissions Catalog once for custom permissions editor
  useEffect(() => {
    apiInstance.get('/permissions-catalog')
      .then(res => {
        if (res.data?.body) setCatalog(res.data.body);
      })
      .catch(() => {});
  }, []);

  const openAddModal = () => {
    setEditingAdmin(null);
    setForm({
      name: '',
      email: '',
      userName: '',
      password: '',
      phone: '',
      countryCode: '+1',
      adminRoleId: roles.length > 0 ? roles[0].id : '',
      status: 'active',
      useCustomPermissions: false,
      customPermissions: []
    });
    setModalOpen(true);
  };

  const openEditModal = (admin) => {
    setEditingAdmin(admin);
    const hasCustom = Array.isArray(admin.adminPermissions) && admin.adminPermissions.length > 0;
    setForm({
      name: admin.name || '',
      email: admin.email || '',
      userName: admin.userName || '',
      password: '',
      phone: admin.phone || '',
      countryCode: admin.countryCode || '+1',
      adminRoleId: admin.adminRoleId || (roles[0]?.id || ''),
      status: admin.status || 'active',
      useCustomPermissions: hasCustom,
      customPermissions: hasCustom ? admin.adminPermissions : []
    });
    setModalOpen(true);
  };

  const handleTogglePermission = (permKey) => {
    setForm(prev => {
      const exists = prev.customPermissions.includes(permKey);
      const next = exists
        ? prev.customPermissions.filter(p => p !== permKey)
        : [...prev.customPermissions, permKey];
      return { ...prev, customPermissions: next };
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      toast.error('Name and Email are required');
      return;
    }
    if (!editingAdmin && (!form.password || form.password.length < 6)) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone,
        countryCode: form.countryCode,
        adminRoleId: form.adminRoleId,
        status: form.status,
        adminPermissions: form.useCustomPermissions ? form.customPermissions : null
      };

      if (form.password && form.password.trim()) {
        payload.password = form.password.trim();
      }
      if (form.userName && form.userName.trim()) {
        payload.userName = form.userName.trim();
      }

      if (editingAdmin) {
        await apiInstance.put(`/subadmins/${editingAdmin.id}`, payload);
        toast.success('Sub-admin updated successfully');
      } else {
        await apiInstance.post('/subadmins', payload);
        toast.success('Sub-admin created successfully');
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.msg || 'Failed to save sub-admin');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (admin) => {
    const result = await Swal.fire({
      title: 'Remove Sub-Admin?',
      text: `Are you sure you want to deactivate ${admin.name}? They will no longer be able to log in.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#f91942',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Remove'
    });

    if (result.isConfirmed) {
      try {
        await apiInstance.delete(`/subadmins/${admin.id}`);
        toast.success('Sub-admin removed successfully');
        fetchData();
      } catch (err) {
        toast.error(err.response?.data?.msg || 'Failed to delete sub-admin');
      }
    }
  };

  return (
    <div>
      <ToastContainer position="top-right" autoClose={2500} />

      <PageHeader
        title="Sub-Admins & Team"
        subtitle={`${data.total} administrative team members`}
        action={
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link
              to="/roles"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                borderRadius: '10px',
                border: '1px solid #e5e7eb',
                background: '#ffffff',
                color: '#374151',
                fontSize: '13px',
                fontWeight: '600',
                textDecoration: 'none',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                transition: 'all 0.2s ease',
              }}
            >
              <i className="material-icons" style={{ fontSize: '18px' }}>badge</i>
              <span>Manage Roles</span>
            </Link>

            <button
              onClick={openAddModal}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #f91942 0%, #6366f1 100%)',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(249, 25, 66, 0.25)',
              }}
            >
              <i className="material-icons" style={{ fontSize: '18px' }}>person_add</i>
              <span>Add Sub-Admin</span>
            </button>
          </div>
        }
      />

      <TableCard>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <SearchBar
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search sub-admin by name, email, username..."
          />

          <FilterSelect
            value={roleId}
            onChange={e => { setRoleId(e.target.value); setPage(1); }}
            options={roles.map(r => ({ value: r.id, label: r.name }))}
            placeholder="All Administrative Roles"
          />

          <FilterSelect
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(1); }}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'blocked', label: 'Blocked / Suspended' },
              { value: 'inactive', label: 'Inactive' }
            ]}
            placeholder="All Status"
          />
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <TableHead columns={['Sr. No.', 'Sub-Admin', 'Username', 'Assigned Role', 'Permissions', 'Status', 'Last Active', 'Actions']} />
            <tbody>
              {loading && <LoadingRow cols={8} />}
              {!loading && !data.list?.length && <EmptyRow cols={8} message="No sub-admins found" />}
              {!loading && data.list?.map((a, i) => {
                const roleSlug = a.adminRoleSlug || a.adminRole?.slug || 'super_admin';
                const roleColor = ROLE_COLORS[roleSlug] || { bg: '#f3f4f6', color: '#374151' };
                const roleName = a.adminRole?.name || (roleSlug === 'super_admin' ? 'Super Admin' : roleSlug);
                const isCustom = Array.isArray(a.adminPermissions) && a.adminPermissions.length > 0;

                return (
                  <tr key={a.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '14px 16px', color: '#9ca3af', fontSize: '13px' }}>{(page - 1) * 10 + i + 1}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '50%',
                          background: 'linear-gradient(135deg, #6366f1, #f91942)',
                          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: '700', fontSize: '14px'
                        }}>
                          {a.name?.charAt(0)?.toUpperCase() || 'A'}
                        </div>
                        <div>
                          <div style={{ fontWeight: '600', color: '#111827', fontSize: '14px' }}>{a.name}</div>
                          <div style={{ color: '#6b7280', fontSize: '12px' }}>{a.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#374151', fontFamily: 'monospace' }}>
                      @{a.userName || '—'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '700',
                        background: roleColor.bg,
                        color: roleColor.color
                      }}>
                        {roleName}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '12px' }}>
                      {isCustom ? (
                        <span style={{ color: '#7c3aed', fontWeight: '600' }}>
                          <i className="material-icons" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: '3px' }}>tune</i>
                          Custom ({a.adminPermissions.length})
                        </span>
                      ) : (
                        <span style={{ color: '#6b7280' }}>Role Default</span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <StatusBadge status={a.status || 'active'} />
                    </td>
                    <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: '13px' }}>
                      {a.loginTime ? formatDate(new Date(a.loginTime * 1000)) : 'Never'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => openEditModal(a)}
                          style={{
                            padding: '6px 12px',
                            border: '1px solid #e5e7eb',
                            background: '#fff',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            color: '#3b82f6',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <i className="material-icons" style={{ fontSize: '15px' }}>edit</i>
                          Edit
                        </button>

                        <button
                          onClick={() => handleDelete(a)}
                          style={{
                            padding: '6px 12px',
                            border: '1px solid #fee2e2',
                            background: '#fff',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            color: '#dc2626',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <i className="material-icons" style={{ fontSize: '15px' }}>delete_outline</i>
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Pagination page={page} totalPages={data.totalPages} onPage={setPage} />
      </TableCard>

      {/* Add / Edit Sub-Admin Modal */}
      {modalOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '20px'
        }}>
          <div style={{
            background: '#fff', borderRadius: '16px', maxWidth: '640px', width: '100%',
            maxHeight: '90vh', overflowY: 'auto', padding: '28px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h5 style={{ margin: 0, fontWeight: '700', color: '#111827' }}>
                {editingAdmin ? 'Edit Sub-Admin' : 'Add New Sub-Admin'}
              </h5>
              <button
                onClick={() => setModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#9ca3af' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px', display: 'block' }}>Full Name *</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Sarah Miller"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px' }}
                  />
                </div>

                <div className="col-md-6 mb-3">
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px', display: 'block' }}>Email Address *</label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="admin@muulahub.com"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px' }}
                  />
                </div>

                <div className="col-md-6 mb-3">
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px', display: 'block' }}>
                    {editingAdmin ? 'Password (leave blank to keep current)' : 'Password *'}
                  </label>
                  <input
                    type="password"
                    required={!editingAdmin}
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    placeholder="Min 6 characters"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px' }}
                  />
                </div>

                <div className="col-md-6 mb-3">
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px', display: 'block' }}>Phone</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    placeholder="+1 555-0199"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px' }}
                  />
                </div>

                <div className="col-md-8 mb-3">
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px', display: 'block' }}>Administrative Role *</label>
                  <select
                    value={form.adminRoleId}
                    onChange={e => setForm({ ...form, adminRoleId: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px' }}
                  >
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name} {r.isSystem ? '(System Role)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-4 mb-3">
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px', display: 'block' }}>Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px' }}
                  >
                    <option value="active">Active</option>
                    <option value="blocked">Blocked / Suspended</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Custom Permission Overrides Toggle */}
              <div style={{ marginTop: '10px', padding: '16px', background: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: form.useCustomPermissions ? '14px' : '0' }}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '14px', color: '#111827' }}>Customize Permissions</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Override default role permissions specifically for this sub-admin</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.useCustomPermissions}
                    onChange={e => {
                      const enabled = e.target.checked;
                      setForm(prev => {
                        let perms = prev.customPermissions;
                        if (enabled && (!perms || !perms.length)) {
                          const roleObj = roles.find(r => r.id === parseInt(prev.adminRoleId));
                          perms = roleObj && Array.isArray(roleObj.permissions) ? roleObj.permissions : [];
                        }
                        return { ...prev, useCustomPermissions: enabled, customPermissions: perms };
                      });
                    }}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                </div>

                {form.useCustomPermissions && catalog && catalog.modules && (
                  <div style={{ maxHeight: '240px', overflowY: 'auto', marginTop: '10px' }}>
                    {Object.entries(catalog.modules).map(([modKey, modInfo]) => (
                      <div key={modKey} style={{ marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #f3f4f6' }}>
                        <div style={{ fontWeight: '600', fontSize: '13px', color: '#374151', marginBottom: '6px' }}>{modInfo.label}</div>
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                          {modInfo.actions.map(act => {
                            const permKey = `${modKey}:${act}`;
                            const isChecked = form.customPermissions.includes(permKey) || form.customPermissions.includes('*');
                            return (
                              <label key={act} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', cursor: 'pointer', color: '#4b5563' }}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleTogglePermission(permKey)}
                                />
                                {act}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    padding: '10px 18px', borderRadius: '8px', border: '1px solid #d1d5db',
                    background: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    padding: '10px 20px', borderRadius: '8px', border: 'none',
                    background: 'linear-gradient(135deg, #f91942 0%, #6366f1 100%)',
                    color: '#fff', fontSize: '14px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer'
                  }}
                >
                  {saving ? 'Saving...' : editingAdmin ? 'Update Sub-Admin' : 'Create Sub-Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubAdminsList;
