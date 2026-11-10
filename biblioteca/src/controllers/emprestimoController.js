import { prisma } from "../lib/prisma.js";

const incluirRelacoes = {
  leitor: { select: { id: true, nome: true } },
  livro: { select: { id: true, titulo: true, autor: true } },
};

function lerId(req) {
  const id = Number(req.params.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function validarCorpo(body, parcial = false) {
  const { livroId, dataDevolucao, devolvido } = body ?? {};
  const dados = {};

  if (!parcial) {
    if (!livroId || !Number.isInteger(Number(livroId)) || Number(livroId) <= 0) {
      return { erro: "O campo \"livroId\" é obrigatório e deve ser um número inteiro positivo." };
    }
    dados.livroId = Number(livroId);
  }

  if (dataDevolucao !== undefined) {
    const data = new Date(dataDevolucao);
    if (isNaN(data.getTime())) {
      return { erro: "O campo \"dataDevolucao\" deve ser uma data válida (ISO 8601)." };
    }
    dados.dataDevolucao = data;
  }

  if (devolvido !== undefined) {
    if (typeof devolvido !== "boolean") {
      return { erro: "O campo \"devolvido\" deve ser true ou false." };
    }
    dados.devolvido = devolvido;
  }

  return { dados };
}

// GET /emprestimos  (somente ADMIN)
export async function listarTodos(req, res) {
  const emprestimos = await prisma.emprestimo.findMany({
    include: incluirRelacoes,
    orderBy: { id: "asc" },
  });
  res.json(emprestimos);
}

// GET /emprestimos/meus  (leitor logado)
export async function listarMeus(req, res) {
  const emprestimos = await prisma.emprestimo.findMany({
    where: { leitorId: req.usuario.id },
    include: incluirRelacoes,
    orderBy: { id: "asc" },
  });
  res.json(emprestimos);
}

// GET /emprestimos/:id  (dono ou ADMIN)
export async function buscar(req, res) {
  const id = lerId(req);
  if (!id) return res.status(400).json({ erro: "ID inválido." });

  const emprestimo = await prisma.emprestimo.findUnique({ where: { id }, include: incluirRelacoes });
  if (!emprestimo) return res.status(404).json({ erro: "Empréstimo não encontrado." });

  const ehDono = emprestimo.leitorId === req.usuario.id;
  const ehAdmin = req.usuario.role === "ADMIN";
  if (!ehDono && !ehAdmin) {
    return res.status(403).json({ erro: "Você só pode ver os seus próprios empréstimos." });
  }
  res.json(emprestimo);
}

// POST /emprestimos  (leitor logado)
export async function criar(req, res) {
  const { dados, erro } = validarCorpo(req.body);
  if (erro) return res.status(400).json({ erro });

  // 1. Verificar se o livro existe e tem exemplares disponíveis
  const livro = await prisma.livro.findUnique({
    where: { id: dados.livroId },
    include: {
      emprestimos: {
        where: { devolvido: false },
        select: { id: true, leitorId: true },
      },
    },
  });
  if (!livro) return res.status(404).json({ erro: "Livro não encontrado." });

  // 2. REGRA: O mesmo leitor não pode pegar o mesmo livro mais de 1 vez sem antes devolver
  const jaTemLivro = livro.emprestimos.some((e) => e.leitorId === req.usuario.id);
  if (jaTemLivro) {
    return res.status(400).json({ erro: "Você já possui este livro emprestado. Devolva-o antes de pegar novamente." });
  }

  // 3. REGRA: Quantidade disponível (estoque)
  const exemplaresEmprestados = livro.emprestimos.length;
  if (exemplaresEmprestados >= livro.quantidade) {
    return res.status(400).json({ erro: "Todos os exemplares deste livro já estão emprestados no momento." });
  }

  // Criar empréstimo atribuindo o leitorId do Token
  const emprestimo = await prisma.emprestimo.create({
    data: { ...dados, leitorId: req.usuario.id },
    include: incluirRelacoes,
  });
  res.status(201).json(emprestimo);
}

async function carregarComPermissao(req, res) {
  const id = lerId(req);
  if (!id) {
    res.status(400).json({ erro: "ID inválido." });
    return null;
  }

  const emprestimo = await prisma.emprestimo.findUnique({ where: { id } });
  if (!emprestimo) {
    res.status(404).json({ erro: "Empréstimo não encontrado." });
    return null;
  }

  const ehDono = emprestimo.leitorId === req.usuario.id;
  const ehAdmin = req.usuario.role === "ADMIN";
  if (!ehDono && !ehAdmin) {
    res.status(403).json({ erro: "Você só pode alterar ou remover os seus próprios empréstimos." });
    return null;
  }
  return emprestimo;
}

// PUT /emprestimos/:id  (dono ou ADMIN - ex: devolver)
export async function atualizar(req, res) {
  const emprestimo = await carregarComPermissao(req, res);
  if (!emprestimo) return;

  const { dados, erro } = validarCorpo(req.body, true);
  if (erro) return res.status(400).json({ erro });
  if (Object.keys(dados).length === 0) {
    return res.status(400).json({ erro: "Envie ao menos um campo para atualizar." });
  }

  delete dados.livroId;

  const atualizado = await prisma.emprestimo.update({
    where: { id: emprestimo.id },
    data: dados,
    include: incluirRelacoes,
  });
  res.json(atualizado);
}

// DELETE /emprestimos/:id  (dono ou ADMIN)
export async function remover(req, res) {
  const emprestimo = await carregarComPermissao(req, res);
  if (!emprestimo) return;

  await prisma.emprestimo.delete({ where: { id: emprestimo.id } });
  res.status(204).send();
}
