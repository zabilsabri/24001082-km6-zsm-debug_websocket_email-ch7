const express = require('express');
const router = express.Router();
const { register, login, whoami, loginPage, registerPage, forgotPasswordPage, requestForgetPasswordToken, resetPassword, resetPasswordPage, notificationPage } = require('../controllers/auth.controllers');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = process.env;

let restrict = (req, res, next) => {
    let { authorization } = req.headers;
    if (!authorization || !authorization.split(' ')[1]) {
        return res.status(401).json({
            status: false,
            message: 'token not provided!',
            data: null
        });
    }

    let token = authorization.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(401).json({
                status: false,
                message: err.message,
                data: null
            });
        }
        delete user.iat;
        req.user = user;
        next();
    });
};

let isAdmin = (req, res, next) => {
    if (req.user.role != 'ADMIN') {
        return res.status(401).json({
            status: false,
            message: 'only admin can access!',
            data: null
        });
    }
    next();
};

// Register
router.post('/api/v1/register', register);
router.get('/register', registerPage);

// Login
router.post('/api/v1/login', login);
router.get('/login', loginPage);

// Forget Password
router.get('/forgot-password', forgotPasswordPage);
router.post('/api/v1/request-forgot-password', requestForgetPasswordToken);

// Reset Password
router.get('/reset-password', resetPasswordPage);
router.put('/api/v1/reset-password', resetPassword);

// Notification
router.get('/notification', notificationPage);

router.get('api/v1/whoami', restrict, whoami);
router.post('api/v1/create-admin', restrict, isAdmin, (req, res, next) => { req.body.role = 'ADMIN'; next(); }, register);

module.exports = router;
