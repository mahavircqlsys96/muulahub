import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import { useDispatch } from 'react-redux';
import { get_dashboard_count, get_dashboard_graph } from '../utils/thunkApis';
import 'react-toastify/dist/ReactToastify.css';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
  ResponsiveContainer, LineChart, Line, AreaChart, Area
} from 'recharts';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const StatCard = ({ url, icon, title, count, color, bgColor }) => (
  <div className="col-xl-3 col-lg-4 col-sm-6 mb-4">
    <Link to={url} style={{ textDecoration: 'none' }}>
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        padding: '20px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        border: '1px solid rgba(0,0,0,0.04)',
        transition: 'transform 0.2s, box-shadow 0.2s',
        cursor: 'pointer'
      }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'; }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: '#9ca3af', fontSize: '12px', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '6px' }}>{title}</div>
            <div style={{ color: '#111827', fontSize: '28px', fontWeight: '700' }}>{typeof count === 'number' ? (count % 1 !== 0 ? `$${count.toFixed(2)}` : count.toLocaleString()) : (count ?? 0)}</div>
          </div>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: bgColor || 'rgba(249,115,22,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <i className="material-icons" style={{ color: color || '#f97316', fontSize: '26px' }}>{icon}</i>
          </div>
        </div>
      </div>
    </Link>
  </div>
);

