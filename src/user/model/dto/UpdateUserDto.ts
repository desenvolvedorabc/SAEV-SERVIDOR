import { PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './CreateUserDto';

export class UpdateUserDto extends PartialType(CreateUserDto) {}
