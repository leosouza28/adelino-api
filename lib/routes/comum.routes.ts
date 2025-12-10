import { Router, Request, Response } from 'express';
import { autenticar } from '../oauth';
import comumController from '../controllers/comum.controller';

const router = Router();

router.get('/', autenticar, (req: Request, res: Response) => {
    res.json({ message: 'API Estrela Dalva 1.0.0' });
});
router.get('/public/estados', comumController.getEstados);
router.get('/public/cidades', comumController.getCidades);
router.get('/public/cep', comumController.getConsultaCEP);
router.get('/public/default-values', comumController.getDefaultValues);

router.get('/v1/admin/dashboard/admin', autenticar, comumController.getDashboardAdmin);


export default router;