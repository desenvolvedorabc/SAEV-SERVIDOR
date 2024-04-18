import { PartialType } from "@nestjs/swagger";
import { CreateSubProfileDto } from "./CreateSubProfileDto";

export class UpdateSubProfileDto extends PartialType(CreateSubProfileDto) {}
