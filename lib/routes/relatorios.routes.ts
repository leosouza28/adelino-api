import { Router } from 'express';
import { autenticar } from '../oauth';
import relatoriosController from '../controllers/relatorios.controller';

const router = Router();

router.get('/v1/admin/relatorios', autenticar, relatoriosController.getRelatorios);


export default router;