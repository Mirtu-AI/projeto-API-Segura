import { prisma } from "../lib/prisma.js";

function lerId(req) {
  const id = Number(req.params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function validarCorpo(body, parcial = false) {
  const { titulo, autor, isbn, quantidade } = body ?? {};
  const obrigatorios = { titulo, autor };
  for (const [nome, valor] of Object.entries(obrigatorios)) {
    if (valor === undefined && parcial) continue;
    if (typeof valor !== "string" || valor.trim() === "") {
      return { erro: `O campo "${nome}" é obrigatório e deve ser texto.` };
    }
  }
  const dados = {};
  if (titulo !== undefined) dados.titulo = titulo.trim();
  if (autor !== undefined) dados.autor = autor.trim();
  if (isbn !== undefined) dados.isbn = isbn.trim() || null;
  if (quantidade !== undefined) {
    const q = Number(quantidade);
    if (!Number.isInteger(q) || q < 0) {
      return { erro: `A quantidade deve ser um número inteiro maior ou igual a 0.` };
    }
    dados.quantidade = q;
  }
  return { dados };
}

// GET /livros  (pública)
export async function listar(req, res) {
  const livros = await prisma.livro.findMany({
    include: {
      emprestimos: {
        where: { devolvido: false },
        select: { id: true, leitorId: true },
      },
    },
    orderBy: { id: "asc" },
  });

  // Calcula disponíveis dinamicamente: quantidade - emprestimos em andamento
  const resultado = livros.map((livro) => {
    const emprestados = livro.emprestimos.length;
    const disponivel = Math.max(0, livro.quantidade - emprestados);
    return {
      id: livro.id,
      titulo: livro.titulo,
      autor: livro.autor,
      isbn: livro.isbn,
      quantidadeTotal: livro.quantidade,
      disponivel,
      leitoresComLivro: livro.emprestimos.map((e) => e.leitorId),
    };
  });

  res.json(resultado);
}

// GET /livros/:id  (pública)
export async function buscar(req, res) {
  const id = lerId(req);
  if (!id) return res.status(400).json({ erro: "ID inválido." });

  const livro = await prisma.livro.findUnique({
    where: { id },
    include: {
      emprestimos: {
        where: { devolvido: false },
        select: { id: true, leitorId: true },
      },
    },
  });
  if (!livro) return res.status(404).json({ erro: "Livro não encontrado." });

  const emprestados = livro.emprestimos.length;
  const disponivel = Math.max(0, livro.quantidade - emprestados);

  res.json({
    id: livro.id,
    titulo: livro.titulo,
    autor: livro.autor,
    isbn: livro.isbn,
    quantidadeTotal: livro.quantidade,
    disponivel,
    leitoresComLivro: livro.emprestimos.map((e) => e.leitorId),
  });
}

// POST /livros  (somente ADMIN) -> 201 | 400
export async function criar(req, res) {
  const { dados, erro } = validarCorpo(req.body);
  if (erro) return res.status(400).json({ erro });

  const livro = await prisma.livro.create({ data: dados });
  res.status(201).json(livro);
}

// PUT /livros/:id  (somente ADMIN)
export async function atualizar(req, res) {
  const id = lerId(req);
  if (!id) return res.status(400).json({ erro: "ID inválido." });

  const livro = await prisma.livro.findUnique({ where: { id } });
  if (!livro) return res.status(404).json({ erro: "Livro não encontrado." });

  const { dados, erro } = validarCorpo(req.body, true);
  if (erro) return res.status(400).json({ erro });
  if (Object.keys(dados).length === 0) {
    return res.status(400).json({ erro: "Envie ao menos um campo para atualizar." });
  }

  const atualizado = await prisma.livro.update({ where: { id }, data: dados });
  res.json(atualizado);
}

// DELETE /livros/:id  (somente ADMIN)
export async function remover(req, res) {
  const id = lerId(req);
  if (!id) return res.status(400).json({ erro: "ID inválido." });

  const livro = await prisma.livro.findUnique({ where: { id } });
  if (!livro) return res.status(404).json({ erro: "Livro não encontrado." });

  await prisma.livro.delete({ where: { id } });
  res.status(204).send();
}
