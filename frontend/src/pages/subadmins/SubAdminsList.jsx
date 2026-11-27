import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import Swal from 'sweetalert2';
import apiInstance from '../../services/api';
import {
  PageHeader, SearchBar, FilterSelect, TableCard, TableHead,
  Pagination, EmptyRow, LoadingRow, StatusBadge, formatDate
} from '../../components/common/PageTable';
import { isSuperAdminUser } from '../../utils/permissions';

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

// 12 Standard Modules defined in Specification
const MAIN_MODULES = [
  { key: 'users', label: 'Users', icon: 'people' },
  { key: 'categories', label: 'Service Categories', icon: 'category' },
  { key: 'bookings', label: 'Bookings', icon: 'event_available' },
  { key: 'payments', label: 'Payments', icon: 'payments' },
  { key: 'withdrawals', label: 'Withdrawals', icon: 'account_balance_wallet' },
  { key: 'wallets', label: 'Wallets', icon: 'account_balance' },
  { key: 'subadmins', label: 'Sub-Admins', icon: 'admin_panel_settings', superAdminOnlyActions: ['add', 'edit', 'delete'] },
  { key: 'roles', label: 'Roles & Permissions', icon: 'security', superAdminOnlyActions: ['add', 'edit', 'delete'] },
];

const CONTENT_MODULES = [
  { key: 'posts', label: 'Posts', icon: 'photo_library' },
  { key: 'reports', label: 'Reports', icon: 'flag' },
  { key: 'notifications', label: 'Notifications', icon: 'notifications' },
  { key: 'support', label: 'Support', icon: 'support_agent' },
];

const ALL_MODULES = [...MAIN_MODULES, ...CONTENT_MODULES];

const ACTIONS = [
  { key: 'add', label: 'Add' },
  { key: 'edit', label: 'Edit' },
  { key: 'view', label: 'View' },
  { key: 'delete', label: 'Delete' },
];

