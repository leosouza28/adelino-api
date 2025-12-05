import { Router } from 'express';
import { autenticar } from '../oauth';
import recebimentosController from '../controllers/recebimentos.controller';

const router = Router();

// Recebimentos
router.get('/v1/admin/recebimentos', autenticar, recebimentosController.getRecebimentos);
router.put('/v1/admin/recebimentos', autenticar, recebimentosController.atualizarRecebimento);

export default router;