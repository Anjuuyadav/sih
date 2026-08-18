const ok = (res, data) => res.status(200).json(data);
const created = (res, data) => res.status(201).json(data);
const badRequest = (res, data) => res.status(400).json(data);
const unauthorized = (res, data) => res.status(401).json(data);
const forbidden = (res, data) => res.status(403).json(data);
const notFound = (res, data) => res.status(404).json(data);
const conflict = (res, data) => res.status(409).json(data);
const internalError = (res, data) => res.status(500).json(data);
const notImplemented = (res, data) => res.status(501).json(data);
const validationError = (res, errors) => res.status(400).json({ errors });

module.exports = {
  ok,
  created,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  internalError,
  notImplemented,
  validationError,
};
