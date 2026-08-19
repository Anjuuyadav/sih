import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';
import AdminLayout from '../../../components/AdminLayout';
import { createDoctor } from '../../../services/doctorService';

const AddDoctor = () => {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      specialization: '',
      qualification: '',
      experienceYears: '',
      dailyPatientLimit: '',
    },
  });

  const onSubmit = async (values) => {
    try {
      await createDoctor(values);
      toast.success('Doctor created successfully');
      navigate('/admin/doctors');
    } catch (error) {
      toast.error(error.message || 'Unable to create doctor');
    }
  };

  return (
    <AdminLayout title="Add Doctor" subtitle="Create a new doctor record.">
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
            <label className="form-label fw-semibold">Password</label>
            <input type="password" className="form-control" {...register('password', { required: 'Password is required', minLength: { value: 8, message: 'Password must be at least 8 characters' } })} />
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
          <div className="col-12 d-flex gap-2">
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Doctor'}</button>
            <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/admin/doctors')} disabled={isSubmitting}>Cancel</button>
          </div>
        </form>
      </section>
    </AdminLayout>
  );
};

export default AddDoctor;