const SubAdminsList = () => {
  const isSuperAdmin = isSuperAdminUser();

  const [data, setData] = useState({ list: [], total: 0, totalPages: 1 });
  const [roles, setRoles] = useState([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleId, setRoleId] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  // Add / Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    userName: '',
    password: '',
    phone: '',
    countryCode: '+1',
    adminRoleId: '',
    status: 'active',
    customPermissions: []
  });

  // View Details Modal State
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewAdmin, setViewAdmin] = useState(null);

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

  // Open Add Modal (Super Admin Only)
  const openAddModal = () => {
    if (!isSuperAdmin) {
      toast.error('Only Super Admin has permission to add sub-admins');
      return;
    }
    setEditingAdmin(null);
    setFormError('');

    // Pre-populate with default permissions of the first role
    const defaultRoleId = roles.length > 0 ? roles[0].id : '';
    const firstRole = roles.find(r => r.id === defaultRoleId);
    const initialPerms = firstRole && Array.isArray(firstRole.permissions) ? [...firstRole.permissions] : [];

    setForm({
      name: '',
      email: '',
      userName: '',
      password: '',
      phone: '',
      countryCode: '+1',
      adminRoleId: defaultRoleId,
      status: 'active',
      customPermissions: initialPerms
    });
    setModalOpen(true);
  };

  // Open Edit Modal (Super Admin Only)
  const openEditModal = (admin) => {
    if (!isSuperAdmin) {
      toast.error('Only Super Admin has permission to edit sub-admins');
      return;
    }
    setEditingAdmin(admin);
    setFormError('');

    let perms = [];
    if (Array.isArray(admin.adminPermissions) && admin.adminPermissions.length > 0) {
      perms = [...admin.adminPermissions];
    } else if (admin.adminRole && Array.isArray(admin.adminRole.permissions)) {
      perms = [...admin.adminRole.permissions];
    }

    setForm({
      name: admin.name || '',
      email: admin.email || '',
      userName: admin.userName || '',
      password: '',
      phone: admin.phone || '',
      countryCode: admin.countryCode || '+1',
      adminRoleId: admin.adminRoleId || (roles[0]?.id || ''),
      status: admin.status || 'active',
      customPermissions: perms
    });
    setModalOpen(true);
  };

  // Open View Details Modal
  const openViewModal = (admin) => {
    setViewAdmin(admin);
    setViewModalOpen(true);
  };

  // Handle Role Selection change in Add/Edit modal -> updates permissions defaults if empty
  const handleRoleChange = (selectedRoleId) => {
    const roleObj = roles.find(r => r.id === parseInt(selectedRoleId));
    const rolePerms = roleObj && Array.isArray(roleObj.permissions) ? roleObj.permissions : [];
    setForm(prev => ({
      ...prev,
      adminRoleId: selectedRoleId,
      customPermissions: rolePerms.length > 0 ? [...rolePerms] : prev.customPermissions
    }));
  };

  // Permission Checkbox Toggle
  const togglePermission = (modKey, actKey) => {
    const permKey = `${modKey}:${actKey}`;
    setForm(prev => {
      const exists = prev.customPermissions.includes(permKey);
      const next = exists
        ? prev.customPermissions.filter(p => p !== permKey && p !== '*')
        : [...prev.customPermissions, permKey];
      return { ...prev, customPermissions: next };
    });
  };

  // Check if a permission is checked
  const isChecked = (modKey, actKey) => {
    if (form.customPermissions.includes('*')) return true;
    return form.customPermissions.includes(`${modKey}:${actKey}`);
  };

  // Toggle all 4 actions for an individual module
  const toggleModuleAll = (modKey) => {
    const modObj = ALL_MODULES.find(m => m.key === modKey);
    const applicableActions = ACTIONS.filter(a => {
      if (modObj?.superAdminOnlyActions?.includes(a.key)) return false;
      return true;
    }).map(a => a.key);

    const allChecked = applicableActions.every(act => isChecked(modKey, act));

    setForm(prev => {
      let next = prev.customPermissions.filter(p => !p.startsWith(`${modKey}:`) && p !== '*');
      if (!allChecked) {
        applicableActions.forEach(act => {
          next.push(`${modKey}:${act}`);
        });
      }
      return { ...prev, customPermissions: next };
    });
  };

  // Select All permissions across all modules
  const handleSelectAll = () => {
    const all = [];
    ALL_MODULES.forEach(mod => {
      ACTIONS.forEach(act => {
        if (!mod.superAdminOnlyActions?.includes(act.key)) {
          all.push(`${mod.key}:${act.key}`);
        }
      });
    });
    setForm(prev => ({ ...prev, customPermissions: all }));
  };

  // Clear All permissions
  const handleClearAll = () => {
    setForm(prev => ({ ...prev, customPermissions: [] }));
  };

  // Save Sub-Admin
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
    setFormError('');
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone,
        countryCode: form.countryCode,
        adminRoleId: form.adminRoleId,
        status: form.status,
        adminPermissions: form.customPermissions
      };

      if (form.password && form.password.trim()) {
        payload.password = form.password.trim();
      }

      if (editingAdmin) {
        await apiInstance.put(`/subadmins/${editingAdmin.id}`, payload);
        toast.success('Sub-Admin updated successfully');
      } else {
        await apiInstance.post('/subadmins', payload);
        toast.success('Sub-Admin created successfully');
      }

      setModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.message || err.response?.data?.msg || 'Operation failed';
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // Delete Sub-Admin
  const handleDelete = (admin) => {
    if (!isSuperAdmin) {
      toast.error('Only Super Admin has permission to delete sub-admins');
      return;
    }

    Swal.fire({
      title: 'Remove Sub-Admin?',
      text: `Are you sure you want to deactivate and remove ${admin.name} (@${admin.userName})?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, remove',
      cancelButtonText: 'Cancel'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await apiInstance.delete(`/subadmins/${admin.id}`);
          toast.success('Sub-Admin removed successfully');
          fetchData();
        } catch (err) {
          console.error(err);
          const msg = err.response?.data?.message || err.response?.data?.msg || 'Failed to remove sub-admin';
          toast.error(msg);
        }
      }
    });
  };

  // Render Permission Module Row
  const renderModuleRow = (mod) => {
    const applicableActions = ACTIONS.filter(a => !mod.superAdminOnlyActions?.includes(a.key));
    const allChecked = applicableActions.every(act => isChecked(mod.key, act.key));

    return (
      <tr key={mod.key} style={{ borderBottom: '1px solid #f3f4f6' }}>
        <td style={{ padding: '12px 16px', fontWeight: '600', color: '#1f2937', fontSize: '13px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="material-icons" style={{ fontSize: '18px', color: '#6366f1' }}>{mod.icon}</i>
            <span>{mod.label}</span>
          </div>
        </td>

        {ACTIONS.map(act => {
          const isRestricted = mod.superAdminOnlyActions?.includes(act.key);
          const checked = !isRestricted && isChecked(mod.key, act.key);

          return (
            <td key={act.key} style={{ padding: '12px 16px', textAlign: 'center' }}>
              {isRestricted ? (
                <span
                  title="Only Super Admin has permission to perform this action"
                  style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    color: '#9ca3af',
                    background: '#f3f4f6',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '2px',
                    cursor: 'not-allowed'
                  }}
                >
                  <i className="material-icons" style={{ fontSize: '12px' }}>lock</i>
                  Super Only
                </span>
              ) : (
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => togglePermission(mod.key, act.key)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#6366f1' }}
                />
              )}
            </td>
          );
        })}

        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
          <button
            type="button"
            onClick={() => toggleModuleAll(mod.key)}
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: '600',
              borderRadius: '6px',
              border: '1px solid #e5e7eb',
              background: allChecked ? '#fee2e2' : '#f0fdf4',
              color: allChecked ? '#b91c1c' : '#15803d',
              cursor: 'pointer'
            }}
          >
            {allChecked ? 'Deselect All' : 'Select All'}
          </button>
        </td>
      </tr>
    );
  };

  return (
    <div>
      <ToastContainer position="top-right" autoClose={2500} />

      <PageHeader
        title="Sub-Admins & Team Management"
        subtitle={`${data.total} registered administrative accounts`}
        action={
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link
              to="/roles"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 16px',
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

            {/* ONLY Super Admin can add new Sub-Admins */}
            {isSuperAdmin && (
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
            )}
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
                const hasCustomPerms = Array.isArray(a.adminPermissions) && a.adminPermissions.length > 0;
                const permissionsCount = hasCustomPerms
                  ? a.adminPermissions.length
                  : (Array.isArray(a.adminRole?.permissions) ? a.adminRole.permissions.length : 0);

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
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: hasCustomPerms ? '#7c3aed' : '#4b5563',
                        fontWeight: '600'
                      }}>
                        <i className="material-icons" style={{ fontSize: '15px' }}>
                          {hasCustomPerms ? 'tune' : 'verified_user'}
                        </i>
                        {permissionsCount} permission(s)
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <StatusBadge status={a.status || 'active'} />
                    </td>
                    <td style={{ padding: '14px 16px', color: '#6b7280', fontSize: '13px' }}>
                      {a.loginTime ? formatDate(new Date(a.loginTime * 1000)) : 'Never'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {/* View Details button (Available for both Super Admin and permitted Sub-Admins) */}
                        <button
                          onClick={() => openViewModal(a)}
                          title="View Details"
                          style={{
                            padding: '6px 10px',
                            border: '1px solid #e5e7eb',
                            background: '#fff',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            color: '#4b5563',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <i className="material-icons" style={{ fontSize: '15px' }}>visibility</i>
                          View
                        </button>

                        {/* Edit and Delete buttons (ONLY for Super Admin) */}
                        {isSuperAdmin && (
                          <>
                            <button
                              onClick={() => openEditModal(a)}
                              title="Edit Sub-Admin"
                              style={{
                                padding: '6px 10px',
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
                              title="Remove Sub-Admin"
                              style={{
                                padding: '6px 10px',
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
                          </>
                        )}
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

      {/* Add / Edit Sub-Admin Modal (Super Admin Only) */}
      {modalOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          zIndex: 9999, padding: '24px 16px', overflowY: 'auto'
        }}>
          <div style={{
            background: '#fff', borderRadius: '16px', maxWidth: '840px', width: '100%',
            margin: '20px auto 40px auto', padding: '28px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h5 style={{ margin: 0, fontWeight: '700', color: '#111827' }}>
                  {editingAdmin ? `Edit Sub-Admin: ${editingAdmin.name}` : 'Add New Sub-Admin'}
                </h5>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                  Configure sub-admin credentials and module-wise Add, Edit, View, and Delete permissions.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#9ca3af' }}
              >
                ✕
              </button>
            </div>

            {formError && (
              <div style={{
                background: '#fee2e2', border: '1px solid #fecaca', color: '#b91c1c',
                padding: '10px 14px', borderRadius: '8px', fontSize: '13px',
                marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                <i className="material-icons" style={{ fontSize: '18px' }}>error_outline</i>
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSave}>
              {/* Account Credentials */}
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
                    placeholder="e.g. sarah@muulahub.com"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px' }}
                  />
                </div>

                <div className="col-md-6 mb-3">
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px', display: 'block' }}>
                    {editingAdmin ? 'New Password (leave blank to keep current)' : 'Password *'}
                  </label>
                  <input
                    type="password"
                    required={!editingAdmin}
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    placeholder={editingAdmin ? '••••••••' : 'Minimum 6 characters'}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px' }}
                  />
                </div>

                <div className="col-md-6 mb-3">
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px', display: 'block' }}>Mobile Number</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={form.countryCode}
                      onChange={e => setForm({ ...form, countryCode: e.target.value })}
                      placeholder="+1"
                      style={{ width: '80px', padding: '10px 12px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', textAlign: 'center' }}
                    />
                    <input
                      type="text"
                      value={form.phone}
                      onChange={e => setForm({ ...form, phone: e.target.value })}
                      placeholder="e.g. 555-0199"
                      style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px' }}
                    />
                  </div>
                </div>

                <div className="col-md-6 mb-3">
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px', display: 'block' }}>Administrative Role *</label>
                  <select
                    value={form.adminRoleId}
                    onChange={e => handleRoleChange(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px' }}
                  >
                    <option value="">Select a role</option>
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name} ({r.slug})</option>
                    ))}
                  </select>
                </div>

                <div className="col-md-6 mb-3">
                  <label style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px', display: 'block' }}>Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm({ ...form, status: e.target.value })}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px' }}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="blocked">Blocked / Suspended</option>
                  </select>
                </div>
              </div>

              {/* Module-Wise Permission Management Matrix */}
              <div style={{
                marginTop: '16px',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                overflow: 'hidden',
                background: '#ffffff'
              }}>
                <div style={{
                  padding: '16px 20px',
                  background: '#f8fafc',
                  borderBottom: '1px solid #e5e7eb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '15px', color: '#0f172a' }}>
                      Module-Wise Permission Matrix (RBAC)
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      Assign independent <strong>Add | Edit | View | Delete</strong> permissions per module.
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      fontSize: '12px',
                      fontWeight: '700',
                      padding: '4px 10px',
                      borderRadius: '20px',
                      background: '#ede9fe',
                      color: '#6d28d9'
                    }}>
                      Selected: {form.customPermissions.length} permission(s)
                    </span>

                    <button
                      type="button"
                      onClick={handleSelectAll}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid #d1d5db',
                        background: '#ffffff',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#374151',
                        cursor: 'pointer'
                      }}
                    >
                      Select All
                    </button>

                    <button
                      type="button"
                      onClick={handleClearAll}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '6px',
                        border: '1px solid #fee2e2',
                        background: '#fff',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#dc2626',
                        cursor: 'pointer'
                      }}
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ position: 'sticky', top: 0, background: '#f1f5f9', zIndex: 2 }}>
                      <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                        <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase' }}>Module</th>
                        <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', width: '90px' }}>Add</th>
                        <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', width: '90px' }}>Edit</th>
                        <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', width: '90px' }}>View</th>
                        <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', width: '90px' }}>Delete</th>
                        <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', width: '120px' }}>Toggle</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Section 1: Main Modules */}
                      <tr style={{ background: '#f8fafc' }}>
                        <td colSpan={6} style={{ padding: '8px 16px', fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Main Modules
                        </td>
                      </tr>
                      {MAIN_MODULES.map(renderModuleRow)}

                      {/* Section 2: Content Modules */}
                      <tr style={{ background: '#f8fafc' }}>
                        <td colSpan={6} style={{ padding: '8px 16px', fontSize: '11px', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Content Modules
                        </td>
                      </tr>
                      {CONTENT_MODULES.map(renderModuleRow)}
                    </tbody>
                  </table>
                </div>
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
                    padding: '10px 22px', borderRadius: '8px', border: 'none',
                    background: 'linear-gradient(135deg, #f91942 0%, #6366f1 100%)',
                    color: '#fff', fontSize: '14px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.25)'
                  }}
                >
                  {saving ? 'Saving Permissions...' : editingAdmin ? 'Update Sub-Admin & Permissions' : 'Create Sub-Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Sub-Admin Details Modal */}
      {viewModalOpen && viewAdmin && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '24px 16px'
        }}>
          <div style={{
            background: '#fff', borderRadius: '16px', maxWidth: '640px', width: '100%',
            padding: '28px', maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h5 style={{ margin: 0, fontWeight: '700', color: '#111827' }}>
                Sub-Admin Details: {viewAdmin.name}
              </h5>
              <button
                onClick={() => setViewModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#9ca3af' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Full Name</div>
                <div style={{ fontSize: '14px', color: '#111827', fontWeight: '600' }}>{viewAdmin.name}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Username</div>
                <div style={{ fontSize: '14px', color: '#111827', fontFamily: 'monospace' }}>@{viewAdmin.userName}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Email Address</div>
                <div style={{ fontSize: '14px', color: '#111827' }}>{viewAdmin.email}</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Phone</div>
                <div style={{ fontSize: '14px', color: '#111827' }}>
                  {viewAdmin.phone ? `${viewAdmin.countryCode || ''} ${viewAdmin.phone}` : '—'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Assigned Role</div>
                <div style={{ fontSize: '14px', color: '#111827', fontWeight: '600' }}>
                  {viewAdmin.adminRole?.name || viewAdmin.adminRoleSlug}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Account Status</div>
                <div><StatusBadge status={viewAdmin.status || 'active'} /></div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#111827', marginBottom: '12px' }}>
                Granted Module Permissions:
              </div>

              {(() => {
                const perms = Array.isArray(viewAdmin.adminPermissions) && viewAdmin.adminPermissions.length > 0
                  ? viewAdmin.adminPermissions
                  : (Array.isArray(viewAdmin.adminRole?.permissions) ? viewAdmin.adminRole.permissions : []);

                if (perms.includes('*')) {
                  return (
                    <div style={{ padding: '12px', background: '#fef2f2', borderRadius: '8px', color: '#991b1b', fontSize: '13px', fontWeight: '600' }}>
                      <i className="material-icons" style={{ fontSize: '16px', verticalAlign: 'middle', marginRight: '4px' }}>admin_panel_settings</i>
                      Super Admin Full Access (Wildcard *)
                    </div>
                  );
                }

                if (!perms.length) {
                  return (
                    <div style={{ padding: '12px', background: '#f9fafb', borderRadius: '8px', color: '#6b7280', fontSize: '13px' }}>
                      No permissions currently assigned to this account.
                    </div>
                  );
                }

                // Group permissions by module
                const grouped = {};
                perms.forEach(p => {
                  const [m, a] = p.split(':');
                  if (!grouped[m]) grouped[m] = [];
                  if (a) grouped[m].push(a);
                });

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {Object.entries(grouped).map(([mod, acts]) => {
                      const modObj = ALL_MODULES.find(m => m.key === mod);
                      const label = modObj ? modObj.label : mod;

                      return (
                        <div key={mod} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          background: '#f8fafc',
                          borderRadius: '8px',
                          border: '1px solid #f1f5f9'
                        }}>
                          <span style={{ fontWeight: '600', fontSize: '13px', color: '#1e293b' }}>
                            {label}
                          </span>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {acts.map(act => (
                              <span key={act} style={{
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '700',
                                textTransform: 'uppercase',
                                background: act === 'delete' ? '#fee2e2' : act === 'add' ? '#dcfce7' : act === 'edit' ? '#fef3c7' : '#e0e7ff',
                                color: act === 'delete' ? '#b91c1c' : act === 'add' ? '#15803d' : act === 'edit' ? '#b45309' : '#3730a3'
                              }}>
                                {act}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button
                type="button"
                onClick={() => setViewModalOpen(false)}
                style={{
                  padding: '9px 18px', borderRadius: '8px', border: '1px solid #d1d5db',
                  background: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubAdminsList;
