import { Router } from 'express';
import { autenticar } from '../oauth';
import usuariosController from '../controllers/usuarios.controller';
import autorizar from '../middlewares/autorizar';

const router = Router();


router.post('/v1/login', usuariosController.login);
router.get("/v1/me", autenticar, usuariosController.me)

// Usuários
router.get('/v1/admin/usuarios', autenticar, usuariosController.getUsuarios);
router.get('/v1/admin/usuario', autenticar, usuariosController.getUsuario);
// Vendedores
router.get('/v1/admin/usuarios/vendedores', autenticar, usuariosController.getVendedores);

router.post('/v1/admin/usuarios', autenticar, usuariosController.addUsuario);
router.post('/v1/admin/usuarios/simples', autenticar, usuariosController.addUsuarioSimples);

// Permissões
router.get("/v1/admin/usuarios/permissoes", autenticar, usuariosController.getPermissoes);

export default router;