import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import AdminLayout from '../../../components/AdminLayout';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { getDoctorById, updateDoctor } from '../../../services/doctorService';

const EditDoctor = () => {
  const { doctorId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm();

  useEffect(() => {
    let isMounted = true;

    const loadDoctor = async () => {
      try {
        const doctor = await getDoctorById(doctorId);
        if (!isMounted) {
          return;
        }

        reset({
          name: doctor.Name || '',
          email: doctor.Email || '',
          phone: doctor.Phone || '',
          password: '',
          specialization: doctor.Specialization || '',
          qualification: doctor.Qualification || '',
          experienceYears: doctor.ExperienceYears ?? '',
          dailyPatientLimit: doctor.DailyPatientLimit ?? '',
          isActive: Boolean(doctor.IsActive),
        });
      } catch (error) {
        toast.error(error.message || 'Unable to load doctor');
        navigate('/admin/doctors');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDoctor();

    return () => {
      isMounted = false;
    };
  }, [doctorId, navigate, reset]);

  const onSubmit = async (values) => {
    const parsedDoctorId = Number(doctorId);
    if (!Number.isInteger(parsedDoctorId)) {
      toast.error('Invalid doctor id');
      return;
    }

    const payload = {
      ...values,
      password: values.password?.trim() ? values.password : undefined,
    };

    if (!payload.password) {
      delete payload.password;
    }

    try {
      await updateDoctor(parsedDoctorId, payload);
      toast.success('Doctor updated successfully');
      navigate('/admin/doctors');
    } catch (error) {
      toast.error(error.message || 'Unable to update doctor');
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Edit Doctor" subtitle="Update doctor details and availability.">
        <LoadingSpinner label="Loading doctor details..." />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Edit Doctor" subtitle="Update doctor details and availability.">
      <section className="admin-card p-4 p-lg-5">
        <form onSubmit={handleSubmit(onSubmit)} className="row g-4">
          <div className="col-12 col-md-6">
            <label className="form-label fw-semibold">Name</label>
            <input className="form-control" {...register('name', { required: 'Name is required' })} />
            {errors.name ? <div className="text-danger small mt-1">{errors.name.message}</div> : null}
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label fw-semibold">Email</label>
            <input type="email" className="form-control" {...register('email', { required: 'Email is required' })} />
            {errors.email ? <div className="text-danger small mt-1">{errors.email.message}</div> : null}
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label fw-semibold">Phone</label>
            <input className="form-control" {...register('phone', { required: 'Phone is required' })} />
            {errors.phone ? <div className="text-danger small mt-1">{errors.phone.message}</div> : null}
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label fw-semibold">Password (optional)</label>
            <input type="password" className="form-control" {...register('password', { minLength: { value: 8, message: 'Password must be at least 8 characters' } })} />
            {errors.password ? <div className="text-danger small mt-1">{errors.password.message}</div> : null}
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label fw-semibold">Specialization</label>
            <input className="form-control" {...register('specialization')} />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label fw-semibold">Qualification</label>
            <input className="form-control" {...register('qualification')} />
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label fw-semibold">Experience Years</label>
            <input type="number" className="form-control" {...register('experienceYears', { valueAsNumber: true, min: { value: 0, message: 'Experience must be positive' } })} />
            {errors.experienceYears ? <div className="text-danger small mt-1">{errors.experienceYears.message}</div> : null}
          </div>
          <div className="col-12 col-md-4">
            <label className="form-label fw-semibold">Daily Patient Limit</label>
            <input type="number" className="form-control" {...register('dailyPatientLimit', { valueAsNumber: true, min: { value: 1, message: 'Daily limit must be at least 1' } })} />
            {errors.dailyPatientLimit ? <div className="text-danger small mt-1">{errors.dailyPatientLimit.message}</div> : null}
          </div>
          <div className="col-12">
            <div className="form-check">
              <input className="form-check-input" type="checkbox" id="isActive" {...register('isActive')} />
              <label className="form-check-label fw-semibold" htmlFor="isActive">Active</label>
            </div>
          </div>
          <div className="col-12 d-flex gap-2">
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Update Doctor'}</button>
            <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/admin/doctors')} disabled={isSubmitting}>Cancel</button>
          </div>
        </form>
      </section>
    </AdminLayout>
  );
};

export default EditDoctor;