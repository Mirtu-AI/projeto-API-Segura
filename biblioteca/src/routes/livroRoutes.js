import { Router } from "express";
import { listar, buscar, criar, atualizar, remover } from "../controllers/livroController.js";
import { autenticar } from "../middlewares/autenticar.js";
import { autorizar } from "../middlewares/autorizar.js";

const router = Router();

router.get("/", listar);                                     // pública
router.get("/:id", buscar);                                  // pública
router.post("/", autenticar, autorizar("ADMIN"), criar);     // somente ADMIN
router.put("/:id", autenticar, autorizar("ADMIN"), atualizar); // somente ADMIN
router.delete("/:id", autenticar, autorizar("ADMIN"), remover); // somente ADMIN

export default router;
