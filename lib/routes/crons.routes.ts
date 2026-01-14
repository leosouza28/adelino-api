import { Router } from 'express';
import cronjobsController from '../controllers/cronjobs.controller';

const router = Router();

router.get('/cron/sync-integracoes/:sku', cronjobsController.syncIntegracao);
router.get('/cron/sync-integracoes/:sku/:data', cronjobsController.syncIntegracao);

export default router;