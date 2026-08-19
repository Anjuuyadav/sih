import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/AdminLayout';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getDoctors } from '../../services/doctorService';
// import { getTherapies } from '../../services/therapyService';
// import { getPrecautions } from '../../services/precautionService';
import { getRecordId, getStatusMeta, formatCurrency, formatDuration } from '../../utils/formatters';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    doctors: 0,
    therapies: 0,
    precautions: 0,
  });

  useEffect(() => {
    let isMounted = true;

    const loadStats = async () => {
      try {
        const [doctors, therapies] = await Promise.all([getDoctors(), getTherapies()]);

        const precautionTotals = await Promise.all(
          therapies.map((therapy) => {
            const therapyId = getRecordId(therapy, ['TherapyId', 'therapyId', 'id']);
            if (!therapyId) {
              return Promise.resolve([]);
            }
            return getPrecautions(therapyId).catch(() => []);
          })
        );

        if (isMounted) {
          setStats({
            doctors: doctors.length,
            therapies: therapies.length,
            precautions: precautionTotals.reduce((total, items) => total + items.length, 0),
          });
        }
      } catch (error) {
        if (isMounted) {
          setStats({ doctors: 0, therapies: 0, precautions: 0 });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadStats();

    return () => {
      isMounted = false;
    };
  }, []);

  const metrics = useMemo(
    () => [
      { label: 'Total Doctors', value: stats.doctors, accent: 'text-primary' },
      { label: 'Total Therapies', value: stats.therapies, accent: 'text-success' },
      { label: 'Total Precautions', value: stats.precautions, accent: 'text-danger' },
    ],
    [stats]
  );

  return (
    <AdminLayout
      title="Dashboard"
      subtitle="A quick operational view of the Panchkarma admin panel."
    >
      {loading ? (
        <LoadingSpinner label="Loading dashboard statistics..." />
      ) : (
        <div className="d-grid gap-4">
          <section className="admin-card page-hero position-relative p-4 p-lg-5">
            <div className="position-relative z-1">
              <span className="badge rounded-pill text-bg-light text-primary fw-semibold mb-3">Admin Overview</span>
              <h2 className="display-6 fw-bold mb-3">Professional management console for Module 2.</h2>
              <p className="mb-4 text-white-75 col-lg-8">
                Manage doctors, therapies, and precautions from a single responsive workspace.
              </p>
              <div className="d-flex flex-wrap gap-2">
                <Link to="/admin/doctors" className="btn btn-light fw-semibold">Open Doctors</Link>
                <Link to="/admin/therapies" className="btn btn-outline-light fw-semibold">Open Therapies</Link>
              </div>
            </div>
          </section>

          <section className="row g-3 g-xl-4">
            {metrics.map((metric) => (
              <div key={metric.label} className="col-12 col-sm-6 col-xl-3">
                <div className="card-metric h-100 p-4">
                  <div className={`small fw-semibold text-uppercase ${metric.accent}`}>{metric.label}</div>
                  <div className="display-6 fw-bold mt-2">{metric.value}</div>
                </div>
              </div>
            ))}
          </section>

          <section className="admin-card p-4">
            <div className="row g-3">
              {[
                { title: 'Doctors', path: '/admin/doctors', description: 'Create, update, and monitor doctors.', color: 'primary' },
                { title: 'Therapies', path: '/admin/therapies', description: 'Manage therapy plans and activation.', color: 'success' },
                { title: 'Precautions', path: '/admin/precautions', description: 'Add and edit therapy precautions.', color: 'danger' },
              ].map((item) => (
                <div key={item.title} className="col-12 col-md-6 col-xl-4">
                  <Link to={item.path} className="text-decoration-none">
                    <div className="h-100 rounded-4 border p-4 bg-white shadow-sm">
                      <div className={`badge text-bg-${item.color}`}>{item.title}</div>
                      <p className="mt-3 mb-0 text-muted">{item.description}</p>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </section>

          <section className="admin-card p-4">
            <h3 className="h5 fw-bold mb-3">Recent Snapshot</h3>
            <div className="row g-3">
              <div className="col-12 col-lg-4">
                <div className="rounded-4 border p-3 bg-light h-100">
                  <div className="small text-muted">Suggested next step</div>
                  <div className="fw-semibold">Keep doctor schedules updated.</div>
                </div>
              </div>
              <div className="col-12 col-lg-4">
                <div className="rounded-4 border p-3 bg-light h-100">
                  <div className="small text-muted">Price range</div>
                  <div className="fw-semibold">Therapies tracked in INR with clean formatting.</div>
                </div>
              </div>
              <div className="col-12 col-lg-4">
                <div className="rounded-4 border p-3 bg-light h-100">
                  <div className="small text-muted">Formatting helpers</div>
                  <div className="fw-semibold">Durations: {formatDuration(7, 45)} · Example cost: {formatCurrency(1500)}</div>
                </div>
              </div>
            </div>
            <div className="d-none">{getStatusMeta(true).label}</div>
          </section>
        </div>
      )}
    </AdminLayout>
  );
};

export default Dashboard;