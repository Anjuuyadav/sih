const express = require('express');
const cors = require('cors');
// const helmet = require('helmet');
// const morgan = require('morgan');
const authRoutes = require('./routes/authRoutes');
const adminPractitionerRoutes = require('./routes/adminPractitionerRoutes');
const adminTherapyRoutes = require('./routes/adminTherapyRoutes');
const adminPrecautionRoutes = require('./routes/adminPrecautionRoutes');
const errorMiddleware = require('./middlewares/errorMiddleware');

const app = express();
const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';

// app.use(helmet());
app.use(cors({ origin: allowedOrigin, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// app.use(morgan('dev'));

app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Panchkarma Backend is running'
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin/practitioners', adminPractitionerRoutes);
app.use('/api/admin/therapies', adminTherapyRoutes);
app.use('/api/admin/therapy-precautions', adminPrecautionRoutes);


app.use(errorMiddleware);

module.exports = app;