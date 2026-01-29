-- Script para criar usuário administrador inicial do sistema SAEV
-- Email: admin@saev.com
-- Senha: admin123 (hash bcrypt)
-- Perfil: SAEV Admin (SPE_ID = 2)
-- Role: SAEV

-- Inserir usuário administrador
-- Senha: admin123 (bcrypt hash com salt 10)
INSERT INTO `USUARIO` (
    `USU_ID`,
    `USU_NOME`,
    `USU_EMAIL`,
    `USU_SENHA`,
    `USU_FONE`,
    `USU_DOCUMENTO`,
    `USU_SPE_ID`,
    `USU_ATIVO`,
    `USU_DT_CRIACAO`,
    `USU_DT_ATUALIZACAO`
) VALUES (
    UUID(),
    'Administrador SAEV',
    'admin@saev.com',
    '$2b$10$8K1p/a0dL2LzxZqZxQFLR.C4uTNnNu.dJy8qZc9F8XQnhkQHHk3Cy',
    '00000000000',
    '00000000000',
    2,
    1,
    NOW(),
    NOW()
);

-- Garantir que todas as áreas adicionais estejam inseridas (complementando o arquivo 3-insertArea.sql)
INSERT IGNORE INTO AREA (`ARE_ID`, `ARE_NOME`, `ARE_DESCRICAO`, `ARE_ATIVO`) VALUES (32, 'REL_PAR', 'Relatório de Participação', '1');
INSERT IGNORE INTO AREA (`ARE_ID`, `ARE_NOME`, `ARE_DESCRICAO`, `ARE_ATIVO`) VALUES (33, 'REL_DES', 'Relatório de Desempenho', '1');
INSERT IGNORE INTO AREA (`ARE_ID`, `ARE_NOME`, `ARE_DESCRICAO`, `ARE_ATIVO`) VALUES (34, 'REL_SIN', 'Relatório Sintético', '1');
INSERT IGNORE INTO AREA (`ARE_ID`, `ARE_NOME`, `ARE_DESCRICAO`, `ARE_ATIVO`) VALUES (35, 'REL_OBJ', 'Relatório por Objetivo', '1');
INSERT IGNORE INTO AREA (`ARE_ID`, `ARE_NOME`, `ARE_DESCRICAO`, `ARE_ATIVO`) VALUES (36, 'REL_CON', 'Relatório Consolidado', '1');
INSERT IGNORE INTO AREA (`ARE_ID`, `ARE_NOME`, `ARE_DESCRICAO`, `ARE_ATIVO`) VALUES (37, 'DASH', 'Dashboard', '1');
INSERT IGNORE INTO AREA (`ARE_ID`, `ARE_NOME`, `ARE_DESCRICAO`, `ARE_ATIVO`) VALUES (38, 'CONFIG', 'Configurações', '1');
INSERT IGNORE INTO AREA (`ARE_ID`, `ARE_NOME`, `ARE_DESCRICAO`, `ARE_ATIVO`) VALUES (39, 'NOT', 'Notificações', '1');
INSERT IGNORE INTO AREA (`ARE_ID`, `ARE_NOME`, `ARE_DESCRICAO`, `ARE_ATIVO`) VALUES (40, 'AUD', 'Auditoria', '1');

-- Associar todas as áreas ao perfil Admin Geral (SPE_ID = 2)
-- Áreas de 32 a 40 (as áreas de 1 a 31 já estão no arquivo 10-insertSubPerfilArea.sql)
INSERT IGNORE INTO `SUB_PERFIL_AREA` (`SPE_ID`, `ARE_ID`) VALUES ('2', 32);
INSERT IGNORE INTO `SUB_PERFIL_AREA` (`SPE_ID`, `ARE_ID`) VALUES ('2', 33);
INSERT IGNORE INTO `SUB_PERFIL_AREA` (`SPE_ID`, `ARE_ID`) VALUES ('2', 34);
INSERT IGNORE INTO `SUB_PERFIL_AREA` (`SPE_ID`, `ARE_ID`) VALUES ('2', 35);
INSERT IGNORE INTO `SUB_PERFIL_AREA` (`SPE_ID`, `ARE_ID`) VALUES ('2', 36);
INSERT IGNORE INTO `SUB_PERFIL_AREA` (`SPE_ID`, `ARE_ID`) VALUES ('2', 37);
INSERT IGNORE INTO `SUB_PERFIL_AREA` (`SPE_ID`, `ARE_ID`) VALUES ('2', 38);
INSERT IGNORE INTO `SUB_PERFIL_AREA` (`SPE_ID`, `ARE_ID`) VALUES ('2', 39);
INSERT IGNORE INTO `SUB_PERFIL_AREA` (`SPE_ID`, `ARE_ID`) VALUES ('2', 40);