const Dashboard = () => {
  const dispatch = useDispatch();
  const [dash, setDash] = useState({});
  const [loading, setLoading] = useState(false);
  const [userChart, setUserChart] = useState([]);
  const [bookingChart, setBookingChart] = useState([]);
  const [revenueChart, setRevenueChart] = useState([]);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const { payload } = await dispatch(get_dashboard_count());
      setDash(payload || {});
    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [dispatch]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const loginmessage = localStorage.getItem('loginmessage');
  useEffect(() => {
    if (loginmessage) {
      toast.success('Welcome back!');
      localStorage.removeItem('loginmessage');
    }
  }, [loginmessage]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { payload } = await dispatch(get_dashboard_graph());
        const uData = payload?.data || [];
        const bData = payload?.bookings || [];
        const rData = payload?.revenue || [];
        setUserChart(uData.map((item, idx) => ({
          month: MONTH_LABELS[idx],
          Users: item?.user || 0,
          Providers: item?.provider || 0,
        })));
        setBookingChart(bData.map((item, idx) => ({
          month: MONTH_LABELS[idx],
          Bookings: item?.count ?? 0,
        })));
        setRevenueChart(rData.map((item, idx) => ({
          month: MONTH_LABELS[idx],
          Revenue: Number(item?.total ?? 0),
        })));
      } catch {
        /* silent */
      }
    };
    fetchStats();
  }, [dispatch]);

  const stats = useMemo(() => dash?.data || {}, [dash]);

  const statCards = [
    { url: "/usersList", icon: "people", title: "Total Users", count: stats.usersCount, color: "#3b82f6", bgColor: "rgba(59,130,246,0.1)" },
    { url: "/providers", icon: "verified_user", title: "Providers", count: stats.providersCount, color: "#10b981", bgColor: "rgba(16,185,129,0.1)" },
    { url: "/bookings", icon: "event_available", title: "Bookings", count: stats.bookingsCount, color: "#f97316", bgColor: "rgba(249,115,22,0.1)" },
    { url: "/payments", icon: "payments", title: "Revenue (Admin)", count: stats.totalRevenue, color: "#ff4d6d", bgColor: "rgba(255,77,109,0.1)" },
    { url: "/bookings", icon: "pending_actions", title: "Active Bookings", count: stats.activeBookings, color: "#06b6d4", bgColor: "rgba(6,182,212,0.1)" },
    { url: "/payments", icon: "trending_up", title: "Monthly Revenue", count: stats.monthlyRevenue, color: "#f59e0b", bgColor: "rgba(245,158,11,0.1)" },
    { url: "/withdrawals", icon: "account_balance_wallet", title: "Pending Withdrawals", count: stats.pendingWithdrawals, color: "#ef4444", bgColor: "rgba(239,68,68,0.1)" },
    { url: "/bookings", icon: "request_quote", title: "Avg Booking Value", count: stats.averageBookingValue || 0, color: "#14b8a6", bgColor: "rgba(20,184,166,0.1)" },
  ];

  return (
    <div style={{ position: 'relative' }}>
      <ToastContainer position="top-right" autoClose={2500} hideProgressBar closeOnClick draggable pauseOnHover />

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ fontWeight: '700', color: '#111827', margin: 0 }}>Dashboard</h4>
        <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>Welcome back! Here's what's happening.</p>
      </div>

      {/* Stats */}
      <div className="row">
        {statCards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>

      {/* Charts */}
      <div className="row mt-2">
        <div className="col-lg-8 mb-4">
          <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <h6 style={{ fontWeight: '600', color: '#111827', marginBottom: '16px' }}>User & Provider Registrations</h6>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={userChart} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Users" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Providers" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="col-lg-4 mb-4">
          <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <h6 style={{ fontWeight: '600', color: '#111827', marginBottom: '16px' }}>Booking Trend</h6>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={bookingChart}>
                <defs>
                  <linearGradient id="bookingGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="Bookings" stroke="#f97316" fill="url(#bookingGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="col-12 mb-4">
          <div style={{ background: '#fff', borderRadius: '16px', padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <h6 style={{ fontWeight: '600', color: '#111827', marginBottom: '16px' }}>Revenue Analytics (Admin Commission)</h6>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueChart}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff4d6d" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#ff4d6d" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`, 'Revenue']} />
                <Area type="monotone" dataKey="Revenue" stroke="#ff4d6d" fill="url(#revenueGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Data */}
      <div className="row">
        <div className="col-lg-4 mb-4">
          <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', background: 'linear-gradient(90deg, #f97316, #fb923c)', color: '#fff' }}>
              <h6 style={{ margin: 0, fontWeight: '600' }}>Recent Bookings</h6>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {(dash?.recentBookings || []).slice(0, 6).map((b) => (
                <li key={b.id} style={{ padding: '12px 20px', borderBottom: '1px solid #f3f4f6' }}>
                  <Link to={`/bookings/${b.id}`} style={{ textDecoration: 'none', color: '#374151', fontSize: '13px' }}>
                    <div style={{ fontWeight: '500' }}>#{b.bookingNumber}</div>
                    <div style={{ color: '#9ca3af', fontSize: '12px' }}>{b.service?.title || 'Service'} • {b.user?.name || 'User'}</div>
                  </Link>
                </li>
              ))}
              {!dash?.recentBookings?.length && <li style={{ padding: '20px', color: '#9ca3af', textAlign: 'center', fontSize: '13px' }}>No bookings yet</li>}
            </ul>
          </div>
        </div>
        <div className="col-lg-4 mb-4">
          <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', background: 'linear-gradient(90deg, #3b82f6, #60a5fa)', color: '#fff' }}>
              <h6 style={{ margin: 0, fontWeight: '600' }}>Recent Users</h6>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {(dash?.recentUsers || []).map((u) => (
                <li key={u.id} style={{ padding: '12px 20px', borderBottom: '1px solid #f3f4f6' }}>
                  <Link to={`/usersView/${u.id}`} style={{ textDecoration: 'none', color: '#374151', fontSize: '13px' }}>
                    <div style={{ fontWeight: '500' }}>{u.name}</div>
                    <div style={{ color: '#9ca3af', fontSize: '12px' }}>{u.email}</div>
                  </Link>
                </li>
              ))}
              {!dash?.recentUsers?.length && <li style={{ padding: '20px', color: '#9ca3af', textAlign: 'center', fontSize: '13px' }}>No users yet</li>}
            </ul>
          </div>
        </div>
        <div className="col-lg-4 mb-4">
          <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', background: 'linear-gradient(90deg, #10b981, #34d399)', color: '#fff' }}>
              <h6 style={{ margin: 0, fontWeight: '600' }}>Recent Providers</h6>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {(dash?.recentProviders || []).map((p) => (
                <li key={p.id} style={{ padding: '12px 20px', borderBottom: '1px solid #f3f4f6' }}>
                  <Link to={`/providers/${p.id}`} style={{ textDecoration: 'none', color: '#374151', fontSize: '13px' }}>
                    <div style={{ fontWeight: '500' }}>{p.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                      <span style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '20px',
                        background: p.providerStatus === 'approved' ? '#dcfce7' : p.providerStatus === 'rejected' ? '#fee2e2' : '#fef9c3',
                        color: p.providerStatus === 'approved' ? '#16a34a' : p.providerStatus === 'rejected' ? '#dc2626' : '#ca8a04',
                        fontWeight: '500'
                      }}>
                        {p.providerStatus}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
              {!dash?.recentProviders?.length && <li style={{ padding: '20px', color: '#9ca3af', textAlign: 'center', fontSize: '13px' }}>No providers yet</li>}
            </ul>
          </div>
        </div>
      </div>

      {/* Advanced Analytics Data */}
      <div className="row">
        <div className="col-lg-6 mb-4">
          <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', background: 'linear-gradient(90deg, #ff4d6d, #a78bfa)', color: '#fff' }}>
              <h6 style={{ margin: 0, fontWeight: '600' }}>Top Categories</h6>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {(dash?.topCategories || []).map((c, i) => (
                <li key={i} style={{ padding: '12px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ color: '#374151', fontSize: '14px', fontWeight: '500' }}>{c.name}</div>
                  <div style={{ color: '#6b7280', fontSize: '13px', fontWeight: '600', background: '#f3f4f6', padding: '4px 10px', borderRadius: '12px' }}>{c.count} Bookings</div>
                </li>
              ))}
              {!dash?.topCategories?.length && <li style={{ padding: '20px', color: '#9ca3af', textAlign: 'center', fontSize: '13px' }}>No categories yet</li>}
            </ul>
          </div>
        </div>
        
        <div className="col-lg-6 mb-4">
          <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', background: 'linear-gradient(90deg, #ec4899, #f472b6)', color: '#fff' }}>
              <h6 style={{ margin: 0, fontWeight: '600' }}>Top Locations</h6>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {(dash?.topLocations || []).map((l, i) => (
                <li key={i} style={{ padding: '12px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ color: '#374151', fontSize: '14px', fontWeight: '500' }}>{l.name}</div>
                  <div style={{ color: '#6b7280', fontSize: '13px', fontWeight: '600', background: '#f3f4f6', padding: '4px 10px', borderRadius: '12px' }}>{l.count} Bookings</div>
                </li>
              ))}
              {!dash?.topLocations?.length && <li style={{ padding: '20px', color: '#9ca3af', textAlign: 'center', fontSize: '13px' }}>No locations yet</li>}
            </ul>
          </div>
        </div>
      </div>

      {loading && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(255,255,255,0.7)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div className="spinner-border" style={{ color: '#f97316', width: '40px', height: '40px' }} />
            <div style={{ marginTop: '12px', color: '#6b7280', fontSize: '14px' }}>Loading...</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
