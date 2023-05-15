export interface ICounty {
    MUN_NOME: string;
    MUN_UF: string;
    MUN_CIDADE: string;
    MUN_ENDERECO: string;
    MUN_NUMERO: string;
    MUN_COMPLEMENTO?: string;
    MUN_BAIRRO: string;
    MUN_CEP: string;
    MUN_DT_INICIO: Date;
    MUN_DT_FIM: Date;
    MUN_ARQ_CONVENIO: string;
    MUN_LOGO: string;
    MUN_ATIVO: boolean;
    MUN_STATUS: string;
}
