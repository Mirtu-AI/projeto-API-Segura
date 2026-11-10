import { Router } from "express";
import { listarTodos, listarMeus, buscar, criar, atualizar, remover } from "../controllers/emprestimoController.js";
import { autenticar } from "../middlewares/autenticar.js";
import { autorizar } from "../middlewares/autorizar.js";

const router = Router();

router.get("/", autenticar, autorizar("ADMIN"), listarTodos); // somente ADMIN
router.get("/meus", autenticar, listarMeus);                 // logado (antes de "/:id"!)
router.get("/:id", autenticar, buscar);                      // dono ou ADMIN (regra no controller)
router.post("/", autenticar, criar);                         // logado
router.put("/:id", autenticar, atualizar);                   // dono ou ADMIN (regra no controller)
router.delete("/:id", autenticar, remover);                  // dono ou ADMIN (regra no controller)

export default router;
