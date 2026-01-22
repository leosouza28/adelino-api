import { Router } from 'express';
import cronjobsController from '../controllers/cronjobs.controller';
import { autenticar } from '../oauth';

const router = Router();

router.get('/sync/empresa', autenticar, cronjobsController.syncEmpresaIntegracoes);
router.get('/cron/sync-integracoes/:sku', cronjobsController.syncIntegracao);
router.get('/cron/sync-integracoes/:sku/:data', cronjobsController.syncIntegracao);

export default router;