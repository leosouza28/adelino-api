import { Router, Request, Response } from 'express';
import { autenticar } from '../oauth';
import comumController from '../controllers/comum.controller';
import empresaController from '../controllers/empresa.controller';

const router = Router();

router.get('/', autenticar, (req: Request, res: Response) => {
    res.json({ message: 'API Estrela Dalva 1.0.0' });
});
router.get('/public/estados', comumController.getEstados);
router.get('/public/cidades', comumController.getCidades);
router.get('/public/cep', comumController.getConsultaCEP);
router.get('/public/default-values', comumController.getDefaultValues);
router.post('/public/computa-acesso', comumController.computaAcesso);
router.post('/public/interesse', comumController.submitInteresse);



router.get('/v1/admin/dashboard/admin', autenticar, comumController.getDashboardAdmin);
// Perfis
router.get('/v1/admin/perfis', autenticar, comumController.getPerfis);
router.get('/v1/admin/perfis/:id', autenticar, comumController.getPerfilById);
router.post('/v1/admin/perfis', autenticar, comumController.setPerfil);
router.get('/v1/admin/lojas', autenticar, comumController.getLojas);
router.get('/v1/admin/lojas/:id', autenticar, comumController.getLojaById);
router.post('/v1/admin/lojas', autenticar, comumController.setLoja);

router.get('/v1/empresa/:id', empresaController.getEmpresaData);
router.post('/v1/admin/empresas/ativacao', autenticar, comumController.verificarCodigoAtivacao);
router.get('/v1/admin/configuracoes', autenticar, empresaController.getConfiguracoesEmpresa);
router.post('/v1/admin/configuracoes', autenticar, empresaController.postConfiguracoesEmpresa);

router.get('/v1/admin/pos', autenticar, comumController.getListaPOS);
router.post('/v1/admin/pos', autenticar, comumController.setPOS);

export default router;