const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { asyncHandler } = require('../middleware/asyncHandler');
const { parseBody } = require('../lib/validate');
const { sendJson } = require('../lib/serialize');
const { notFound, forbidden } = require('../lib/errors');

const router = express.Router();

// GET /tickets — support/admin see all; everyone else sees their own.
router.get('/tickets', asyncHandler(async (req, res) => {
  const isStaff = ['SUPPORT', 'ADMIN'].includes(req.user.role);
  const tickets = await prisma.ticket.findMany({
    where: isStaff ? {} : { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return sendJson(res, 200, tickets);
}));

const ticketSchema = z.object({
  type: z.enum(['GENERAL', 'TASK', 'PAYMENT', 'WITHDRAWAL', 'KYC']).optional(),
  subject: z.string(),
  message: z.string(),
  disputeKind: z.string().optional(),
});

// POST /tickets — open a ticket/dispute.
router.post('/tickets', asyncHandler(async (req, res) => {
  const body = parseBody(ticketSchema, req.body);
  const ticket = await prisma.ticket.create({
    data: {
      userId: req.user.id,
      type: body.type || 'GENERAL',
      subject: body.subject,
      disputeKind: body.disputeKind,
      thread: [{ from: req.user.id, at: new Date().toISOString(), message: body.message }],
    },
  });
  return sendJson(res, 201, ticket);
}));

module.exports = router;
