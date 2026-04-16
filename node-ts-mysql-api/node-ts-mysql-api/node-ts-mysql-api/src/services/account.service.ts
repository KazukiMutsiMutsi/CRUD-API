import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Op } from 'sequelize';
import { Account, Role } from '../models/account.model';
import { RefreshToken } from '../models/refresh-token.model';
import { sendEmail } from '../helpers/send-email';
import config from '../config/config.json';

// ── helpers ──────────────────────────────────────────────────────────────────

function generateJwt(accountId: number): string {
  return jwt.sign({ sub: accountId }, config.jwt.secret, {
    expiresIn: config.jwt.accessTokenExpiry,
  } as jwt.SignOptions);
}

async function generateRefreshToken(accountId: number, ipAddress: string): Promise<RefreshToken> {
  return RefreshToken.create({
    accountId,
    token: crypto.randomBytes(40).toString('hex'),
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    createdByIp: ipAddress,
  });
}

function basicDetails(account: Account) {
  const { id, title, firstName, lastName, email, role, created, updated, isVerified } = account;
  return { id, title, firstName, lastName, email, role, created, updated, isVerified };
}

// ── public service methods ────────────────────────────────────────────────────

export async function register(params: {
  title?: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  origin: string;
}) {
  if (params.password !== params.confirmPassword) throw new Error('Passwords do not match');

  const existing = await Account.findOne({ where: { email: params.email } });
  if (existing) {
    // Don't reveal that the email exists — just send a "already registered" email
    await sendAlreadyRegisteredEmail(params.email, params.origin);
    return;
  }

  const isFirstAccount = (await Account.count()) === 0;
  const role = isFirstAccount ? Role.Admin : Role.User;
  const verificationToken = crypto.randomBytes(40).toString('hex');

  await Account.create({
    title: params.title,
    firstName: params.firstName,
    lastName: params.lastName,
    email: params.email,
    passwordHash: await bcrypt.hash(params.password, 10),
    role,
    verificationToken,
    isVerified: false,
    created: new Date(),
    updated: new Date(),
  });

  await sendVerificationEmail(params.email, verificationToken, params.origin);
}

export async function verifyEmail(token: string) {
  const account = await Account.findOne({ where: { verificationToken: token } });
  if (!account) throw new Error('Verification failed');

  account.verified = new Date();
  account.isVerified = true;
  account.verificationToken = undefined;
  account.updated = new Date();
  await account.save();
}

export async function authenticate(params: {
  email: string;
  password: string;
  ipAddress: string;
}) {
  const account = await Account.findOne({ where: { email: params.email } });
  if (!account || !account.isVerified || !(await bcrypt.compare(params.password, account.passwordHash))) {
    throw new Error('Email or password is incorrect');
  }

  const jwtToken = generateJwt(account.id);
  const refreshToken = await generateRefreshToken(account.id, params.ipAddress);

  return { ...basicDetails(account), jwtToken, refreshToken: refreshToken.token };
}

export async function refreshToken(token: string, ipAddress: string) {
  const existing = await RefreshToken.findOne({ where: { token } });
  if (!existing || !existing.isActive) throw new Error('Invalid token');

  const account = await Account.findByPk(existing.accountId);
  if (!account) throw new Error('Account not found');

  // Rotate: revoke old, create new
  existing.revoked = new Date();
  existing.revokedByIp = ipAddress;
  const newToken = await generateRefreshToken(account.id, ipAddress);
  existing.replacedByToken = newToken.token;
  await existing.save();

  const jwtToken = generateJwt(account.id);
  return { ...basicDetails(account), jwtToken, refreshToken: newToken.token };
}

export async function revokeToken(token: string, ipAddress: string) {
  const existing = await RefreshToken.findOne({ where: { token } });
  if (!existing || !existing.isActive) throw new Error('Invalid token');

  existing.revoked = new Date();
  existing.revokedByIp = ipAddress;
  await existing.save();
}

export async function forgotPassword(email: string, origin: string) {
  const account = await Account.findOne({ where: { email } });
  if (!account) return; // silently fail

  account.resetToken = crypto.randomBytes(40).toString('hex');
  account.resetTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  account.updated = new Date();
  await account.save();

  await sendPasswordResetEmail(account.email, account.resetToken, origin);
}

export async function validateResetToken(token: string) {
  const account = await Account.findOne({
    where: {
      resetToken: token,
      resetTokenExpires: { [Op.gt]: new Date() },
    },
  });
  if (!account) throw new Error('Invalid token');
  return account;
}

export async function resetPassword(token: string, password: string, confirmPassword: string) {
  if (password !== confirmPassword) throw new Error('Passwords do not match');
  const account = await validateResetToken(token);

  account.passwordHash = await bcrypt.hash(password, 10);
  account.passwordReset = new Date();
  account.resetToken = undefined;
  account.resetTokenExpires = undefined;
  account.updated = new Date();
  await account.save();
}

export async function getAll() {
  const accounts = await Account.findAll();
  return accounts.map(basicDetails);
}

export async function getById(id: number) {
  const account = await Account.findByPk(id);
  if (!account) throw new Error('Account not found');
  return basicDetails(account);
}

export async function create(params: {
  title?: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: Role;
}) {
  if (params.password !== params.confirmPassword) throw new Error('Passwords do not match');
  if (await Account.findOne({ where: { email: params.email } })) throw new Error('Email already registered');

  const account = await Account.create({
    ...params,
    passwordHash: await bcrypt.hash(params.password, 10),
    isVerified: true,
    verified: new Date(),
    created: new Date(),
    updated: new Date(),
  });
  return basicDetails(account);
}

export async function update(id: number, params: Partial<{
  title: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: Role;
}>) {
  const account = await Account.findByPk(id);
  if (!account) throw new Error('Account not found');

  if (params.email && params.email !== account.email) {
    if (await Account.findOne({ where: { email: params.email } })) throw new Error('Email already taken');
  }

  if (params.password) {
    if (params.password !== params.confirmPassword) throw new Error('Passwords do not match');
    account.passwordHash = await bcrypt.hash(params.password, 10);
  }

  Object.assign(account, {
    title: params.title ?? account.title,
    firstName: params.firstName ?? account.firstName,
    lastName: params.lastName ?? account.lastName,
    email: params.email ?? account.email,
    role: params.role ?? account.role,
    updated: new Date(),
  });

  await account.save();
  return basicDetails(account);
}

export async function deleteAccount(id: number) {
  const account = await Account.findByPk(id);
  if (!account) throw new Error('Account not found');
  await account.destroy();
}

// ── email helpers ─────────────────────────────────────────────────────────────

async function sendVerificationEmail(email: string, token: string, origin: string) {
  const verifyUrl = `${origin}/accounts/verify-email?token=${token}`;
  await sendEmail({
    to: email,
    subject: 'Verify Email',
    html: `<p>Please click the link below to verify your email address:</p>
           <p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
  });
}

async function sendAlreadyRegisteredEmail(email: string, origin: string) {
  await sendEmail({
    to: email,
    subject: 'Email Already Registered',
    html: `<p>Your email <strong>${email}</strong> is already registered.</p>
           <p>If you don't know your password, visit <a href="${origin}/accounts/forgot-password">forgot password</a>.</p>`,
  });
}

async function sendPasswordResetEmail(email: string, token: string, origin: string) {
  const resetUrl = `${origin}/accounts/reset-password?token=${token}`;
  await sendEmail({
    to: email,
    subject: 'Reset Password',
    html: `<p>Click the link below to reset your password. The link is valid for 24 hours.</p>
           <p><a href="${resetUrl}">${resetUrl}</a></p>`,
  });
}
