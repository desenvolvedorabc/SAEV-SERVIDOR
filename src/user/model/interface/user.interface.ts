export interface IUser {
  USU_ID: number;
  USU_NOME: string;
  USU_FONE: string;
  USU_DOCUMENTO?: string;
  USU_AVATAR?: string;
  USU_EMAIL: string;
  USU_SENHA?: string;
  USU_ATIVO: boolean;
  USU_DT_CRIACAO: Date;
  USU_DT_ATUALIZACAO: Date;
}
