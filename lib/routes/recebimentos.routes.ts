import { Router } from 'express';
import { autenticar } from '../oauth';
import recebimentosController from '../controllers/recebimentos.controller';

const router = Router();

// Recebimentos
router.get('/v1/admin/recebimentos', autenticar, recebimentosController.getRecebimentos);
router.put('/v1/admin/recebimentos', autenticar, recebimentosController.atualizarRecebimento);

router.get('/v1/admin/pix', autenticar, recebimentosController.getPixs);
router.post('/v1/admin/pix', autenticar, recebimentosController.createPix);

router.get('/v1/admin/recebimentos-pos', autenticar, recebimentosController.getRecebimentosPOS);
router.get('/v1/admin/recebimentos-pos/summary', autenticar, recebimentosController.getRecebimentosPOSSummary);

export default router;