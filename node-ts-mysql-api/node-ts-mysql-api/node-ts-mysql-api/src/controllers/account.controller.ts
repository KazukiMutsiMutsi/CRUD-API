import { Request, Response, NextFunction } from 'express';
import * as accountService from '../services/account.service';
import { AuthRequest } from '../middleware/authorize';
import { Role } from '../models/account.model';

function setTokenCookie(res: Response, token: string) {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    sameSite: 'strict',
  });
}

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const origin = req.get('origin') ?? `${req.protocol}://${req.get('host')}`;
    await accountService.register({ ...req.body, origin });
    res.json({ message: 'Registration successful. Please check your email to verify your account.' });
  } catch (err) {
    next(err);
  }
}

export async function verifyEmail(req: Request, res: Response, next: NextFunction) {
  try {
    await accountService.verifyEmail(req.body.token);
    res.json({ message: 'Verification successful. You can now log in.' });
  } catch (err) {
    next(err);
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const ipAddress = req.ip ?? '0.0.0.0';
    const result = await accountService.authenticate({ ...req.body, ipAddress });
    setTokenCookie(res, result.refreshToken);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function refreshToken(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.cookies['refreshToken'] as string;
    const ipAddress = req.ip ?? '0.0.0.0';
    const result = await accountService.refreshToken(token, ipAddress);
    setTokenCookie(res, result.refreshToken);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function revokeToken(req: Request, res: Response, next: NextFunction) {
  try {
    const token = (req.body.token as string | undefined) ?? (req.cookies['refreshToken'] as string);
    const ipAddress = req.ip ?? '0.0.0.0';
    await accountService.revokeToken(token, ipAddress);
    res.json({ message: 'Token revoked' });
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const origin = req.get('origin') ?? `${req.protocol}://${req.get('host')}`;
    await accountService.forgotPassword(req.body.email, origin);
    res.json({ message: 'Please check your email for password reset instructions.' });
  } catch (err) {
    next(err);
  }
}

export async function validateResetToken(req: Request, res: Response, next: NextFunction) {
  try {
    await accountService.validateResetToken(req.body.token);
    res.json({ message: 'Token is valid' });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const { token, password, confirmPassword } = req.body;
    await accountService.resetPassword(token, password, confirmPassword);
    res.json({ message: 'Password reset successful. You can now log in.' });
  } catch (err) {
    next(err);
  }
}

export async function getAll(_req: Request, res: Response, next: NextFunction) {
  try {
    const accounts = await accountService.getAll();
    res.json(accounts);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params['id'] ?? '0');
    // Users can only access their own account
    if (req.user?.role !== Role.Admin && req.user?.id !== id) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }
    const account = await accountService.getById(id);
    res.json(account);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const account = await accountService.create(req.body);
    res.status(201).json(account);
  } catch (err) {
    next(err);
  }
}

export async function update(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params['id'] ?? '0');
    if (req.user?.role !== Role.Admin && req.user?.id !== id) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }
    const account = await accountService.update(id, req.body);
    res.json(account);
  } catch (err) {
    next(err);
  }
}

export async function deleteAccount(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const id = parseInt(req.params['id'] ?? '0');
    if (req.user?.role !== Role.Admin && req.user?.id !== id) {
      res.status(403).json({ message: 'Forbidden' });
      return;
    }
    await accountService.deleteAccount(id);
    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    next(err);
  }
}

//accunt.controller.ts
