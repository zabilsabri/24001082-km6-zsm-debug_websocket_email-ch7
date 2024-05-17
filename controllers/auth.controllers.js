const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sendMail, getHTML } = require('../libs/nodemailer');
const { JWT_SECRET } = process.env;
const Sentry = require('../libs/sentry');

const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);

module.exports = {
    register: async (req, res, next) => {
        try {
            let { name, email, password, role } = req.body;
            if (!name || !email || !password) {
                return res.status(400).json({
                    status: false,
                    message: 'name, email and password are required!',
                    data: null
                });
            }

            let exist = await prisma.user.findFirst({ where: { email } });
            if (exist) {
                return res.status(400).json({
                    status: false,
                    message: 'email has already been used!',
                    data: null
                });
            }

            let encryptedPassword = await bcrypt.hash(password, 10);
            let userData = {
                name,
                email,
                password: encryptedPassword
            };
            if (role) userData.role = role;
            let user = await prisma.user.create({ data: userData });
            delete user.password;

            // Create notification
            const notification = await prisma.notif.create({
                data: {
                    title: 'New User Registered',
                    content: `${user.name} has registered with email ${user.email}`,
                    userId: user.id
                }
            });

            // io.emit(`notification`, newNotification);

            return res.status(201).json({
                status: true,
                message: 'OK',
                data: user
            });
        } catch (error) {
            Sentry.captureException(error);
            next(error);
        }
    },

    login: async (req, res, next) => {
        try {
            let { email, password } = req.body;
            if (!email || !password) {
                return res.status(400).json({
                    status: false,
                    message: 'email and password are required!',
                    data: null
                });
            }

            let user = await prisma.user.findFirst({ where: { email } });
            if (!user) {
                return res.status(400).json({
                    status: false,
                    message: 'invalid email or password!',
                    data: null
                });
            }

            let isPasswordCorrect = await bcrypt.compare(password, user.password);
            if (!isPasswordCorrect) {
                return res.status(400).json({
                    status: false,
                    message: 'invalid email or password!',
                    data: null
                });
            }

            delete user.password;
            let token = jwt.sign(user, JWT_SECRET);

            res.json({
                status: true,
                message: 'OK',
                data: { ...user, token }
            });
        } catch (error) {
            Sentry.captureException(error);
            next(error);
        }
    },

    whoami: async (req, res, next) => {
        try {
            res.json({
                status: true,
                message: 'OK',
                data: req.user
            });
        } catch (error) {
            Sentry.captureException(error);
            next(error);
        }
    },

    requestForgetPasswordToken: async (req, res, next) => {
        try {
            let {email} = req.body;

            let user = await prisma.user.findFirst({ where: { email } });

            if (!user) {
                return res.status(404).json({
                    status: false,
                    message: 'user not found!',
                    data: null
                });
            }

            let token = jwt.sign({ email: email }, JWT_SECRET);

            const tokenData = await prisma.user.update({
                where: { email },
                data: { token }
            });

            let url = `${req.protocol}://${req.get('host')}/reset-password?token=${token}`;
            let html = await getHTML('verification-code.ejs', { username: user.name, url: url});
            await sendMail(email, 'Forget Password', html);
            return res.json({
                status: true,
                message: 'success',
                data: token
            });
        } catch (error) {
            Sentry.captureException(error);
            next(error);
        }
    },

    resetPassword: async (req, res, next) => {
        try {
            let { password, token } = req.body;

            let user = await prisma.user.findFirst({ where: { token } });

            if (!user) {
                return res.status(404).json({
                    status: false,
                    message: 'user not found!',
                    data: null
                });
            }

            let encryptedPassword = await bcrypt.hash(password, 10);
            let updatedUser = await prisma.user.update({
                where: { token },
                data: { password: encryptedPassword, token: null }
            });

            delete updatedUser.password;

            return res.json({
                status: true,
                message: 'success',
                data: updatedUser
            });
        } catch (error) {
            Sentry.captureException(error);
            next(error);
        }
    },

    notificationPage: async (req, res, next) => {
        try {
            const notifications = await prisma.notif.findMany();
            res.render('notification', { notifications });
        } catch (error) {
            Sentry.captureException(error);
            next(error);
        }
    },

    loginPage: async (req, res, next) => {
        try {
            res.render('login');
        } catch (error) {
            Sentry.captureException(error);
            next(error);
        }
    },

    registerPage: async (req, res, next) => {
        try {
            res.render('register');
        } catch (error) {
            Sentry.captureException(error);
            next(error);
        }
    },

    forgotPasswordPage: async (req, res, next) => {
        try {
            res.render('forget-password');
        } catch (error) {
            Sentry.captureException(error);
            next(error);
        }
    },

    resetPasswordPage: async (req, res, next) => {
        try {
            
            const token = await prisma.user.findFirst({ where: { token: req.query.token } });
            
            if (!token) {
                return res.status(404).json({
                    status: false,
                    message: 'token not found!',
                    data: null
                });
            } 

            res.render('reset-password', { token: req.query.token });
            
        } catch (error) {
            Sentry.captureException(error);
            next(error);
        }
    }
};