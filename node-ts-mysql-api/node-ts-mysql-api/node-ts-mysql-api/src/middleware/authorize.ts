import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Account, Role } from '../models/account.model';
import config from '../config/config.json';

export interface AuthRequest extends Request {
  user?: Account;
}

export function authorize(roles: Role[] = []) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as { sub: number };
      const account = await Account.findByPk(decoded.sub);
      if (!account) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      if (roles.length && !roles.includes(account.role)) {
        res.status(403).json({ message: 'Forbidden' });
        return;
      }

      req.user = account;
      next();
    } catch {
      res.status(401).json({ message: 'Unauthorized' });
    }
  };
}
//authorize.ts
