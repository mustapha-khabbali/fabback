import express from 'express';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { requireAuth } from '../middleware/auth.js';

export const reviewsRouter = express.Router();

const reviewSchema = z.object({
  projectId: z.string().uuid(),
  problemSolving: z.number().int().min(0).max(5),
  technicalExecution: z.number().int().min(0).max(5),
  functionality: z.number().int().min(0).max(5),
  innovation: z.number().int().min(0).max(5),
  feasibility: z.number().int().min(0).max(5),
  safetyCompliance: z.number().int().min(0).max(5),
  sdgAlignment: z.number().int().min(0).max(5),
  intuitionUsability: z.number().int().min(0).max(5),
  feedback: z.string().optional()
});

reviewsRouter.use(requireAuth);

reviewsRouter.post('/', async (req, res, next) => {
  try {
    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
      return;
    }

    const review = parsed.data;
    const result = await query(
      `
        insert into reviews (
          project_id, reviewer_id, problem_solving, technical_execution,
          functionality, innovation, feasibility, safety_compliance,
          sdg_alignment, intuition_usability, feedback
        )
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
        returning *
      `,
      [
        review.projectId,
        req.user.id,
        review.problemSolving,
        review.technicalExecution,
        review.functionality,
        review.innovation,
        review.feasibility,
        review.safetyCompliance,
        review.sdgAlignment,
        review.intuitionUsability,
        review.feedback || ''
      ]
    );

    res.status(201).json({ review: result.rows[0] });
  } catch (error) {
    next(error);
  }
});
