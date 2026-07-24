const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { asyncHandler } = require('../middleware/asyncHandler');
const { parseBody } = require('../lib/validate');
const { hashPassword, verifyPassword, signToken } = require('../lib/auth');
const { ensureWallet } = require('../lib/wallet');
const { badRequest, unauthorized, notFound } = require('../lib/errors');
const { sendJson } = require('../lib/serialize');
const config = require('../lib/config');

const router = express.Router();

// Generate a 6-digit OTP. In dev we return it in the response so flows are testable;
// in production this would be delivered by SMS/email and never echoed.
function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  phone: z.string().optional(),
  role: z.enum(['CONTRIBUTOR', 'SPONSOR', 'REVIEWER', 'SUPPORT', 'ADMIN']).optional(),
  legalName: z.string().optional(),
  username: z.string().optional(),
  countryCode: z.string().length(2).optional(),
  languages: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
});

// POST /auth/register — create account + wallet, issue OTP for verification.
router.post('/register', asyncHandler(async (req, res) => {
  const body = parseBody(registerSchema, req.body);
  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) throw badRequest('Email already registered', 'email_taken');

  const otp = generateOtp();
  const user = await prisma.user.create({
    data: {
      email: body.email,
      phone: body.phone,
      passwordHash: await hashPassword(body.password),
      role: body.role || 'CONTRIBUTOR',
      legalName: body.legalName,
      username: body.username,
      countryCode: body.countryCode || 'NG',
      languages: body.languages || [],
      skills: body.skills || [],
      otpCode: otp,
      otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });
  await ensureWallet(prisma, user.id, user.countryCode === 'NG' ? 'NGN' : 'NGN');

  return sendJson(res, 201, {
    id: user.id,
    email: user.email,
    role: user.role,
    emailVerified: false,
    // No email/SMS delivery is configured for this demo, so the one-time code is
    // returned here for the onboarding flow to display/verify. In production this
    // would be delivered out-of-band and never returned in the response.
    otp,
  });
}));

const otpSchema = z.object({ email: z.string().email(), otp: z.string() });

// POST /auth/otp/verify — verify OTP, mark verified, return a token.
router.post('/otp/verify', asyncHandler(async (req, res) => {
  const body = parseBody(otpSchema, req.body);
  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (!user) throw notFound('User not found');
  if (!user.otpCode || user.otpCode !== body.otp) throw badRequest('Invalid OTP', 'invalid_otp');
  if (user.otpExpiresAt && user.otpExpiresAt < new Date()) throw badRequest('OTP expired', 'otp_expired');

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: true, otpCode: null, otpExpiresAt: null },
  });
  return sendJson(res, 200, { token: signToken(updated), user: { id: updated.id, role: updated.role } });
}));

const loginSchema = z.object({ email: z.string().email(), password: z.string() });

// POST /auth/login — email/password -> JWT.
router.post('/login', asyncHandler(async (req, res) => {
  const body = parseBody(loginSchema, req.body);
  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (!user) throw unauthorized('Invalid credentials', 'invalid_credentials');
  const ok = await verifyPassword(body.password, user.passwordHash);
  if (!ok) throw unauthorized('Invalid credentials', 'invalid_credentials');
  if (user.status !== 'ACTIVE') throw unauthorized('Account not active', 'account_inactive');

  return sendJson(res, 200, {
    token: signToken(user),
    user: { id: user.id, email: user.email, role: user.role, ryseLevel: user.ryseLevel },
  });
}));

const resetSchema = z.object({ email: z.string().email(), newPassword: z.string().min(8) });

// POST /auth/reset — reset password (demo: direct reset by email).
router.post('/reset', asyncHandler(async (req, res) => {
  const body = parseBody(resetSchema, req.body);
  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (!user) throw notFound('User not found');
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(body.newPassword) },
  });
  return sendJson(res, 200, { ok: true });
}));

module.exports = router;
