import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/authRoutes.js";
import livroRoutes from "./routes/livroRoutes.js";
import emprestimoRoutes from "./routes/emprestimoRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import { naoEncontrada, tratarErros } from "./middlewares/erros.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json());

// Servir os arquivos estáticos da interface web
app.use(express.static(path.join(__dirname, "../public")));

app.get("/api", (req, res) => {
  res.json({ api: "Biblioteca", status: "no ar", documentacao: "veja o README.md" });
});

app.use("/auth", authRoutes);
app.use("/livros", livroRoutes);
app.use("/emprestimos", emprestimoRoutes);
app.use("/users", userRoutes);

app.use(naoEncontrada);
app.use(tratarErros);

export default app;
