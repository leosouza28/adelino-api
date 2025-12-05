import { Router } from 'express';
import cronjobsController from '../controllers/cronjobs.controller';

const router = Router();

router.get('/sync-sicoob', (req, res) => {
    cronjobsController.syncSicoobPixRecebidos().then()
    res.json(true);
});

export default router;