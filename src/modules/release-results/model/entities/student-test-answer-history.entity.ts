import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm'

export enum Operation {
  INSERT = 'INSERT',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

@Entity('aluno_teste_resposta_historico')
@Index(['ATH_DT_CRIACAO'])
export class StudentTestAnswerHistory {
  @PrimaryGeneratedColumn()
  ATH_ID: number

  @Column()
  ATH_ATR_ID: number

  @Column({ nullable: true })
  ATH_ATR_RESPOSTA_ANTIGA: string

  @Column({ nullable: true })
  ATH_ATR_RESPOSTA_NOVA: string

  @Column({ nullable: true })
  ATH_TEG_ID?: number

  @Column()
  ATH_ALT_ID: number

  @Column('enum', { enum: Operation })
  ATH_OPERACAO: Operation

  @CreateDateColumn()
  ATH_DT_CRIACAO: Date
}
