import { Router } from 'express';
import { authorize } from '../middleware/authorize';
import { Role } from '../models/account.model';
import * as controller from '../controllers/account.controller';

const router = Router();

// Public routes
router.post('/register', controller.register);
router.post('/verify-email', controller.verifyEmail);
router.post('/authenticate', controller.authenticate);
router.post('/refresh-token', controller.refreshToken);
router.post('/revoke-token', authorize(), controller.revokeToken);
router.post('/forgot-password', controller.forgotPassword);
router.post('/validate-reset-token', controller.validateResetToken);
router.post('/reset-password', controller.resetPassword);

// Admin-only routes
router.get('/', authorize([Role.Admin]), controller.getAll);
router.post('/', authorize([Role.Admin]), controller.create);

// Authenticated routes (admin or own account)
router.get('/:id', authorize(), controller.getById);
router.put('/:id', authorize(), controller.update);
router.delete('/:id', authorize(), controller.deleteAccount);

export default router;
//account.routes