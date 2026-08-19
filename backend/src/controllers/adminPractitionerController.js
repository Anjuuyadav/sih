const { validationResult } = require('express-validator');
const service = require('../services/adminPractitionerService');
const response = require('../utils/responseHelper');

const validate = (req, res) => { const errors = validationResult(req); return errors.isEmpty() || response.validationError(res, errors.array()); };
const createPractitioner = async (req, res, next) => { try { if (!validate(req, res)) return; const practitioner = await service.createPractitioner(req.body); return response.created(res, { practitioner }); } catch (error) { next(error); } };
const getPractitioners = async (req, res, next) => { try { return response.ok(res, { practitioners: await service.getPractitioners() }); } catch (error) { next(error); } };
const getPractitionerById = async (req, res, next) => { try { if (!validate(req, res)) return; return response.ok(res, { practitioner: await service.getPractitionerById(req.params.id) }); } catch (error) { next(error); } };
const updatePractitioner = async (req, res, next) => { try { if (!validate(req, res)) return; return response.ok(res, { practitioner: await service.updatePractitioner(req.params.id, req.body) }); } catch (error) { next(error); } };
const deletePractitioner = async (req, res, next) => { try { if (!validate(req, res)) return; await service.deletePractitioner(req.params.id); return response.ok(res, { message: 'Practitioner deactivated successfully' }); } catch (error) { next(error); } };
const getAvailability = async (req, res, next) => { try { if (!validate(req, res)) return; return response.ok(res, { availability: await service.getAvailability(req.params.id) }); } catch (error) { next(error); } };
module.exports = { createPractitioner, getPractitioners, getPractitionerById, updatePractitioner, deletePractitioner, getAvailability };
