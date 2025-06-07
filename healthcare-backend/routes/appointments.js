const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const Appointment = require('../models/appointment');

// Get all appointments
router.get('/', authenticateToken, async (req, res) => {
    try {
        const appointments = await Appointment.find()
            .populate('patientId', 'firstName lastName')
            .populate('doctorId', 'firstName lastName specialization');
        res.json(appointments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get appointment by ID
router.get('/:id', authenticateToken, async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id)
            .populate('patientId', 'firstName lastName')
            .populate('doctorId', 'firstName lastName specialization');
        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }
        res.json(appointment);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create new appointment
router.post('/', authenticateToken, async (req, res) => {
    const appointment = new Appointment({
        patientId: req.body.patientId,
        doctorId: req.body.doctorId,
        date: req.body.date,
        time: req.body.time,
        status: req.body.status || 'scheduled',
        notes: req.body.notes
    });

    try {
        const newAppointment = await appointment.save();
        res.status(201).json(newAppointment);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update appointment
router.patch('/:id', authenticateToken, async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        Object.keys(req.body).forEach(key => {
            appointment[key] = req.body[key];
        });

        const updatedAppointment = await appointment.save();
        res.json(updatedAppointment);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete appointment
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);
        if (!appointment) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        await appointment.remove();
        res.json({ message: 'Appointment deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router; 