import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import Swal from 'sweetalert2';
import apiInstance from '../../services/api';
import {
  PageHeader, TableCard, TableHead, LoadingRow, EmptyRow, formatDate
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

const RolesList = () => {
  const [roles, setRoles] = useState([]);
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    permissions: []
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesRes, catRes] = await Promise.all([
        apiInstance.get('/roles'),
        apiInstance.get('/permissions-catalog')
      ]);
      if (rolesRes.data?.body) setRoles(rolesRes.data.body);
      if (catRes.data?.body) setCatalog(catRes.data.body);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load roles and permissions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openAddModal = () => {
    setEditingRole(null);
    setForm({
      name: '',
      slug: '',
      description: '',
      permissions: []
    });
    setModalOpen(true);
  };

  const openEditModal = (role) => {
    setEditingRole(role);
    setForm({
      name: role.name || '',
      slug: role.slug || '',
      description: role.description || '',
      permissions: Array.isArray(role.permissions) ? [...role.permissions] : []
    });
    setModalOpen(true);
  };

  const togglePermission = (key) => {
    setForm((prev) => {
      const perms = new Set(prev.permissions);
      if (perms.has(key)) perms.delete(key);
      else perms.add(key);
      return { ...prev, permissions: Array.from(perms) };
    });
  };

  const toggleModulePermissions = (moduleActions) => {
    setForm((prev) => {
      const current = new Set(prev.permissions);
      const allSelected = moduleActions.every((a) => current.has(a.key));
      if (allSelected) {
        moduleActions.forEach((a) => current.delete(a.key));
      } else {
        moduleActions.forEach((a) => current.add(a.key));
      }
      return { ...prev, permissions: Array.from(current) };
    });
  };

  const selectAllPermissions = () => {
    if (!catalog?.modules) return;
    const all = [];
    Object.values(catalog.modules).forEach((mod) => {
      mod.actions.forEach((act) => all.push(act.key));
    });
    setForm((prev) => ({ ...prev, permissions: all }));
  };

  const deselectAllPermissions = () => {
    setForm((prev) => ({ ...prev, permissions: [] }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Role name is required');
      return;
    }

    setSaving(true);
    try {
      if (editingRole) {
        await apiInstance.put(`/roles/${editingRole.id}`, {
          name: form.name,
          description: form.description,
          permissions: form.permissions
        });
        toast.success('Role updated successfully');
      } else {
        await apiInstance.post('/roles', {
          name: form.name,
          slug: form.slug || form.name.toLowerCase().replace(/[^a-z0-9]/g, '_'),
          description: form.description,
          permissions: form.permissions
        });
        toast.success('Custom role created successfully');
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to save role');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (role) => {
    if (role.isSystem) {
      toast.warning('System roles cannot be deleted');
      return;
    }
    const result = await Swal.fire({
      title: 'Delete Role?',
      html: `Are you sure you want to delete role <b>${role.name}</b>?<br/>This cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, Delete'
    });

    if (result.isConfirmed) {
      try {
        await apiInstance.delete(`/roles/${role.id}`);
        toast.success('Role deleted successfully');
        fetchData();
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to delete role');
      }
    }
  };

  return (
    <div className="container-fluid py-4" style={{ minHeight: '80vh' }}>
      <ToastContainer position="top-right" autoClose={3000} />

      <PageHeader
        title="Roles & Permissions"
        subtitle="Manage administrative roles, access control matrices, and role visibility across Muula Hub modules"
        actions={
          <div className="d-flex gap-2">
            <Link
              to="/subadmins"
              className="btn btn-outline-secondary d-flex align-items-center gap-1"
              style={{ borderRadius: '8px', fontWeight: 600 }}
            >
              <i className="material-icons" style={{ fontSize: '18px' }}>admin_panel_settings</i>
              Manage Sub-Admins
            </Link>
            <button
              onClick={openAddModal}
              className="btn btn-primary d-flex align-items-center gap-1"
              style={{ borderRadius: '8px', fontWeight: 600 }}
            >
              <i className="material-icons" style={{ fontSize: '18px' }}>add</i>
              Create Custom Role
            </button>
          </div>
        }
      />

      {/* Roles Grid / Table */}
      <TableCard>
        <div className="table-responsive">
          <table className="table align-items-center mb-0">
            <TableHead
              columns={[
                'Role & Description',
                'Slug / Key',
                'Type',
                'Assigned Users',
                'Permissions Count',
                'Actions'
              ]}
            />
            <tbody>
              {loading ? (
                <LoadingRow colSpan={6} />
              ) : roles.length === 0 ? (
                <EmptyRow colSpan={6} message="No roles configured" />
              ) : (
                roles.map((role) => {
                  const style = ROLE_COLORS[role.slug] || { bg: '#f1f5f9', color: '#334155' };
                  const permsCount = Array.isArray(role.permissions) ? role.permissions.length : 0;
                  const isAllPerms = role.slug === 'super_admin';

                  return (
                    <tr key={role.id}>
                      <td style={{ padding: '16px 20px', maxWidth: '340px' }}>
                        <div className="d-flex align-items-start gap-2">
                          <span
                            style={{
                              display: 'inline-block',
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              backgroundColor: style.color,
                              marginTop: '6px',
                              flexShrink: 0
                            }}
                          />
                          <div>
                            <h6 className="mb-0 text-sm font-weight-bold" style={{ color: '#1e293b' }}>
                              {role.name}
                            </h6>
                            <p className="text-xs text-muted mb-0" style={{ lineHeight: '1.4' }}>
                              {role.description || 'No description provided'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <code
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            color: '#475569'
                          }}
                        >
                          {role.slug}
                        </code>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        {role.isSystem ? (
                          <span
                            className="badge"
                            style={{
                              backgroundColor: '#e0f2fe',
                              color: '#0369a1',
                              fontWeight: 600,
                              borderRadius: '6px',
                              padding: '5px 9px'
                            }}
                          >
                            System Role
                          </span>
                        ) : (
                          <span
                            className="badge"
                            style={{
                              backgroundColor: '#f3e8ff',
                              color: '#7e22ce',
                              fontWeight: 600,
                              borderRadius: '6px',
                              padding: '5px 9px'
                            }}
                          >
                            Custom
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <span className="badge badge-light" style={{ fontSize: '13px', fontWeight: 600 }}>
                          {role.usersCount || 0} users
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        {isAllPerms ? (
                          <span
                            className="badge"
                            style={{
                              backgroundColor: '#dcfce7',
                              color: '#15803d',
                              fontWeight: 600,
                              borderRadius: '6px',
                              padding: '5px 9px'
                            }}
                          >
                            Full Access (All Modules)
                          </span>
                        ) : (
                          <span
                            className="badge"
                            style={{
                              backgroundColor: style.bg,
                              color: style.color,
                              fontWeight: 600,
                              borderRadius: '6px',
                              padding: '5px 9px'
                            }}
                          >
                            {permsCount} permissions
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'center' }}>
                        <div className="d-flex justify-content-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(role)}
                            className="btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1"
                            style={{ borderRadius: '6px', padding: '6px 12px', fontSize: '12px' }}
                            title="Edit Permissions & Details"
                          >
                            <i className="material-icons" style={{ fontSize: '15px' }}>
                              {role.isSystem ? 'visibility' : 'edit'}
                            </i>
                            {role.isSystem ? 'View / Edit Permissions' : 'Edit'}
                          </button>
                          {!role.isSystem && (
                            <button
                              type="button"
                              onClick={() => handleDelete(role)}
                              className="btn btn-sm btn-outline-danger"
                              style={{ borderRadius: '6px', padding: '6px 10px' }}
                              title="Delete Role"
                            >
                              <i className="material-icons" style={{ fontSize: '15px' }}>delete</i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </TableCard>

      {/* Role Edit/Add Modal */}
      {modalOpen && (
        <div
          className="modal fade show"
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
          tabIndex="-1"
        >
          <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content" style={{ borderRadius: '12px', border: 'none' }}>
              <div className="modal-header" style={{ borderBottom: '1px solid #f1f5f9', padding: '18px 24px' }}>
                <div>
                  <h5 className="modal-title font-weight-bold" style={{ color: '#0f172a' }}>
                    {editingRole
                      ? (editingRole.isSystem ? `Role Permissions: ${editingRole.name}` : `Edit Role: ${editingRole.name}`)
                      : 'Create Custom Administrative Role'}
                  </h5>
                  <p className="text-xs text-muted mb-0">
                    {editingRole?.isSystem
                      ? 'Core system roles have predefined defaults. You can adjust permissions assigned to this role.'
                      : 'Define custom role attributes and configure granular permission access across system modules.'}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setModalOpen(false)}
                  disabled={saving}
                />
              </div>

              <form onSubmit={handleSave}>
                <div className="modal-body" style={{ padding: '24px', maxHeight: '72vh', overflowY: 'auto' }}>
                  {/* Basic Information */}
                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <label className="form-label text-xs font-weight-bold text-uppercase text-secondary">
                        Role Name <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Regional Support Lead"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        disabled={editingRole?.isSystem}
                        required
                        style={{ borderRadius: '8px', padding: '10px 14px' }}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label text-xs font-weight-bold text-uppercase text-secondary">
                        Role Identifier (Slug)
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="auto-generated from name"
                        value={form.slug}
                        onChange={(e) => setForm({ ...form, slug: e.target.value })}
                        disabled={!!editingRole}
                        style={{ borderRadius: '8px', padding: '10px 14px' }}
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label text-xs font-weight-bold text-uppercase text-secondary">
                        Role Description / Operational Scope
                      </label>
                      <textarea
                        className="form-control"
                        rows="2"
                        placeholder="Summary of responsibilities and restrictions according to Muula Hub spec..."
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        disabled={editingRole?.isSystem}
                        style={{ borderRadius: '8px', padding: '10px 14px' }}
                      />
                    </div>
                  </div>

                  {/* Super admin notice */}
                  {editingRole?.slug === 'super_admin' ? (
                    <div className="alert alert-info d-flex align-items-center gap-2 mb-3" style={{ borderRadius: '8px' }}>
                      <i className="material-icons" style={{ fontSize: '20px' }}>info</i>
                      <div className="text-sm">
                        <b>Super Admin Bypass:</b> This role holds unrestricted access to all modules, financial operations, audit logs, and settings by architecture. Individual switches are enabled by default.
                      </div>
                    </div>
                  ) : null}

                  {/* Permission Matrix */}
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <h6 className="mb-0 font-weight-bold" style={{ color: '#0f172a' }}>
                        Module Permission Matrix
                      </h6>
                      <small className="text-muted">
                        Selected: <b>{form.permissions.length}</b> permission(s)
                      </small>
                    </div>
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        onClick={selectAllPermissions}
                        className="btn btn-sm btn-outline-secondary"
                        style={{ borderRadius: '6px' }}
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={deselectAllPermissions}
                        className="btn btn-sm btn-outline-secondary"
                        style={{ borderRadius: '6px' }}
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  {catalog?.modules && (
                    <div className="row g-3">
                      {Object.entries(catalog.modules).map(([modKey, mod]) => {
                        const currentPerms = new Set(form.permissions);
                        const allSelected = mod.actions.every((a) => currentPerms.has(a.key));
                        const someSelected = mod.actions.some((a) => currentPerms.has(a.key));

                        return (
                          <div className="col-md-6" key={modKey}>
                            <div
                              style={{
                                border: '1px solid #e2e8f0',
                                borderRadius: '10px',
                                background: '#ffffff',
                                overflow: 'hidden'
                              }}
                            >
                              <div
                                style={{
                                  padding: '10px 14px',
                                  background: '#f8fafc',
                                  borderBottom: '1px solid #e2e8f0',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center'
                                }}
                              >
                                <div>
                                  <span className="font-weight-bold text-sm text-dark">
                                    {mod.label}
                                  </span>
                                  <span className="text-xs text-muted ms-2">
                                    ({mod.actions.filter((a) => currentPerms.has(a.key)).length}/{mod.actions.length})
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => toggleModulePermissions(mod.actions)}
                                  className="btn btn-xs btn-link p-0 text-decoration-none"
                                  style={{ fontSize: '11px', fontWeight: 600 }}
                                >
                                  {allSelected ? 'Deselect All' : 'Select All'}
                                </button>
                              </div>

                              <div style={{ padding: '12px 14px' }}>
                                <div className="d-flex flex-column gap-2">
                                  {mod.actions.map((act) => {
                                    const checked = currentPerms.has(act.key);
                                    return (
                                      <label
                                        key={act.key}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '8px',
                                          margin: 0,
                                          cursor: 'pointer',
                                          fontSize: '13px'
                                        }}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={() => togglePermission(act.key)}
                                          style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                        />
                                        <span style={{ color: checked ? '#0f172a' : '#64748b' }}>
                                          {act.label}
                                        </span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="modal-footer" style={{ borderTop: '1px solid #f1f5f9', padding: '16px 24px' }}>
                  <button
                    type="button"
                    className="btn btn-light"
                    onClick={() => setModalOpen(false)}
                    disabled={saving}
                    style={{ borderRadius: '8px' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving}
                    style={{ borderRadius: '8px' }}
                  >
                    {saving ? 'Saving...' : 'Save Permissions'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RolesList;
