import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../../components/AdminLayout';
import DeleteConfirmationModal from '../../../components/DeleteConfirmationModal';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { deleteDoctor, getDoctors } from '../../../services/doctorService';
import { getRecordId, getStatusMeta } from '../../../utils/formatters';
import { toast } from 'react-toastify';

const PAGE_SIZE = 10;

const DoctorList = () => {
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const loadDoctors = async () => {
    setLoading(true);
    try {
      const response = await getDoctors();
      setDoctors(response);
    } catch (error) {
      toast.error(error.message || 'Unable to load doctors');
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoctors();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const filteredDoctors = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return doctors;
    }

    return doctors.filter((doctor) => {
      const values = [doctor.Name, doctor.Email, doctor.Phone, doctor.Specialization, doctor.Qualification]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return values.includes(keyword);
    });
  }, [doctors, search]);

  const totalPages = Math.max(1, Math.ceil(filteredDoctors.length / PAGE_SIZE));
  const visibleDoctors = filteredDoctors.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleDelete = async () => {
    if (!deletingId) {
      return;
    }

    setDeleteBusy(true);
    try {
      await deleteDoctor(deletingId);
      toast.success('Doctor deleted successfully');
      setDoctors((currentDoctors) => {
        const nextDoctors = currentDoctors.filter((doctor) => String(getRecordId(doctor, ['DoctorId', 'doctorId', 'id'])) !== String(deletingId));
        setPage((currentPage) => Math.min(currentPage, Math.max(1, Math.ceil(nextDoctors.length / PAGE_SIZE))));
        return nextDoctors;
      });
    } catch (error) {
      toast.error(error.message || 'Unable to delete doctor');
    } finally {
      setDeleteBusy(false);
      setDeletingId(null);
    }
  };

  return (
    <AdminLayout title="Doctors" subtitle="Manage the doctor master data for the admin panel.">
      <div className="d-grid gap-4">
        <section className="admin-card p-4 d-flex flex-column flex-lg-row justify-content-between gap-3 align-items-lg-center">
          <div>
            <h2 className="h4 fw-bold mb-1">Doctors</h2>
            <p className="mb-0 text-muted">Search, edit, and maintain the doctor directory.</p>
          </div>
          <Link to="/admin/doctors/add" className="btn btn-primary fw-semibold">Add New Doctor</Link>
        </section>

        <section className="admin-card p-3 p-lg-4">
          <div className="row g-3 align-items-center mb-3">
            <div className="col-12 col-lg-6">
              <input
                type="search"
                className="form-control"
                placeholder="Search by name, email, phone, specialization..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="col-12 col-lg-6 text-lg-end text-muted small">
              {filteredDoctors.length} record{filteredDoctors.length === 1 ? '' : 's'} found
            </div>
          </div>

          {loading ? (
            <LoadingSpinner label="Loading doctors..." />
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle admin-table mb-0">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Specialization</th>
                    <th>Experience</th>
                    <th>Daily Limit</th>
                    <th>Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleDoctors.length > 0 ? (
                    visibleDoctors.map((doctor) => {
                      const doctorId = getRecordId(doctor, ['DoctorId', 'doctorId', 'id']);
                      const status = getStatusMeta(doctor.IsActive ?? doctor.isActive ?? doctor.Status);
                      return (
                        <tr key={doctorId}>
                          <td className="fw-semibold">{doctor.Name}</td>
                          <td>{doctor.Email}</td>
                          <td>{doctor.Phone}</td>
                          <td>{doctor.Specialization || '-'}</td>
                          <td>{doctor.ExperienceYears ?? '-'}</td>
                          <td>{doctor.DailyPatientLimit ?? '-'}</td>
                          <td><span className={`status-badge ${status.className}`}>{status.label}</span></td>
                          <td>
                            <div className="d-flex justify-content-end gap-2">
                              <Link to={`/admin/doctors/edit/${doctorId}`} className="btn btn-sm btn-outline-primary">Edit</Link>
                              <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setDeletingId(doctorId)}>
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="8" className="text-center py-5 text-muted">No doctors found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 ? (
            <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
              <div className="text-muted small">
                Page {page} of {totalPages}
              </div>
              <nav>
                <ul className="pagination mb-0">
                  <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                    <button type="button" className="page-link" onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button>
                  </li>
                  <li className="page-item active">
                    <span className="page-link">{page}</span>
                  </li>
                  <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                    <button type="button" className="page-link" onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Next</button>
                  </li>
                </ul>
              </nav>
            </div>
          ) : null}

          <div className="small text-muted mt-2">Appointments are scheduled automatically based on daily patient limit and availability.</div>
        </section>
      </div>

      <DeleteConfirmationModal
        show={Boolean(deletingId)}
        title="Delete doctor"
        message="This doctor will be marked inactive. Do you want to continue?"
        loading={deleteBusy}
        onCancel={() => setDeletingId(null)}
        onConfirm={handleDelete}
      />
    </AdminLayout>
  );
};

export default DoctorList;